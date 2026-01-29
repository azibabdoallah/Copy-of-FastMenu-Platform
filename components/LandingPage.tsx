import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Utensils, QrCode, Zap, Smartphone, ChefHat, BarChart3, ArrowRight } from 'lucide-react';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white font-sans text-black">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center gap-2">
              <div className="bg-black p-2 rounded-lg text-primary">
                <Utensils size={20} />
              </div>
              <span className="font-black text-xl tracking-tight uppercase">FASTMENU</span>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate('/menu')} 
                className="text-sm font-bold text-gray-600 hover:text-black transition-colors hidden md:block"
              >
                تجربة المنيو
              </button>
              <button 
                onClick={() => navigate('/auth')} 
                className="bg-primary text-black px-6 py-2 rounded-full text-sm font-bold hover:bg-yellow-400 transition-colors shadow-sm"
              >
                دخول المشتركين
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          <span className="inline-block py-1 px-4 rounded-full bg-black text-primary text-sm font-bold mb-6 animate-in fade-in slide-in-from-bottom-4 border border-gray-100">
            ⚡ خدمة المنيو الالكتروني للمطاعم
          </span>
          <h1 className="text-4xl md:text-6xl font-black text-black tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
            حول قائمة مطعمك إلى <span className="text-primary relative inline-block">
              سرعة البرق
              <svg className="absolute -bottom-2 w-full h-3 text-black opacity-10" viewBox="0 0 100 10" preserveAspectRatio="none">
                  <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="5" fill="none" />
              </svg>
            </span>
          </h1>
          <p className="mt-4 text-xl text-gray-500 max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
            FASTMENU هي المنصة الأسهل لإنشاء منيو إلكتروني ذكي، مع دعم QR Code والذكاء الاصطناعي لتجربة طلب استثنائية.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => navigate('/auth')} 
              className="w-full sm:w-auto px-8 py-4 bg-black text-white text-lg font-bold rounded-xl shadow-xl hover:bg-gray-900 transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              ابـدأ مجانـاً <ArrowRight size={20} className="text-primary" />
            </button>
            <button 
              onClick={() => navigate('/menu')} 
              className="w-full sm:w-auto px-8 py-4 bg-primary text-black border border-primary text-lg font-bold rounded-xl hover:bg-yellow-400 transition-all flex items-center justify-center gap-2"
            >
              <Smartphone size={20} />
              شاهد مثال حي
            </button>
          </div>
        </div>
        
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-40">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[100px]" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-gray-200/50 rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Features Grid */}
      <div className="py-24 bg-gray-50 border-t border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-black">لماذا تختار FASTMENU؟</h2>
            <p className="mt-4 text-gray-500 font-medium">كل ما تحتاجه لإدارة المنيو والطلبات في مكان واحد</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<QrCode className="text-black" size={32} />}
              title="دخول عبر QR Code"
              description="لا حاجة لتثبيت تطبيقات. يمسح الزبون الرمز بكاميرا الجوال ويظهر المنيو فوراً."
            />
            <FeatureCard 
              icon={<Zap className="text-primary fill-primary" size={32} />}
              title="وصف ذكي (AI)"
              description="استخدم الذكاء الاصطناعي لكتابة أوصاف شهية وجذابة لأطباقك بضغطة زر واحدة."
            />
            <FeatureCard 
              icon={<Smartphone className="text-black" size={32} />}
              title="واجهة سهلة وسريعة"
              description="تصميم عصري يعمل بسلاسة على جميع الهواتف المحمولة لتجربة مستخدم مميزة."
            />
             <FeatureCard 
              icon={<ChefHat className="text-black" size={32} />}
              title="إدارة كاملة للمطبخ"
              description="لوحة تحكم للمطعم لاستقبال الطلبات وتغيير حالة الطلب (جديد، تحضير، جاهز)."
            />
            <FeatureCard 
              icon={<BarChart3 className="text-primary" size={32} />}
              title="تحديث فوري"
              description="غيّر الأسعار، أخفِ الأطباق المنتهية، وأضف عروضاً جديدة في لحظات."
            />
            <FeatureCard 
              icon={<Utensils className="text-black" size={32} />}
              title="دعم متعدد اللغات"
              description="واجهة تدعم العربية والفرنسية لتناسب جميع زبائنك."
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-black text-white py-12 border-t-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-6">
                <div className="bg-primary p-1.5 rounded text-black"><Utensils size={24} /></div>
                <span className="font-black text-2xl tracking-widest">FASTMENU</span>
            </div>
            <p className="text-gray-400 mb-8 max-w-md mx-auto font-medium">
                المنصة الأسهل والأسرع للمطاعم والكافيهات لإنشاء قائمة طعام رقمية تفاعلية.
            </p>
            <div className="border-t border-gray-800 pt-8 text-sm text-gray-500 font-bold">
                © {new Date().getFullYear()} جميع الحقوق محفوظة لمنصة FASTMENU.
            </div>
        </div>
      </footer>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:border-primary hover:shadow-md transition-all group">
    <div className="w-14 h-14 bg-gray-50 group-hover:bg-primary/20 rounded-xl flex items-center justify-center mb-6 transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-bold mb-3 text-black">{title}</h3>
    <p className="text-gray-500 leading-relaxed text-sm">
      {description}
    </p>
  </div>
);

export default LandingPage;