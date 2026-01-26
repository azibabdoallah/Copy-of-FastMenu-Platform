
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
      {/* Sidebar ... (remains unchanged) */}
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
        {/* Mobile Header ... (remains unchanged) */}
        
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          {/* Analytics, Orders, Menu Tabs ... (remains unchanged) */}

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
              
              {/* Working Hours Section ... (remains unchanged) */}
              {/* Social Links Section ... (remains unchanged) */}
              
              <button onClick={saveSettings} disabled={isSaving} className="bg-primary text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors shadow-lg shadow-primary/30 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSaving ? t.saving : t.saveChanges}
              </button>
            </div>
          )}
          
          {/* Menu Tab remains unchanged */}
        </div>
      </main>

      {/* Modals remain unchanged */}
    </div>
  );
};

export default AdminDashboard;
