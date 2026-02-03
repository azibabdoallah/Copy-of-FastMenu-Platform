import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RestaurantConfig, Category, Dish, Order, Offer, Language, WorkingHours } from '../types';
import { DEFAULT_CONFIG, TRANSLATIONS } from '../constants';
import { generateDishDescription } from '../services/geminiService';
import { getOrders, updateOrderStatus } from '../services/orderService';
import { supabase } from '../services/supabase';
import { 
    uploadImage, 
    addDishToSupabase, 
    updateDishInSupabase, 
    addCategoryToSupabase,
    updateCategoryInSupabase,
    getRestaurantConfig
} from '../services/storageService';
import { 
  Settings, Utensils, Image as ImageIcon, Plus, Edit2, Trash2,
  Save, X, Wand2, LogOut, Loader2, ClipboardList, RefreshCcw, ArrowRight, Bell,
  BarChart3, TrendingUp, DollarSign, Smartphone, Facebook, Instagram, Zap,
  Eye, EyeOff, Languages, ShoppingBag, Target, ChevronDown, Clock, Printer, Bike, MapPin, Phone, Grid, Layout, ShieldCheck, Flame
} from 'lucide-react';

interface AdminDashboardProps {
  config: RestaurantConfig;
  onUpdate: (config: RestaurantConfig) => Promise<void>;
  onLogout: () => void;
}

