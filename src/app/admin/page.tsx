// File: src/app/admin/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/admin/Sidebar';
import Dashboard from '../../../components/admin/Dashboard';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  
  const router = useRouter();

  // Check authentication on component mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth/verify', {
          method: 'GET',
          credentials: 'include',
        });
        
        console.log('Auth check response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Auth data:', data);
          setUser(data.admin);
          setAuthChecked(true);
        } else {
          console.log('Auth failed, redirecting to login');
          // Only redirect if we're sure the auth failed
          if (response.status === 401) {
            router.replace('/admin/login');
          }
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.replace('/admin/login');
      } finally {
        setIsLoading(false);
      }
    };

    // Add a small delay to prevent race conditions
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, [router]);

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (response.ok) {
        // Clear user state
        setUser(null);
        setAuthChecked(false);
        // Redirect to login page
        router.replace('/admin/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Force redirect even if logout fails
      setUser(null);
      router.replace('/admin/login');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'users':
        return <Dashboard />;
      case 'policies':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Policies Management</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );
      case 'claims':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Claims Management</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );
      case 'analytics':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Analytics</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );
      case 'notifications':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Notifications</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Settings</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );
      default:
        return null;
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Don't render anything if user is not authenticated and auth check is complete
  if (!user && authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // Don't render if user is null (safety check)
  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
      />
      <main className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Welcome back, {user.name}</h1>
                <p className="text-sm text-gray-600">{user.email} • {user.role}</p>
              </div>
              <div className="text-sm text-gray-500">
                Last login: {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
        {renderContent()}
      </main>
    </div>
  );
}