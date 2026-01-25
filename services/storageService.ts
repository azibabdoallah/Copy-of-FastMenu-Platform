import { RestaurantConfig, Dish, Category } from '../types';
import { DEFAULT_CONFIG } from '../constants';
import { supabase } from './supabase';

const LOCAL_STORAGE_KEY = 'restaurant_config';

export const clearLocalData = () => {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
};

export const getRestaurantConfig = async (identifier?: string): Promise<RestaurantConfig> => {
  let config: RestaurantConfig = { ...DEFAULT_CONFIG };
  
  try {
    let uid = identifier;
    
    // إذا لم يتوفر معرف، نحاول جلبه من الجلسة الحالية (للأدمن)
    if (!uid) {
        const { data: { session } } = await supabase.auth.getSession();
        uid = session?.user?.id;
    }
    
    if (!uid) return config;

    let query = supabase.from('profiles').select('*');
    
    // التحقق إذا كان المعرف هو UUID أو Slug
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid);
    
    if (isUuid) {
        query = query.eq('id', uid);
    } else {
        // البحث باستخدام الـ slug (المعرف النصي)
        query = query.eq('slug', uid);
    }

    const { data: profile } = await query.maybeSingle();

    // إذا لم نجد بالـ slug، نجرب البحث باسم المطعم كخيار أخير
    if (!profile && !isUuid) {
        const decodedName = decodeURIComponent(uid).replace(/-/g, ' ');
        const { data: profileByName } = await supabase.from('profiles')
            .select('*')
            .ilike('restaurant_name', decodedName)
            .maybeSingle();
        
        if (profileByName) return processProfile(profileByName, config);
    }

    if (profile) {
        return processProfile(profile, config);
    }

    return config;
  } catch (e) {
    console.error("Error fetching config:", e);
    return config;
  }
};

// دالة مساعدة لمعالجة بيانات البروفايل وتحويلها لكائن الإعدادات
const processProfile = async (profile: any, defaultConfig: RestaurantConfig): Promise<RestaurantConfig> => {
    const s = profile.settings || {};
    const realId = profile.id;

    const config = {
        ...defaultConfig,
        name: profile.restaurant_name || defaultConfig.name,
        description: profile.description || defaultConfig.description,
        logo: profile.logo_url || defaultConfig.logo,
        coverImage: profile.cover_url || defaultConfig.coverImage,
        currency: s.currency || defaultConfig.currency,
        primaryColor: s.primaryColor || defaultConfig.primaryColor,
        isOrderingEnabled: s.isOrderingEnabled ?? true,
        socials: { ...defaultConfig.socials, ...(s.socials || {}) },
        offers: s.offers || defaultConfig.offers,
        workingHours: s.workingHours || defaultConfig.workingHours
    };

    // جلب الأقسام والأطباق المرتبطة بهذا المعرف الحقيقي
    const [{ data: cats }, { data: items }] = await Promise.all([
        supabase.from('categories').select('*').eq('user_id', realId),
        supabase.from('items').select('*').eq('user_id', realId)
    ]);

    if (cats) {
        config.categories = cats.map((c: any) => ({
            id: String(c.id),
            name: c.name,
            image: c.image,
            isAvailable: c.is_available !== false
        }));
    }

    if (items) {
        config.dishes = items.map((i: any) => ({
            id: String(i.id),
            categoryId: String(i.category_id),
            name: i.name,
            description: i.description,
            price: Number(i.price),
            image: i.image,
            prepTime: i.prep_time,
            isAvailable: i.is_available,
            calories: i.calories
        }));
    }
    
    // ربط المعرف الحقيقي للمطعم بالكائن لضمان وصول الطلبات
    (config as any).restaurant_db_id = realId;
    return config;
};

export const saveRestaurantConfig = async (config: RestaurantConfig): Promise<boolean> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { error } = await supabase.from('profiles').upsert({
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
            workingHours: config.workingHours,
            isOrderingEnabled: config.isOrderingEnabled
        }
    });
    return !error;
  } catch (e) {
    return false;
  }
};

export const uploadImage = async (file: File): Promise<string | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `uploads/${fileName}`;
    const { error: uploadError } = await supabase.storage.from('restaurant-assets').upload(filePath, file);
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from('restaurant-assets').getPublicUrl(filePath);
    return data.publicUrl;
  } catch (e) {
    return null;
  }
};

export const addDishToSupabase = async (dish: Dish): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('items').insert({
    user_id: user.id,
    category_id: parseInt(dish.categoryId),
    name: dish.name,
    description: dish.description,
    price: dish.price,
    image: dish.image,
    prep_time: dish.prepTime,
    is_available: dish.isAvailable,
    calories: dish.calories
  });
  return !error;
};

export const updateDishInSupabase = async (dish: Dish): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('items').update({
    category_id: parseInt(dish.categoryId),
    name: dish.name,
    description: dish.description,
    price: dish.price,
    image: dish.image,
    prep_time: dish.prepTime,
    is_available: dish.isAvailable,
    calories: dish.calories
  }).eq('id', parseInt(dish.id)).eq('user_id', user.id);
  return !error;
};

export const addCategoryToSupabase = async (category: Partial<Category>): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('categories').insert({
    user_id: user.id,
    name: category.name,
    image: category.image,
    is_available: category.isAvailable
  });
  return !error;
};

export const updateCategoryInSupabase = async (category: Category): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { error } = await supabase.from('categories').update({
    name: category.name,
    image: category.image,
    is_available: category.isAvailable
  }).eq('id', parseInt(category.id)).eq('user_id', user.id);
  return !error;
};