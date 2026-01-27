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
  Eye, EyeOff, Languages, ShoppingBag, Target, ChevronDown, Clock, Printer, Bike, MapPin, Phone
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
  
  // Print State
  const [autoPrint, setAutoPrint] = useState(() => localStorage.getItem('autoPrint') === 'true');
  const processedOrdersRef = useRef<Set<number>>(new Set());

  // Language State
  const [language, setLanguage] = useState<Language>('ar');
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  const [analyticsRange, setAnalyticsRange] = useState<TimeRange>('today');
  const [customDate, setCustomDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  const [settingsForm, setSettingsForm] = useState(initialConfig);
  
  // Translation helper
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  // Handle Language/Direction Change
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

  // Handle Auto Print Toggle Persistence
  useEffect(() => {
    localStorage.setItem('autoPrint', String(autoPrint));
  }, [autoPrint]);

  const playNotificationSound = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(err => console.log("Audio play failed:", err));
    }
  };

  // --- PRINT FUNCTIONALITY ---
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
            
            ${!isDelivery ? 
                `<div style="font-size: 16px; font-weight: bold; margin-top: 5px;">طاولة: ${order.table_number}</div>` : 
                `<div style="font-size: 16px; font-weight: bold; margin-top: 5px;">🛵 طلب توصيل</div>`
            }
            <div>العميل: ${order.customer_name}</div>
            
            ${order.verification_code ? `<div class="verify-code">كود: ${order.verification_code}</div>` : ''}
          </div>
        </div>

        ${isDelivery ? `
            <div class="delivery-box">
                <div>📞 ${order.phone || 'غير متوفر'}</div>
                <div>📍 ${order.address || 'غير متوفر'}</div>
            </div>
        ` : ''}

        <table class="items">
          <thead>
            <tr>
              <th>الكمية</th>
              <th>الصنف</th>
              <th>السعر</th>
            </tr>
          </thead>
          <tbody>
            ${order.items.map(item => `
              <tr>
                <td style="width: 15%;">${item.quantity}x</td>
                <td>${item.dish.name}</td>
                <td style="width: 25%;">${item.dish.price * item.quantity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          <span>المجموع:</span>
          <span>${order.total} ${config.currency}</span>
        </div>

        <div class="footer">
          <p>شكراً لزيارتكم!</p>
        </div>

        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
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
        
        // Initial load: mark all existing as processed so we don't auto-print old orders
        if (processedOrdersRef.current.size === 0 && data.length > 0) {
            data.forEach(o => o.id && processedOrdersRef.current.add(o.id));
        }

        // Logic for Notification and Auto-Print
        if (data.length > previousOrderCountRef.current && previousOrderCountRef.current !== 0) {
            playNotificationSound();
            
            // Check for NEW orders specifically
            const newOrders = data.filter(o => o.id && !processedOrdersRef.current.has(o.id));
            
            if (newOrders.length > 0) {
                // Add to processed set
                newOrders.forEach(o => o.id && processedOrdersRef.current.add(o.id));

                // Auto Print Logic
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
          workingHours: {
              ...prev.workingHours,
              [day]: {
                  ...prev.workingHours[day],
                  [field]: value
              }
          }
      }));
  };

  const handleSocialChange = (field: keyof RestaurantConfig['socials'], value: string) => {
    setSettingsForm(prev => ({ ...prev, socials: { ...prev.socials, [field]: value } }));
  };

  // --- NEW DELETE FUNCTION (Edge Function) ---
  const handleDelete = async (tableName: string, recordId: string) => {
    if (recordId.startsWith('local_')) return true;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        alert("يجب تسجيل الدخول أولاً");
        return false;
    }

    try {
      const { data, error } = await supabase.functions.invoke('delete-manager', {
        body: { 
          table: tableName, 
          id: recordId, 
          userId: user.id 
        }
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

  // --- ANALYTICS LOGIC ---
  const analyticsData = useMemo(() => {
    // Filter only completed orders for revenue calc
    const completedOrders = orders.filter(o => o.status === 'completed');
    
    // Normalize dates for comparison (ignoring time)
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    
    const now = new Date();
    const todayStart = normalizeDate(now);

    const filteredOrders = completedOrders.filter(o => {
        if (!o.created_at) return false;
        const orderDate = new Date(o.created_at);
        const orderTime = normalizeDate(orderDate);

        if (analyticsRange === 'today') {
            return orderTime === todayStart;
        } else if (analyticsRange === 'week') {
            const weekAgo = new Date(now);
            weekAgo.setDate(now.getDate() - 7);
            return orderTime >= normalizeDate(weekAgo);
        } else if (analyticsRange === 'month') {
            const monthAgo = new Date(now);
            monthAgo.setDate(now.getDate() - 30);
            return orderTime >= normalizeDate(monthAgo);
        } else if (analyticsRange === 'custom') {
            const selected = new Date(customDate);
            return orderTime === normalizeDate(selected);
        }
        return true;
    });

    const periodRevenue = filteredOrders.reduce((sum, o) => sum + Number(o.total), 0);
    const periodCount = filteredOrders.length;
    const averageOrderValue = periodCount > 0 ? periodRevenue / periodCount : 0;

    // Best Sellers Logic
    const dishCounts: Record<string, number> = {};
    filteredOrders.forEach(o => {
        o.items.forEach(item => {
            dishCounts[item.dish.name] = (dishCounts[item.dish.name] || 0) + item.quantity;
        });
    });

    const bestSellers = Object.entries(dishCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

    // Find max sold count for progress bar scaling
    const maxSoldCount = bestSellers.length > 0 ? bestSellers[0].count : 0;

    return { 
        periodRevenue, 
        periodCount, 
        averageOrderValue,
        bestSellers,
        maxSoldCount 
    };
  }, [orders, analyticsRange, customDate]);


  // --- SAVE SETTINGS ---
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

  // --- OFFERS ---
  const saveOffer = async (offer: Offer) => {
    setIsSaving(true);
    try {
        const newOffers = config.offers.some(o => o.id === offer.id)
            ? config.offers.map(o => o.id === offer.id ? offer : o)
            : [...config.offers, offer];
        
        const newConfig = { ...config, offers: newOffers };
        await onUpdate(newConfig);
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
            const newConfig = { ...config, offers: newOffers };
            
            await onUpdate(newConfig);
            await refreshData();
            
            setEditingOffer(null);
            alert('تم حذف العرض بنجاح');
        } catch (e) {
            console.error("Error deleting offer:", e);
            alert('حدث خطأ أثناء حذف العرض');
        } finally {
            setIsSaving(false);
        }
    }
  };
  
   const handleToggleOfferStatus = async (e: React.MouseEvent, offer: Offer) => {
      e.preventDefault();
      e.stopPropagation();

      setIsSaving(true);
      try {
          const updatedOffer = { ...offer, active: !offer.active };
          setConfig(prev => ({
              ...prev,
              offers: prev.offers.map(o => o.id === offer.id ? updatedOffer : o)
          }));
          
          await onUpdate({
              ...config,
              offers: config.offers.map(o => o.id === offer.id ? updatedOffer : o)
          });
      } catch(e: any) {
          console.error("Error toggling offer:", e);
          alert('حدث خطأ أثناء التحديث');
          await refreshData();
      } finally {
          setIsSaving(false);
      }
  };

  // --- CATEGORIES ---
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
    
    const previousConfig = { ...config };
    setConfig(prev => ({
        ...prev,
        categories: prev.categories.map(c => c.id === cat.id ? { ...c, isAvailable: !c.isAvailable } : c)
    }));

    try {
        await updateCategoryInSupabase({ ...cat, isAvailable: !cat.isAvailable });
    } catch (e: any) {
        console.error("Toggle category failed:", e);
        setConfig(previousConfig); 
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
        if (success) {
            setConfig(prev => ({
                ...prev,
                categories: prev.categories.filter(c => c.id !== id),
                dishes: prev.dishes.filter(d => d.categoryId !== id)
            }));
        }
        setIsSaving(false);
    }
  };

  // --- DISHES ---
  const saveDish = async (dish: Dish) => {
    if (!dish.categoryId) {
        alert("يجب اختيار قسم للطبق");
        return;
    }
    setIsSaving(true);
    try {
      const existingDish = config.dishes.find(d => d.id === dish.id);
      if (existingDish) {
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
    const previousDishes = [...config.dishes];
    setConfig(prev => ({
      ...prev,
      dishes: prev.dishes.map(d => d.id === dish.id ? { ...d, isAvailable: !d.isAvailable } : d)
    }));

    try {
      await updateDishInSupabase({ ...dish, isAvailable: !dish.isAvailable });
    } catch (error: any) {
      console.error("[Toggle Dish] Error:", error);
      setConfig(prev => ({ ...prev, dishes: previousDishes })); 
      alert(`فشل التحديث: ${error.message || 'خطأ غير معروف'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteDish = async (dishId: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الطبق نهائياً؟')) {
         setIsSaving(true);
         const success = await handleDelete('items', dishId); 
         if (success) {
             setConfig(prev => ({
                 ...prev,
                 dishes: prev.dishes.filter(d => d.id !== dishId)
             }));
             setEditingDish(null);
         }
         setIsSaving(false);
    }
  };

  const handleAiDescription = async () => {
    if (!editingDish || !editingDish.name) {
        alert("يرجى كتابة اسم الطبق أولاً");
        return;
    }
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
        if (type === 'category' && editingCategory) {
          setEditingCategory({ ...editingCategory, image: url });
        } else if (type === 'dish' && editingDish) {
          setEditingDish({ ...editingDish, image: url });
        } else if (type === 'offer' && editingOffer) {
            setEditingOffer({ ...editingOffer, image: url });
        } else if (type === 'logo') {
           handleSettingsChange('logo', url);
        } else if (type === 'cover') {
           handleSettingsChange('coverImage', url);
        }
      }
    } finally {
      setIsUploadingImage(false);
    }
  };
  
  // Working Hours Display Logic
  const daysOfWeek: Array<keyof WorkingHours> = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <div className="p-6 border-b border-gray-100 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-black flex items-center justify-center text-primary mb-3">
             <Utensils size={32} />
          </div>
          <h2 className="font-black text-lg text-gray-800">{t.dashboard}</h2>
          <p className="text-xs text-gray-400">{t.manageMenu}</p>
          
          <div className="relative mt-4 w-full">
             <button
                onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                className="w-full bg-gray-50 text-gray-800 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors flex items-center justify-between text-xs font-bold border border-gray-200"
            >
                <div className="flex items-center gap-2">
                    <span>{language === 'ar' ? '🇸🇦' : '🇫🇷'}</span>
                    <span>{language === 'ar' ? 'العربية' : 'Français'}</span>
                </div>
                <ChevronDown size={14} className="text-gray-400" />
            </button>

            {isLangMenuOpen && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2">
                    <button 
                        onClick={() => selectLanguage('ar')}
                        className={`w-full text-right px-4 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 ${language === 'ar' ? 'font-bold text-black bg-primary/20' : 'text-gray-600'}`}
                    >
                        <span>🇸🇦</span> العربية
                    </button>
                    <button 
                        onClick={() => selectLanguage('fr')}
                        className={`w-full text-right px-4 py-2 text-xs flex items-center gap-2 hover:bg-gray-50 ${language === 'fr' ? 'font-bold text-black bg-primary/20' : 'text-gray-600'}`}
                    >
                        <span>🇫🇷</span> Français
                    </button>
                </div>
            )}
        </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => navigate('/select')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-gray-700 bg-gray-100 border border-gray-200 hover:bg-gray-200 mb-6 font-bold"
          >
            <ArrowRight size={20} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} />
            <span>{t.backToSelect}</span>
          </button>

          <button onClick={() => setActiveTab('orders')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'orders' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <ClipboardList size={20} />
            <span>{t.orders}</span>
          </button>

          <button onClick={() => setActiveTab('analytics')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'analytics' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <BarChart3 size={20} />
            <span>{t.analytics}</span>
          </button>

          <button onClick={() => setActiveTab('menu')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'menu' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Utensils size={20} />
            <span>{t.menu}</span>
          </button>
          
          <button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? 'bg-primary text-black font-bold shadow-md' : 'text-gray-600 hover:bg-gray-50'}`}>
            <Settings size={20} />
            <span>{t.settings}</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-100">
           <button onClick={() => navigate('/select')} className="w-full flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors">
             <LogOut size={18} />
             <span>{t.logout}</span>
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header */}
        <div className="md:hidden bg-white p-4 flex justify-between items-center shadow-sm">
             <div className="flex items-center gap-2">
                 <button onClick={() => navigate('/select')} className="p-2 bg-gray-100 rounded-lg text-gray-700"><ArrowRight size={20} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} /></button>
                 <h1 className="font-bold">{t.dashboard}</h1>
             </div>
             <div className="flex items-center gap-2">
                <button onClick={() => setIsLangMenuOpen(!isLangMenuOpen)} className="p-2 bg-gray-100 rounded-full relative">
                    <Languages size={20} />
                    {isLangMenuOpen && (
                         <div className="absolute top-full left-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden z-50 w-32">
                            <button onClick={() => selectLanguage('ar')} className="block w-full text-right px-4 py-2 text-xs hover:bg-gray-50">العربية</button>
                            <button onClick={() => selectLanguage('fr')} className="block w-full text-right px-4 py-2 text-xs hover:bg-gray-50">Français</button>
                        </div>
                    )}
                </button>
                <button onClick={() => navigate('/select')}><LogOut size={20} className="text-red-500" /></button>
             </div>
        </div>
        
        {/* Mobile Tabs */}
        <div className="md:hidden flex bg-white border-b border-gray-200 overflow-x-auto no-scrollbar">
             <button onClick={() => setActiveTab('orders')} className={`flex-1 min-w-[80px] py-3 text-center text-sm font-medium ${activeTab === 'orders' ? 'text-black border-b-2 border-primary font-bold' : 'text-gray-500'}`}>{t.orders}</button>
             <button onClick={() => setActiveTab('analytics')} className={`flex-1 min-w-[80px] py-3 text-center text-sm font-medium ${activeTab === 'analytics' ? 'text-black border-b-2 border-primary font-bold' : 'text-gray-500'}`}>{t.analytics}</button>
             <button onClick={() => setActiveTab('menu')} className={`flex-1 min-w-[80px] py-3 text-center text-sm font-medium ${activeTab === 'menu' ? 'text-black border-b-2 border-primary font-bold' : 'text-gray-500'}`}>{t.menu}</button>
             <button onClick={() => setActiveTab('settings')} className={`flex-1 min-w-[80px] py-3 text-center text-sm font-medium ${activeTab === 'settings' ? 'text-black border-b-2 border-primary font-bold' : 'text-gray-500'}`}>{t.settings}</button>
        </div>

        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          
          {/* ... (Previous Tabs Content: Analytics, Orders) ... */}
          {activeTab === 'analytics' && (
             <div className="animate-in fade-in space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <BarChart3 className="text-primary" /> 
                        {t.analytics}
                    </h2>
                    
                    {/* Date Range Controls */}
                    <div className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm w-full md:w-auto overflow-x-auto no-scrollbar">
                        <button onClick={() => setAnalyticsRange('today')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${analyticsRange === 'today' ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>{t.today}</button>
                        <button onClick={() => setAnalyticsRange('week')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${analyticsRange === 'week' ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>{t.week}</button>
                        <button onClick={() => setAnalyticsRange('month')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${analyticsRange === 'month' ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>{t.month}</button>
                        <button onClick={() => setAnalyticsRange('custom')} className={`px-4 py-1.5 rounded-md text-sm font-bold transition-all whitespace-nowrap ${analyticsRange === 'custom' ? 'bg-black text-white shadow' : 'text-gray-500 hover:text-gray-900'}`}>{t.custom}</button>
                    </div>
                </div>

                {analyticsRange === 'custom' && (
                    <div className="flex justify-end animate-in slide-in-from-top-2">
                        <input 
                            type="date" 
                            value={customDate} 
                            onChange={(e) => setCustomDate(e.target.value)} 
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 outline-none bg-white"
                        />
                    </div>
                )}

                {/* Stat Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                            <DollarSign size={28} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t.totalRevenue}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{analyticsData.periodRevenue} <span className="text-sm font-normal text-gray-400">{config.currency}</span></h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                            <ShoppingBag size={28} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t.totalOrders}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{analyticsData.periodCount}</h3>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4 hover:shadow-md transition-all">
                        <div className="w-14 h-14 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                            <Target size={28} />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium">{t.averageOrder}</p>
                            <h3 className="text-2xl font-black text-gray-900 mt-1">{analyticsData.averageOrderValue.toFixed(1)} <span className="text-sm font-normal text-gray-400">{config.currency}</span></h3>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Best Sellers */}
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                            <TrendingUp className="text-primary" /> {t.bestSellers}
                        </h3>
                        {analyticsData.bestSellers.length === 0 ? (
                            <div className="text-center py-8 text-gray-400 text-sm">{t.noOrders}</div>
                        ) : (
                            <div className="space-y-5">
                                {analyticsData.bestSellers.map((item, idx) => (
                                    <div key={idx} className="relative">
                                        <div className="flex justify-between items-center mb-1.5 text-sm font-medium">
                                            <span>{item.name}</span>
                                            <span className="text-gray-500">{item.count}</span>
                                        </div>
                                        <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <div 
                                                className="h-full bg-primary rounded-full transition-all duration-1000" 
                                                style={{ width: `${(item.count / analyticsData.maxSoldCount) * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    
                    {/* Placeholder for future charts or more stats */}
                    <div className="bg-gradient-to-br from-black to-gray-800 p-6 rounded-2xl shadow-sm border border-gray-700 text-white flex flex-col justify-center items-center text-center">
                        <BarChart3 size={48} className="text-primary mb-4" />
                        <h3 className="font-bold text-xl">مزيد من التحليلات قريباً</h3>
                        <p className="text-gray-400 text-sm mt-2 max-w-xs">نعمل على إضافة رسوم بيانية تفصيلية لمساعدتك في فهم سلوك الزبائن.</p>
                    </div>
                </div>
             </div>
          )}

          {activeTab === 'orders' && (
             <div className="animate-in fade-in space-y-6">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Bell className={orders.some(o => o.status === 'pending') ? "text-primary animate-bounce" : "text-gray-400"} /> 
                        {t.receivedOrders}
                    </h2>
                    
                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
                             <input 
                                type="checkbox" 
                                checked={autoPrint} 
                                onChange={e => setAutoPrint(e.target.checked)}
                                className="w-4 h-4 text-primary rounded"
                             />
                             <div className="flex items-center gap-1.5">
                                 <Printer size={16} className={autoPrint ? 'text-primary' : 'text-gray-400'} />
                                 <span className="text-sm font-medium">طباعة تلقائية</span>
                             </div>
                        </label>
                        <button onClick={() => fetchOrders(false)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-primary">
                            <RefreshCcw size={16} /> {t.update}
                        </button>
                    </div>
                </div>

                {loadingOrders ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="animate-spin text-primary" size={32} />
                    </div>
                ) : orders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
                        <ClipboardList className="mx-auto text-gray-300 mb-2" size={48} />
                        <p className="text-gray-500">{t.noOrders}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {orders.map(order => (
                            <div key={order.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                                <div className={`p-4 border-b flex justify-between items-start ${order.status === 'completed' ? 'bg-gray-50' : 'bg-white'}`}>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            {order.type === 'delivery' ? (
                                                 <span className="font-bold text-lg text-blue-600 flex items-center gap-1"><Bike size={18}/> توصيل</span>
                                            ) : (
                                                 <span className="font-bold text-lg">{t.table} {order.table_number}</span>
                                            )}
                                            
                                            {order.status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full font-bold animate-pulse">{t.new}</span>}
                                            {order.status === 'preparing' && <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full font-bold">{t.preparing}</span>}
                                            {order.status === 'completed' && <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">{t.completed}</span>}
                                        </div>
                                        <p className="text-sm text-gray-500 font-bold">{order.customer_name}</p>
                                        
                                        {/* Display Address if Delivery */}
                                        {order.type === 'delivery' && (
                                            <div className="mt-2 text-xs bg-blue-50 p-2 rounded border border-blue-100 text-gray-700">
                                                <div className="flex items-center gap-1 mb-1"><Phone size={12}/> {order.phone}</div>
                                                <div className="flex items-start gap-1"><MapPin size={12} className="shrink-0 mt-0.5"/> {order.address}</div>
                                            </div>
                                        )}
                                        {/* Display Code if Dine-in */}
                                        {order.type === 'dine_in' && order.verification_code && (
                                            <div className="mt-2 inline-flex items-center gap-1.5 text-xs bg-gray-100 px-2 py-1 rounded border border-gray-200 font-bold text-gray-700">
                                                {/* Verification code display logic kept for existing orders but no new codes will be generated */}
                                                كود: {order.verification_code}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-end gap-1">
                                        <span className="text-xs text-gray-400 font-mono">
                                            {order.created_at ? new Date(order.created_at).toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', {hour: '2-digit', minute:'2-digit'}) : ''}
                                        </span>
                                        <button 
                                            onClick={() => printOrderReceipt(order)}
                                            className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-full transition-colors"
                                            title="طباعة الفاتورة"
                                        >
                                            <Printer size={16} />
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 flex-1 space-y-3">
                                    {order.items.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center text-sm">
                                            <div className="flex items-center gap-2">
                                                <span className="bg-gray-100 w-6 h-6 flex items-center justify-center rounded text-xs font-bold">{item.quantity}x</span>
                                                <span className="text-gray-700">{item.dish.name}</span>
                                            </div>
                                            <span className="text-gray-500">{item.dish.price * item.quantity}</span>
                                        </div>
                                    ))}
                                    <div className="border-t pt-3 mt-2 flex justify-between items-center font-bold">
                                        <span>{t.total}</span>
                                        <span className="text-primary text-lg">{order.total} {config.currency}</span>
                                    </div>
                                </div>
                                <div className="p-3 bg-gray-50 flex gap-2">
                                    {order.status === 'pending' && <button onClick={() => handleStatusUpdate(order.id!, 'preparing')} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700">{t.startPrep}</button>}
                                    {order.status === 'preparing' && <button onClick={() => handleStatusUpdate(order.id!, 'completed')} className="flex-1 bg-green-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-green-700">{t.complete}</button>}
                                    {order.status !== 'completed' && <button onClick={() => handleStatusUpdate(order.id!, 'cancelled')} className="px-3 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium">{t.cancel}</button>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8 animate-in fade-in">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Settings className="text-primary" /> {t.restaurantSettings}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                 <div className="md:col-span-2 bg-gray-50 p-4 rounded-xl border border-gray-200 flex justify-between items-center mb-4">
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
              
              {/* Working Hours Section */}
              <h3 className="font-bold text-lg mb-4 text-gray-800 flex items-center gap-2"><Clock size={20} /> {t.workingHours}</h3>
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 mb-8 space-y-4">
                  {daysOfWeek.map((day) => (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200 last:border-0 last:pb-0">
                          <div className="flex items-center justify-between w-full sm:w-1/3">
                              <span className="font-bold text-gray-700">{t[day]}</span>
                              <label className="relative inline-flex items-center cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={settingsForm.workingHours[day].isOpen} 
                                    onChange={e => handleWorkingHoursChange(day, 'isOpen', e.target.checked)} 
                                    className="sr-only peer" 
                                  />
                                  <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
                                  <span className="text-xs font-bold text-gray-500 mr-2 peer-checked:text-primary">
                                    {settingsForm.workingHours[day].isOpen ? t.available : t.closed}
                                  </span>
                              </label>
                          </div>
                          
                          {settingsForm.workingHours[day].isOpen ? (
                              <div className="flex items-center gap-2 w-full sm:w-2/3">
                                  <input 
                                    type="time" 
                                    value={settingsForm.workingHours[day].start} 
                                    onChange={e => handleWorkingHoursChange(day, 'start', e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none" 
                                  />
                                  <span className="text-gray-400">-</span>
                                  <input 
                                    type="time" 
                                    value={settingsForm.workingHours[day].end} 
                                    onChange={e => handleWorkingHoursChange(day, 'end', e.target.value)}
                                    className="flex-1 border rounded-lg px-3 py-1.5 text-sm bg-white focus:ring-2 focus:ring-primary/20 outline-none" 
                                  />
                              </div>
                          ) : (
                              <div className="w-full sm:w-2/3 bg-gray-200/50 rounded-lg py-1.5 text-center text-sm text-gray-400 font-medium">
                                  {t.closed}
                              </div>
                          )}
                      </div>
                  ))}
              </div>

              <h3 className="font-bold text-lg mb-4 text-gray-800">{t.socialLinks}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                 <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Smartphone size={16} /> WhatsApp</label><input type="text" value={settingsForm.socials.whatsapp || ''} onChange={e => handleSocialChange('whatsapp', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" dir="ltr" /></div>
                <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Instagram size={16} /> Instagram (User)</label><input type="text" value={settingsForm.socials.instagram || ''} onChange={e => handleSocialChange('instagram', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" dir="ltr" /></div>
                <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1"><Facebook size={16} /> Facebook (User/ID)</label><input type="text" value={settingsForm.socials.facebook || ''} onChange={e => handleSocialChange('facebook', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" dir="ltr" placeholder="ex: restaurant.page" /></div>
                <div><label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">TikTok (User)</label><input type="text" value={settingsForm.socials.tiktok || ''} onChange={e => handleSocialChange('tiktok', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" dir="ltr" placeholder="@user" /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">Google Maps (URL)</label><input type="text" value={settingsForm.socials.googleMaps || ''} onChange={e => handleSocialChange('googleMaps', e.target.value)} className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary/20 outline-none" dir="ltr" /></div>
              </div>
              <button onClick={saveSettings} disabled={isSaving} className="bg-primary text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? t.saving : t.saveChanges}
              </button>
            </div>
          )}
          
          {/* ... (Menu Tab remains unchanged) ... */}
          {activeTab === 'menu' && (
            <div className="animate-in fade-in">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold flex items-center gap-2"><Utensils className="text-primary" /> {t.menuManagement}</h2>
                <button onClick={() => setEditingCategory({ id: Date.now().toString(), name: '', image: '', isAvailable: true })} className="bg-gray-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2"><Plus size={16} /> {t.newCategory}</button>
              </div>

               {/* OFFERS */}
               <div className="mb-10">
                   <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800"><Zap className="text-yellow-500 fill-yellow-500" size={20} /> {t.homeOffers}</h3>
                        <button onClick={() => setEditingOffer({ id: Date.now().toString(), title: '', image: '', price: 0, active: true })} className="text-black bg-primary/20 hover:bg-primary/30 px-3 py-1.5 rounded-lg text-sm font-bold flex items-center gap-1"><Plus size={14} /> {t.addOffer}</button>
                   </div>
                   {config.offers.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                           {config.offers.map(offer => (
                               <div key={offer.id} className={`relative group bg-white border rounded-xl overflow-hidden shadow-sm transition-all ${!offer.active ? 'opacity-60 border-gray-200' : 'border-primary/50'}`}>
                                    <div className="h-32 w-full bg-gray-100 relative">
                                        <img src={offer.image} className="w-full h-full object-cover grayscale-0 transition-all group-hover:grayscale-0" alt="" />
                                        <div className="absolute top-2 left-2 bg-black/70 text-primary px-2 py-0.5 rounded text-xs font-bold">{offer.price} {config.currency}</div>
                                        {/* Show Original Price if exists */}
                                        {offer.originalPrice && offer.originalPrice > offer.price && (
                                            <div className="absolute top-2 right-2 bg-red-600 text-white px-2 py-0.5 rounded text-xs font-bold line-through">{offer.originalPrice} {config.currency}</div>
                                        )}
                                        {!offer.active && (
                                            <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
                                                <span className="bg-gray-800 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1"><EyeOff size={12} /> {t.hidden}</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="p-3">
                                        <h4 className="font-bold text-gray-800">{offer.title}</h4>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setEditingOffer(offer)} className="flex-1 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-bold hover:bg-gray-200">{t.edit}</button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleToggleOfferStatus(e, offer)} 
                                                className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1 z-10 relative cursor-pointer transition-colors ${offer.active ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                            >
                                                {offer.active ? <><Eye size={14} /> {t.active}</> : <><EyeOff size={14} /> {t.hidden}</>}
                                            </button>
                                        </div>
                                    </div>
                               </div>
                           ))}
                       </div>
                   ) : (
                       <div className="text-center py-6 bg-gray-50 border border-dashed border-gray-200 rounded-xl text-gray-500 text-sm">{t.noOffers}</div>
                   )}
               </div>

              <div className="border-t border-gray-100 my-8"></div>

              {/* Categories */}
              <div className="space-y-8">
                {config.categories.length === 0 ? (
                    <div className="text-center py-10 bg-white border rounded-xl"><p className="text-gray-500">لا توجد أقسام حتى الآن. أضف قسماً لتبدأ بإضافة الأطباق.</p></div>
                ) : config.categories.map(cat => (
                  <div key={cat.id} className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all ${!cat.isAvailable ? 'opacity-70 bg-gray-50' : ''}`}>
                    <div className="bg-gray-50 p-4 flex justify-between items-center border-b border-gray-100">
                        <div className="flex items-center gap-3">
                            {cat.image && <img src={cat.image} className={`w-10 h-10 rounded-full object-cover border border-gray-200 ${!cat.isAvailable ? 'grayscale' : ''}`} alt="" />}
                            <h3 className="font-bold text-lg flex items-center gap-2">
                                {cat.name}
                                {!cat.isAvailable && <span className="bg-gray-200 text-gray-600 text-[10px] px-2 py-0.5 rounded-full">{t.hidden}</span>}
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                             <button 
                                type="button"
                                onClick={(e) => handleToggleCategoryAvailability(e, cat)} 
                                className={`p-2 rounded-lg z-10 relative cursor-pointer transition-colors ${cat.isAvailable ? 'text-green-600 hover:bg-green-50' : 'text-gray-500 bg-gray-200 hover:bg-gray-300'}`}
                                title={cat.isAvailable ? t.hideSection : t.showSection}
                            >
                                {cat.isAvailable ? <Eye size={18} /> : <EyeOff size={18} />}
                            </button>
                            <button onClick={() => setEditingCategory(cat)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"><Edit2 size={18} /></button>
                        </div>
                    </div>
                    
                    {cat.isAvailable && (
                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {config.dishes.filter(d => d.categoryId === cat.id).map(dish => (
                                <div key={dish.id} className={`border rounded-lg p-3 flex gap-3 relative group transition-all ${!dish.isAvailable ? 'bg-gray-50 border-gray-200 opacity-75' : 'bg-white border-gray-100'}`}>
                                    <div className="relative w-20 h-20 shrink-0">
                                        <img src={dish.image} className="w-full h-full rounded-lg object-cover bg-gray-100" alt="" />
                                        {!dish.isAvailable && (
                                            <div className="absolute inset-0 bg-white/60 flex items-center justify-center rounded-lg backdrop-blur-[1px]">
                                                <EyeOff size={20} className="text-gray-500" />
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 flex flex-col justify-between">
                                        <div>
                                            <h4 className="font-bold text-gray-800 line-clamp-1">{dish.name}</h4>
                                            <p className="text-primary font-bold text-sm">{dish.price} {config.currency}</p>
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                            <button onClick={() => setEditingDish(dish)} className="text-xs bg-blue-50 text-blue-600 px-2 py-1.5 rounded hover:bg-blue-100 flex-1 text-center">{t.edit}</button>
                                            <button 
                                                type="button"
                                                onClick={(e) => handleToggleDishAvailability(e, dish)} 
                                                className={`text-xs px-2 py-1.5 rounded z-10 relative cursor-pointer flex-1 flex items-center justify-center gap-1 transition-colors ${dish.isAvailable ? 'bg-green-50 text-green-600 hover:bg-green-100' : 'bg-gray-200 text-gray-500 hover:bg-gray-300'}`}
                                            >
                                                {dish.isAvailable ? <><Eye size={12} /> {t.available}</> : <><EyeOff size={12} /> {t.hidden}</>}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => setEditingDish({ id: Date.now().toString(), categoryId: cat.id, name: '', description: '', price: 0, image: 'https://picsum.photos/400/300', prepTime: 15, isAvailable: true })} className="border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center text-gray-400 hover:border-primary hover:text-primary transition-colors min-h-[100px]">
                                <Plus size={24} />
                                <span className="text-sm font-medium mt-1">{t.addDish}</span>
                            </button>
                        </div>
                    )}
                    {!cat.isAvailable && (
                        <div className="p-8 text-center text-gray-400">
                             <EyeOff size={32} className="mx-auto mb-2 opacity-50" />
                             <p className="text-sm">{t.hiddenSectionMsg}</p>
                        </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Offer Modal */}
      {editingOffer && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                 <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold">{t.addEditOffer}</h3><button onClick={() => setEditingOffer(null)}><X size={20} /></button></div>
                 <div className="p-6 space-y-4">
                     <div><label className="block text-sm font-medium mb-1">{t.offerTitle}</label><input className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingOffer.title} onChange={e => setEditingOffer({...editingOffer, title: e.target.value})} /></div>
                     
                     <div className="flex gap-4">
                         <div className="flex-1">
                             <label className="block text-sm font-medium mb-1">{t.newPrice}</label>
                             <input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingOffer.price} onChange={e => setEditingOffer({...editingOffer, price: Number(e.target.value)})} />
                         </div>
                         <div className="flex-1">
                             <label className="block text-sm font-medium mb-1">{t.oldPrice}</label>
                             <input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingOffer.originalPrice || ''} onChange={e => setEditingOffer({...editingOffer, originalPrice: Number(e.target.value)})} placeholder="اختياري" />
                         </div>
                     </div>

                     <div><label className="block text-sm font-medium mb-1">{t.offerImage}</label><div className="flex items-center gap-4 border border-gray-200 rounded-lg p-2">{editingOffer.image && (<img src={editingOffer.image} alt="Preview" className="w-16 h-12 rounded object-cover bg-gray-100" />)}<div className="flex-1 relative"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'offer')} disabled={isUploadingImage} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />{isUploadingImage && <Loader2 className="animate-spin absolute right-0 top-2 text-primary" size={16} />}</div></div></div>
                     
                     <div className="flex items-center gap-2 pt-2">
                        <input 
                            type="checkbox" 
                            id="offerActive" 
                            checked={editingOffer.active} 
                            onChange={e => setEditingOffer({...editingOffer, active: e.target.checked})} 
                            className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" 
                        />
                        <label htmlFor="offerActive" className="text-sm font-medium text-gray-700 select-none">{t.offerActive}</label>
                     </div>

                     <div className="flex gap-2 pt-2">
                        <button 
                            onClick={() => saveOffer(editingOffer)} 
                            className="w-full bg-primary text-black py-3 rounded-lg font-bold shadow-lg shadow-primary/30"
                        >
                            {isSaving ? t.saving : t.saveOffer}
                        </button>
                    </div>
                 </div>
             </div>
          </div>
      )}

      {/* Category Modal */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50"><h3 className="font-bold">{t.addEditCategory}</h3><button onClick={() => setEditingCategory(null)}><X size={20} /></button></div>
                <div className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium mb-1">{t.catName}</label><input className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingCategory.name} onChange={e => setEditingCategory({...editingCategory, name: e.target.value})} /></div>
                    <div><label className="block text-sm font-medium mb-1">{t.catImage}</label><div className="flex items-center gap-4 border border-gray-200 rounded-lg p-2">{editingCategory.image && (<img src={editingCategory.image} alt="Preview" className="w-12 h-12 rounded object-cover bg-gray-100" />)}<div className="flex-1 relative"><input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'category')} disabled={isUploadingImage} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary/10 file:text-primary hover:file:bg-primary/20 cursor-pointer" />{isUploadingImage && <Loader2 className="animate-spin absolute right-0 top-2 text-primary" size={16} />}</div></div></div>
                    
                    <div className="flex items-center gap-2 pt-2">
                         <input 
                             type="checkbox" 
                             id="catAvailable" 
                             checked={editingCategory.isAvailable !== false} 
                             onChange={e => setEditingCategory({...editingCategory, isAvailable: e.target.checked})} 
                             className="w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" 
                         />
                         <label htmlFor="catAvailable" className="text-sm font-medium text-gray-700 select-none">{t.catActive}</label>
                    </div>

                    <button onClick={() => saveCategory(editingCategory)} className="w-full bg-primary text-black py-3 rounded-lg font-bold">{isSaving ? t.saving : t.saveChanges}</button>
                </div>
            </div>
        </div>
      )}

      {/* Dish Modal */}
      {editingDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0"><h3 className="font-bold text-lg">{t.dishDetails}</h3><button onClick={() => setEditingDish(null)}><X size={20} /></button></div>
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="flex gap-4 flex-col md:flex-row">
                        <div className="flex-1 space-y-4">
                            <div><label className="block text-sm font-medium mb-1">{t.dishName}</label><input className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingDish.name} onChange={e => setEditingDish({...editingDish, name: e.target.value})} /></div>
                            <div>
                                <label className="block text-sm font-medium mb-1">{t.selectCat}</label>
                                <select className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary bg-white" value={editingDish.categoryId} onChange={e => setEditingDish({...editingDish, categoryId: e.target.value})}>
                                    <option value="" disabled>{t.selectCat}</option>
                                    {config.categories.map(cat => (<option key={cat.id} value={cat.id}>{cat.name}</option>))}
                                </select>
                            </div>
                            <div><label className="block text-sm font-medium mb-1">{t.price}</label><input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingDish.price} onChange={e => setEditingDish({...editingDish, price: Number(e.target.value)})} /></div>
                             <div><label className="block text-sm font-medium mb-1">{t.prepTime}</label><input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingDish.prepTime} onChange={e => setEditingDish({...editingDish, prepTime: Number(e.target.value)})} /></div>
                            <div><label className="block text-sm font-medium mb-1">{t.calories}</label><input type="number" className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary" value={editingDish.calories || ''} onChange={e => setEditingDish({...editingDish, calories: Number(e.target.value)})} /></div>
                        </div>
                        <div className="flex-1 space-y-4">
                             <div><label className="block text-sm font-medium mb-1">{t.dishImage}</label><div className={`border-2 border-dashed border-gray-200 rounded-lg p-4 flex flex-col items-center justify-center relative transition-colors ${isUploadingImage ? 'bg-gray-50' : 'hover:bg-gray-50'}`}>{editingDish.image ? (<div className="relative w-full h-32 mb-2 group"><img src={editingDish.image} className="w-full h-full object-cover rounded-lg" alt="" /><div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-lg"><span className="text-white text-xs font-bold">{t.changeImage}</span></div></div>) : (<div className="text-gray-400 flex flex-col items-center mb-2"><ImageIcon size={32} /><span className="text-xs mt-1">{t.clickUpload}</span></div>)}<input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, 'dish')} disabled={isUploadingImage} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed" />{isUploadingImage && (<div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-lg"><Loader2 className="animate-spin text-primary" /></div>)}</div></div>
                            <div>
                                <div className="flex justify-between items-end mb-1"><label className="block text-sm font-medium">{t.restaurantDesc}</label><button onClick={handleAiDescription} disabled={isGeneratingAi} className="text-[10px] flex items-center gap-1 text-purple-600 bg-purple-50 hover:bg-purple-100 px-2 py-1 rounded-full transition-colors"><Wand2 size={10} /> {isGeneratingAi ? t.generating : t.aiWrite}</button></div>
                                <textarea className="w-full border rounded-lg px-3 py-2 outline-none focus:border-primary h-24" value={editingDish.description} onChange={e => setEditingDish({...editingDish, description: e.target.value})} />
                            </div>
                             <div className="flex items-center gap-2 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <input type="checkbox" id="isAvailable" checked={editingDish.isAvailable} onChange={e => setEditingDish({...editingDish, isAvailable: e.target.checked})} className="w-5 h-5 text-primary rounded cursor-pointer" />
                                <label htmlFor="isAvailable" className="text-sm font-bold cursor-pointer select-none">{t.dishActive}</label>
                             </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-2 shrink-0">
                    <div className="flex-1"></div>
                    <button onClick={() => setEditingDish(null)} className="px-6 py-2 rounded-lg text-gray-600 hover:bg-gray-200">{t.cancelBtn}</button>
                    <button onClick={() => saveDish(editingDish)} className="px-6 py-2 rounded-lg bg-primary text-black font-bold hover:bg-yellow-400">{isSaving ? t.saving : t.saveDish}</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;