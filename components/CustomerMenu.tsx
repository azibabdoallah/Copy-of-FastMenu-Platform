import React, { useState, useEffect, useMemo } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language, Category, WorkingHours } from '../types';
import DishCard from './DishCard';
import { submitOrder } from '../services/orderService';
import { getRestaurantConfig } from '../services/storageService';
import { supabase } from '../services/supabase';
import { ShoppingBag, Plus, Minus, X, CheckCircle, LogOut, Loader2, ArrowRight, Flame, Utensils } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { TRANSLATIONS } from '../constants';

const CustomerMenu: React.FC<{config: RestaurantConfig}> = ({ config: initialConfig }) => {
  const navigate = useNavigate();
  const { identifier } = useParams<{ identifier: string }>(); 
  const [searchParams] = useSearchParams();
  const uidQuery = searchParams.get('uid');
  
  const [currentConfig, setCurrentConfig] = useState<RestaurantConfig>(initialConfig);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderType, setOrderType] = useState<'dine_in' | 'delivery'>('dine_in');
  
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const language = 'ar';
  const t = TRANSLATIONS[language];

  // جلب البيانات عند فتح الصفحة
  useEffect(() => {
    const loadRestaurant = async () => {
      setIsLoading(true);
      try {
        const idToFetch = identifier || uidQuery;
        const configData = await getRestaurantConfig(idToFetch || undefined);
        setCurrentConfig(configData);
        
        // تعيين الفئة النشطة الافتراضية
        if (configData.offers.some(o => o.active)) {
            setActiveCategory('offers');
        } else if (configData.categories.length > 0) {
            setActiveCategory(configData.categories[0].id);
        }
      } catch (error) {
        console.error("Failed to load restaurant:", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadRestaurant();
  }, [identifier, uidQuery]);

  const activeOffers = useMemo(() => currentConfig.offers.filter(o => o.active), [currentConfig.offers]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      window.scrollTo({ top: element.offsetTop - 120, behavior: 'smooth' });
    }
  };

  const addToCart = (dish: Dish) => {
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dish.id);
      if (existing) {
        return prev.map(item => item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { dish, quantity: 1 }];
    });
    setSelectedDish(null);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // المعرف الحقيقي للمطعم (UUID) هو المفتاح لظهور الطلبات في لوحة التحكم
    const restaurantId = (currentConfig as any).restaurant_db_id;
    
    if (!restaurantId) {
        alert("خطأ: تعذر تحديد هوية المطعم.");
        return;
    }

    setIsSubmitting(true);
    try {
      await submitOrder({
        restaurant_id: restaurantId, 
        customer_name: customerName,
        table_number: orderType === 'delivery' ? 'توصيل' : tableNumber,
        items: cart,
        total: cart.reduce((s, i) => s + (i.dish.price * i.quantity), 0),
        type: orderType,
        phone: customerPhone,
        address: customerAddress
      });
      
      setCart([]);
      setIsCheckingOut(false);
      setIsCartOpen(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
    } catch (error) {
      alert("فشل إرسال الطلب، يرجى المحاولة لاحقاً.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="animate-spin text-primary" size={48} />
            <p className="font-bold text-gray-500">جاري تحميل القائمة...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900" dir="rtl">
      {/* Header */}
      <div className="px-4 pt-6 pb-2 flex justify-between items-center bg-white sticky top-0 z-30 border-b border-slate-50">
         <div className="flex items-center gap-3">
            <img src={currentConfig.logo} className="w-10 h-10 rounded-xl object-cover shadow-sm" alt="" />
            <div>
                <h1 className="font-black text-lg leading-none">{currentConfig.name}</h1>
                <span className="text-[10px] text-green-600 font-bold uppercase tracking-tighter">مفتوح الآن</span>
            </div>
         </div>
         <button onClick={() => navigate(-1)} className="bg-slate-50 p-2 rounded-full border border-slate-100">
            <ArrowRight size={18} />
         </button>
      </div>

      {/* Hero Banner */}
      <div className="px-4 mt-4">
        <div className="w-full aspect-[21/9] rounded-2xl overflow-hidden shadow-lg relative bg-slate-100">
            <img src={currentConfig.coverImage} className="w-full h-full object-cover" alt="" />
        </div>
      </div>

      {/* Category Pills */}
      <div className="sticky top-[72px] z-20 bg-white/90 backdrop-blur-md py-4 border-b border-slate-50 overflow-x-auto no-scrollbar flex px-4 gap-3">
          {activeOffers.length > 0 && (
            <button onClick={() => scrollToCategory('offers')} className={`whitespace-nowrap px-5 py-2 rounded-2xl text-xs font-black transition-all border ${activeCategory === 'offers' ? 'bg-primary border-primary text-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {t.offers}
            </button>
          )}
          {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
            <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-5 py-2 rounded-2xl text-xs font-black transition-all border ${activeCategory === cat.id ? 'bg-primary border-primary text-black' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                {cat.name}
            </button>
          ))}
      </div>

      {/* Sections */}
      <div className="px-4 py-4 space-y-8">
        {activeOffers.length > 0 && (
            <div id="section-offers" className="scroll-mt-36">
                <h2 className="text-xl font-black mb-4 flex items-center gap-2"><Flame className="text-primary" size={20}/> {t.offers}</h2>
                <div className="grid grid-cols-1 gap-1">
                    {activeOffers.map(offer => (
                        <DishCard key={offer.id} dish={{...currentConfig.dishes[0], id: offer.id, name: offer.title, price: offer.price, image: offer.image, description: offer.description || ''}} currency={currentConfig.currency} onClick={() => setSelectedDish({...currentConfig.dishes[0], id: offer.id, name: offer.title, price: offer.price, image: offer.image, description: offer.description || ''})} />
                    ))}
                </div>
            </div>
        )}

        {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
            <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-36">
              <h2 className="text-xl font-black mb-4 flex items-center gap-2">
                <span className="w-2 h-6 bg-primary rounded-full"></span>
                {cat.name}
              </h2>
              <div className="grid grid-cols-1 gap-1">
                {currentConfig.dishes.filter(d => d.categoryId === cat.id && d.isAvailable).map(dish => (
                  <DishCard key={dish.id} dish={dish} currency={currentConfig.currency} onClick={() => setSelectedDish(dish)} />
                ))}
              </div>
            </div>
        ))}
      </div>

      {/* Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 z-40">
            <button onClick={() => setIsCartOpen(true)} className="w-full bg-slate-900 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-primary text-black w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ring-4 ring-slate-800">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                    </div>
                    <span className="font-black text-sm">{t.viewOrder}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="font-black text-primary text-lg">{cart.reduce((s, i) => s + (i.dish.price * i.quantity), 0)} {currentConfig.currency}</span>
                </div>
            </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm p-4" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-black">{t.cart}</h2>
                <button onClick={() => setIsCartOpen(false)} className="bg-slate-100 p-2 rounded-full"><X size={20}/></button>
            </div>
            
            {!isCheckingOut ? (
                <>
                <div className="space-y-3 mb-8 max-h-[40vh] overflow-y-auto no-scrollbar">
                    {cart.map(item => (
                        <div key={item.dish.id} className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                            <div>
                                <h4 className="font-bold text-sm">{item.dish.name}</h4>
                                <p className="text-primary font-black text-xs">{item.dish.price * item.quantity} {currentConfig.currency}</p>
                            </div>
                            <div className="flex items-center gap-3 bg-white p-1 rounded-xl border border-slate-100">
                                <button onClick={() => setCart(prev => prev.map(i => i.dish.id === item.dish.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0))} className="w-8 h-8 flex items-center justify-center text-red-500"><Minus size={14}/></button>
                                <span className="font-black w-4 text-center">{item.quantity}</span>
                                <button onClick={() => setCart(prev => prev.map(i => i.dish.id === item.dish.id ? {...i, quantity: i.quantity + 1} : i))} className="w-8 h-8 flex items-center justify-center text-green-500"><Plus size={14}/></button>
                            </div>
                        </div>
                    ))}
                </div>
                <button onClick={() => setIsCheckingOut(true)} className="w-full bg-primary text-black p-5 rounded-2xl font-black text-lg shadow-xl">{t.completeOrder}</button>
                </>
            ) : (
                <form onSubmit={handleCheckout} className="space-y-4">
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-2">
                        <button type="button" onClick={() => setOrderType('dine_in')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${orderType === 'dine_in' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>داخلي</button>
                        <button type="button" onClick={() => setOrderType('delivery')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${orderType === 'delivery' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>توصيل</button>
                    </div>
                    <input required className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-primary font-bold" placeholder={t.namePlaceholder} value={customerName} onChange={e => setCustomerName(e.target.value)} />
                    {orderType === 'dine_in' ? (
                        <input required className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-primary font-bold" placeholder={t.tablePlaceholder} value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                    ) : (
                        <>
                        <input required className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-primary font-bold" placeholder={t.phonePlaceholder} value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                        <textarea required className="w-full bg-slate-50 border-2 border-transparent p-4 rounded-2xl outline-none focus:border-primary font-bold" placeholder={t.addressPlaceholder} value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                        </>
                    )}
                    <button disabled={isSubmitting} className="w-full bg-slate-900 text-primary p-5 rounded-2xl font-black text-lg shadow-xl flex items-center justify-center gap-3">
                        {isSubmitting ? <Loader2 className="animate-spin"/> : <ShoppingBag/>}
                        {isSubmitting ? t.sending : t.confirmOrder}
                    </button>
                </form>
            )}
          </div>
        </div>
      )}

      {/* Dish Modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm p-0 md:p-4" onClick={() => setSelectedDish(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-[40px] md:rounded-[40px] overflow-hidden shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <img src={selectedDish.image} className="w-full h-80 object-cover" alt="" />
            <div className="p-8">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-black text-slate-900">{selectedDish.name}</h2>
                <span className="text-2xl font-black text-primary">{selectedDish.price} {currentConfig.currency}</span>
              </div>
              <p className="text-slate-500 leading-relaxed mb-10 text-lg font-medium">{selectedDish.description}</p>
              <button onClick={() => addToCart(selectedDish)} className="w-full bg-primary text-black font-black py-5 rounded-3xl text-xl shadow-2xl shadow-primary/30 active:scale-95 transition-all flex items-center justify-center gap-3">
                <Plus size={24} />
                {t.addToOrder}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Success Success */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/90 backdrop-blur-md p-4">
          <div className="bg-white p-12 rounded-[40px] text-center shadow-2xl max-w-xs w-full">
            <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-green-50">
                <CheckCircle size={56} className="text-green-500" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">{t.orderSuccess}</h3>
            <p className="text-slate-500 mt-3 font-bold">{t.orderSuccessMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;