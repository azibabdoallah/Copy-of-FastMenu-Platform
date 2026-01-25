import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CustomerMenu from './components/CustomerMenu';
import AdminDashboard from './components/AdminDashboard';
import LandingPage from './components/LandingPage';
import AuthPage from './components/AuthPage';
import SelectionPage from './components/SelectionPage';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { getRestaurantConfig, saveRestaurantConfig, clearLocalData } from './services/storageService';
import { RestaurantConfig } from './types';
import { DEFAULT_CONFIG } from './constants';
import { supabase } from './services/supabase';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const [config, setConfig] = useState<RestaurantConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getRestaurantConfig();
        setConfig(data);
    } catch (error) {
        console.error("Failed to load data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            clearLocalData();
            setConfig(DEFAULT_CONFIG);
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            loadData();
        }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleUpdateConfig = async (newConfig: RestaurantConfig) => {
    setConfig(newConfig);
    await saveRestaurantConfig(newConfig);
  };

  const handleLogout = async () => {
      clearLocalData();
      setConfig(DEFAULT_CONFIG);
      await supabase.auth.signOut();
      window.location.href = '/auth'; 
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-primary">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" size={40} />
                <p>جاري تحميل البيانات...</p>
            </div>
        </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/select" element={<ProtectedRoute><SelectionPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard config={config} onUpdate={handleUpdateConfig} onLogout={handleLogout} /></ProtectedRoute>} />
        
        {/* دعم الوصول للمنيو عبر الرابط المباشر (Slug) أو المعرف */}
        <Route path="/menu/:identifier" element={<CustomerMenu config={config} />} />
        <Route path="/menu" element={<CustomerMenu config={config} />} />
        
        {/* مسار احتياطي للمعرف المباشر في الجذر */}
        <Route path="/:identifier" element={<CustomerMenu config={config} />} />

        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;