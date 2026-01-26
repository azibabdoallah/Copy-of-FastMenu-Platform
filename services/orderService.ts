import { supabase } from './supabase';
import { Order } from '../types';

const ORDERS_STORAGE_KEY = 'restaurant_orders';

// Helper to serialize delivery info into a string stored in table_number column
// This avoids needing new columns in the database
const DELIVERY_PREFIX = 'DELIVERY_V1|||';
const DINEIN_PREFIX = 'DINEIN_V1|||';

// --- CLEANUP LOGIC ---
const CLEANUP_HOURS = 8;

const cleanupOldOrders = async () => {
  try {
    // Calculate cutoff time (current time - 8 hours)
    const cutoffTime = new Date(Date.now() - CLEANUP_HOURS * 60 * 60 * 1000).toISOString();

    // 1. Delete from Supabase
    const { error } = await supabase
      .from('orders')
      .delete()
      .lt('created_at', cutoffTime);
    
    if (error) console.error("Supabase cleanup error:", error);

    // 2. Delete from Local Storage (Fallback)
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (storedOrders) {
      const orders: Order[] = JSON.parse(storedOrders);
      // Filter keep only orders newer than cutoff
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

    // If delivery, pack the details into the table_number field
    // Format: DELIVERY_V1|||PHONE|||ADDRESS
    if (order.type === 'delivery') {
        const cleanPhone = (order.phone || '').replace(/\|\|\|/g, ' '); // Sanitize delimiter
        const cleanAddress = (order.address || '').replace(/\|\|\|/g, ' '); // Sanitize delimiter
        finalTableNumber = `${DELIVERY_PREFIX}${cleanPhone}|||${cleanAddress}`;
    }
    // If Dine-in, pack Table number AND Verification Code
    // Format: DINEIN_V1|||TABLE_NUM|||VERIFICATION_CODE
    else if (order.type === 'dine_in') {
        const cleanTable = (order.table_number || '').replace(/\|\|\|/g, ' ');
        const cleanCode = (order.verification_code || '').replace(/\|\|\|/g, ' ');
        finalTableNumber = `${DINEIN_PREFIX}${cleanTable}|||${cleanCode}`;
    }

    const submissionData = {
        restaurant_id: order.restaurant_id,
        customer_name: order.customer_name,
        table_number: finalTableNumber,
        items: order.items, 
        total: order.total,
        status: 'pending'
    };

    // Note: We do NOT send type, phone, address as separate columns to Supabase
    // to prevent errors if those columns don't exist in the user's table.

    const { data, error } = await supabase
      .from('orders')
      .insert([submissionData])
      .select();
  
    if (error) throw error;
    return data;
  } catch (error) {
    console.warn("Order submission failed (offline/error), saving locally:", error);
    
    // Fallback: Save to Local Storage
    const newOrder: Order = {
      ...order,
      id: Date.now(), 
      status: 'pending',
      created_at: new Date().toISOString()
    };
    
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    const orders: Order[] = storedOrders ? JSON.parse(storedOrders) : [];
    const updatedOrders = [newOrder, ...orders];
    
    localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    return [newOrder];
  }
};

export const getOrders = async () => {
  // Trigger cleanup before fetching
  await cleanupOldOrders();

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) throw error;

    // Hydrate the data (extract delivery/verification info from table_number if present)
    const formattedData = (data as any[]).map(order => {
        const tNum = order.table_number;

        if (tNum && typeof tNum === 'string') {
            if (tNum.startsWith(DELIVERY_PREFIX)) {
                const parts = tNum.split('|||');
                // parts[0] is prefix, parts[1] is phone, parts[2] is address
                return {
                    ...order,
                    type: 'delivery',
                    phone: parts[1] || '',
                    address: parts[2] || '',
                    table_number: 'توصيل' // Friendly display for UI
                };
            } else if (tNum.startsWith(DINEIN_PREFIX)) {
                const parts = tNum.split('|||');
                // parts[0] is prefix, parts[1] is table_num, parts[2] is code
                return {
                    ...order,
                    type: 'dine_in',
                    table_number: parts[1] || '?',
                    verification_code: parts[2] || ''
                };
            }
        }
        
        // Default (Legacy orders or plain table numbers)
        return { ...order, type: 'dine_in' };
    });

    return formattedData as Order[];
  } catch (error) {
    console.warn("Fetching orders failed (offline mode), loading locally:", error);
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    return storedOrders ? JSON.parse(storedOrders) : [];
  }
};

export const updateOrderStatus = async (id: number, status: string) => {
  try {
    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.warn("Updating status failed (offline mode), updating locally:", error);
    
    const storedOrders = localStorage.getItem(ORDERS_STORAGE_KEY);
    if (storedOrders) {
      const orders: Order[] = JSON.parse(storedOrders);
      const updatedOrders = orders.map(o => o.id === id ? { ...o, status: status as any } : o);
      localStorage.setItem(ORDERS_STORAGE_KEY, JSON.stringify(updatedOrders));
    }
  }
};