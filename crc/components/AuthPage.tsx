import React, { useState } from 'react';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Loader2, ArrowLeft, AlertCircle, Utensils } from 'lucide-react';

const AuthPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const getErrorMessage = (errorMsg: string) => {
    if (errorMsg.includes('Invalid login credentials')) return 'البريد الإلكتروني أو كلمة المرور غير صحيحة';
    return 'حدث خطأ: ' + errorMsg;
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Sign In Logic Only
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/select');
      
    } catch (err: any) {
      console.error("Auth Error:", err);
      setError(getErrorMessage(err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 font-sans text-black">
      <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row h-[600px]">
        
        {/* Image Side */}
        <div className="hidden md:block w-1/2 bg-black relative">
            <img 
                src="https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=2070&auto=format&fit=crop" 
                alt="Restaurant" 
                className="absolute inset-0 w-full h-full object-cover opacity-40 grayscale"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
            <div className="relative z-10 p-12 h-full flex flex-col justify-between text-white">
                <div onClick={() => navigate('/')} className="cursor-pointer flex items-center gap-2 w-fit">
                    <div className="bg-primary text-black p-2 rounded-lg backdrop-blur-sm">
                        <Utensils size={20} />
                    </div>
                    <span className="font-black text-xl tracking-wider">FASTMENU</span>
                </div>
                <div>
                    <h2 className="text-4xl font-black mb-4"><span className="text-primary">أدر</span> مطعمك بذكاء</h2>
                    <p className="text-gray-300 leading-relaxed font-medium">
                        منصة المنيو الرقمي الأولى. سجل دخولك لإدارة مطعمك بسرعة البرق.
                    </p>
                </div>
            </div>
        </div>

        {/* Form Side */}
        <div className="w-full md:w-1/2 p-8 md:p-12 flex flex-col justify-center relative">
            <button 
                onClick={() => navigate('/')} 
                className="absolute top-6 right-6 text-gray-400 hover:text-black transition-colors md:hidden"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="max-w-sm mx-auto w-full">
                <h2 className="text-3xl font-black mb-2 text-black">
                    تسجيل الدخول
                </h2>
                <p className="text-gray-500 mb-6 font-medium">
                    مرحباً بعودتك! أدخل بياناتك للمتابعة
                </p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg flex items-center gap-2 mb-6 text-sm font-medium border border-red-100">
                        <AlertCircle size={18} className="shrink-0" />
                        {error}
                    </div>
                )}

                <form onSubmit={handleAuth} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">البريد الإلكتروني</label>
                        <div className="relative">
                            <Mail className="absolute right-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="email" 
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all bg-gray-50 focus:bg-white"
                                placeholder="name@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label>
                        <div className="relative">
                            <Lock className="absolute right-3 top-3 text-gray-400" size={18} />
                            <input 
                                type="password" 
                                required
                                minLength={6}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pr-10 pl-4 py-3 border border-gray-200 rounded-xl outline-none focus:border-black focus:ring-2 focus:ring-black/5 transition-all bg-gray-50 focus:bg-white"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        disabled={loading}
                        className="w-full bg-black text-primary font-black py-3.5 rounded-xl shadow-lg hover:bg-gray-900 transition-all active:scale-95 flex items-center justify-center gap-2 border border-black"
                    >
                        {loading && <Loader2 className="animate-spin" size={20} />}
                        دخول
                    </button>
                </form>

                <div className="mt-8 text-center pt-6 border-t border-gray-100">
                    <p className="text-gray-500 text-sm mb-2 font-medium">
                        ترغب بالاشتراك وتفعيل الخدمة لمطعمك؟
                    </p>
                    <a 
                        href="https://wa.me/213559323128"
                        target="_blank"
                        rel="noreferrer"
                        className="text-black font-bold hover:underline inline-flex items-center gap-1 hover:text-primary transition-colors"
                    >
                         تواصل معنا
                    </a>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;