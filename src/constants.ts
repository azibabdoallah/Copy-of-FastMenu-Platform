import { RestaurantConfig } from './types';

const defaultSchedule = { isOpen: true, start: "09:00", end: "23:00" };

export const DEFAULT_CONFIG: RestaurantConfig = {
  name: "اسم المطعم",
  description: "وصف المطعم يظهر هنا للزبائن.",
  logo: "https://via.placeholder.com/200", 
  coverImage: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=1000&auto=format&fit=crop",
  currency: "ر.س",
  primaryColor: "#fbbf24", 
  languages: ['ar'],
  isOrderingEnabled: true,
  socials: {
    whatsapp: "",
    instagram: "",
    facebook: "",
    tiktok: "",
    googleMaps: "",
  },
  workingHours: {
    saturday: { ...defaultSchedule },
    sunday: { ...defaultSchedule },
    monday: { ...defaultSchedule },
    tuesday: { ...defaultSchedule },
    wednesday: { ...defaultSchedule },
    thursday: { ...defaultSchedule },
    friday: { isOpen: true, start: "13:00", end: "23:00" },
  },
  offers: [], // تم تنظيف العروض
  categories: [], // تم تنظيف الأصناف
  dishes: [] // تم تنظيف الأطباق
};

export const TRANSLATIONS = {
  ar: {
    // (أبقِ جميع الترجمات كما هي في الكود الذي أرسلته لي)
    openNow: "مفتوح الآن",
    closedNow: "مغلق الآن",
    // ... باقي الترجمات العربية
  },
  fr: {
    // (أبقِ جميع الترجمات كما هي في الكود الذي أرسلته لي)
    openNow: "Ouvert maintenant",
    closedNow: "Fermé maintenant",
    // ... باقي الترجمات الفرنسية
  }
};
