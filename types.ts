
export type Language = 'ar' | 'fr';

export interface Dish {
  id: string;
  categoryId: string; // Foreign Key to categories table
  name: string;
  description: string;
  price: number;
  image: string;
  prepTime: number; // in minutes
  isAvailable: boolean;
  calories?: number;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  isAvailable: boolean; // Added isAvailable
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  whatsapp?: string;
  googleMaps?: string;
}

export interface Offer {
  id: string;
  title: string;
  description?: string;
  price: number;
  originalPrice?: number;
  image: string;
  active: boolean;
}

export interface DaySchedule {
  isOpen: boolean;
  start: string;
  end: string;
}

export interface WorkingHours {
  saturday: DaySchedule;
  sunday: DaySchedule;
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
}

export interface RestaurantConfig {
  id?: string; // المعرف الحقيقي للمطعم من قاعدة البيانات
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  currency: string;
  primaryColor: string;
  socials: SocialLinks;
  categories: Category[];
  dishes: Dish[];
  offers: Offer[];
  languages: Language[];
  workingHours: WorkingHours;
  isOrderingEnabled: boolean;
  isDeliveryEnabled?: boolean; // حقل جديد للتحكم في خدمة التوصيل
}

export interface CartItem {
  dish: Dish;
  quantity: number;
}

export interface Order {
  id?: number;
  restaurant_id: string;
  customer_name: string;
  table_number: string;
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  created_at?: string;
  type?: 'dine_in' | 'delivery';
  phone?: string;
  address?: string;
  verification_code?: string;
}
