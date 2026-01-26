import { RestaurantConfig, Dish, Category } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { supabase } from './supabase';

const LOCAL_STORAGE_KEY = 'restaurant_config';
const ORDERS_STORAGE_KEY = 'restaurant_orders'; 

export const clearLocalData = () => {
    try {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        localStorage.removeItem(ORDERS_STORAGE_KEY);
    } catch (e) {
        console.error("Failed to clear local data", e);
    }
};

const setLocalConfig = (config: RestaurantConfig) => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
        console.error("Failed to save to local storage", e);
    }
};

export const getRestaurantConfig = async (identifier?: string): Promise<RestaurantConfig> => {
  let config: RestaurantConfig = { ...DEFAULT_CONFIG };
  
  try {
    let uid = identifier;
    if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id;
    }

    if (!uid) return config;

    // التحقق من نوع المعرف (UUID أو Slug)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
    let query = supabase.from('profiles').select('*');

    if (isUuid) {
        query = query.eq('id', uid);
    } else {
        query = query.eq('slug', uid);
    }

    const { data: profile } = await query.maybeSingle();

    if (profile) {
        const settings = profile.settings || {};
        const realId = profile.id;

        config = {
            ...config,
            id: realId, // تخزين المعرف الحقيقي لضمان وصول الطلبات بشكل صحيح
            name: profile.restaurant_name ?? config.name,
            description: profile.description ?? config.description,
            logo: profile.logo_url ?? config.logo,
            coverImage: profile.cover_url ?? config.coverImage,
            currency: settings.currency ?? config.currency,
            primaryColor: settings.primaryColor ?? config.primaryColor,
            isOrderingEnabled: settings.isOrderingEnabled ?? true,
            socials: { ...config.socials, ...(settings.socials || {}) },
            offers: settings.offers ?? config.offers,
            languages: settings.languages ?? config.languages,
            workingHours: settings.workingHours ?? config.workingHours
        };

        const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
            supabase.from('categories').select('*').eq('user_id', realId).order('created_at', { ascending: true }),
            supabase.from('items').select('*').eq('user_id', realId).order('id', { ascending: true })
        ]);

        if (categoriesData) {
            config.categories = categoriesData.map((c: any) => ({
                id: String(c.id),
                name: c.name,
                image: c.image,
                isAvailable: c.is_available !== false
            }));
        }

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
        
        // ربط المعرف الحقيقي لأغراض التوافق الإضافي
        (config as any).restaurant_db_id = realId;
    }

    setLocalConfig(config);
    return config;
  } catch (e) {
    console.error("Error loading config:", e);
    return config;
  }
};

export const saveRestaurantConfig = async (config: RestaurantConfig): Promise<boolean> => {
  setLocalConfig(config);
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
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
            workingHours: config.workingHours
        }
    };
    const { error } = await supabase.from('profiles').upsert(profileData);
    return !error;
  } catch (e) {
    return true;
  }
};

export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
    const { error: uploadError, data: uploadData } = await supabase.storage.from('menu_photos').upload(fileName, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('menu_photos').getPublicUrl(uploadData.path);
    return data.publicUrl;
  } catch (error) {
    return URL.createObjectURL(file);
  }
};

export const addDishToSupabase = async (dish: Dish): Promise<Dish | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return dish;
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
    return { ...dish, id: String(data.id) };
  } catch (error) {
    return dish;
  }
};

export const updateDishInSupabase = async (dish: Dish): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return true;
    const { error } = await supabase.from('items').update({
        name: dish.name,
        description: dish.description,
        price: dish.price,
        category_id: dish.categoryId,
        image: dish.image,
        prep_time: dish.prepTime,
        is_available: dish.isAvailable,
        calories: dish.calories
    }).eq('id', dish.id).eq('user_id', user.id);
    return !error;
  } catch (error) {
    return true;
  }
};

export const addCategoryToSupabase = async (category: Omit<Category, 'id'>): Promise<Category | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return null;
        const { data, error } = await supabase.from('categories').insert({
            name: category.name,
            image: category.image || null,
            user_id: user.id
        }).select().single();
        if (error) throw error;
        return { id: String(data.id), name: data.name, image: data.image, isAvailable: true };
    } catch (e) {
        return null;
    }
};

export const updateCategoryInSupabase = async (category: Category): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return true;
        const { error } = await supabase.from('categories').update({ 
            name: category.name, 
            image: category.image || null,
            is_available: category.isAvailable
        }).eq('id', category.id).eq('user_id', user.id); 
        return !error;
    } catch (e) {
        return true;
    }
};