type Tab = 'menu' | 'settings' | 'orders' | 'analytics';
type TimeRange = 'today' | 'week' | 'month' | 'custom';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ config: initialConfig, onUpdate, onLogout }) => {
  const navigate = useNavigate();
  const [config, setConfig] = useState<RestaurantConfig>(initialConfig);
  const [activeTab, setActiveTab] = useState<Tab>('orders');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [editingOffer, setEditingOffer] = useState<Offer | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('autoPrint') === 'true');
  const processedOrdersRef = useRef<Set<number>>(new Set());
  const [language, setLanguage] = useState<Language>('ar');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [analyticsRange, setAnalyticsRange] = useState<TimeRange>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number>(0);
  const colorInputRef = useRef<HTMLInputElement>(null);
  const [settingsForm, setSettingsForm] = useState(initialConfig);
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  const selectLanguage = (lang: Language) => {
    setLanguage(lang);
    setIsLangMenuOpen(false);
  };

  useEffect(() => {
    setConfig(initialConfig);
    setSettingsForm(initialConfig);
  }, [initialConfig]);

  useEffect(() => {
    if (config.name === DEFAULT_CONFIG.name) {
        setActiveTab('settings');
        setIsFirstLogin(true);
    }
  }, [config.name]);

  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    localStorage.setItem('autoPrint', String(autoPrint));
  }, [autoPrint]);

  const playNotificationSound = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.log("Audio play failed:", err));
    }
  };

  const printOrderReceipt = (order: Order) => {
    const printWindow = window.open('', '', 'width=400,height=600');
    if (!printWindow) return;
    const isDelivery = order.type === 'delivery';
    const receiptHtml = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <title>Order #${order.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; text-align: center; direction: rtl; }
          .header { margin-bottom: 20px; border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .title { font-size: 20px; font-weight: bold; margin: 0; }
          .meta { font-size: 12px; color: #555; margin-top: 5px; }
          .delivery-box { border: 2px solid #000; padding: 10px; margin: 10px 0; text-align: right; font-weight: bold; }
          .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: right; }
          .total { font-size: 18px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; }
          @media print { @page { margin: 0; size: 80mm auto; } body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${config.name}</h1>
          <div class="meta"><div>رقم الطلب: #${order.id}</div><div>${isDelivery ? '🛵 توصيل' : 'طاولة: ' + order.table_number}</div></div>
        </div>
        ${isDelivery ? `<div class="delivery-box"><div>📞 ${order.phone}</div><div>📍 ${order.address}</div></div>` : ''}
        <table class="items">
          <tbody>${order.items.map(item => `<tr><td>${item.quantity}x ${item.dish.name}</td><td>${item.dish.price * item.quantity}</td></tr>`).join('')}</tbody>
        </table>
        <div class="total">المجموع: ${order.total}</div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };
  
  const refreshData = async () => {
      const newData = await getRestaurantConfig();
      setConfig(newData);
      setSettingsForm(newData);
  };

  const fetchOrders = async (isBackground = false) => {
    if (!isBackground) setLoadingOrders(true);
    try {
        const data = await getOrders();
        if (processedOrdersRef.current.size === 0 && data.length > 0) {
            data.forEach(o => o.id && processedOrdersRef.current.add(o.id));
        }
        if (data.length > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
            playNotificationSound();
            const newOrders = data.filter(o => o.id && !processedOrdersRef.current.has(o.id));
            if (newOrders.length > 0) {
                newOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));
                if (autoPrint) newOrders.forEach(order => printOrderReceipt(order));
            }
        }
        previousOrderCountRef.current = data.length;
        setOrders(data);
    } catch (error) {
        console.error("Error fetching orders:", error);
    } finally {
        if (!isBackground) setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' || activeTab === 'analytics') {
      fetchOrders(false);
      const interval = setInterval(() => fetchOrders(true), 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleStatusUpdate = async (id: number, status: Order['status']) => {
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    await updateOrderStatus(id, status);
  };

  const handleSettingsChange = (field: keyof RestaurantConfig, value: any) => {
    setSettingsForm(prev => ({ ...prev, [field]: value }));
  };
  
  const handleWorkingHoursChange = (day: keyof WorkingHours, field: 'isOpen' | 'start' | 'end', value: any) => {
      setSettingsForm(prev => ({
          ...prev,
          workingHours: { ...prev.workingHours, [day]: { ...prev.workingHours[day], [field]: value } }
      }));
  };

  const saveSettings = async () => {
    setIsSaving(true);
    try {
        await onUpdate(settingsForm);
        await refreshData();
        setIsFirstLogin(false);
        alert('تم حفظ الإعدادات بنجاح! ✅');
    } catch (error) {
        alert('فشل حفظ الإعدادات. ❌');
    } finally {
        setIsSaving(false);
    }
  };

  const analyticsData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const periodRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const periodCount = completedOrders.length;
    const averageOrderValue = periodCount > 0 ? periodRevenue / periodCount : 0;
    const dishCounts: Record<string, number> = {};
    completedOrders.forEach(o => {
        o.items.forEach(item => { dishCounts[item.dish.name] = (dishCounts[item.dish.name] || 0) + item.quantity; });
    });
    const bestSellers = Object.entries(dishCounts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5);
    return { periodRevenue, periodCount, averageOrderValue, bestSellers };
  }, [orders]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'cover' | 'category' | 'dish' | 'offer') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        if (type === 'logo') handleSettingsChange('logo', url);
        else if (type === 'cover') handleSettingsChange('coverImage', url);
      }
    } finally {
      setIsUploadingImage(false);
    }
  };

  const daysOfWeek: Array<keyof WorkingHours> = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-primary mb-3"><Utensils size={32} /></div>
          <h2 className="font-black text-lg text-gray-800">{t.dashboard}</h2>
          <div className="relative mt-4 w-full">
             <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="w-full bg-gray-50 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-xs font-bold border border-gray-200">
                <div className="flex items-center gap-2"><span>{language === 'ar' ? '🇸🇦' : '🇫🇷'}</span><span>{language === 'ar' ? 'العربية' : 'Français'}</span></div>
                <ChevronDown size={14} className="text-gray-400" />
            </button>
            {isLangMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50">
                    <button onClick={() => selectLanguage('ar')} className="w-full text-right px-4 py-2 text-xs hover:bg-gray-50">العربية</button>
                    <button onClick={() => selectLanguage('fr')} className="w-full text-right px-4 py-2 text-xs hover:bg-gray-50">Français</button>
                </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => navigate('/select')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 mb-6 font-bold"><ArrowRight size={20} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} /><span>{t.backToSelect}</span></button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><ClipboardList size={20} /><span>{t.orders}</span></button>
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><BarChart3 size={20} /><span>{t.analytics}</span></button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'menu' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Utensils size={20} /><span>{t.menu}</span></button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /><span>{t.settings}</span></button>
        </nav>
        <div className="p-4 border-t border-gray-100"><button onClick={onLogout} className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"><LogOut size={18} /><span>{t.logout}</span></button></div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-4"><h2 className="text-2xl font-bold flex items-center gap-3"><Bell className="text-primary" /> {t.receivedOrders}</h2></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {orders.map(order => (
                  <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex justify-between mb-2"><span className="font-bold">{order.customer_name}</span><span className="text-xs bg-gray-100 px-2 py-1 rounded">#{order.id}</span></div>
                    <div className="text-sm text-gray-500 mb-4">{order.type === 'delivery' ? '🛵 توصيل' : 'طاولة: ' + order.table_number}</div>
                    <div className="border-t pt-4 flex justify-between"><button onClick={() => handleStatusUpdate(order.id!, 'completed')} className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm">إتمام</button><button onClick={() => printOrderReceipt(order)} className="p-2 bg-gray-50 rounded-lg"><Printer size={18} /></button></div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings className="text-primary" /> {t.restaurantSettings}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 {/* خيار تفعيل الطلب */}
                 <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-700"><Smartphone size={20} /></div>
                        <div><h3 className="font-bold text-gray-800">{t.orderingPhone}</h3><p className="text-xs text-gray-500">{t.orderingPhoneDesc}</p></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settingsForm.isOrderingEnabled !== false} onChange={e => handleSettingsChange('isOrderingEnabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                </div>

                {/* خيار كود التحقق الجديد */}
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-700"><ShieldCheck size={20} /></div>
                        <div><h3 className="font-bold text-gray-800">{t.securityPin}</h3><p className="text-xs text-gray-500">{t.securityPinDesc}</p></div>
                    </div>
                    <input 
                      type="text" 
                      maxLength={4} 
                      className="w-40 border border-gray-300 rounded-lg px-4 py-2 font-mono text-center text-xl tracking-widest focus:ring-2 focus:ring-primary outline-none"
                      value={settingsForm.verificationPin || ''}
                      onChange={e => handleSettingsChange('verificationPin', e.target.value.replace(/\D/g, ''))}
                    />
                </div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.restaurantName}</label><input type="text" value={settingsForm.name} onChange={e => handleSettingsChange('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20" /></div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label><input type="text" value={settingsForm.currency} onChange={e => handleSettingsChange('currency', e.target.value)} className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20" /></div>
              </div>
              <button onClick={saveSettings} disabled={isSaving} className="bg-primary text-black px-8 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">{isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{isSaving ? t.saving : t.saveChanges}</button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
