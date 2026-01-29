import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
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

  // Load data from Supabase on mount AND on Auth Change
  useEffect(() => {
    // 1. Initial Load
    loadData();

    // 2. Listen for Auth Changes (Sign In / Sign Out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT') {
            // CRITICAL: Clear all sensitive data when user logs out
            clearLocalData();
            setConfig(DEFAULT_CONFIG); // Reset state to default
        } else if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
            // Re-fetch data for the new user
            loadData();
        }
    });

    return () => {
        subscription.unsubscribe();
    };
  }, []);

  // Function to update config in state and Supabase
  const handleUpdateConfig = async (newConfig: RestaurantConfig) => {
    // Optimistic update
    setConfig(newConfig);
    // Persist to cloud
    await saveRestaurantConfig(newConfig);
  };

  const handleLogout = async () => {
      // Clear data locally first
      clearLocalData();
      setConfig(DEFAULT_CONFIG);
      
      await supabase.auth.signOut();
      // Explicit logout redirects to Auth page
      window.location.hash = '/auth'; 
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
    <HashRouter>
      <Routes>
        {/* 1. Landing Page (Public Only - Redirects owners to Select) */}
        <Route 
          path="/" 
          element={
            <PublicRoute>
              <LandingPage />
            </PublicRoute>
          } 
        />
        
        {/* 2. Auth Page (Public Only - Redirects owners to Select) */}
        <Route 
          path="/auth" 
          element={
            <PublicRoute>
              <AuthPage />
            </PublicRoute>
          } 
        />

        {/* 3. Selection Page (Protected Hub) */}
        <Route 
          path="/select" 
          element={
            <ProtectedRoute>
              <SelectionPage />
            </ProtectedRoute>
          } 
        />
        
        {/* 4. Admin Dashboard (Protected) */}
        <Route 
          path="/admin" 
          element={
            <ProtectedRoute>
              <AdminDashboard 
                config={config} 
                onUpdate={handleUpdateConfig} 
                onLogout={handleLogout}
              />
            </ProtectedRoute>
          } 
        />

        {/* 5. Customer Menu (Public Access for everyone) */}
        <Route 
          path="/menu" 
          element={<CustomerMenu config={config} />} 
        />
        
        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </HashRouter>
  );
};

export default App;