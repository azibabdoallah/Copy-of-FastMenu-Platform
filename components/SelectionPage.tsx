import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, UtensilsCrossed, LogOut, ArrowRight, Loader2 } from 'lucide-react';
import { supabase } from '../services/supabase';
import { clearLocalData } from '../services/storageService';

const SelectionPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            setUserId(user.id);
        }
        setLoading(false);
    };
    getUser();
  }, []);

  const handleLogout = async () => {
    // Security: Clear any cached data
    clearLocalData();
    await supabase.auth.signOut();
    navigate('/auth');
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center">
              <Loader2 className="animate-spin text-primary" size={32} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-slate-900 p-8 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-primary/10 opacity-30"></div>
            <h1 className="text-2xl font-bold text-white relative z-10 mb-2">مرحباً بك 👋</h1>
            <p className="text-slate-400 text-sm relative z-10">لوحة التحكم المركزية</p>
        </div>

        {/* Options */}
        <div className="p-8 space-y-4">
          <button 
            onClick={() => navigate('/admin')}
            className="w-full group bg-white border-2 border-gray-100 hover:border-primary/50 p-6 rounded-2xl flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-primary/5"
          >
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center text-primary group-hover:scale-110 transition-transform shadow-sm">
                <LayoutDashboard size={28} />
            </div>
            <div className="text-right flex-1">
                <h3 className="font-bold text-xl text-gray-800 group-hover:text-primary transition-colors">إدارة المنيو</h3>
                <p className="text-xs text-gray-500 mt-1">تعديل الأطباق، الأسعار، ومتابعة الطلبات</p>
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-primary" />
          </button>

          <button 
             onClick={() => userId && navigate(`/menu?uid=${userId}`)}
             className="w-full group bg-white border-2 border-gray-100 hover:border-green-500/50 p-6 rounded-2xl flex items-center gap-4 transition-all hover:shadow-lg hover:shadow-green-500/5"
          >
            <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center text-green-600 group-hover:scale-110 transition-transform shadow-sm">
                <UtensilsCrossed size={28} />
            </div>
             <div className="text-right flex-1">
                <h3 className="font-bold text-xl text-gray-800 group-hover:text-green-600 transition-colors">عرض المنيو للزبائن</h3>
                <p className="text-xs text-gray-500 mt-1">مشاهدة المنيو كما يظهر للعميل</p>
            </div>
            <ArrowRight className="text-gray-300 group-hover:text-green-600" size={20} />
          </button>
        </div>

        {/* Footer / Logout */}
        <div className="bg-gray-50 p-4 border-t border-gray-100 flex justify-center">
            <button 
                onClick={handleLogout}
                className="flex items-center gap-2 text-red-500 hover:bg-red-50 px-6 py-2 rounded-full text-sm font-bold transition-colors"
            >
                <LogOut size={18} />
                تسجيل الخروج
            </button>
        </div>
      </div>
    </div>
  );
};

export default SelectionPage;