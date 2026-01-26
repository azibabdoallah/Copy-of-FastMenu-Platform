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
    <div className="min-h-screen bg-[#F9FAFB] pb-24 font-sans text-slate-900">
      {/* Header & Exit Button */}
      <div className="px-5 pt-6 flex justify-between items-center mb-4 z-30 relative">
         <div className="w-10"></div>
         <button onClick={handleExit} className="bg-white text-gray-400 p-2.5 rounded-2xl shadow-sm border border-gray-100 hover:bg-gray-50 transition-all">
             {isOwner ? <LogOut size={20} /> : <ArrowRight size={20} className={language === 'ar' ? 'rotate-0' : 'rotate-180'} />}
        </button>
      </div>

      {/* Main Container for spacing */}
      <div className="px-5 max-w-md mx-auto">
        
        {/* Cover or Offers Slider */}
        <div className="mb-8">
          <div className="w-full relative rounded-[2.5rem] overflow-hidden aspect-[1.8/1] shadow-xl bg-gray-200">
              {activeOffers.length > 0 ? (
                  <>
                      <div className="absolute inset-0 flex transition-transform duration-700 ease-in-out" style={{ transform: `translateX(${language === 'ar' ? '' : '-'}${currentOfferIndex * 100}%)` }}>
                          {activeOffers.map((offer) => (
                               <img key={offer.id} src={offer.image} alt={offer.title} className="w-full h-full object-cover shrink-0 cursor-pointer" onClick={() => handleOfferClick(offer)} />
                          ))}
                      </div>
                      <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-10">
                          {activeOffers.map((_, idx) => (
                              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${currentOfferIndex === idx ? 'bg-white w-6' : 'bg-white/40 w-1.5'}`} />
                          ))}
                      </div>
                  </>
              ) : (
                  <img src={currentConfig.coverImage} alt="Cover" className="w-full h-full object-cover" />
              )}
          </div>
        </div>

        {/* Restaurant Info Section */}
        <div className="flex flex-col items-center mb-8 text-center relative z-10">
            <div className="-mt-16 w-28 h-28 rounded-[2rem] border-8 border-[#F9FAFB] bg-white shadow-2xl overflow-hidden mb-4">
                <img src={currentConfig.logo} alt="Logo" className="w-full h-full object-cover" />
            </div>
            <h1 className="text-2xl font-black text-gray-900 mb-2 leading-tight">{currentConfig.name}</h1>
            
            <div className="flex flex-wrap justify-center items-center gap-3 mb-4">
              {isOrderingEnabled && (
                  <button onClick={() => setIsHoursModalOpen(true)} className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-1.5 transition-all ${isOpen ? 'bg-green-50 text-green-600 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                      {isOpen ? t.openNow : t.closedNow}
                      <Clock size={12} />
                  </button>
              )}
              {currentConfig.socials.googleMaps && (
                  <a href={currentConfig.socials.googleMaps} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 bg-amber-50 text-amber-600 border border-amber-100 px-3 py-1.5 rounded-full text-[11px] font-bold">
                      <Star size={12} className="fill-amber-600" />
                      <span>{t.rateExp}</span>
                  </a>
              )}
            </div>

            {isOrderingEnabled && (
                <div className="flex bg-gray-200/50 p-1 rounded-2xl border border-gray-100 w-fit">
                    <button onClick={() => setOrderType('dine_in')} className={`px-5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all ${orderType === 'dine_in' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}>
                        <Utensils size={14} /> {t.dineIn}
                    </button>
                    <button onClick={() => setOrderType('delivery')} className={`px-5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 transition-all ${orderType === 'delivery' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400'}`}>
                        <Bike size={14} /> {t.delivery}
                    </button>
                </div>
            )}
        </div>

        {/* Floating Social Icons */}
        <div className="flex justify-center gap-4 mb-10">
             {currentConfig.socials.instagram && (
                 <a href={getSocialUrl('instagram', currentConfig.socials.instagram)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-pink-600 bg-white p-3 rounded-2xl shadow-sm border border-gray-50 transition-all hover:scale-110"><Instagram size={20} /></a>
             )}
             {currentConfig.socials.facebook && (
                 <a href={getSocialUrl('facebook', currentConfig.socials.facebook)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600 bg-white p-3 rounded-2xl shadow-sm border border-gray-50 transition-all hover:scale-110"><Facebook size={20} /></a>
             )}
             {currentConfig.socials.tiktok && (
                 <a href={getSocialUrl('tiktok', currentConfig.socials.tiktok)} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-black bg-white p-3 rounded-2xl shadow-sm border border-gray-50 transition-all hover:scale-110"><TikTokIcon /></a>
             )}
        </div>

        {/* Categories Navigation (Capsule Style) */}
        <div className="sticky top-0 z-20 bg-[#F9FAFB]/90 backdrop-blur-md py-4 -mx-5 px-5 mb-4">
          <div className="flex overflow-x-auto no-scrollbar gap-2.5">
            {activeOffers.length > 0 && (
                <button onClick={() => scrollToCategory('offers')} className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 border ${activeCategory === 'offers' ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                <Flame size={14} className={activeCategory === 'offers' ? 'fill-orange-400 text-orange-400' : 'text-gray-400'} />
                {t.offers}
              </button>
            )}
            {currentConfig.categories.filter(c => c.isAvailable).map(cat => (
              <button key={cat.id} onClick={() => scrollToCategory(cat.id)} className={`whitespace-nowrap px-6 py-2.5 rounded-2xl text-xs font-bold transition-all border ${activeCategory === cat.id ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-white text-gray-400 border-gray-100 hover:bg-gray-50'}`}>
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items List */}
        <div className="space-y-12">
          {activeOffers.length > 0 && (
              <div id="section-offers" className="scroll-mt-28">
                  <h2 className="text-xl font-black mb-6 text-gray-900 flex items-center gap-3">
                    <span className="w-1.5 h-6 bg-orange-500 rounded-full" />
                    {t.offers}
                  </h2>
                  <div className="grid gap-6">
                      {activeOffers.map(offer => (
                          <div key={offer.id} onClick={() => handleOfferClick(offer)} className="bg-white p-4 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-50 flex gap-4 active:scale-95 transition-all">
                              <img src={offer.image} className="w-24 h-24 rounded-[1.5rem] object-cover" alt="" />
                              <div className="flex flex-col justify-center flex-1">
                                  <h3 className="font-bold text-gray-900 text-base mb-1">{offer.title}</h3>
                                  <p className="text-gray-400 text-xs line-clamp-2 mb-2 leading-relaxed">{offer.description || t.offers}</p>
                                  <span className="text-orange-500 font-black text-lg">{offer.price} <span className="text-xs font-medium opacity-70">{currentConfig.currency}</span></span>
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
              <div key={cat.id} id={`section-${cat.id}`} className="scroll-mt-28">
                <h2 className="text-xl font-black mb-6 text-gray-900 flex items-center gap-3">
                   <span className="w-1.5 h-6 bg-orange-500 rounded-full" />
                   {cat.name}
                </h2>
                <div className="grid gap-6">
                  {dishes.map(dish => (
                    <div key={dish.id} onClick={() => setSelectedDish(dish)} className="bg-white p-4 rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.03)] border border-gray-50 flex gap-4 active:scale-95 transition-all">
                        <img src={dish.image} className="w-24 h-24 rounded-[1.5rem] object-cover shadow-sm" alt="" />
                        <div className="flex flex-col justify-center flex-1">
                            <h4 className="font-bold text-gray-900 text-base mb-1">{dish.name}</h4>
                            <p className="text-gray-400 text-xs line-clamp-2 mb-2 leading-relaxed">{dish.description}</p>
                            <span className="text-orange-500 font-black text-lg">{dish.price} <span className="text-xs font-medium opacity-70">{currentConfig.currency}</span></span>
                        </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* WhatsApp & Cart Floating Buttons */}
        <div className="fixed bottom-8 left-0 right-0 px-6 flex justify-between items-center pointer-events-none z-40">
            {currentConfig.socials.whatsapp && (
              <a href={`https://wa.me/${currentConfig.socials.whatsapp}`} target="_blank" rel="noreferrer" className="pointer-events-auto bg-[#25D366] rounded-2xl shadow-2xl hover:scale-110 transition-transform flex items-center justify-center w-14 h-14"><WhatsAppIcon /></a>
            )}
            {isOrderingEnabled && cart.length > 0 && (
              <button onClick={() => setIsCartOpen(true)} className="pointer-events-auto bg-black text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom border border-gray-800">
                <div className="bg-orange-500 text-white w-6 h-6 flex items-center justify-center rounded-xl text-xs font-bold">{cart.reduce((a, b) => a + b.quantity, 0)}</div>
                <span className="font-bold text-sm">{t.viewOrder}</span>
                <span className="font-black text-sm text-orange-400">{cartTotal} {currentConfig.currency}</span>
              </button>
            )}
        </div>
      </div>

      {/* Modals & Overlays (Styled to match) */}
      {isHoursModalOpen && currentConfig.workingHours && (
         <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsHoursModalOpen(false)}>
             <div className="bg-white w-full max-w-sm mx-5 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
                 <div className="p-6 border-b flex justify-between items-center bg-gray-50/50">
                     <h3 className="font-black text-lg flex items-center gap-3"><Clock className="text-orange-500" size={24} /> {t.workingHours}</h3>
                     <button onClick={() => setIsHoursModalOpen(false)} className="bg-gray-200 p-2 rounded-xl text-gray-500 hover:bg-gray-300 transition-all"><X size={20} /></button>
                 </div>
                 <div className="p-4 bg-white">
                     {daysOrder.map(day => {
                         const schedule = currentConfig.workingHours[day];
                         return (
                             <div key={day} className="flex justify-between items-center p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 rounded-2xl transition-all">
                                 <span className="font-bold text-gray-700">{t[day]}</span>
                                 <span className={`text-xs font-black px-3 py-1 rounded-lg ${schedule.isOpen ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>{schedule.isOpen ? `${formatTime(schedule.start)} - ${formatTime(schedule.end)}` : t.closed}</span>
                             </div>
                         );
                     })}
                 </div>
             </div>
         </div>
      )}

      {/* Redesigned Cart Sidebar/Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-end md:justify-center bg-black/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsCartOpen(false)}>
          <div className="bg-[#F9FAFB] w-full md:w-[450px] md:h-[90vh] h-[85vh] md:rounded-[3rem] rounded-t-[3rem] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
            <div className="p-6 border-b flex justify-between items-center bg-white rounded-t-[3rem]">
              <h2 className="font-black text-xl flex items-center gap-3"><ShoppingBag className="text-orange-500" /> {t.cart}</h2>
              <button onClick={() => setIsCartOpen(false)} className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-500 rounded-2xl transition-all"><X size={24} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {cart.map(item => (
                <div key={item.dish.id} className="flex gap-4 items-center bg-white p-4 rounded-3xl shadow-sm border border-gray-50">
                  <img src={item.dish.image} className="w-16 h-16 rounded-2xl object-cover" alt="" />
                  <div className="flex-1">
                    <h4 className="font-bold text-sm text-gray-900 line-clamp-1">{item.dish.name}</h4>
                    <p className="text-orange-500 font-black text-sm">{item.dish.price} {currentConfig.currency}</p>
                  </div>
                  <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-1 border border-gray-100">
                    <button onClick={() => updateQuantity(item.dish.id, -1)} className="p-2 hover:bg-white rounded-xl text-red-500 transition-all shadow-sm"><Minus size={14} /></button>
                    <span className="text-sm font-black w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.dish.id, 1)} className="p-2 hover:bg-white rounded-xl text-green-600 transition-all shadow-sm"><Plus size={14} /></button>
                  </div>
                </div>
              ))}
              {cart.length === 0 && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                  <ShoppingBag size={64} className="mb-4 opacity-20" />
                  <p className="font-bold">{t.emptyCart}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t bg-white rounded-b-[3rem] shadow-inner">
              <div className="flex justify-between items-center mb-6">
                <span className="text-gray-400 font-bold">{t.total}</span>
                <span className="font-black text-2xl text-gray-900">{cartTotal} <span className="text-sm text-gray-400 font-bold">{currentConfig.currency}</span></span>
              </div>
              
              {isCheckingOut ? (
                <form onSubmit={handleCheckout} className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between mb-2">
                      <span className="font-black text-xs text-gray-500 uppercase tracking-wider">{t.orderType}</span>
                      <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl shadow-sm border border-gray-100">
                        {orderType === 'dine_in' ? <Utensils size={14} className="text-orange-500"/> : <Bike size={14} className="text-orange-500"/>}
                        <span className="font-black text-xs">{orderType === 'dine_in' ? t.dineIn : t.delivery}</span>
                      </div>
                  </div>
                  <input required placeholder={t.namePlaceholder} className="w-full bg-gray-50 border-gray-100 border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:border-black transition-all outline-none" value={customerName} onChange={e => setCustomerName(e.target.value)} />
                  {orderType === 'dine_in' ? (
                      <input required placeholder={t.tablePlaceholder} className="w-full bg-gray-50 border-gray-100 border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:border-black transition-all outline-none" value={tableNumber} onChange={e => setTableNumber(e.target.value)} />
                  ) : (
                      <div className="space-y-4">
                        <input required type="tel" placeholder={t.phonePlaceholder} className="w-full bg-gray-50 border-gray-100 border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:border-black transition-all outline-none" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} />
                        <textarea required placeholder={t.addressPlaceholder} className="w-full bg-gray-50 border-gray-100 border-2 rounded-2xl px-5 py-4 text-sm font-bold focus:border-black transition-all outline-none h-24 resize-none" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
                      </div>
                  )}
                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setIsCheckingOut(false)} className="flex-1 py-4 text-gray-400 text-sm font-black hover:bg-gray-50 rounded-2xl transition-all">{t.back}</button>
                    <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-black text-white text-sm font-black rounded-2xl shadow-xl hover:bg-gray-800 disabled:opacity-50 transition-all active:scale-95">{isSubmitting ? t.sending : t.confirmOrder}</button>
                  </div>
                </form>
              ) : (
                <button onClick={() => setIsCheckingOut(true)} disabled={cart.length === 0} className="w-full py-5 bg-black text-white font-black rounded-[2rem] shadow-2xl hover:bg-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-3">
                  {t.completeOrder}
                  <ArrowRight size={20} className={language === 'ar' ? 'rotate-180' : ''} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderSuccess && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in">
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl flex flex-col items-center text-center max-w-sm mx-6 animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-50 text-green-500 rounded-[2rem] flex items-center justify-center mb-6 shadow-inner"><CheckCircle size={48} /></div>
            <h3 className="text-2xl font-black mb-3 text-gray-900">{t.orderSuccess}</h3>
            <p className="text-gray-400 font-bold text-sm leading-relaxed">{t.orderSuccessMsg}</p>
          </div>
        </div>
      )}

      {/* Dish Details Modal */}
      {selectedDish && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/60 p-0 md:p-6 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setSelectedDish(null)}>
          <div className="bg-white w-full md:max-w-2xl md:rounded-[3rem] rounded-t-[3rem] overflow-hidden max-h-[92vh] flex flex-col shadow-2xl animate-in slide-in-from-bottom duration-500" onClick={e => e.stopPropagation()}>
            <div className="relative h-80 shrink-0">
               <img src={selectedDish.image} alt={selectedDish.name} className="w-full h-full object-cover" />
               <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
               <button onClick={() => setSelectedDish(null)} className="absolute top-6 right-6 bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-xl text-gray-900 hover:scale-110 transition-all"><X size={24} /></button>
            </div>
            <div className="p-8 flex-1 overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-3xl font-black text-gray-900 leading-tight">{selectedDish.name}</h2>
                <div className="bg-orange-50 px-4 py-2 rounded-2xl">
                    <span className="text-2xl font-black text-orange-500">{selectedDish.price} <span className="text-xs opacity-70">{currentConfig.currency}</span></span>
                </div>
              </div>
              <p className="text-gray-400 font-bold leading-loose mb-8 text-sm">{selectedDish.description}</p>
              
              <div className="flex items-center gap-4 pt-4 mt-auto border-t border-gray-50">
                  <button onClick={() => addToCart(selectedDish)} disabled={!isOrderingEnabled} className={`flex-1 font-black py-5 rounded-[2rem] shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isOrderingEnabled ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                    <ShoppingBag size={24} />
                    {isOrderingEnabled ? t.addToOrder : t.orderingDisabled}
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerMenu;
