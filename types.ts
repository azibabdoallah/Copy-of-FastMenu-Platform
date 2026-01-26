
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
  // user_id is handled by backend RLS, but conceptually exists
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
  description?: string; // Optional now
  price: number;        // Current Price (Discounted)
  originalPrice?: number; // Old Price (Before Discount)
  image: string;        // Added image
  active: boolean;
}

export interface DaySchedule {
  isOpen: boolean;
  start: string; // "09:00"
  end: string;   // "23:00"
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
  name: string;
  logo: string;
  coverImage: string;
  description: string;
  currency: string;
  primaryColor: string;
  socials: SocialLinks;
  categories: Category[]; // Fetched from 'categories' table
  dishes: Dish[];         // Fetched from 'items' table
  offers: Offer[];
  languages: Language[];
  workingHours: WorkingHours; // Added working hours
  isOrderingEnabled: boolean; // Controls if customers can place orders
}

export interface CartItem {
  dish: Dish;
  quantity: number;
}

export interface Order {
  id?: number;
  restaurant_id: string; // Links order to a specific restaurant owner
  customer_name: string;
  table_number: string; // Used for Table # OR "Delivery" label
  items: CartItem[];
  total: number;
  status: 'pending' | 'preparing' | 'completed' | 'cancelled';
  created_at?: string;
  // Delivery Fields
  type?: 'dine_in' | 'delivery';
  phone?: string;
  address?: string;
  // Anti-spam
  verification_code?: string;
}