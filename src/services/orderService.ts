import { supabase } from './supabase';
import { Order } from '../types';

const ORDERS_STORAGE_KEY = 'restaurant_orders';
const DELIVERY_PREFIX = 'DELIVERY_V1|||';
const DINEIN_PREFIX = 'DINEIN_V1|||';
const CLEANUP_HOURS = 8;

// --- دالة التنظيف المحدثة (تحذف فقط طلباتك القديمة) ---
const cleanupOldOrders = async (userId: string) => {
  try {
    const cutoffTime = new Date(Date.now() - CLEANUP_HOURS * 60 * 60 * 1000).toISOString();

    // حذف الطلبات القديمة الخاصة بك فقط من قاعدة البيانات
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('restaurant_id', userId) // ضمان عدم حذف طلبات الآخرين
      .lt('created_at', cutoffTime);
    
    if (error) console.error("Supabase cleanup error:", error);

    // تنظيف التخزين المحلي
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (storedOrders) {
      const orders: Order[] = JSON.parse(storedOrders);
      const freshOrders = orders.filter(o => {
          if (!o.created_at) return true; 
          return new Date(o.created_at).getTime() > new Date(cutoffTime).getTime();
      });
      if (freshOrders.length !== orders.length) {
          localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(freshOrders));
      }
    }
  } catch (err) {
    console.warn("Cleanup process failed:", err);
  }
};

export const submitOrder = async (order: Omit<Order, 'id' | 'created_at' | 'status'>) => {
  try {
    let finalTableNumber = order.table_number;

    if (order.type === 'delivery') {
        const cleanPhone = (order.phone || '').replace(/\|\|\|/g, ' ');
        const cleanAddress = (order.address || '').replace(/\|\|\|/g, ' ');
        finalTableNumber = `${DELIVERY_PREFIX}${cleanPhone}|||${cleanAddress}`;
    } else if (order.type === 'dine_in') {
        const cleanTable = (order.table_number || '').replace(/\|\|\|/g, ' ');
        const cleanCode = (order.verification_code || '').replace(/\|\|\|/g, ' ');
        finalTableNumber = `${DINEIN_PREFIX}${cleanTable}|||${cleanCode}`;
    }

    const { data, error } = await supabase
      .from('orders')
      .insert([{
        restaurant_id: order.restaurant_id,
        customer_name: order.customer_name,
        table_number: finalTableNumber,
        items: order.items, 
        total: order.total,
        status: 'pending'
      }])
      .select();
  
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("Order submission failed, saving locally:", error);
    const newOrder: Order = { ...order, id: Date.now(), status: 'pending', created_at: new Date().toISOString() };
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const orders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify([newOrder, ...orders]));
    return [newOrder];
  }
};

// --- دالة جلب الطلبات المحدثة (العزل التام) ---
export const getOrders = async () => {
  // 1. الحصول على جلسة المستخدم الحالية
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    console.error("No active session found");
    return [];
  }

  // 2. تشغيل التنظيف لطلبات هذا المستخدم فقط
  await cleanupOldOrders(userId);

  try {
    // 3. جلب الطلبات المفلترة بـ restaurant_id
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', userId) // هذا هو السطر الذي يمنع التداخل
      .order('created_at', { ascending: false });
      
    if (error) throw error;

    return (data as any[]).map(order => {
        const tNum = order.table_number;
        if (tNum && typeof tNum === 'string') {
            if (tNum.startsWith(DELIVERY_PREFIX)) {
                const parts = tNum.split('|||');
                return { ...order, type: 'delivery', phone: parts[1] || '', address: parts[2] || '', table_number: 'توصيل' };
            } else if (tNum.startsWith(DINEIN_PREFIX)) {
                const parts = tNum.split('|||');
                return { ...order, type: 'dine_in', table_number: parts[1] || '?', verification_code: parts[2] || '' };
            }
        }
        return { ...order, type: 'dine_in' };
    }) as Order[];
  } catch (error) {
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    return storedOrders ? JSON.parse(storedOrders) : [];
  }
};

export const updateOrderStatus = async (id: number, status: string) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    // التحديث مع التأكد من ملكية الطلب كخطوة أمان إضافية
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id)
      .eq('restaurant_id', session.user.id);

    if (error) throw error;
  } catch (error) {
    console.warn("Status update failed:", error);
  }
};
