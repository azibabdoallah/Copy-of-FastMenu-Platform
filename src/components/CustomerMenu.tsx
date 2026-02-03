import React, { useState, useEffect, useMemo } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language, WorkingHours } from '../types';
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

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" className="text-white">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/>
  </svg>
);

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

const CustomerMenu: React.FC<CustomerMenuProps> = ({ config: initialConfig }) => {
  const navigate = useNavigate();
  const { restaurantId } = useParams();
  
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
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  const isOrderingEnabled = currentConfig.isOrderingEnabled !== false;
  const isDeliveryEnabled = currentConfig.isDeliveryEnabled !== false; 
  const activeOffers = useMemo(() => currentConfig.offers.filter(o => o.active), [currentConfig.offers]);
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setIsOwner(!!session));
  }, []);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            if (restaurantId) {
                const fetchedConfig = await getRestaurantConfig(restaurantId, true);
                setCurrentConfig(fetchedConfig);
                setMenuDishes(fetchedConfig.dishes);
                const { data: profile } = await supabase.from('profiles').select('id').eq('restaurant_name', restaurantId).maybeSingle();
                if (profile) setMenuOwnerId(profile.id);
            } else {
                setCurrentConfig(initialConfig);
                setMenuDishes(initialConfig.dishes);
            }
        } catch (error) {
            console.error("Failed to load menu data", error);
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={32} /></div>;

  return (
    <div className="min-h-screen bg-white pb-20" dir="rtl">
      {/* Header */}
      <div className="p-4 flex justify-between items-center bg-white sticky top-0 z-30 border-b">
        <h1 className="text-xl font-black">{currentConfig.name}</h1>
        <button onClick={() => navigate(isOwner ? '/select' : '/')} className="p-2 bg-gray-100 rounded-full"><ArrowRight size={18} /></button>
      </div>

      {/* Hero & Logo */}
      <div className="px-4 mt-4">
        <div className="aspect-[2.5/1] rounded-2xl overflow-hidden bg-gray-100 shadow-sm">
          <img src={currentConfig.coverImage} className="w-full h-full object-cover" alt="" />
        </div>
        <div className="flex items-end gap-4 -mt-10 px-2">
          <div className="w-24 h-24 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden">
            <img src={currentConfig.logo} className="w-full h-full object-cover" alt="" />
          </div>
        </div>
      </div>

      {/* Categories Bar */}
      <div className="sticky top-14 z-20 bg-white/90 backdrop-blur-md border-b p-2 overflow-x-auto flex gap-2 no-scrollbar">
        {activeOffers.length > 0 && <button onClick={() => scrollToCategory('offers')} className={`px-4 py-1.5 rounded-full text-xs font-bold ${activeCategory === 'offers' ? 'bg-black text-white' : 'bg-gray-100'}`}>🔥 {t.offers}</button>}
        {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
          <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${activeCategory === cat.id ? 'bg-black text-white' : 'bg-gray-100'}`}>{cat.name}</button>
        ))}
      </div>

      {/* Dishes List */}
{/* محتوى المنيو */}
      <div className="p-4 space-y-8">
        {/* --- هذا هو الجزء الذي كان ناقصاً لإظهار العروض --- */}
        {activeOffers.length > 0 && (
          <div id="section-offers" className="scroll-mt-28">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2">🔥 {t.offers}</h2>
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

        {/* بقية الأقسام العادية */}
        {currentConfig.categories.filter(c => c.isAvailable).map(cat => {
          const dishes = filteredDishes(cat.id);
          if (dishes.length === 0) return null;
          return (
            <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-28">
              <h2 className="text-lg font-bold mb-4">{cat.name}</h2>
              <div className="grid gap-4">
                {dishes.map(dish => <DishCard key={dish.id} dish={dish} currency={currentConfig.currency} onClick={() => setSelectedDish(dish)} />)}
              </div>
            </div>
          );
        })}
      </div>        {currentConfig.categories.filter(c => c.isAvailable).map(cat => {
          const dishes = filteredDishes(cat.id);
          if (dishes.length === 0) return null;
          return (
            <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-28">
              <h2 className="text-lg font-bold mb-4">{cat.name}</h2>
              <div className="grid gap-4">
                {dishes.map(dish => <DishCard key={dish.id} dish={dish} currency={currentConfig.currency} onClick={() => setSelectedDish(dish)} />)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals & Cart Logic (Keeping it clean for build) */}
      {cart.length > 0 && (
        <button onClick={() => setIsCartOpen(true)} className="fixed bottom-6 left-6 right-6 z-30 bg-black text-white p-4 rounded-2xl shadow-xl flex justify-between items-center">
          <span className="font-bold">{t.viewOrder}</span>
          <span className="font-bold">{cartTotal} {currentConfig.currency}</span>
        </button>
      )}

      {/* Success Popup */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white p-8 rounded-2xl shadow-2xl flex flex-col items-center text-center max-w-sm mx-4 animate-in zoom-in">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h3 className="text-xl font-bold">{t.orderSuccess}</h3>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
