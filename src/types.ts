export type Language = 'ar' | 'fr';

export interface WorkingHours {
  isOpen: boolean;
  start: string;
  end: string;
}

export interface Category {
  id: string;
  name: string;
  image?: string;
  isAvailable: boolean;
}

export interface Dish {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  price: number;
  image: string;
  prepTime: number;
  isAvailable: boolean;
  calories?: number;
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

export interface RestaurantConfig {
  id?: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  currency: string;
  primaryColor: string; // التعديل الجديد للون
  categoryStyle: 'grid' | 'list'; // التعديل الجديد لشكل الأقسام
  isOrderingEnabled: boolean;
  isDeliveryEnabled: boolean; // التعديل الجديد للتوصيل
  socials: {
    whatsapp?: string;
    instagram?: string;
    facebook?: string;
    tiktok?: string;
    googleMaps?: string;
  };
  categories: Category[];
  dishes: Dish[];
  offers: Offer[];
  languages: Language[];
  workingHours: {
    [key: string]: WorkingHours;
  };
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
  type: 'dine_in' | 'delivery';
  phone?: string;
  address?: string;
  verification_code?: string; // التعديل الجديد لرمز الأمان
  created_at?: string;
}
