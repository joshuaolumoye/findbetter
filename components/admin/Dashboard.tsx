import { useState, useEffect } from 'react';
import { Search, Filter, Users, TrendingUp, DollarSign, AlertCircle, RefreshCw } from 'lucide-react';

// Import the new UserDetails component
import UserDetails from './UserDetailsEnhanced';

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
  canton?: string;
  postal_code?: string;
  selected_insurer?: string;
  name?: string;
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
}: {
  user: UserData;
  onClick: (user: UserData) => void;
}) {
  const normalizedUser = {
    ...user,
    name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    joinDate: user.joinDate || (user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A'),
    totalPremium: user.totalPremium || user.total_premium || 0,
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

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
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(user.status)}`}>
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
              {formatCurrency(normalizedUser.totalPremium)}
            </p>
          </div>
        </div>

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

export default function Dashboard() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [users, setUsers] = useState<UserData[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const usersParams = new URLSearchParams();
      if (searchTerm.trim()) usersParams.append('search', searchTerm.trim());
      if (filterStatus !== 'all') usersParams.append('status', filterStatus);
      
      const usersResponse = await fetch(`/api/users?${usersParams}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!usersResponse.ok) {
        throw new Error(`Failed to fetch users: ${usersResponse.status}`);
      }
      
      const usersData = await usersResponse.json();

      const transformedUsers: UserData[] = (usersData.users || []).map((user: UserData) => ({
        ...user,
        name: user.full_name || `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        joinDate: user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A',
        totalPremium: user.totalPremium || user.total_premium || 0,
        policyCount: 1,
      }));

      setUsers(transformedUsers);

      const statsResponse = await fetch('/api/dashboard/stats', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData || defaultStats);
      } else {
        setStats(defaultStats);
      }

    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
      setUsers([]);
      setStats(defaultStats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mounted) {
      fetchData();
    }
  }, [searchTerm, filterStatus, mounted]);

  const formatCurrency = (amount: number): string => {
    if (!mounted) return 'CHF 0';
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  };

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

  // Show user details if a user is selected
  if (selectedUser) {
    return <UserDetails user={selectedUser} onBack={() => setSelectedUser(null)} />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Versicherungs Dashboard</h1>
          <p className="text-gray-600">Verwalten Sie Ihre Kunden und Versicherungsanträge</p>
        </div>
        <button 
          onClick={fetchData}
          className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Aktualisieren</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gesamte Benutzer</p>
              <p className="text-2xl font-bold text-gray-900">{loading ? '...' : stats.total_users}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Aktive Benutzer</p>
              <p className="text-2xl font-bold text-green-600">{loading ? '...' : stats.active_users}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Gesamtprämien</p>
              <p className="text-2xl font-bold text-purple-600">{loading ? '...' : formatCurrency(stats.total_approved_premium)}</p>
            </div>
            <DollarSign className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Ausstehend</p>
              <p className="text-2xl font-bold text-yellow-600">{loading ? '...' : stats.pending_users}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-yellow-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Suchen Sie Benutzer nach Name oder E-Mail..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500"
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
              onClick={setSelectedUser}
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