import { RestaurantConfig, Dish, Category } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { supabase } from './supabase';

const LOCAL_STORAGE_KEY = 'restaurant_config';
const ORDERS_STORAGE_KEY = 'restaurant_orders'; 

// --- SECURITY HELPER: Clear Local Data ---
export const clearLocalData = () => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(ORDERS_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear local data", e);
    }
};

// --- HELPER: Get Current User or Target User ---
const getUserId = async (targetUserId?: string): Promise<string | null> => {
    if (targetUserId) return targetUserId;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.user?.id || null;
    } catch (e) {
        return null;
    }
};

// --- HELPER: Local Storage Utils ---
const getLocalConfig = (): RestaurantConfig => {
    try {
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        const parsed = local ? JSON.parse(local) : DEFAULT_CONFIG;
        // Merge with DEFAULT_CONFIG to ensure structure exists
        return { 
            ...DEFAULT_CONFIG, 
            ...parsed, 
            categories: parsed.categories || [], 
            dishes: parsed.dishes || [],
            offers: parsed.offers || []
        };
    } catch (e) {
        return DEFAULT_CONFIG;
    }
};

const setLocalConfig = (config: RestaurantConfig) => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error("Failed to save to local storage", e);
    }
};

// --- 1. PROFILES (Settings) ---

export const getRestaurantConfig = async (targetUserId?: string): Promise<RestaurantConfig> => {
  // Always start with local config
  let config: RestaurantConfig = getLocalConfig();
  
  try {
    const uid = await getUserId(targetUserId);
    
    // If no user and no target, just return local
    if (!uid) return config;

    // A. Fetch Profile
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('restaurant_name, description, logo_url, cover_url, settings')
        .eq('id', uid)
        .maybeSingle();

    if (profileError && profileError.code !== 'PGRST116') throw profileError;

    if (profileData) {
        const settings = profileData.settings || {};
        config = {
            ...config,
            name: profileData.restaurant_name ?? config.name,
            description: profileData.description ?? config.description,
            logo: profileData.logo_url ?? config.logo,
            coverImage: profileData.cover_url ?? config.coverImage,
            currency: settings.currency ?? config.currency,
            primaryColor: settings.primaryColor ?? config.primaryColor,
            isOrderingEnabled: settings.isOrderingEnabled ?? config.isOrderingEnabled ?? true,
            socials: { ...config.socials, ...(settings.socials || {}) },
            offers: settings.offers ?? config.offers,
            languages: settings.languages ?? config.languages,
            // Merge working hours, fallback to default if missing in DB
            workingHours: settings.workingHours ?? config.workingHours
        };
    }

    // B. Fetch Categories
    const { data: categoriesData } = await supabase
        .from('categories')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: true });

    if (categoriesData) {
        config.categories = categoriesData.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            image: c.image,
            // Default to true if column is missing or data is null
            isAvailable: c.is_available !== false
        }));
    }

    // C. Fetch Items
    const { data: itemsData } = await supabase
        .from('items')
        .select('*')
        .eq('user_id', uid)
        .order('id', { ascending: true });

    if (itemsData) {
        config.dishes = itemsData.map((item: any) => ({
            id: String(item.id),
            categoryId: String(item.category_id),
            name: item.name,
            description: item.description,
            price: Number(item.price),
            image: item.image,
            prepTime: item.prep_time,
            isAvailable: item.is_available,
            calories: item.calories
        }));
    }

    // Update local storage with fresh data
    setLocalConfig(config);
    return config;

  } catch (e) {
    console.warn("Offline/Error mode active. Serving local data.", e);
    return config;
  }
};

export const saveRestaurantConfig = async (config: RestaurantConfig): Promise<boolean> => {
  setLocalConfig(config); // Always save locally first

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true; // Treat as success (local save only)

    const profileData = {
        id: user.id,
        restaurant_name: config.name,
        description: config.description,
        logo_url: config.logo,
        cover_url: config.coverImage,
        settings: {
            currency: config.currency,
            primaryColor: config.primaryColor,
            socials: config.socials,
            offers: config.offers,
            languages: config.languages,
            isOrderingEnabled: config.isOrderingEnabled,
            workingHours: config.workingHours // Save working hours
        }
    };

    const { error } = await supabase.from('profiles').upsert(profileData);
    if (error) throw error;
    
    return true;
  } catch (e) {
    console.warn("Cloud save failed, saved locally:", e);
    return true; // Return true so UI doesn't rollback
  }
};

// --- 2. CATEGORIES Management ---

export const addCategoryToSupabase = async (category: Omit<Category, 'id'>): Promise<Category | null> => {
    const tempId = `local_${Date.now()}`;
    const newCat: Category = { ...category, id: tempId };
    
    // Update local immediately
    const config = getLocalConfig();
    config.categories.push(newCat);
    setLocalConfig(config);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return newCat;

        // Note: Removed 'is_available' because the DB column might be missing
        const { data, error } = await supabase.from('categories').insert({
            name: category.name,
            image: category.image || null,
            // is_available: category.isAvailable, 
            user_id: user.id
        }).select().single();

        if (error) throw error;

        const realCat = {
            id: String(data.id),
            name: data.name,
            image: data.image,
            isAvailable: category.isAvailable // Keep local value
        };
        
        // Swap temp ID for real ID locally
        config.categories = config.categories.map(c => c.id === tempId ? realCat : c);
        setLocalConfig(config);

        return realCat;
    } catch (e) {
        console.warn("Cloud add category failed, using local:", e);
        return newCat;
    }
};

