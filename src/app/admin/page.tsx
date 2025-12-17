// File: src/app/admin/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu } from 'lucide-react';
import Sidebar from '../../../components/admin/Sidebar';
import Dashboard from '../../../components/admin/Dashboard';
import Analytics from '../../../components/admin/Analytics';
import Policies from '../../../components/admin/Policies';
import Notifications from '../../../components/admin/Notifications';
import Referrals from '../../../components/admin/Referrals';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
        // Mark that auth check finished so UI shows redirecting state, then navigate
        setAuthChecked(true);
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
        setUser(null);
        setAuthChecked(false);
        router.replace('/admin/login');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      router.replace('/admin/login');
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
      case 'users':
        return <Dashboard />;
      
      case 'analytics':
        return <Analytics />;
      
      case 'policies':
        return <Policies />;

      case 'referrals':
        return <Referrals />;

      case 'claims':
        return (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Claims Management</h2>
            <p className="text-gray-600">This section is under development</p>
          </div>
        );

      case 'notifications':
        return <Notifications />;
      
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

  if (!user && authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <p className="text-gray-600">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <main className="flex-1 overflow-y-auto">
        {/* Mobile Header with Hamburger */}
        <div className="lg:hidden bg-white border-b border-gray-200 p-4 sticky top-0 z-30">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu className="h-6 w-6 text-gray-700" />
            </button>
            <h1 className="text-lg font-semibold text-gray-900">FindBetter.ch</h1>
            <div className="w-10"></div> {/* Spacer for centering */}
          </div>
        </div>

        <div className="p-4 md:p-6">
          <div className="mb-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
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
        </div>
      </main>
    </div>
  );
}