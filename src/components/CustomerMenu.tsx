import React, { useState, useEffect, useMemo } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language } from '../types';
import DishCard from './DishCard';
import { submitOrder } from '../services/orderService';
import { getRestaurantConfig } from '../services/storageService';
import { supabase } from '../services/supabase';
import { ShoppingBag, Plus, Minus, X, CheckCircle, LogOut, Loader2, ArrowRight, Facebook, Instagram, Flame, Star, Clock, Bike, Utensils, LayoutGrid } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TRANSLATIONS } from '../constants';

interface CustomerMenuProps {
  config: RestaurantConfig;
}

const CustomerMenu: React.FC<CustomerMenuProps> = ({ config: initialConfig }) => {
  const navigate = useNavigate();
  const { restaurantId } = useParams(); // يقرأ الاسم من الرابط (مثلاً DIFL)
  
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
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  
  // Form State
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOrderingEnabled = currentConfig.isOrderingEnabled !== false;
  const isDeliveryEnabled = currentConfig.isDeliveryEnabled !== false; 
  const activeOffers = useMemo(() => currentConfig.offers?.filter(o => o.active) || [], [currentConfig.offers]);
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  // Check if owner is logged in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsOwner(!!session));
  }, []);

  // --- المنطق الحاسم: تحويل اسم الرابط إلى بيانات ---
  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (restaurantId) {
                // 1. البحث عن معرف المطعم باستخدام الاسم الموجود في الرابط
                const { data: profile, error } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('restaurant_name', restaurantId) // البحث عن DIFL
                    .maybeSingle();

                if (profile) {
                    setMenuOwnerId(profile.id); // تخزين المعرف لتمكين الطلب
                    // 2. جلب المنيو الخاص بهذا المعرف
                    const fetchedConfig = await getRestaurantConfig(profile.id);
                    setCurrentConfig(fetchedConfig);
                    setMenuDishes(fetchedConfig.dishes || []);
                } else {
                    console.log("المطعم غير موجود، قد يكون الرابط خاطئاً");
                    // يمكن توجيه المستخدم لصفحة خطأ هنا
                }
            } else {
                setCurrentConfig(initialConfig);
                setMenuDishes(initialConfig.dishes || []);
            }
        } catch (error) {
            console.error("Error fetching menu:", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [restaurantId, initialConfig]);

  // Set active category on load
  useEffect(() => {
    if (activeOffers.length > 0) setActiveCategory('offers');
    else {
        const first = currentConfig.categories?.find(c => c.isAvailable);
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
    if (!menuOwnerId) return alert("لا يمكن إرسال الطلب: لم يتم التعرف على المطعم.");
    
    setIsSubmitting(true);
    try {
      await submitOrder({ 
          restaurant_id: menuOwnerId, 
          customer_name: customerName, 
          table_number: orderType === 'delivery' ? 'توصيل' : tableNumber, 
          items: cart, 
          total: cartTotal, 
          type: orderType, 
          phone: customerPhone, 
          address: customerAddress, 
          verification_code: verificationCode 
      });
      setCart([]); 
      setIsCheckingOut(false); 
      setIsCartOpen(false); 
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (err) { 
        alert("فشل إرسال الطلب. تأكد من الاتصال بالإنترنت."); 
        console.error(err);
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const formatTime = (t: string) => t; // Simplified for now
  const isOpen = true; // Simplified checking logic for stability

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-amber-500" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 font-sans" dir="rtl">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-white sticky top-0 z-30 border-b shadow-sm">
        <h1 className="text-xl font-black">{currentConfig.name}</h1>
        {isOwner && <button onClick={() => navigate('/select')} className="p-2 bg-gray-100 rounded-full"><LogOut size={18} /></button>}
      </div>

      {/* Hero */}
      <div className="px-4 mt-4">
        <div className="aspect-[2.5/1] rounded-2xl overflow-hidden bg-gray-100 shadow-inner relative">
          <img src={currentConfig.coverImage} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex items-end gap-4 -mt-10 px-2 relative z-10">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-lg overflow-hidden">
            <img src={currentConfig.logo} className="w-full h-full object-cover" alt="Logo" />
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="sticky top-[65px] z-20 bg-white/95 backdrop-blur-md border-b p-2 overflow-x-auto flex gap-2 no-scrollbar">
        {activeOffers.length > 0 && <button onClick={() => scrollToCategory('offers')} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === 'offers' ? 'bg-black text-white' : 'bg-amber-100 text-amber-800'}`}>🔥 {t.offers}</button>}
        {currentConfig.categories?.filter(c => c.isAvailable).map(cat => (
          <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-black text-white' : 'bg-gray-100'}`}>{cat.name}</button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 space-y-10">
        {activeOffers.length > 0 && (
          <div id="section-offers" className="scroll-mt-28">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">🔥 {t.offers}</h3>
            <div className="grid gap-4">
              {activeOffers.map(offer => (
                <DishCard key={offer.id} dish={{ id: offer.id, categoryId: 'offer', name: offer.title, description: offer.description || '', price: offer.price, image: offer.image, isAvailable: true, prepTime: 0 }} currency={currentConfig.currency} onClick={() => setSelectedDish({ ...offer, categoryId: 'offer', name: offer.title, prepTime: 0, isAvailable: true } as any)} />
              ))}
            </div>
          </div>
        )}

        {currentConfig.categories?.filter(c => c.isAvailable).map(cat => {
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
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 left-6 right-6 z-40 bg-black text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
          <div className="flex items-center gap-2"><span className="bg-amber-500 text-black px-2 rounded-full text-xs font-bold">{cart.length}</span><span>{t.viewOrder}</span></div>
          <span className="font-bold text-amber-500">{cartTotal} {currentConfig.currency}</span>
        </button>
      )}

      {/* Cart Modal (Simplified) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-end md:items-center p-4 animate-in fade-in" onClick={() => setIsCartOpen(false)}>
            <div className="bg-white w-full max-w-md rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between mb-4 border-b pb-2"><h2 className="font-bold text-lg">{t.cart}</h2><button onClick={() => setIsCartOpen(false)}><X/></button></div>
                <div className="max-h-[50vh] overflow-y-auto space-y-3 mb-4">
                    {cart.map(item => (
                        <div key={item.dish.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                            <div className="text-sm">
                                <div className="font-bold">{item.dish.name}</div>
                                <div className="text-gray-500">{item.dish.price} {currentConfig.currency}</div>
                            </div>
                            <div className="flex items-center gap-2 bg-white border rounded px-1">
                                <button onClick={() => updateQuantity(item.dish.id, -1)} className="p-1 text-red-500"><Minus size={14}/></button>
                                <span className="text-sm font-bold w-4 text-center">{item.quantity}</span>
                                <button onClick={() => updateQuantity(item.dish.id, 1)} className="p-1 text-green-500"><Plus size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                {isCheckingOut ? (
                    <form onSubmit={handleCheckout} className="space-y-2">
                        <input placeholder={t.namePlaceholder} className="w-full border p-2 rounded" value={customerName} onChange={e => setCustomerName(e.target.value)} required />
                        {orderType === 'dine_in' ? (
                            <input placeholder={t.tablePlaceholder} className="w-full border p-2 rounded" value={tableNumber} onChange={e => setTableNumber(e.target.value)} required />
                        ) : (
                            <>
                                <input placeholder={t.phonePlaceholder} className="w-full border p-2 rounded" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} required />
                                <input placeholder={t.addressPlaceholder} className="w-full border p-2 rounded" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} required />
                            </>
                        )}
                        <div className="flex gap-2">
                            <button type="button" onClick={() => setIsCheckingOut(false)} className="flex-1 bg-gray-200 py-2 rounded text-sm">{t.back}</button>
                            <button type="submit" disabled={isSubmitting} className="flex-1 bg-black text-white py-2 rounded text-sm font-bold">{isSubmitting ? t.sending : t.confirmOrder}</button>
                        </div>
                    </form>
                ) : (
                    <div className="flex gap-2">
                        {isOrderingEnabled && <div className="flex bg-gray-100 p-1 rounded flex-1 justify-center gap-2">
                            <button onClick={() => setOrderType('dine_in')} className={`px-2 py-1 rounded text-xs ${orderType === 'dine_in' ? 'bg-white shadow' : ''}`}>{t.dineIn}</button>
                            {isDeliveryEnabled && <button onClick={() => setOrderType('delivery')} className={`px-2 py-1 rounded text-xs ${orderType === 'delivery' ? 'bg-white shadow' : ''}`}>{t.delivery}</button>}
                        </div>}
                        <button onClick={() => setIsCheckingOut(true)} className="flex-[2] bg-black text-white py-3 rounded-xl font-bold">{t.completeOrder}</button>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* Dish Modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 bg-black/60 flex justify-center items-end md:items-center p-4" onClick={() => setSelectedDish(null)}>
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
                <img src={selectedDish.image} className="w-full h-48 object-cover"/>
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-1">{selectedDish.name}</h2>
                    <p className="text-gray-500 text-sm mb-4">{selectedDish.description}</p>
                    <button onClick={() => addToCart(selectedDish)} disabled={!isOrderingEnabled} className="w-full bg-black text-amber-500 font-bold py-3 rounded-xl">{isOrderingEnabled ? t.addToOrder : t.orderingDisabled}</button>
                </div>
            </div>
        </div>
      )}

      {/* Success Message */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4">
            <div className="bg-white p-6 rounded-2xl text-center animate-in zoom-in">
                <CheckCircle className="text-green-500 mx-auto mb-2" size={48} />
                <h3 className="font-bold text-xl">{t.orderSuccess}</h3>
            </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
