import React, { useState, useEffect, useMemo } from 'react';
import { RestaurantConfig, Dish, CartItem, Offer, Language, WorkingHours } from '../types';
import DishCard from './DishCard';
import { submitOrder } from '../services/orderService';
import { getRestaurantConfig } from '../services/storageService';
import { supabase } from '../services/supabase';
import { ShoppingBag, Plus, Minus, X, CheckCircle, LogOut, Loader2, ArrowRight, Facebook, Instagram, Flame, Star, Clock, Bike, Utensils } from 'lucide-react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
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
  const { identifier } = useParams<{ identifier: string }>(); 
  const [searchParams] = useSearchParams();
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
  const [isHoursModalOpen, setIsHoursModalOpen] = useState(false);
  
  const [customerName, setCustomerName] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);

  const isOrderingEnabled = currentConfig.isOrderingEnabled !== false;
  const activeOffers = useMemo(() => currentConfig.offers.filter(o => o.active), [currentConfig.offers]);
  const t = TRANSLATIONS[language as 'ar' | 'fr'] || TRANSLATIONS['ar'];

  useEffect(() => {
      if (activeOffers.length <= 1) return;
      const interval = setInterval(() => {
          setCurrentOfferIndex(prev => (prev + 1) % activeOffers.length);
      }, 5000);
      return () => clearInterval(interval);
  }, [activeOffers.length]);

  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsOwner(!!session);
    });
  }, []);

  useEffect(() => {
    const loadData = async () => {
        setIsLoading(true);
        try {
            const idToFetch = identifier || targetUserId;
            const fetchedConfig = await getRestaurantConfig(idToFetch || undefined);
            
            if (fetchedConfig.id) {
                setMenuOwnerId(fetchedConfig.id);
            }
            setCurrentConfig(fetchedConfig);
            setMenuDishes(fetchedConfig.dishes);
        } catch (error) {
            console.error("Failed to load menu data", error);
        } finally {
            setIsLoading(false);
        }
    };
    loadData();
  }, [identifier, targetUserId, initialConfig]);

  useEffect(() => {
    if (activeOffers.length > 0) {
        setActiveCategory('offers');
    } else {
        const firstAvailable = currentConfig.categories.find(c => c.isAvailable);
        if (firstAvailable) setActiveCategory(firstAvailable.id);
    }
  }, [currentConfig, activeOffers.length]);

  useEffect(() => {
    const handleScroll = () => {
      const sections = [];
      if (activeOffers.length > 0) sections.push('offers');
      currentConfig.categories.filter(c => c.isAvailable).forEach(c => sections.push(c.id));

      let current = '';
      for (const sectionId of sections) {
         const el = document.getElementById(`section-${sectionId}`);
         if (el) {
             const rect = el.getBoundingClientRect();
             if (rect.top >= 0 && rect.top < 300) {
                 current = sectionId;
                 break;
             }
         }
      }
      if (current && current !== activeCategory) {
        setActiveCategory(current);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [currentConfig.categories, activeCategory, activeOffers.length]);

  const scrollToCategory = (id: string) => {
    setActiveCategory(id);
    const element = document.getElementById(`section-${id}`);
    if (element) {
      const y = element.getBoundingClientRect().top + window.pageYOffset - 120;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const filteredDishes = (categoryId: string) => {
    return menuDishes.filter(d => 
      d.categoryId === categoryId && 
      d.isAvailable === true
    );
  };

  const addToCart = (dish: Dish, quantity: number = 1) => {
    if (!isOrderingEnabled) return;
    setCart(prev => {
      const existing = prev.find(item => item.dish.id === dish.id);
      if (existing) {
        return prev.map(item => item.dish.id === dish.id ? { ...item, quantity: item.quantity + quantity } : item);
      }
      return [...prev, { dish, quantity: 1 }];
    });
    setSelectedDish(null);
  };

   const handleOfferClick = (offer: Offer) => {
      const offerAsDish: Dish = {
          id: offer.id,
          name: offer.title,
          description: offer.description || t.offers,
          price: offer.price,
          image: offer.image,
          categoryId: 'offer',
          prepTime: 0, 
          isAvailable: true
      };
      setSelectedDish(offerAsDish);
  };

  const updateQuantity = (dishId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.dish.id === dishId) {
        return { ...item, quantity: Math.max(0, item.quantity + delta) };
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + (item.dish.price * item.quantity), 0);
  }, [cart]);

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName) return;
    if (orderType === 'dine_in' && !tableNumber) return;
    if (orderType === 'delivery' && (!customerPhone || !customerAddress)) return;

    if (!menuOwnerId) {
        alert("عذراً، لا يمكن إرسال الطلب في وضع المعاينة العامة.");
        return;
    }
    
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
        address: customerAddress
      });
      setCart([]);
      setIsCheckingOut(false);
      setIsCartOpen(false);
      setOrderSuccess(true);
      setTimeout(() => setOrderSuccess(false), 3000);
      setTableNumber('');
      setCustomerPhone('');
      setCustomerAddress('');
    } catch (error) {
      alert("حدث خطأ أثناء إرسال الطلب.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    if (isOwner) navigate('/select');
    else navigate('/');
  };

  const getSocialUrl = (platform: 'instagram' | 'facebook' | 'tiktok', handle: string) => {
      if (handle.startsWith('http')) return handle;
      switch(platform) {
          case 'instagram': return `https://instagram.com/${handle.replace('@', '')}`;
          case 'facebook': return `https://facebook.com/${handle}`;
          case 'tiktok': return `https://tiktok.com/@${handle.replace('@', '')}`;
          default: return '#';
      }
  };
  
  const checkIfOpen = (): boolean => {
      if (!currentConfig.workingHours) return true;
      const now = new Date();
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const currentDay = days[now.getDay()] as keyof WorkingHours;
      const schedule = currentConfig.workingHours[currentDay];
      if (!schedule || !schedule.isOpen) return false;
      const currentTime = now.getHours() * 60 + now.getMinutes();
      const [startH, startM] = schedule.start.split(':').map(Number);
      const startTime = startH * 60 + startM;
      const [endH, endM] = schedule.end.split(':').map(Number);
      let endTime = endH * 60 + endM;
      if (endTime < startTime) endTime += 24 * 60;
      return currentTime >= startTime && currentTime <= endTime;
  };
  
  const isOpen = checkIfOpen();
  const daysOrder: Array<keyof WorkingHours> = ['saturday', 'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
  
  const formatTime = (time: string) => {
      const [h, m] = time.split(':');
      let hour = parseInt(h);
      const ampm = hour >= 12 ? 'pm' : 'am';
      hour = hour % 12;
      hour = hour ? hour : 12;
      return `${hour < 10 ? '0'+hour : hour}:${m} ${ampm}`;
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-white flex flex-col items-center justify-center space-y-4">
             <Loader2 className="animate-spin text-primary" size={32} />
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 font-sans text-slate-900">
      {/* Header */}
      <div className="px-4 pt-4 flex justify-between items-center bg-white mb-2 z-30 relative">
         <div className="w-8"></div>
         <button onClick={handleExit} className="bg-gray-50 text-gray-400 p-2 rounded-xl border border-gray-100">
             {isOwner ? <LogOut size={18} /> : <ArrowRight size={18} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} />}
        </button>
      </div>

      <div className="px-4 max-w-md mx-auto">
        
        {/* Cover Section */}
        <div className="mb-6">
          <div className="w-full relative rounded-3xl overflow-hidden aspect-[2/1] shadow-sm bg-gray-100 border border-gray-50">
              {activeOffers.length > 0 ? (
                  <>
                      <div className="absolute inset-0 flex transition-transform duration-500 ease-out" style={{ transform: `translateX(${language === 'ar' ? '' : '-'}${currentOfferIndex * 100}%)` }}>
                          {activeOffers.map((offer) => (
                               <img key={offer.id} src={offer.image} alt={offer.title} className="w-full h-full object-cover shrink-0 cursor-pointer" onClick={() => handleOfferClick(offer)} />
                          ))}
                      </div>
                      <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10">
                          {activeOffers.map((_, idx) => (
                              <div key={idx} className={`h-1 rounded-full transition-all ${currentOfferIndex === idx ? 'bg-white w-4' : 'bg-white/40 w-1'}`} />
                          ))}
                      </div>
                  </>
              ) : (
                  <img src={currentConfig.coverImage} alt="Cover" className="w-full h-full object-cover" />
              )}
          </div>
        </div>

        {/* Info & Profile */}
        <div className="flex flex-col items-center mb-6 text-center">
            <div className="-mt-14 w-24 h-24 rounded-3xl border-4 border-white bg-white shadow-md overflow-hidden mb-3">
                <img src={currentConfig.logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-xl font-black text-gray-900 mb-1">{currentConfig.name}</h1>
            
            <div className="flex items-center gap-2 mb-3">
              {isOrderingEnabled && (
                  <button onClick={() => setIsHoursModalOpen(true)} className={`text-[10px] font-bold px-2 py-1 rounded-lg border flex items-center gap-1 ${isOpen ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      {isOpen ? t.openNow : t.closedNow}
                      <Clock size={10} />
                  </button>
              )}
            </div>

            {isOrderingEnabled && (
                <div className="flex bg-gray-100 p-1 rounded-xl w-fit">
                    <button onClick={() => setOrderType('dine_in')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all ${orderType === 'dine_in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                        <Utensils size={12} /> {t.dineIn}
                    </button>
                    <button onClick={() => setOrderType('delivery')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 transition-all ${orderType === 'delivery' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'}`}>
                        <Bike size={12} /> {t.delivery}
                    </button>
                </div>
            )}
        </div>

        {/* Social Icons */}
        <div className="flex justify-center gap-3 mb-6">
             {currentConfig.socials.instagram && (
                 <a href={getSocialUrl('instagram', currentConfig.socials.instagram)} target="_blank" rel="noreferrer" className="text-gray-400 bg-white p-2 rounded-xl border border-gray-100 shadow-sm"><Instagram size={18} /></a>
             )}
             {currentConfig.socials.facebook && (
                 <a href={getSocialUrl('facebook', currentConfig.socials.facebook)} target="_blank" rel="noreferrer" className="text-gray-400 bg-white p-2 rounded-xl border border-gray-100 shadow-sm"><Facebook size={18} /></a>
             )}
             {currentConfig.socials.tiktok && (
                 <a href={getSocialUrl('tiktok', currentConfig.socials.tiktok)} target="_blank" rel="noreferrer" className="text-gray-400 bg-white p-2 rounded-xl border border-gray-100 shadow-sm"><TikTokIcon /></a>
             )}
        </div>

        {/* Category Navbar */}
        <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md py-3 -mx-4 px-4 border-b border-gray-50 mb-4">
          <div className="flex overflow-x-auto no-scrollbar gap-2">
            {activeOffers.length > 0 && (
                <button onClick={() => scrollToCategory('offers')} className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 border ${activeCategory === 'offers' ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                <Flame size={12} className={activeCategory === 'offers' ? 'text-orange-400' : ''} />
                {t.offers}
              </button>
            )}
            {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
              <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-4 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${activeCategory === cat.id ? 'bg-black text-white border-black' : 'bg-gray-50 text-gray-400 border-gray-100'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items List - Compact Style */}
        <div className="space-y-8">
          {activeOffers.length > 0 && (
              <div id="section-offers" className="scroll-mt-24">
                  <h2 className="text-sm font-black mb-4 text-gray-900 uppercase tracking-wide">{t.offers}</h2>
                  <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50">
                      {activeOffers.map(offer => (
                          <div key={offer.id} onClick={() => handleOfferClick(offer)} className="flex items-center gap-3 p-3 active:bg-gray-50 transition-colors">
                              <img src={offer.image} className="w-16 h-16 rounded-lg object-cover" alt="" />
                              <div className="flex-1 min-w-0">
                                  <h3 className="font-bold text-gray-900 text-xs mb-0.5 truncate">{offer.title}</h3>
                                  <p className="text-gray-400 text-[10px] line-clamp-1">{offer.description || t.offers}</p>
                                  <div className="text-orange-500 font-bold text-xs mt-1">{offer.price} {currentConfig.currency}</div>
                              </div>
                          </div>
                      ))}
                  </div>
              </div>
          )}

          {currentConfig.categories.filter(c => c.isAvailable).map(cat => {
            const dishes = filteredDishes(cat.id);
            if (dishes.length === 0) return null;
            return (
              <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-24">
                <h2 className="text-sm font-black mb-4 text-gray-900 uppercase tracking-wide">{cat.name}</h2>
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-50 shadow-[0_2px_15px_-3px_rgba(0,0,0,0.02)]">
                  {dishes.map(dish => (
                    <div key={dish.id} onClick={() => setSelectedDish(dish)} className="flex items-center gap-3 p-3 active:bg-gray-50 transition-colors">
                        <img src={dish.image} className="w-16 h-16 rounded-lg object-cover" alt="" />
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-gray-900 text-xs mb-0.5 truncate">{dish.name}</h4>
                            <p className="text-gray-400 text-[10px] line-clamp-2 leading-tight">{dish.description}</p>
                            <div className="text-orange-500 font-bold text-xs mt-1">{dish.price} {currentConfig.currency}</div>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="fixed bottom-6 left-0 right-0 px-4 flex justify-between items-center z-40 pointer-events-none">
            {currentConfig.socials.whatsapp && (
              <a href={`https://wa.me/${currentConfig.socials.whatsapp}`} target="_blank" rel="noreferrer" className="pointer-events-auto bg-[#25D366] rounded-2xl shadow-lg flex items-center justify-center w-12 h-12"><WhatsAppIcon /></a>
            )}
            {isOrderingEnabled && cart.length > 0 && (
              <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto bg-black text-white px-4 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-gray-800">
                <div className="bg-orange-500 text-white w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
                <span className="font-bold text-[11px]">{t.viewOrder}</span>
                <span className="font-bold text-[11px] text-orange-400">{cartTotal} {currentConfig.currency}</span>
              </button>
            )}
        </div>
      </div>

      {/* Modals & Popups (Working as before but smaller) */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm px-4 pb-4 animate-in fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-white w-full max-w-sm rounded-[2rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="font-black text-sm flex items-center gap-2"><ShoppingBag className="text-orange-500" size={18} /> {t.cart}</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-1.5 bg-gray-50 text-gray-400 rounded-lg"><X size={18} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[50vh]">
              {cart.map(item => (
                <div key={item.dish.id} className="flex gap-3 items-center">
                  <img src={item.dish.image} className="w-12 h-12 rounded-lg object-cover" alt="" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-[11px] truncate">{item.dish.name}</h4>
                    <p className="text-orange-500 font-bold text-[10px]">{item.dish.price} {currentConfig.currency}</p>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button onClick={() => updateQuantity(item.dish.id, -1)} className="p-1 bg-white rounded-md shadow-sm"><Minus size={12} /></button>
                    <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.dish.id, 1)} className="p-1 bg-white rounded-md shadow-sm"><Plus size={12} /></button>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t bg-gray-50/50 rounded-b-[2rem]">
              <div className="flex justify-between items-center mb-4">
                <span className="text-gray-400 text-[10px] font-bold">{t.total}</span>
                <span className="font-black text-lg">{cartTotal} {currentConfig.currency}</span>
              </div>
              {isCheckingOut ? (
                <form onSubmit={handleCheckout} className="space-y-3">
                  <input required placeholder={t.namePlaceholder} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:border-black outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  {orderType === 'dine_in' ? (
                      <input required placeholder={t.tablePlaceholder} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:border-black outline-none" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                  ) : (
                      <input required type="tel" placeholder={t.phonePlaceholder} className="w-full bg-white border border-gray-100 rounded-xl px-4 py-3 text-xs font-bold focus:border-black outline-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                  )}
                  <button type="submit" className="w-full py-4 bg-black text-white text-xs font-black rounded-xl">{isSubmitting ? t.sending : t.confirmOrder}</button>
                </form>
              ) : (
                <button onClick={() => setIsCheckingOut(true)} className="w-full py-4 bg-black text-white text-xs font-black rounded-xl">{t.completeOrder}</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Item Details Popover (Smaller) */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in" onClick={() => setSelectedDish(null)}>
          <div className="bg-white w-full max-w-sm rounded-[2.5rem] overflow-hidden shadow-2xl animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="relative h-48">
               <img src={selectedDish.image} alt={selectedDish.name} className="w-full h-full object-cover" />
               <button onClick={() => setSelectedDish(null)} className="absolute top-4 right-4 bg-white/90 p-2 rounded-xl text-gray-900"><X size={18} /></button>
            </div>
            <div className="p-6">
              <h2 className="text-xl font-black mb-1">{selectedDish.name}</h2>
              <div className="text-orange-500 font-black text-lg mb-4">{selectedDish.price} {currentConfig.currency}</div>
              <p className="text-gray-400 text-xs leading-relaxed mb-6">{selectedDish.description}</p>
              <button onClick={() => addToCart(selectedDish)} disabled={!isOrderingEnabled} className={`w-full py-4 rounded-xl font-black text-xs shadow-lg transition-all ${isOrderingEnabled ? 'bg-black text-white active:scale-95' : 'bg-gray-100 text-gray-400'}`}>
                {isOrderingEnabled ? t.addToOrder : t.orderingDisabled}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {orderSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-2xl flex flex-col items-center text-center max-w-xs mx-6">
            <CheckCircle size={48} className="text-green-500 mb-4" />
            <h3 className="text-xl font-black mb-2">{t.orderSuccess}</h3>
            <p className="text-gray-400 font-bold text-xs">{t.orderSuccessMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
