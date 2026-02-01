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
  Save, X, Wand2, LogOut, Loader2, ClipboardList, RefreshCcw, AlertTriangle, ArrowRight, Bell,
  BarChart3, TrendingUp, DollarSign, Calendar, Smartphone, Facebook, Instagram, Zap,
  Eye, EyeOff, Languages, ShoppingBag, Target, ChevronDown, Clock, Printer, Bike, MapPin, Phone, Grid, Layout
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
  }, []);

  useEffect(() => {
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
      <html dir="rtl" lang="ar">
      <head>
        <title>Order #${order.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; padding: 20px; text-align: center; direction: rtl; }
          .header { border-bottom: 1px dashed #000; padding-bottom: 10px; }
          .delivery-box { border: 2px solid #000; padding: 10px; margin: 10px 0; text-align: right; }
          .total { font-size: 18px; font-weight: bold; border-top: 1px dashed #000; margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header"><h1>${config.name}</h1><div>#${order.id}</div></div>
        ${isDelivery ? `<div class="delivery-box">📞 ${order.phone} <br/> 📍 ${order.address}</div>` : `<div>طاولة: ${order.table_number}</div>`}
        <div class="total">المجموع: ${order.total} ${config.currency}</div>
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
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        const data = await getOrders();
        const myOrders = data.filter(o => o.restaurant_id === session.user.id);
        
        if (processedOrdersRef.current.size === 0 && myOrders.length > 0) {
            myOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));
        }
        if (myOrders.length > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
            playNotificationSound();
            const newOrders = myOrders.filter(o => o.id && !processedOrdersRef.current.has(o.id));
            if (newOrders.length > 0 && autoPrint) {
                newOrders.forEach(order => printOrderReceipt(order));
            }
        }
        previousOrderCountRef.current = myOrders.length;
        setOrders(myOrders);
    } catch (error) { console.error(error); } finally { if (!isBackground) setLoadingOrders(false); }
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

  const handleDeleteDish = async (dishId: string) => {
    if (window.confirm('⚠️ حذف نهائي؟ لا يمكن التراجع!')) {
         setIsSaving(true);
         const { data: { user } } = await supabase.auth.getUser();
         if (!user) return;
         try {
             const { error } = await supabase.from('items').delete().eq('id', dishId).eq('userId', user.id);
             if (error) throw error;
             setConfig(prev => ({ ...prev, dishes: prev.dishes.filter(d => d.id !== dishId) }));
             alert('تم الحذف');
         } catch (e) { alert('فشل الحذف'); } finally { setIsSaving(false); }
    }
  };

  const analyticsData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const periodRevenue = completedOrders.reduce((sum, o) => sum + Number(o.total), 0);
    return { periodRevenue, periodCount: completedOrders.length };
  }, [orders]);

  const saveSettings = async () => {
    setIsSaving(true);
    try {
        await onUpdate(settingsForm);
        await refreshData();
        alert('تم الحفظ ✅');
    } catch (e) { alert('خطأ ❌'); } finally { setIsSaving(false); }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col p-4 space-y-4">
        <h2 className="font-bold text-center text-xl mb-4">{t.dashboard}</h2>
        <button onClick={() => setActiveTab('orders')} className={`p-3 rounded-lg ${activeTab === 'orders' ? 'bg-primary' : ''}`}>📦 {t.orders}</button>
        <button onClick={() => setActiveTab('analytics')} className={`p-3 rounded-lg ${activeTab === 'analytics' ? 'bg-primary' : ''}`}>📊 {t.analytics}</button>
        <button onClick={() => setActiveTab('menu')} className={`p-3 rounded-lg ${activeTab === 'menu' ? 'bg-primary' : ''}`}>🍴 {t.menu}</button>
        <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-lg ${activeTab === 'settings' ? 'bg-primary' : ''}`}>⚙️ {t.settings}</button>
        <button onClick={onLogout} className="mt-auto p-3 text-red-600">🚪 {t.logout}</button>
      </aside>

      <main className="flex-1 p-6 overflow-y-auto">
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold">الطلبات الواردة</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {orders.map(order => (
                <div key={order.id} className="bg-white p-4 rounded-xl shadow-sm border">
                  <div className="flex justify-between font-bold border-b pb-2 mb-2">
                    <span>{order.type === 'delivery' ? '🛵 توصيل' : `🪑 طاولة ${order.table_number}`}</span>
                    <span className="text-primary">{order.total} {config.currency}</span>
                  </div>
                  <div className="text-sm space-y-1">
                    {order.items.map((item, i) => <div key={i}>{item.quantity}x {item.dish.name}</div>)}
                  </div>
                  <div className="mt-4 flex gap-2">
                    {order.status === 'pending' && <button onClick={() => handleStatusUpdate(order.id!, 'preparing')} className="bg-blue-600 text-white px-4 py-2 rounded-lg flex-1">بدء التجهيز</button>}
                    {order.status === 'preparing' && <button onClick={() => handleStatusUpdate(order.id!, 'completed')} className="bg-green-600 text-white px-4 py-2 rounded-lg flex-1">إكمال</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-xl shadow-sm space-y-6">
            <h2 className="text-2xl font-bold">إعدادات المطعم</h2>
            <input type="text" value={settingsForm.name} onChange={e => handleSettingsChange('name', e.target.value)} className="w-full border p-2 rounded" placeholder="اسم المطعم" />
            <div className="flex items-center gap-4">
               <label>اللون الأساسي:</label>
               <input type="color" value={settingsForm.primaryColor} onChange={e => handleSettingsChange('primaryColor', e.target.value)} />
            </div>
            <button onClick={saveSettings} className="bg-primary px-6 py-2 rounded-lg font-bold w-full">حفظ التغييرات</button>
          </div>
        )}

        {activeTab === 'menu' && (
           <div className="space-y-4">
             <h2 className="text-2xl font-bold">إدارة المنيو</h2>
             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
               {config.dishes.map(dish => (
                 <div key={dish.id} className="bg-white p-4 rounded-xl border relative">
                    <img src={dish.image} className="w-full h-32 object-cover rounded mb-2" />
                    <h3 className="font-bold">{dish.name}</h3>
                    <button onClick={() => handleDeleteDish(dish.id)} className="absolute top-2 right-2 p-2 bg-red-100 text-red-600 rounded-full"><Trash2 size={16}/></button>
                 </div>
               ))}
             </div>
           </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