export const updateCategoryInSupabase = async (category: Category): Promise<boolean> => {
    const config = getLocalConfig();
    config.categories = config.categories.map(c => c.id === category.id ? category : c);
    setLocalConfig(config);

    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return true;

        // Skip cloud update if it's a local-only item
        if (category.id.startsWith('local_')) return true;

        // Note: Removed 'is_available' because the DB column might be missing
        const { error } = await supabase.from('categories')
            .update({ 
                name: category.name, 
                image: category.image || null,
                // is_available: category.isAvailable 
            })
            .eq('id', category.id)
            .eq('user_id', user.id); 

        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Cloud update category failed, using local:", e);
        return true;
    }
};

export const deleteCategoryFromSupabase = async (categoryId: string): Promise<boolean> => {
    const config = getLocalConfig();
    config.categories = config.categories.filter(c => c.id !== categoryId);
    config.dishes = config.dishes.filter(d => d.categoryId !== categoryId);
    setLocalConfig(config);

    try {
         const { data: { user } } = await supabase.auth.getUser();
        if (!user) return true;

        if (categoryId.startsWith('local_')) return true;

        const { error } = await supabase
            .from('categories')
            .delete()
            .eq('id', categoryId)
            .eq('user_id', user.id);

        if (error) throw error;
        return true;
    } catch (e) {
        console.warn("Cloud delete category failed, using local:", e);
        return true;
    }
};

export const deleteDishesByCategory = async (categoryId: string): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return true;

        if (categoryId.startsWith('local_')) return true;

        const { error } = await supabase
            .from('items')
            .delete()
            .eq('category_id', categoryId)
            .eq('user_id', user.id);
            
        if (error) throw error;
        return true;
    } catch (e) {
        return true;
    }
};


// --- 3. ITEMS (Dishes) Management ---

export const addDishToSupabase = async (dish: Dish): Promise<Dish | null> => {
  const tempId = dish.id && !dish.id.startsWith('local_') ? dish.id : `local_${Date.now()}`;
  const newDish = { ...dish, id: tempId };

  const config = getLocalConfig();
  config.dishes.push(newDish);
  setLocalConfig(config);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return newDish;

    const { data, error } = await supabase.from('items').insert({
      name: dish.name,
      description: dish.description,
      price: dish.price,
      category_id: dish.categoryId,
      image: dish.image,
      prep_time: dish.prepTime,
      is_available: dish.isAvailable,
      calories: dish.calories,
      user_id: user.id
    }).select().single();

    if (error) throw error;
    
    const realDish = { ...dish, id: String(data.id) };
    config.dishes = config.dishes.map(d => d.id === tempId ? realDish : d);
    setLocalConfig(config);

    return realDish;
  } catch (error) {
    console.warn("Cloud add dish failed, using local:", error);
    return newDish;
  }
};

export const updateDishInSupabase = async (dish: Dish): Promise<boolean> => {
  const config = getLocalConfig();
  config.dishes = config.dishes.map(d => d.id === dish.id ? dish : d);
  setLocalConfig(config);

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    
    if (dish.id.startsWith('local_')) return true;

    const { error } = await supabase
      .from('items')
      .update({
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category_id: dish.categoryId,
        image: dish.image,
        prep_time: dish.prepTime,
        is_available: dish.isAvailable,
        calories: dish.calories
      })
      .eq('id', dish.id)
      .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Cloud update dish failed, using local:", error);
    return true;
  }
};

export const deleteDishFromSupabase = async (dishId: string): Promise<boolean> => {
  const config = getLocalConfig();
  config.dishes = config.dishes.filter(d => d.id !== dishId);
  setLocalConfig(config);

  try {
     const { data: { user } } = await supabase.auth.getUser();
     if (!user) return true;

    if (dishId.startsWith('local_')) return true;

    const { error } = await supabase
        .from('items')
        .delete()
        .eq('id', dishId)
        .eq('user_id', user.id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.warn("Cloud delete dish failed, using local:", error);
    return true;
  }
};

// --- IMAGE UPLOAD ---
export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError, data: uploadData } = await supabase.storage
      .from('menu_photos')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('menu_photos')
      .getPublicUrl(uploadData.path || filePath);
    
    if (data.publicUrl) return data.publicUrl;
    
    throw new Error("No public URL returned");

  } catch (error) {
    console.warn("Image upload failed (offline), returning object URL", error);
    return URL.createObjectURL(file);
  }
};
// دالة جديدة لجلب بيانات المطعم عن طريق الاسم المختصر (Slug)
export const getRestaurantBySlug = async (slug: string): Promise<string | null> => {
    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('id')
            .eq('slug', slug) // هنا نبحث بالاسم المختصر
            .maybeSingle();

        if (error || !data) return null;
        return data.id; // نعيد الـ ID الحقيقي للمطعم لكي يكمل الكود عمله
    } catch (e) {
        return null;
    }
};
