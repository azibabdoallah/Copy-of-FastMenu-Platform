import React, { useState, useEffect } from 'react';
// 1. تغيير HashRouter إلى BrowserRouter وتسميته Router
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

  const applyCustomerBranding = (color: string) => {
    if (color) {
      document.documentElement.style.setProperty('--customer-brand', color);
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
        const data = await getRestaurantConfig();
        setConfig(data);
        applyCustomerBranding(data.primaryColor);
    } catch (error) {
        console.error("Failed to load data", error);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          await supabase.auth.signOut();
          clearLocalData();
          setConfig(DEFAULT_CONFIG);
        }
      } catch (err) {
        console.warn("Auth check failed:", err);
      }
      await loadData();
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
        if (event === 'SIGNED_OUT') {
            clearLocalData();
            setConfig(DEFAULT_CONFIG);
            applyCustomerBranding(DEFAULT_CONFIG.primaryColor);
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            loadData();
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  const handleUpdateConfig = async (newConfig: RestaurantConfig) => {
    setConfig(newConfig);
    applyCustomerBranding(newConfig.primaryColor);
    await saveRestaurantConfig(newConfig);
  };

  const handleLogout = async () => {
      clearLocalData();
      setConfig(DEFAULT_CONFIG);
      applyCustomerBranding(DEFAULT_CONFIG.primaryColor);
      await supabase.auth.signOut();
      window.location.href = '/auth'; 
  };

  if (loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 text-amber-400">
            <div className="flex flex-col items-center gap-2">
                <Loader2 className="animate-spin" size={40} />
                <p>جاري تحميل البيانات...</p>
            </div>
        </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<PublicRoute><LandingPage /></PublicRoute>} />
        <Route path="/auth" element={<PublicRoute><AuthPage /></PublicRoute>} />
        <Route path="/select" element={<ProtectedRoute><SelectionPage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminDashboard config={config} onUpdate={handleUpdateConfig} onLogout={handleLogout}/></ProtectedRoute>} />
        
        {/* التعديل الحاسم هنا: جعلنا الرابط يقبل الاسم مباشرة */}
        <Route path="/:restaurantName" element={<CustomerMenu config={config} />} />
        
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default App;
