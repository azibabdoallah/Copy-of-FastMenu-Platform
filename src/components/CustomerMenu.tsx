import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language, Category, WorkingHours } from '../types';
import DishCard from './DishCard';
import { submitOrder } from '../services/orderService';
import { getRestaurantConfig } from '../services/storageService';
import { supabase } from '../services/supabase';
import { ShoppingBag, Plus, Minus, X, CheckCircle, LogOut, Loader2, ArrowRight, Ban, Facebook, Instagram, Flame, Star, Clock, Bike, Utensils, LayoutGrid, ShieldCheck } from 'lucide-react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { TRANSLATIONS } from '../constants';

interface CustomerMenuProps {
  config: RestaurantConfig;
}

const CustomerMenu: React.FC<CustomerMenuProps> = ({ config: initialConfig }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { restaurantName } = useParams(); 
  const targetUserId = searchParams.get('uid');
  
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
  
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const fetched = await getRestaurantConfig(restaurantName || targetUserId || undefined, !!restaurantName);
            setCurrentConfig(fetched);
            setMenuDishes(fetched.dishes);
        } catch (e) { console.error(e); }
        finally { setIsLoading(false); }
    };
    loadData();
  }, [targetUserId, restaurantName, initialConfig]);

  const cartTotal = useMemo(() => cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0), [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // التحقق الفعلي من كود الأمان
    if (currentConfig.verificationPin && verificationCode !== currentConfig.verificationPin) {
      alert(t.invalidCode);
      return;
    }

    if (!customerName || (orderType === 'dine_in' && !tableNumber)) return;
    
    setIsSubmitting(true);
    try {
      await submitOrder({ 
          restaurant_id: currentConfig.name, 
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
    } catch (error) { alert("خطأ في الإرسال"); }
    finally { setIsSubmitting(false); }
  };

  if (isLoading) return <div className="min-h-screen bg-white flex flex-col items-center justify-center"><Loader2 className="animate-spin text-primary" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white pb-20 font-sans">
      {/* Header Profile */}
      <div className="p-4 flex flex-col items-center bg-gray-50 border-b">
          <img src={currentConfig.logo} className="w-20 h-20 rounded-2xl shadow-md mb-2 object-cover" alt="" />
          <h1 className="text-xl font-black">{currentConfig.name}</h1>
          <p className="text-gray-500 text-xs mb-4 text-center">{currentConfig.description}</p>
      </div>

      {/* Categories & Dishes */}
      <div className="p-4 space-y-6">
        {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
          <div key={cat.id}>
            <h2 className="font-bold border-r-4 border-primary pr-2 mb-4">{cat.name}</h2>
            <div className="grid gap-4">
              {menuDishes.filter(d => d.categoryId === cat.id && d.isAvailable).map(dish => (
                <DishCard key={dish.id} dish={dish} currency={currentConfig.currency} onClick={() => {
                  if (currentConfig.isOrderingEnabled) {
                    const existing = cart.find(i => i.dish.id === dish.id);
                    if (existing) {
                      setCart(cart.map(i => i.dish.id === dish.id ? {...i, quantity: i.quantity + 1} : i));
                    } else {
                      setCart([...cart, {dish, quantity: 1}]);
                    }
                  }
                }} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Floating View Order */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 inset-x-0 px-4">
            <button onClick={() => setIsCartOpen(true)} className="w-full bg-black text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
                <span className="font-bold">{t.viewOrder}</span>
                <span className="bg-primary text-black px-3 py-1 rounded-lg font-black">{cartTotal} {currentConfig.currency}</span>
            </button>
        </div>
      )}

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end">
          <div className="bg-white w-full max-h-[85vh] rounded-t-[32px] p-6 overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black">{t.cart}</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
            </div>
            
            {isCheckingOut ? (
              <form onSubmit={handleCheckout} className="space-y-4">
                <input required placeholder={t.namePlaceholder} className="w-full p-4 bg-gray-50 border rounded-2xl outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                <div className="flex gap-2">
                  <input required placeholder={t.tablePlaceholder} className="flex-1 p-4 bg-gray-50 border rounded-2xl outline-none" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                  <div className="relative w-32">
                    <ShieldCheck className="absolute left-3 top-4 text-primary" size={18} />
                    <input required maxLength={4} placeholder="CODE" className="w-full p-4 pl-10 bg-gray-50 border-2 border-primary/30 rounded-2xl outline-none font-mono text-center font-bold" value={verificationCode} onChange={e => setVerificationCode(e.target.value.replace(/\D/g,''))} />
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 text-center">* الرمز مطبوع تحت الـ QR Code أمامك</p>
                <button type="submit" disabled={isSubmitting} className="w-full bg-primary text-black p-4 rounded-2xl font-black shadow-lg shadow-primary/20">
                  {isSubmitting ? t.sending : t.confirmOrder}
                </button>
                <button type="button" onClick={() => setIsCheckingOut(false)} className="w-full text-gray-500 font-bold py-2">{t.back}</button>
              </form>
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {cart.map(item => (
                    <div key={item.dish.id} className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <img src={item.dish.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                        <div><h4 className="font-bold text-sm">{item.dish.name}</h4><p className="text-xs text-gray-400">{item.dish.price} {currentConfig.currency}</p></div>
                      </div>
                      <div className="flex items-center gap-3 bg-gray-100 p-2 rounded-xl">
                        <button onClick={() => {
                          const updated = cart.map(i => i.dish.id === item.dish.id ? {...i, quantity: Math.max(0, i.quantity - 1)} : i).filter(i => i.quantity > 0);
                          setCart(updated);
                        }}><Minus size={16}/></button>
                        <span className="font-bold">{item.quantity}</span>
                        <button onClick={() => setCart(cart.map(i => i.dish.id === item.dish.id ? {...i, quantity: i.quantity + 1} : i))}><Plus size={16}/></button>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={() => setIsCheckingOut(true)} className="w-full bg-black text-white p-4 rounded-2xl font-bold">{t.completeOrder}</button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 text-center max-w-sm w-full animate-in zoom-in">
            <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4"><CheckCircle size={48} /></div>
            <h3 className="text-xl font-black mb-2">{t.orderSuccess}</h3>
            <p className="text-gray-500 text-sm mb-6">{t.orderSuccessMsg}</p>
            <button onClick={() => setOrderSuccess(false)} className="w-full bg-black text-white py-3 rounded-2xl font-bold">{t.back}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
