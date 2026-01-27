import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { RestaurantConfig, Category, Dish, Order, Offer, Language, WorkingHours } from '../types';
import { DEFAULT_CONFIG, TRANSLATIONS } from '../constants';
import { generateDishDescription } from '../services/geminiService';
import { getOrders, updateOrderStatus } from '../services/orderService';
import { supabase } from '../services/supabase'; // Import supabase directly for Edge Functions
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
  Eye, EyeOff, Languages, ShoppingBag, Target, ChevronDown, Clock, Printer, Bike, MapPin, Phone,
  LayoutDashboard, Flame
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
          .verify-code { font-size: 14px; font-weight: bold; margin-top: 5px; border: 1px solid #000; display: inline-block; padding: 2px 5px; }
          .items { width: 100%; border-collapse: collapse; margin-bottom: 20px; text-align: right; }
          .items th { border-bottom: 1px solid #000; padding: 5px 0; font-size: 12px; }
          .items td { padding: 5px 0; font-size: 14px; }
          .total { font-size: 18px; font-weight: bold; border-top: 1px dashed #000; padding-top: 10px; margin-top: 10px; text-align: left; display: flex; justify-content: space-between; }
          .footer { margin-top: 30px; font-size: 12px; color: #555; }
          @media print {
            @page { margin: 0; size: 80mm auto; }
            body { margin: 10mm; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">${config.name}</h1>
          <div class="meta">
            <div>التاريخ: ${new Date().toLocaleDateString('ar-SA')} ${new Date().toLocaleTimeString('ar-SA')}</div>
            <div>رقم الطلب: #${order.id}</div>
            ${!isDelivery ? `<div style="font-size: 16px; font-weight: bold; margin-top: 5px;">طاولة: ${order.table_number}</div>` : `<div style="font-size: 16px; font-weight: bold; margin-top: 5px;">🛵 طلب توصيل</div>`}
            <div>العميل: ${order.customer_name}</div>
            ${order.verification_code ? `<div class="verify-code">كود: ${order.verification_code}</div>` : ''}
          </div>
        </div>
        ${isDelivery ? `<div class="delivery-box"><div>📞 ${order.phone || 'غير متوفر'}</div><div>📍 ${order.address || 'غير متوفر'}</div></div>` : ''}
        <table class="items">
          <thead><tr><th>الكمية</th><th>الصنف</th><th>السعر</th></tr></thead>
          <tbody>
            ${order.items.map(item => `<tr><td style="width: 15%;">${item.quantity}x</td><td>${item.dish.name}</td><td style="width: 25%;">${item.dish.price * item.quantity}</td></tr>`).join('')}
          </tbody>
        </table>
        <div class="total"><span>المجموع:</span><span>${order.total} ${config.currency}</span></div>
        <div class="footer"><p>شكراً لزيارتكم!</p></div>
        <script>window.onload = function() { window.print(); window.close(); }</script>
      </body>
      </html>
    `;
    printWindow.document.write(receiptHtml);
    printWindow.document.close();
  };
  
  const refreshData = async () => {
      if (!config.id) return;
      // Fixed: getRestaurantConfig call expects 0 or 1 optional arguments. Removing redundant ID as it's fetched from session.
      const newData = await getRestaurantConfig();
      setConfig(newData);
      setSettingsForm(newData);
  };

  const fetchOrders = async (isBackground = false) => {
    if (!config.id) return;
    if (!isBackground) setLoadingOrders(true);
    try {
        // Fixed: getOrders call expects 0 arguments. Removing redundant ID.
        const data = await getOrders();
        if (processedOrdersRef.current.size === 0 && data.length > 0) {
            data.forEach(o => o.id && processedOrdersRef.current.add(o.id));
        }
        if (data.length > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
            playNotificationSound();
            const newOrders = data.filter(o => o.id && !processedOrdersRef.current.has(o.id));
            if (newOrders.length > 0) {
                newOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));
                if (autoPrint) {
                    newOrders.forEach(order => printOrderReceipt(order));
                }
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
    if ((activeTab === 'orders' || activeTab === 'analytics') && config.id) {
      fetchOrders(false);
      const interval = setInterval(() => fetchOrders(true), 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, config.id]);

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
          workingHours: {
              ...prev.workingHours,
              [day]: { ...prev.workingHours[day], [field]: value }
          }
      }));
  };

  const handleSocialChange = (field: keyof RestaurantConfig['socials'], value: string) => {
    setSettingsForm(prev => ({ ...prev, socials: { ...prev.socials, [field]: value } }));
  };

  const handleDelete = async (tableName: string, recordId: string) => {
    if (recordId.startsWith('local_')) return true;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert("يجب تسجيل الدخول أولاً"); return false; }
    try {
      const { error } = await supabase.functions.invoke('delete-manager', {
        body: { table: tableName, id: recordId, userId: user.id }
      });
      if (error) throw error;
      alert("تم الحذف بنجاح!");
      return true;
    } catch (error: any) {
      console.error("خطأ:", error);
      alert("حدث خطأ أثناء الحذف: " + error.message);
      return false;
    }
  };

  const analyticsData = useMemo(() => {
    const completedOrders = orders.filter(o => o.status === 'completed');
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const now = new Date();
    const todayStart = normalizeDate(now);
    const filteredOrders = completedOrders.filter(o => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at);
        const orderTime = normalizeDate(orderDate);
        if (analyticsRange === 'today') return orderTime === todayStart;
        if (analyticsRange === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return orderTime >= normalizeDate(weekAgo);
        }
        if (analyticsRange === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setDate(now.getDate() - 30);
            return orderTime >= normalizeDate(monthAgo);
        }
        if (analyticsRange === 'custom') {
            const selected = new Date(customDate);
            return orderTime === normalizeDate(selected);
        }
        return true;
    });
    const periodRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const periodCount = filteredOrders.length;
    const averageOrderValue = periodCount > 0 ? periodRevenue / periodCount : 0;
    const dishCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            dishCounts[item.dish.name] = (dishCounts[item.dish.name] || 0) + item.quantity;
        });
    });
    const bestSellers = Object.entries(dishCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    const maxSoldCount = bestSellers.length > 0 ? bestSellers[0].count : 0;
    return { periodRevenue, periodCount, averageOrderValue, bestSellers, maxSoldCount };
  }, [orders, analyticsRange, customDate]);

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

  const saveOffer = async (offer: Offer) => {
    setIsSaving(true);
    try {
        const newOffers = config.offers.some(o => o.id === offer.id)
            ? config.offers.map(o => o.id === offer.id ? offer : o)
            : [...config.offers, offer];
        await onUpdate({ ...config, offers: newOffers });
        await refreshData();
        setEditingOffer(null);
        alert('تم حفظ العرض بنجاح');
    } catch (e) {
        alert('حدث خطأ');
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا العرض؟')) {
        setIsSaving(true);
        try {
            const newOffers = config.offers.filter(o => o.id !== offerId);
            await onUpdate({ ...config, offers: newOffers });
            await refreshData();
            setEditingOffer(null);
            alert('تم حذف العرض بنجاح');
        } catch (e) {
            alert('حدث خطأ أثناء حذف العرض');
        } finally {
            setIsSaving(false);
        }
    }
  };
  
   const handleToggleOfferStatus = async (e: React.MouseEvent, offer: Offer) => {
      e.preventDefault(); e.stopPropagation();
      setIsSaving(true);
      try {
          const updatedOffer = { ...offer, active: !offer.active };
          await onUpdate({
              ...config,
              offers: config.offers.map(o => o.id === offer.id ? updatedOffer : o)
          });
          await refreshData();
      } catch(e) {
          alert('حدث خطأ أثناء التحديث');
      } finally {
          setIsSaving(false);
      }
  };

  const saveCategory = async (cat: Category) => {
    setIsSaving(true);
    try {
        if (config.categories.some(c => c.id === cat.id)) {
             await updateCategoryInSupabase(cat);
        } else {
             await addCategoryToSupabase({ name: cat.name, image: cat.image, isAvailable: true });
        }
        await refreshData();
        setEditingCategory(null);
        alert('تم حفظ القسم بنجاح ✅');
    } catch (e: any) {
        alert(`حدث خطأ أثناء حفظ القسم: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleToggleCategoryAvailability = async (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
        await updateCategoryInSupabase({ ...cat, isAvailable: !cat.isAvailable });
        await refreshData();
    } catch (e: any) {
        alert(`فشل التحديث: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا القسم؟ سيتم حذف جميع الأطباق المرتبطة به.')) {
        setIsSaving(true);
        const success = await handleDelete('categories', id);
        if (success) await refreshData();
        setIsSaving(false);
    }
  };

  const saveDish = async (dish: Dish) => {
    if (!dish.categoryId) { alert("يجب اختيار قسم للطبق"); return; }
    setIsSaving(true);
    try {
      if (config.dishes.find(d => d.id === dish.id)) {
          await updateDishInSupabase(dish);
      } else {
          await addDishToSupabase(dish);
      }
      await refreshData();
      setEditingDish(null);
      alert('تم حفظ الطبق بنجاح!');
    } catch (error) {
      alert('حدث خطأ أثناء حفظ الطبق.');
    } finally {
      setIsSaving(false);
    }
  };
  
  const handleToggleDishAvailability = async (e: React.MouseEvent, dish: Dish) => {
    e.stopPropagation();
    setIsSaving(true);
    try {
      await updateDishInSupabase({ ...dish, isAvailable: !dish.isAvailable });
      await refreshData();
    } catch (error: any) {
      alert(`فشل التحديث: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطبق نهائياً؟')) {
         setIsSaving(true);
         const success = await handleDelete('items', dishId); 
         if (success) await refreshData();
         setEditingDish(null);
         setIsSaving(false);
    }
  };

  const handleAiDescription = async () => {
    if (!editingDish || !editingDish.name) { alert("يرجى كتابة اسم الطبق أولاً"); return; }
    setIsGeneratingAi(true);
    const catName = config.categories.find(c => c.id === editingDish.categoryId)?.name || 'عام';
    const desc = await generateDishDescription(editingDish.name, catName);
    setEditingDish(prev => prev ? { ...prev, description: desc } : null);
    setIsGeneratingAi(false);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'category' | 'dish' | 'logo' | 'cover' | 'offer') => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const url = await uploadImage(file);
      if (url) {
        if (type === 'category' && editingCategory) setEditingCategory({ ...editingCategory, image: url });
        else if (type === 'dish' && editingDish) setEditingDish({ ...editingDish, image: url });
        else if (type === 'offer' && editingOffer) setEditingOffer({ ...editingOffer, image: url });
        else if (type === 'logo') handleSettingsChange('logo', url);
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
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-primary mb-3">
             <Utensils size={32} />
          </div>
          <h2 className="font-black text-lg text-gray-800">{t.dashboard}</h2>
          <p className="text-xs text-gray-400">{t.manageMenu}</p>
          <div className="relative mt-4 w-full">
             <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="w-full bg-gray-50 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-xs font-bold border border-gray-200">
                <div className="flex items-center gap-2"><span>{language === 'ar' ? '🇸🇦' : '🇫🇷'}</span><span>{language === 'ar' ? 'العربية' : 'Français'}</span></div>
                <ChevronDown size={14} className="text-gray-400" />
            </button>
            {isLangMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => selectLanguage('ar')} className={`w-full text-right px-4 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 ${language === 'ar' ? 'font-bold text-black bg-primary/20' : 'text-gray-600'}`}>🇸🇦 العربية</button>
                    <button onClick={() => selectLanguage('fr')} className={`w-full text-right px-4 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 ${language === 'fr' ? 'font-bold text-black bg-primary/20' : 'text-gray-600'}`}>🇫🇷 Français</button>
                </div>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => navigate('/select')} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 mb-6 font-bold"><ArrowRight size={20} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} /><span>{t.backToSelect}</span></button>
          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><ClipboardList size={20} /><span>{t.orders}</span></button>
          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><BarChart3 size={20} /><span>{t.analytics}</span></button>
          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'menu' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Utensils size={20} /><span>{t.menu}</span></button>
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}><Settings size={20} /><span>{t.settings}</span></button>
        </nav>
        <div className="p-4 border-t border-gray-100"><button onClick={onLogout} className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"><LogOut size={18} /><span>{t.logout}</span></button></div>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-100 p-4 md:hidden flex justify-between items-center sticky top-0 z-40">
           <div className="flex items-center gap-2"><div className="bg-black p-1.5 rounded text-primary"><Utensils size={18} /></div><span className="font-bold text-sm tracking-tight">FASTMENU</span></div>
           <button onClick={onLogout} className="text-red-500"><LogOut size={20} /></button>
        </header>
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {isFirstLogin && (
            <div className="mb-8 bg-black text-white p-6 rounded-2xl shadow-xl flex flex-col md:flex-row items-center gap-6 relative overflow-hidden border-4 border-primary">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-3xl rounded-full"></div>
                <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-black shrink-0 shadow-lg shadow-primary/20"><Zap size={32} /></div>
                <div className="relative z-10 flex-1 text-center md:text-right"><h2 className="text-xl font-bold mb-1">{t.welcomeTitle}</h2><p className="text-gray-400 text-sm font-medium">{t.welcomeMsg}</p></div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold flex items-center gap-3"><ClipboardList className="text-primary" /> {t.receivedOrders} <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{orders.length}</span></h2>
                  <div className="flex items-center gap-3">
                      <button onClick={() => setAutoPrint(!autoPrint)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${autoPrint ? 'bg-primary/20 border-primary text-black' : 'bg-gray-100 border-transparent text-gray-500 hover:bg-gray-200'}`} title="طباعة الطلبات تلقائياً">
                        <Printer size={14} />{autoPrint ? 'طباعة تلقائية مفعلة' : 'تفعيل الطباعة التلقائية'}
                      </button>
                      <button onClick={() => fetchOrders(false)} disabled={loadingOrders} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-all active:rotate-180">
                        {loadingOrders ? <Loader2 className="animate-spin" size={20} /> : <RefreshCcw size={20} />}
                      </button>
                  </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {orders.map(order => (
                  <div key={order.id} className={`bg-white rounded-2xl p-5 shadow-sm border-2 transition-all hover:shadow-md ${order.status === 'pending' ? 'border-primary/50' : 'border-gray-50'}`}>
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{order.customer_name}</h3>
                            {order.type === 'delivery' ? <span className="bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1"><Bike size={10}/> توصيل</span> : <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded">{t.table} {order.table_number}</span>}
                        </div>
                        <p className="text-xs text-gray-400 font-medium">#{order.id} • {order.created_at ? new Date(order.created_at).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : ''}</p>
                        {order.verification_code && <div className="mt-1 text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded w-fit border border-gray-200 font-bold">كود: {order.verification_code}</div>}
                      </div>
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : order.status === 'preparing' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'}`}>{t[order.status]}</span>
                    </div>
                    {order.type === 'delivery' && (
                        <div className="mb-4 p-2 bg-gray-50 rounded-lg border border-gray-100 text-[11px] space-y-1">
                            <div className="flex items-center gap-2 text-gray-700 font-bold"><Phone size={10}/> {order.phone}</div>
                            <div className="flex items-start gap-2 text-gray-500 leading-relaxed"><MapPin size={10} className="mt-0.5 shrink-0"/> {order.address}</div>
                        </div>
                    )}
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto pr-1">
                      {order.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between text-sm items-center">
                          <span className="text-gray-600"><span className="font-bold text-black">{item.quantity}x</span> {item.dish.name}</span>
                          <span className="font-bold text-xs">{item.dish.price * item.quantity} {config.currency}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t pt-4 flex justify-between items-center mb-4">
                      <span className="text-gray-400 text-xs font-bold">{t.total}</span>
                      <span className="font-black text-lg text-primary">{order.total} {config.currency}</span>
                    </div>
                    <div className="flex gap-2">
                       <button onClick={() => printOrderReceipt(order)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors" title="طباعة الفاتورة"><Printer size={18} /></button>
                      {order.status === 'pending' && <button onClick={() => order.id && handleStatusUpdate(order.id, 'preparing')} className="flex-1 bg-black text-primary py-2 rounded-lg text-xs font-bold hover:bg-gray-900 transition-colors shadow-sm">{t.startPrep}</button>}
                      {order.status === 'preparing' && <button onClick={() => order.id && handleStatusUpdate(order.id, 'completed')} className="flex-1 bg-green-500 text-white py-2 rounded-lg text-xs font-bold hover:bg-green-600 transition-colors shadow-sm">{t.complete}</button>}
                      <button onClick={() => order.id && handleStatusUpdate(order.id, 'cancelled')} className="px-3 bg-red-50 text-red-500 py-2 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">{t.cancel}</button>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-400"><ClipboardList size={64} className="mb-4 opacity-10" /><p className="font-bold">{t.noOrders}</p></div>}
              </div>
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8 animate-in fade-in">
                 <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold flex items-center gap-3"><BarChart3 className="text-primary" /> {t.analytics}</h2>
                    <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100">
                        {(['today', 'week', 'month', 'custom'] as TimeRange[]).map(range => (
                            <button key={range} onClick={() => setAnalyticsRange(range)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${analyticsRange === range ? 'bg-black text-primary' : 'text-gray-500 hover:bg-gray-50'}`}>{t[range]}</button>
                        ))}
                    </div>
                 </div>
                 {analyticsRange === 'custom' && (
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 w-fit">
                        <label className="block text-xs font-bold text-gray-500 mb-2">{t.timeRange}</label>
                        <input type="date" value={customDate} onChange={(e) => setCustomDate(e.target.value)} className="border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none" />
                    </div>
                 )}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center text-green-600 shadow-inner"><DollarSign size={24} /></div>
                        <div><p className="text-xs font-bold text-gray-400 mb-1">{t.totalRevenue}</p><h3 className="text-2xl font-black">{analyticsData.periodRevenue.toLocaleString()} {config.currency}</h3></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-inner"><ShoppingBag size={24} /></div>
                        <div><p className="text-xs font-bold text-gray-400 mb-1">{t.totalOrders}</p><h3 className="text-2xl font-black">{analyticsData.periodCount}</h3></div>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 flex items-center gap-5">
                        <div className="w-12 h-12 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600 shadow-inner"><TrendingUp size={24} /></div>
                        <div><p className="text-xs font-bold text-gray-400 mb-1">{t.averageOrder}</p><h3 className="text-2xl font-black">{Math.round(analyticsData.averageOrderValue).toLocaleString()} {config.currency}</h3></div>
                    </div>
                 </div>
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-50">
                        <h3 className="font-black text-lg mb-6 flex items-center gap-2"><Target className="text-primary" /> {t.bestSellers}</h3>
                        <div className="space-y-6">
                            {analyticsData.bestSellers.map((item, idx) => (
                                <div key={idx} className="space-y-2">
                                    <div className="flex justify-between text-sm"><span className="font-bold text-gray-700">{item.name}</span><span className="font-black text-primary">{item.count} مبيعاً</span></div>
                                    <div className="w-full h-3 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                        <div className="h-full bg-primary transition-all duration-1000 shadow-[0_0_10px_rgba(251,191,36,0.3)]" style={{ width: `${(item.count / analyticsData.maxSoldCount) * 100}%` }}></div>
                                    </div>
                                </div>
                            ))}
                            {analyticsData.bestSellers.length === 0 && <p className="text-center text-gray-400 py-10 text-sm font-medium">لا توجد بيانات مبيعات كافية.</p>}
                        </div>
                    </div>
                    <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-50 flex flex-col justify-center items-center text-center relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-12 -mt-12"></div>
                         <Zap size={48} className="text-primary mb-4 opacity-20" />
                         <h3 className="font-black text-xl mb-2">رؤى سريعة</h3>
                         <p className="text-gray-500 text-sm leading-relaxed max-w-xs font-medium">{analyticsData.periodCount > 0 ? `لقد حققت اليوم ${analyticsData.periodCount} طلباً بإجمالي مبيعات رائع. استمر في تقديم الأفضل!` : 'ابدأ باستقبال الطلبات لمشاهدة تحليل دقيق لأداء مطعمك هنا.'}</p>
                    </div>
                 </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings className="text-primary" /> {t.restaurantSettings}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 {/* Ordering Toggle */}
                 <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-700"><Smartphone size={20} /></div>
                        <div><h3 className="font-bold text-gray-800">{t.orderingPhone}</h3><p className="text-xs text-gray-500 mt-0.5">{t.orderingPhoneDesc}</p></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settingsForm.isOrderingEnabled !== false} onChange={e => handleSettingsChange('isOrderingEnabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                        <span className={`text-sm font-medium text-gray-900 ${language === 'ar' ? 'mr-3' : 'ml-3'}`}>{settingsForm.isOrderingEnabled !== false ? t.active : t.inactive}</span>
                    </label>
                </div>

                {/* Delivery Toggle (NEW) */}
                <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg border border-gray-200 text-gray-700"><Bike size={20} /></div>
                        <div><h3 className="font-bold text-gray-800">{t.deliveryService}</h3><p className="text-xs text-gray-500 mt-0.5">{t.deliveryServiceDesc}</p></div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={settingsForm.isDeliveryEnabled !== false} onChange={e => handleSettingsChange('isDeliveryEnabled', e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                        <span className={`text-sm font-medium text-gray-900 ${language === 'ar' ? 'mr-3' : 'ml-3'}`}>{settingsForm.isDeliveryEnabled !== false ? t.active : t.inactive}</span>
                    </label>
                </div>

                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.restaurantName}</label><input type="text" value={settingsForm.name} onChange={e => handleSettingsChange('name', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" /></div>
                 <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.restaurantLogo}</label>
                  <div className="flex gap-4 items-center">
                    <div className="w-16 h-16 rounded-full border bg-gray-50 flex-shrink-0 overflow-hidden"><img src={settingsForm.logo} alt="Logo" className="w-full h-full object-cover" /></div>
                    <div className="relative flex-1">
                         <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'logo')} disabled={isUploadingImage} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                         {isUploadingImage && <Loader2 className="animate-spin absolute top-2 left-0 text-primary" size={20} />}
                    </div>
                  </div>
                </div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">{t.restaurantDesc}</label><textarea value={settingsForm.description} onChange={e => handleSettingsChange('description', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none h-24" /></div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t.coverImage}</label>
                   <div className="flex gap-4 items-center">
                        <div className="w-24 h-14 rounded border bg-gray-50 flex-shrink-0 overflow-hidden"><img src={settingsForm.coverImage} alt="Cover" className="w-full h-full object-cover" /></div>
                         <div className="relative flex-1">
                             <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'cover')} disabled={isUploadingImage} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20" />
                             {isUploadingImage && <Loader2 className="animate-spin absolute top-2 left-0 text-primary" size={20} />}
                        </div>
                    </div>
                </div>
                <div><label className="block text-sm font-medium text-gray-700 mb-1">{t.currency}</label><input type="text" value={settingsForm.currency} onChange={e => handleSettingsChange('currency', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" /></div>
              </div>
              <div className="mb-8 p-6 bg-gray-50 rounded-2xl border border-gray-100">
                  <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18} /> {t.workingHours}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {daysOfWeek.map(day => (
                          <div key={day} className="bg-white p-3 rounded-xl border border-gray-200">
                              <div className="flex justify-between items-center mb-2">
                                  <span className="text-xs font-bold text-gray-700">{t[day]}</span>
                                  <label className="relative inline-flex items-center cursor-pointer">
                                      <input type="checkbox" checked={settingsForm.workingHours[day].isOpen} onChange={e => handleWorkingHoursChange(day, 'isOpen', e.target.checked)} className="sr-only peer" />
                                      <div className="w-7 h-4 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-500"></div>
                                  </label>
                              </div>
                              {settingsForm.workingHours[day].isOpen ? (
                                  <div className="flex gap-2 items-center">
                                      <input type="time" value={settingsForm.workingHours[day].start} onChange={e => handleWorkingHoursChange(day, 'start', e.target.value)} className="text-[10px] border rounded p-1 w-full" />
                                      <span className="text-gray-400 text-[10px]">-</span>
                                      <input type="time" value={settingsForm.workingHours[day].end} onChange={e => handleWorkingHoursChange(day, 'end', e.target.value)} className="text-[10px] border rounded p-1 w-full" />
                                  </div>
                              ) : <p className="text-[10px] text-red-400 font-bold text-center py-1">{t.closed}</p>}
                          </div>
                      ))}
                  </div>
              </div>
              <div className="mb-8">
                <h3 className="font-bold text-sm text-gray-500 mb-4 flex items-center gap-2 border-b pb-2 uppercase tracking-wider">{t.socialLinks}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"><Instagram size={20} className="text-pink-600" /><input type="text" placeholder="Instagram" value={settingsForm.socials.instagram} onChange={e => handleSocialChange('instagram', e.target.value)} className="bg-transparent text-sm w-full outline-none" /></div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"><Facebook size={20} className="text-blue-600" /><input type="text" placeholder="Facebook" value={settingsForm.socials.facebook} onChange={e => handleSocialChange('facebook', e.target.value)} className="bg-transparent text-sm w-full outline-none" /></div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"><Zap size={20} className="text-black" /><input type="text" placeholder="TikTok" value={settingsForm.socials.tiktok} onChange={e => handleSocialChange('tiktok', e.target.value)} className="bg-transparent text-sm w-full outline-none" /></div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100"><Phone size={20} className="text-green-600" /><input type="text" placeholder="WhatsApp" value={settingsForm.socials.whatsapp} onChange={e => handleSocialChange('whatsapp', e.target.value)} className="bg-transparent text-sm w-full outline-none" /></div>
                  <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-xl border border-gray-100 md:col-span-2"><MapPin size={20} className="text-red-600" /><input type="text" placeholder="Google Maps" value={settingsForm.socials.googleMaps} onChange={e => handleSocialChange('googleMaps', e.target.value)} className="bg-transparent text-sm w-full outline-none" /></div>
                </div>
              </div>
              <button onClick={saveSettings} disabled={isSaving} className="bg-primary text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}{isSaving ? t.saving : t.saveChanges}
              </button>
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex justify-between items-center">
                 <h2 className="text-2xl font-bold flex items-center gap-3"><Utensils className="text-primary" /> {t.menuManagement}</h2>
                 <button onClick={() => setEditingCategory({ id: 'local_' + Date.now(), name: '', isAvailable: true })} className="bg-black text-primary px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-900 transition-all shadow-lg active:scale-95"><Plus size={16} /> {t.newCategory}</button>
              </div>
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-50 overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-1 h-full bg-primary"></div>
                  <div className="flex justify-between items-center mb-6"><h3 className="font-bold flex items-center gap-2 text-gray-800"><Flame className="text-primary fill-primary" size={20}/> {t.homeOffers}</h3><button onClick={() => setEditingOffer({ id: 'local_' + Date.now(), title: '', price: 0, image: '', active: true })} className="text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-bold transition-all">{t.addOffer}</button></div>
                  <div className="flex gap-4 overflow-x-auto pb-4 no-scrollbar">
                      {config.offers.map(offer => (
                          <div key={offer.id} className={`w-48 shrink-0 bg-gray-50 rounded-xl overflow-hidden border-2 transition-all relative group ${offer.active ? 'border-gray-100' : 'border-gray-200 grayscale opacity-60'}`}>
                              <img src={offer.image} className="w-full h-24 object-cover" alt="" />
                              <div className="p-3"><h4 className="font-bold text-xs truncate mb-1">{offer.title}</h4><p className="text-primary font-black text-sm">{offer.price} {config.currency}</p></div>
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  <button onClick={() => setEditingOffer(offer)} className="p-2 bg-white text-black rounded-full hover:bg-primary hover:text-white transition-colors"><Edit2 size={14} /></button>
                                  <button onClick={(e) => handleToggleOfferStatus(e, offer)} className={`p-2 bg-white rounded-full transition-colors ${offer.active ? 'text-gray-400' : 'text-green-500'}`}>{offer.active ? <EyeOff size={14}/> : <Eye size={14}/>}</button>
                              </div>
                          </div>
                      ))}
                  </div>
              </section>
              <div className="space-y-6">
                {config.categories.map(cat => (
                  <div key={cat.id} className={`bg-white rounded-2xl shadow-sm border-2 overflow-hidden transition-all ${cat.isAvailable ? 'border-gray-50' : 'border-red-50 bg-red-50/10 opacity-75'}`}>
                    <div className="bg-gray-50 p-4 border-b flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        {cat.image && <img src={cat.image} className="w-10 h-10 rounded-lg object-cover shadow-sm" alt="" />}
                        <div><h3 className="font-black text-gray-800 flex items-center gap-2">{cat.name}{!cat.isAvailable && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">{t.hidden}</span>}</h3></div>
                      </div>
                      <div className="flex gap-2">
                         <button onClick={(e) => handleToggleCategoryAvailability(e, cat)} className={`p-2 rounded-lg transition-all ${cat.isAvailable ? 'bg-gray-100 text-gray-400 hover:text-red-500' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}>{cat.isAvailable ? <EyeOff size={16} /> : <Eye size={16} />}</button>
                         <button onClick={() => setEditingCategory(cat)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors"><Edit2 size={16} /></button>
                         <button onClick={(e) => handleDeleteCategory(e, cat.id)} className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {config.dishes.filter(d => d.categoryId === cat.id).map(dish => (
                        <div key={dish.id} className={`p-3 rounded-xl border flex gap-3 group relative transition-all ${dish.isAvailable ? 'bg-white border-gray-100 hover:border-primary' : 'bg-gray-50 border-gray-200 grayscale opacity-70'}`}>
                          <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 shadow-sm"><img src={dish.image} className="w-full h-full object-cover transition-transform group-hover:scale-110" alt="" /></div>
                          <div className="flex-1 min-w-0"><h4 className="font-bold text-sm truncate group-hover:text-primary transition-colors">{dish.name}</h4><p className="text-xs text-gray-400 line-clamp-1 mb-2">{dish.description}</p><span className="text-black font-black text-sm">{dish.price} {config.currency}</span></div>
                          <div className="absolute inset-0 bg-white/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2"><button onClick={() => setEditingDish(dish)} className="p-1.5 bg-black text-primary rounded-lg shadow-lg hover:scale-110 transition-transform"><Edit2 size={14} /></button><button onClick={(e) => handleToggleDishAvailability(e, dish)} className={`p-1.5 bg-white rounded-lg shadow-md hover:scale-110 transition-transform ${dish.isAvailable ? 'text-gray-400' : 'text-green-600'}`}>{dish.isAvailable ? <EyeOff size={14} /> : <Eye size={14} />}</button></div>
                        </div>
                      ))}
                      <button onClick={() => setEditingDish({ id: 'local_' + Date.now(), categoryId: cat.id, name: '', description: '', price: 0, image: '', prepTime: 15, isAvailable: true })} className="border-2 border-dashed border-gray-100 rounded-xl p-3 flex flex-col items-center justify-center gap-2 hover:border-primary hover:bg-gray-50 transition-all text-gray-400 hover:text-primary"><Plus size={24} /><span className="text-[10px] font-bold">{t.addDish}</span></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {editingOffer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-xl font-black">{t.addEditOffer}</h3><button onClick={() => setEditingOffer(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.offerTitle}</label><input type="text" value={editingOffer.title} onChange={e => setEditingOffer({ ...editingOffer, title: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div>
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.newPrice}</label><input type="number" value={editingOffer.price} onChange={e => setEditingOffer({ ...editingOffer, price: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.oldPrice}</label><input type="number" value={editingOffer.originalPrice || 0} onChange={e => setEditingOffer({ ...editingOffer, originalPrice: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.offerImage}</label><div className="flex gap-4 items-center"><div className="w-20 h-20 rounded-xl border bg-gray-50 flex-shrink-0 overflow-hidden"><img src={editingOffer.image} className="w-full h-full object-cover" alt="" /></div><div className="relative flex-1"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'offer')} className="w-full text-xs" />{isUploadingImage && <Loader2 className="animate-spin absolute top-2 left-0 text-primary" size={20} />}</div></div></div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3"><button onClick={() => saveOffer(editingOffer)} disabled={isSaving} className="flex-1 bg-black text-primary font-black py-3 rounded-xl shadow-lg disabled:opacity-50">{isSaving ? t.saving : t.saveOffer}</button><button onClick={() => handleDeleteOffer(editingOffer.id)} disabled={isSaving} className="px-4 bg-red-50 text-red-500 rounded-xl font-bold hover:bg-red-100 transition-colors"><Trash2 size={20} /></button></div>
          </div>
        </div>
      )}

      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-xl font-black">{t.addEditCategory}</h3><button onClick={() => setEditingCategory(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.catName}</label><input type="text" value={editingCategory.name} onChange={e => setEditingCategory({ ...editingCategory, name: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.catImage}</label><div className="flex gap-4 items-center"><div className="w-16 h-16 rounded-xl border bg-gray-50 flex-shrink-0 overflow-hidden">{editingCategory.image && <img src={editingCategory.image} className="w-full h-full object-cover" alt="" />}</div><div className="relative flex-1"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} className="w-full text-xs" />{isUploadingImage && <Loader2 className="animate-spin absolute top-2 left-0 text-primary" size={20} />}</div></div></div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3"><button onClick={() => saveCategory(editingCategory)} disabled={isSaving} className="flex-1 bg-black text-primary font-black py-3 rounded-xl shadow-lg disabled:opacity-50">{isSaving ? t.saving : t.saveChanges}</button></div>
          </div>
        </div>
      )}

      {editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="p-6 border-b flex justify-between items-center bg-gray-50"><h3 className="text-xl font-black">{t.dishDetails}</h3><button onClick={() => setEditingDish(null)} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X size={20} /></button></div>
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.dishName}</label><input type="text" value={editingDish.name} onChange={e => setEditingDish({ ...editingDish, name: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.selectCat}</label><select value={editingDish.categoryId} onChange={e => setEditingDish({ ...editingDish, categoryId: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm bg-white outline-none">{config.categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div></div>
              <div className="grid grid-cols-3 gap-4"><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.price}</label><input type="number" value={editingDish.price} onChange={e => setEditingDish({ ...editingDish, price: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.prepTime}</label><input type="number" value={editingDish.prepTime} onChange={e => setEditingDish({ ...editingDish, prepTime: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div><div><label className="block text-sm font-bold text-gray-700 mb-1">{t.calories}</label><input type="number" value={editingDish.calories || 0} onChange={e => setEditingDish({ ...editingDish, calories: Number(e.target.value) })} className="w-full border rounded-xl px-3 py-2 text-sm outline-none" /></div></div>
              <div><div className="flex justify-between items-center mb-1"><label className="block text-sm font-bold text-gray-700">{t.restaurantDesc}</label><button onClick={handleAiDescription} disabled={isGeneratingAi} className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded flex items-center gap-1 hover:bg-primary/20 font-bold transition-all disabled:opacity-50">{isGeneratingAi ? <Loader2 className="animate-spin" size={12}/> : <Wand2 size={12}/>}{isGeneratingAi ? t.generating : t.aiWrite}</button></div><textarea value={editingDish.description} onChange={e => setEditingDish({ ...editingDish, description: e.target.value })} className="w-full border rounded-xl px-3 py-2 text-sm h-20 outline-none resize-none" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">{t.dishImage}</label><div className="relative h-40 rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 group">{editingDish.image ? <><img src={editingDish.image} className="w-full h-full object-cover" alt="" /><div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white"><label className="cursor-pointer bg-white text-black px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all"><ImageIcon size={14}/> {t.changeImage}<input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'dish')} /></label></div></> : <label className="cursor-pointer flex flex-col items-center justify-center h-full text-gray-400 hover:text-primary transition-colors"><Plus size={32} /><span className="text-xs font-bold">{t.clickUpload}</span><input type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'dish')} /></label>}{isUploadingImage && <div className="absolute inset-0 bg-white/60 flex items-center justify-center"><Loader2 className="animate-spin text-primary" size={24}/></div>}</div></div>
            </div>
            <div className="p-6 bg-gray-50 border-t flex gap-3"><button onClick={() => setEditingDish(null)} className="flex-1 py-3 text-gray-500 font-bold hover:bg-gray-200 rounded-xl">إلغاء</button><button onClick={() => saveDish(editingDish)} disabled={isSaving} className="flex-[2] bg-black text-primary font-black py-3 rounded-xl disabled:opacity-50">{isSaving ? t.saving : t.saveDish}</button>{!editingDish.id.startsWith('local_') && <button onClick={() => handleDeleteDish(editingDish.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 shadow-sm"><Trash2 size={20}/></button>}</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;