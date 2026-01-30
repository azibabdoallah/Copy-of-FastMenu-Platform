import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { Loader2 } from 'lucide-react';

interface PublicRouteProps {
  children: React.ReactElement;
}

const PublicRoute: React.FC<PublicRouteProps> = ({ children }) => {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  if (session) {
    // If user is logged in, FORCE redirect to Selection Page (Page 3)
    return <Navigate to="/select" replace />;
  }

  return children;
};

export default PublicRoute;