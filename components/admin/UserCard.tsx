'use client';

import { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, MapPin, CreditCard, 
  FileText, DollarSign, Clock, AlertCircle, CheckCircle, 
  Edit, Save, X, Building, Shield, Settings
} from 'lucide-react';
import { UserData } from './UserCard';

interface Policy {
  id: string;
  type: string;
  number: string;
  status: 'active' | 'expired' | 'pending' | 'rejected';
  premium: number;
  startDate: string;
  endDate: string;
  coverage: string;
  insurer: string;
}

interface UserDetailsProps {
  user: UserData;
  onBack: () => void;
}

export default function UserDetails({ user, onBack }: UserDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(user.status);
  const [adminNotes, setAdminNotes] = useState('');

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
      setError(err.message || 'Failed to fetch user details');
    } finally {
      setLoading(false);
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
      setError(err.message || 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserDetails();
  }, [user.id]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle className="h-4 w-4" />;
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'rejected': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
    }
  };

  // Mock policy data based on user data - in real app, this would come from API
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
        insurer: userData.selected_insurer
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
            <ArrowLeft className="h-5 w-5 mr-2" />
            Zurück zu Benutzern
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
            <ArrowLeft className="h-5 w-5 mr-2" />
            Zurück zu Benutzern
          </button>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(user.status)}`}>
                  {getStatusIcon(user.status)}
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
                  <Edit className="h-4 w-4" />
                  <span>Bearbeiten</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <select
                  value={editedStatus}
                  onChange={(e) => setEditedStatus(e.target.value as any)}
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
                  <Save className="h-4 w-4" />
                  <span>Speichern</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedStatus(user.status);
                    setAdminNotes('');
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                  <span>Abbrechen</span>
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
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {user.name || user.full_name || 'Unnamed User'}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {user.email}
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                {user.phone}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Beigetreten {user.joinDate || user.join_date ? new Date(user.join_date).toLocaleDateString('de-CH') : 'N/A'}
              </div>
              {user.canton && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
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
              <FileText className="h-8 w-8 text-blue-600" />
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
              <Shield className="h-8 w-8 text-purple-600" />
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
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
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
              <Building className="h-12 w-12 mx-auto mb-4 text-gray-300" />
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
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
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
}