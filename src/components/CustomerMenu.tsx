import React, { useState, useEffect, useMemo } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language, WorkingHours } from '../types';
import DishCard from './DishCard';
import { submitOrder } from '../services/orderService';
import { getRestaurantConfig } from '../services/storageService';
import { supabase } from '../services/supabase';
import { ShoppingBag, Plus, Minus, X, CheckCircle, LogOut, Loader2, ArrowRight, Facebook, Instagram, Flame, Star, Clock, Bike, Utensils } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TRANSLATIONS } from '../constants';

interface CustomerMenuProps {
  config: RestaurantConfig;
}

const CustomerMenu: React.FC<CustomerMenuProps> = ({ config: initialConfig }) => {
  const navigate = useNavigate();
  const { restaurantId } = useParams(); // سيأخذ القيمة "DIFL" من الرابط
  
  const [currentConfig, setCurrentConfig] = useState<RestaurantConfig>(initialConfig);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in');
  const [language] = useState<Language>('ar');
  const [menuOwnerId, setMenuOwnerId] = useState<string | null>(null);
  const [menuDishes, setMenuDishes] = useState<Dish[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOrderingEnabled = currentConfig.isOrderingEnabled !== false;
  const isDeliveryEnabled = currentConfig.isDeliveryEnabled !== false; 
  const activeOffers = useMemo(() => currentConfig.offers.filter(o => o.active), [currentConfig.offers]);
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsOwner(!!session));
  }, []);

  // --- دالة التحميل الذكية: تحويل الاسم (DIFL) إلى بيانات حقيقية ---
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (restaurantId) {
                // 1. نبحث عن الـ ID الحقيقي للمطعم باستخدام اسمه (DIFL)
                const { data: profile } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('restaurant_name', restaurantId)
                    .maybeSingle();

                if (profile) {
                    setMenuOwnerId(profile.id);
                    // 2. الآن نجلب الأطباق والإعدادات باستخدام الـ ID الصحيح
                    const fetchedConfig = await getRestaurantConfig(profile.id);
                    setCurrentConfig(fetchedConfig);
                    setMenuDishes(fetchedConfig.dishes);
                } else {
                    console.error("المطعم غير موجود");
                }
            } else {
                setCurrentConfig(initialConfig);
                setMenuDishes(initialConfig.dishes);
            }
        } catch (error) {
            console.error("خطأ في التحميل:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [restaurantId, initialConfig]);

  useEffect(() => {
    if (activeOffers.length > 0) setActiveCategory('offers');
    else {
        const first = currentConfig.categories.find(c => c.isAvailable);
        if (first) setActiveCategory(first.id);
    }
  }, [currentConfig, activeOffers.length]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filteredDishes = (catId: string) => menuDishes.filter(d => d.categoryId === catId && d.isAvailable);

  const addToCart = (dish: Dish, qty: number = 1) => {
    if (!isOrderingEnabled) return;
    setCart(prev => {
      const ex = prev.find(i => i.dish.id === dish.id);
      if (ex) return prev.map(i => i.dish.id === dish.id ? { ...i, quantity: i.quantity + qty } : i);
      return [...prev, { dish, quantity: qty }];
    });
    setSelectedDish(null);
  };

  const cartTotal = useMemo(() => cart.reduce((s, i) => s + (i.dish.price * i.quantity), 0), [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuOwnerId) return alert("وضع المعاينة: لا يمكن إرسال طلبات.");
    setIsSubmitting(true);
    try {
      await submitOrder({ 
          restaurant_id: menuOwnerId, 
          customer_name: customerName, 
          table_number: orderType === 'delivery' ? 'توصيل' : tableNumber, 
          items: cart, total: cartTotal, type: orderType, 
          phone: customerPhone, address: customerAddress, verification_code: verificationCode 
      });
      setCart([]); setIsCheckingOut(false); setIsCartOpen(false); setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) { alert("خطأ في الطلب."); } finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 font-sans" dir="rtl">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-white sticky top-0 z-30 border-b shadow-sm">
        <h1 className="text-xl font-black">{currentConfig.name}</h1>
        <button onClick={() => navigate(isOwner ? '/select' : '/')} className="p-2 bg-gray-100 rounded-full"><ArrowRight size={18} /></button>
      </div>

      {/* Hero & Logo */}
      <div className="px-4 mt-4">
        <div className="aspect-[2.5/1] rounded-2xl overflow-hidden bg-gray-100 shadow-inner">
          <img src={currentConfig.coverImage} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex items-end gap-4 -mt-12 px-2">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
            <img src={currentConfig.logo} className="w-full h-full object-cover" alt="Logo" />
          </div>
          <div className="pb-1 bg-white/80 backdrop-blur-sm rounded-lg px-2 shadow-sm">
            <h2 className="text-lg font-bold">{currentConfig.name}</h2>
            <p className="text-[10px] text-gray-500 line-clamp-1">{currentConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="sticky top-[65px] z-20 bg-white/95 backdrop-blur-md border-b p-2 overflow-x-auto flex gap-2 no-scrollbar">
        {activeOffers.length > 0 && (
          <button onClick={() => scrollToCategory('offers')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${activeCategory === 'offers' ? 'bg-black text-white' : 'bg-amber-50 text-amber-600'}`}>🔥 {t.offers}</button>
        )}
        {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
          <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${activeCategory === cat.id ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>{cat.name}</button>
        ))}
      </div>

      {/* Content Section */}
      <div className="p-4 space-y-10">
        {/* Render Offers */}
        {activeOffers.length > 0 && (
          <div id="section-offers" className="scroll-mt-28">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">✨ {t.offers}</h3>
            <div className="grid gap-4">
              {activeOffers.map(offer => (
                <DishCard 
                  key={offer.id} 
                  dish={{ 
                    id: offer.id, categoryId: 'offer', name: offer.title, 
                    description: offer.description || '', price: offer.price, 
                    image: offer.image, isAvailable: true, prepTime: 15 
                  }} 
                  currency={currentConfig.currency} 
                  onClick={() => setSelectedDish({
                    id: offer.id, name: offer.title, description: offer.description || '',
                    price: offer.price, image: offer.image, categoryId: 'offer',
                    prepTime: 15, isAvailable: true
                  })} 
                />
              ))}
            </div>
          </div>
        )}

        {/* Render Categories & Dishes */}
        {currentConfig.categories.filter(c => c.isAvailable).map(cat => {
          const dishes = filteredDishes(cat.id);
          if (dishes.length === 0) return null;
          return (
            <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-28">
              <h3 className="text-lg font-bold mb-4 border-r-4 border-black pr-2">{cat.name}</h3>
              <div className="grid gap-4">
                {dishes.map(dish => <DishCard key={dish.id} dish={dish} currency={currentConfig.currency} onClick={() => setSelectedDish(dish)} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Cart Button */}
      {cart.length > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 left-6 right-6 z-40 bg-black text-white p-4 rounded-2xl shadow-2xl flex justify-between items-center border border-gray-800">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-black w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold">{cart.length}</div>
            <span className="font-bold text-sm">{t.viewOrder}</span>
          </div>
          <span className="font-bold text-lg text-amber-500">{cartTotal} {currentConfig.currency}</span>
        </button>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 rounded-3xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h3 className="text-2xl font-bold mb-2">{t.orderSuccess}</h3>
            <p className="text-gray-500">{t.orderSuccessMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
