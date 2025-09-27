import { useState, useEffect } from 'react';
import React, { ReactNode } from "react";
import { Search, Filter, Plus, Users, TrendingUp, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

type Status = 'active' | 'inactive' | 'pending' | 'rejected';

interface UserData {
  id: number;
  status: string;
  full_name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  join_date?: string;
  joinDate?: string;
  totalPremium?: number;
  total_premium?: number;
  policyCount: number;
  annual_savings?: number;
  compliance_status?: 'Complete' | 'Incomplete';
  avatar?: string;
  canton?: string;
  postal_code?: string;
  selected_insurer?: string;
  name?: string; // added since you build it dynamically
}
interface DashboardStats {
  total_users: number;
  active_users: number;
  total_approved_premium: number;
  pending_users: number;
}

const defaultStats: DashboardStats = {
  total_users: 0,
  active_users: 0,
  total_approved_premium: 0,
  pending_users: 0,
};
function UserCard({
  user,
  onClick,
  formatCurrency,
  getStatusColor
}: {
  user: UserData;
  onClick: (user: UserData) => void;
  formatCurrency?: (amount: number) => string;
  getStatusColor?: (status: string) => string;
}) {
  // Normalize user data from database
  const normalizedUser = {
    ...user,
    name:  user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    joinDate: user.joinDate || (user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A'),
    totalPremium: user.totalPremium || user.total_premium || 0,
  };

  const defaultGetStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const defaultFormatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const statusColorFn = getStatusColor || defaultGetStatusColor;
  const currencyFormatter = formatCurrency || defaultFormatCurrency;

  return (
    <div 
      onClick={() => onClick(normalizedUser)}
      className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md hover:border-blue-300 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          <div className="bg-blue-100 rounded-full p-3 group-hover:bg-blue-200 transition-colors">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {normalizedUser.name || 'Unnamed User'}
            </h3>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${statusColorFn(user.status)}`}>
              {user.status === 'active' ? 'Aktiv' : 
               user.status === 'pending' ? 'Ausstehend' : 
               user.status === 'inactive' ? 'Inaktiv' : 'Abgelehnt'}
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center text-gray-600 text-sm">
          <span className="w-4 h-4 mr-2">✉</span>
          <span className="truncate">{user.email}</span>
        </div>
                
        <div className="flex items-center text-gray-600 text-sm">
          <span className="w-4 h-4 mr-2">📞</span>
          <span>{user.phone}</span>
        </div>
                
        <div className="flex items-center text-gray-600 text-sm">
          <span className="w-4 h-4 mr-2">📅</span>
          <span>Beigetreten {normalizedUser.joinDate}</span>
        </div>

        {user.canton && (
          <div className="flex items-center text-gray-600 text-sm">
            <span className="w-4 h-4 mr-2">📍</span>
            <span>{user.canton}</span>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100">
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center text-sm">
            <span className="w-4 h-4 mr-1 text-gray-400">💳</span>
            <span className="text-gray-600">{user.policyCount || 1} Police(n)</span>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Prämie</p>
            <p className="font-semibold text-green-600">
              {currencyFormatter(normalizedUser.totalPremium)}
            </p>
          </div>
        </div>

        {/* Additional info row */}
        <div className="flex justify-between items-center text-xs text-gray-500">
          {user.selected_insurer && (
            <span className="truncate">{user.selected_insurer}</span>
          )}
          {user.compliance_status && (
            <span className={`px-2 py-1 rounded text-xs ${
              user.compliance_status === 'Complete' 
                ? 'bg-green-100 text-green-700' 
                : 'bg-orange-100 text-orange-700'
            }`}>
              {user.compliance_status}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// UserDetails Component
function UserDetails({ user, onBack }: { user: UserData; onBack: () => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(user.status);
  const [adminNotes, setAdminNotes] = useState('');
  const [stats, setStats] = useState<DashboardStats>(defaultStats);

  
  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Fetch detailed user data
  const fetchUserDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }

      const data = await response.json();
      setUserDetails(data);
    } catch (err) {
      console.error('Error fetching user details:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to fetch user details');
      }
    }
  }; 


  // Update user status
    const updateUserStatus = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${user.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: editedStatus,
          notes: adminNotes
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update user status: ${response.status}`);
      }
      
      // Refresh user details
      await fetchUserDetails();
      setIsEditing(false);
      setAdminNotes('');
    } catch (err) {
      console.error('Error updating user status:', err);
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to update user status');
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  type Status = 'active' | 'inactive' | 'pending' | 'rejected';
  const getStatusColor = (status: Status): string => {
  switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

const getStatusIcon = (status: Status): ReactNode => {
  const iconStyle = "h-4 w-4";
  switch (status) {
    case 'active': return <span className={iconStyle}>✓</span>;
    case 'pending': return <span className={iconStyle}>⏱</span>;
    case 'rejected': return <span className={iconStyle}>✗</span>;
    default: return <span className={iconStyle}>⚠</span>;
  }
};

interface UserData {
  id: string | number;
  status?: string;
  totalPremium?: number;
  total_premium?: number;
  selected_insurer?: string;
}

interface Policy {
  id: string;
  type: string;
  number: string;
  status: 'active' | 'pending';
  premium: number;
  startDate: string;
  endDate: string;
  coverage: string;
  insurer?: string;
}

 const generateMockPolicies = (userData: UserData): Policy[] => {
  const policies: Policy[] = [];

  if (userData.selected_insurer) {
    policies.push({
      id: '1',
      type: 'Krankenversicherung',
      number: `KV-${userData.id}-001`,
      status: userData.status === 'active' ? 'active' : 'pending',
      premium: userData.totalPremium || userData.total_premium || 0,
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      coverage: 'Grundversicherung',
      insurer: userData.selected_insurer,
    });
  }

  return policies;
};

  const policies = generateMockPolicies(user);

  if (loading && !userDetails) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Zurück zu Benutzern
          </button>
        </div>
        <div className="p-6">
          <div className="animate-pulse space-y-6">
            <div className="flex items-start space-x-6">
              <div className="bg-gray-200 rounded-full p-4 w-16 h-16"></div>
              <div className="flex-1 space-y-3">
                <div className="h-6 bg-gray-200 rounded w-1/3"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            ← Zurück zu Benutzern
          </button>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(user.status as Status)}`}>
                  {getStatusIcon(user.status as Status)}
                  <span className="text-sm font-medium">
                    {user.status === 'active' ? 'Aktiv' : 
                    user.status === 'pending' ? 'Ausstehend' : 
                    user.status === 'inactive' ? 'Inaktiv' : 'Abgelehnt'}
                  </span>
                </div>

                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  ✏ Bearbeiten
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <select
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value)}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                >
                  <option value="pending">Ausstehend</option>
                  <option value="active">Aktiv</option>
                  <option value="inactive">Inaktiv</option>
                  <option value="rejected">Abgelehnt</option>
                </select>
                <button
                  onClick={updateUserStatus}
                  disabled={loading}
                  className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  💾 Speichern
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedStatus(user.status);
                    setAdminNotes('');
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  ✗ Abbrechen
                </button>
              </div>
            )}
          </div>
        </div>

        {isEditing && (
          <div className="mt-4">
            <textarea
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Admin-Notizen hinzufügen..."
              className="w-full border border-gray-300 rounded-lg p-3 text-sm"
              rows={3}
            />
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      <div className="p-6">
        {/* User Info Header */}
        <div className="flex items-start space-x-6 mb-8">
          <div className="bg-blue-100 rounded-full p-4">
            <Users className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
               {user.name || user.full_name || 'Unnamed User'}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2">✉</span>
                {user.email}
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2">📞</span>
                {user.phone}
              </div>
              <div className="flex items-center">
                <span className="w-4 h-4 mr-2">📅</span>
                Beigetreten {user.joinDate || (user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A')}
              </div>
              {user.canton && (
                <div className="flex items-center">
                  <span className="w-4 h-4 mr-2">📍</span>
                  {user.canton}, Schweiz
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Versicherungen</p>
                <p className="text-2xl font-bold text-blue-900">{user.policyCount || policies.length}</p>
              </div>
              <span className="text-2xl">📄</span>
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Jahresprämie</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(user.totalPremium || user.total_premium || 0)}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Ersparnis p.a.</p>
                <p className="text-2xl font-bold text-purple-900">
                  {formatCurrency(user.annual_savings || 0)}
                </p>
              </div>
              <span className="text-2xl">🛡</span>
            </div>
          </div>
        </div>

        {/* Policies List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Versicherungsverträge</h2>
          {policies.length > 0 ? (
            <div className="space-y-4">
              {policies.map((policy) => (
                <div key={policy.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{policy.type}</h3>
                      <p className="text-sm text-gray-600">Vertrag #{policy.number}</p>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status).replace('border-', 'border ')}`}>
                      {policy.status === 'active' ? 'Aktiv' : 
                       policy.status === 'pending' ? 'Ausstehend' : 
                       policy.status === 'expired' ? 'Abgelaufen' : 'Abgelehnt'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Prämie</p>
                      <p className="font-medium">{formatCurrency(policy.premium)}/Jahr</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Versicherer</p>
                      <p className="font-medium">{policy.insurer}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gültig von</p>
                      <p className="font-medium">{new Date(policy.startDate).toLocaleDateString('de-CH')}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Gültig bis</p>
                      <p className="font-medium">{new Date(policy.endDate).toLocaleDateString('de-CH')}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <span className="text-4xl mb-4 block">🏢</span>
              <p>Keine Versicherungsverträge gefunden</p>
            </div>
          )}
        </div>

        {/* Compliance Status */}
        {user.compliance_status && (
          <div className="mt-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Compliance Status</h2>
            <div className={`p-4 rounded-lg border ${
              user.compliance_status === 'Complete' 
                ? 'bg-green-50 border-green-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-center">
                {user.compliance_status === 'Complete' ? (
                  <span className="w-5 h-5 text-green-600 mr-2">✓</span>
                ) : (
                  <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
                )}
                <span className={`font-medium ${
                  user.compliance_status === 'Complete' ? 'text-green-800' : 'text-orange-800'
                }`}>
                  {user.compliance_status === 'Complete' ? 'Vollständig' : 'Unvollständig'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Main Dashboard Component
export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  // Handle client-side mounting to prevent hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch users and statistics
  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Fetch users with proper error handling
      const usersParams = new URLSearchParams();
      if (searchTerm.trim()) usersParams.append('search', searchTerm.trim());
      if (filterStatus !== 'all') usersParams.append('status', filterStatus);
      
      const usersResponse = await fetch(`/api/users?${usersParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }
      
      const usersData = await usersResponse.json();

      // Transform database users to match UserData interface
      const transformedUsers: UserData[] = (usersData.users || []).map((user: UserData) => ({
        ...user,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        joinDate: user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A',
        totalPremium: user.totalPremium || user.total_premium || 0,
        policyCount: 1, // Default to 1 for now
      }));

      setUsers(transformedUsers);

      // Fetch statistics
      const statsResponse = await fetch('/api/dashboard/stats', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData || {});
      } else {
        console.warn('Failed to fetch stats, using defaults');
        setStats({});
      }

    }  catch (err) {
    console.error('Error fetching data:', err);
    if (err instanceof Error) {
      setError(err.message);
    } else {
      setError('Failed to fetch data');
    }
    setUsers([]);
    setStats(defaultStats); // reset stats safely
  } finally {
    setLoading(false);
  }
};

  // Fetch data on component mount and when filters change
  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [searchTerm, filterStatus, mounted]);

  // Handle search with debouncing
  const handleSearch = (value: string) => {
    setSearchTerm(value);
  };

  // Handle status filter change
  const handleStatusFilter = (status: string) => {
    setFilterStatus(status);
  };

  // Handle user selection
  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user);
  };

  // Handle back from user details
  const handleBackFromDetails = () => {
    setSelectedUser(null);
    // Refresh data when coming back
    if (mounted) {
      fetchData();
    }
  };

  const getStatusColor = (status: Status): string => {
  switch (status) {
    case 'active': return 'text-green-600';
    case 'inactive': return 'text-red-600';
    case 'pending': return 'text-yellow-600';
    case 'rejected': return 'text-red-600';
    default: return 'text-gray-600';
  }
};

  const formatCurrency = (amount: number): string => {
    if (!mounted) return 'CHF 0'; // Prevent hydration mismatch

    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };


  // Don't render until mounted to prevent hydration issues
  if (!mounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Versicherungs Dashboard</h1>
            <p className="text-gray-600">Verwalten Sie Ihre Kunden und Versicherungsanträge</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // if (selectedUser) {
  //   return <UserDetails user={selectedUser} onBack={handleBackFromDetails} />;
  // }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Versicherungs Dashboard</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Kunden und Versicherungsanträge</p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={fetchData}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Aktualisieren</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
          <button 
            onClick={() => setError('')}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            ×
          </button>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gesamte Benutzer</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : stats.total_users}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktive Benutzer</p>
              <p className="text-2xl font-bold text-green-600">
                {loading ? '...' : (stats.active_users || 0)}
              </p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gesamtprämien</p>
              <p className="text-2xl font-bold text-purple-600">
                {loading ? '...' : formatCurrency(stats.total_approved_premium || 0)}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ausstehend</p>
              <p className="text-2xl font-bold text-yellow-600">
                {loading ? '...' : (stats.pending_users || 0)}
              </p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen Sie Benutzer nach Name oder E-Mail..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Alle Status</option>
              <option value="active">Aktiv</option>
              <option value="inactive">Inaktiv</option>
              <option value="pending">Ausstehend</option>
              <option value="rejected">Abgelehnt</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Grid */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-4">
                  <div className="bg-gray-200 rounded-full p-3 w-12 h-12"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                    <div className="h-3 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {users.map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onClick={handleSelectUser}
              formatCurrency={formatCurrency}
              getStatusColor={getStatusColor}
            />
          ))}
        </div>
      )}

      {!loading && users.length === 0 && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all' 
              ? 'Keine Benutzer gefunden, die Ihren Kriterien entsprechen'
              : 'Noch keine Benutzer registriert'
            }
          </p>
        </div>
      )}
    </div>
  );
}