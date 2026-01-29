import { RestaurantConfig } from './types';

export const DEFAULT_CONFIG: RestaurantConfig = {
  name: 'مطعمي الجديد',
  description: 'أهلاً بكم في مطعمنا، نقدم لكم أشهى المأكولات بجودة عالية.',
  logo: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c',
  coverImage: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836',
  currency: 'DA',
  primaryColor: '#FFD700', // اللون الذهبي الافتراضي
  categoryStyle: 'grid',
  isOrderingEnabled: true,
  isDeliveryEnabled: true,
  socials: {},
  categories: [],
  dishes: [],
  offers: [],
  languages: ['ar'],
  workingHours: {
    saturday: { isOpen: true, start: '09:00', end: '23:00' },
    sunday: { isOpen: true, start: '09:00', end: '23:00' },
    monday: { isOpen: true, start: '09:00', end: '23:00' },
    tuesday: { isOpen: true, start: '09:00', end: '23:00' },
    wednesday: { isOpen: true, start: '09:00', end: '23:00' },
    thursday: { isOpen: true, start: '09:00', end: '23:00' },
    friday: { isOpen: true, start: '16:00', end: '23:00' },
  }
};

export const TRANSLATIONS = {
  ar: {
    dashboard: 'لوحة التحكم',
    menu: 'قائمة الطعام',
    settings: 'الإعدادات',
    orders: 'الطلبات',
    analytics: 'الإحصائيات',
    delivery: 'توصيل',
    dineIn: 'داخل المطعم',
    total: 'المجموع',
    cart: 'السلة',
    completeOrder: 'إتمام الطلب',
    namePlaceholder: 'الاسم الكامل',
    tablePlaceholder: 'رقم الطاولة',
    phonePlaceholder: 'رقم الهاتف',
    addressPlaceholder: 'عنوان التوصيل',
    orderSuccess: 'تم إرسال طلبك بنجاح!',
    orderSuccessMsg: 'سوف نقوم بتجهيز طلبك في أقرب وقت ممكن.',
    securityCode: 'رمز الأمان',
    verificationPlaceholder: 'أدخل الـ 4 أرقام من الطاولة',
    // أضف أي ترجمات أخرى تحتاجها هنا
    saturday: 'السبت',
    sunday: 'الأحد',
    monday: 'الاثنين',
    tuesday: 'الثلاثاء',
    wednesday: 'الأربعاء',
    thursday: 'الخميس',
    friday: 'الجمعة',
    closed: 'مغلق',
    openNow: 'مفتوح الآن',
    closedNow: 'مغلق الآن'
  },
  fr: {
    dashboard: 'Tableau de bord',
    menu: 'Menu',
    settings: 'Paramètres',
    orders: 'Commandes',
    analytics: 'Statistiques',
    delivery: 'Livraison',
    dineIn: 'Sur place',
    total: 'Total',
    cart: 'Panier',
    completeOrder: 'Commander',
    securityCode: 'Code de sécurité',
    // أضف الترجمة الفرنسية هنا
  }
};
