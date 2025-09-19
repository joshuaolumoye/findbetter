'use client';

import { ArrowLeft, User, Mail, Phone, Calendar, MapPin, CreditCard, FileText, DollarSign, Clock } from 'lucide-react';
import { UserData } from './UserCard';

interface Policy {
  id: string;
  type: string;
  number: string;
  status: 'active' | 'expired' | 'pending';
  premium: number;
  startDate: string;
  endDate: string;
  coverage: string;
}

interface UserDetailsProps {
  user: UserData;
  onBack: () => void;
}

export default function UserDetails({ user, onBack }: UserDetailsProps) {
  // Mock policy data - in real app, this would come from API
  const policies: Policy[] = [
    {
      id: '1',
      type: 'Health Insurance',
      number: 'HI-2024-001',
      status: 'active',
      premium: 1200,
      startDate: '2024-01-15',
      endDate: '2025-01-14',
      coverage: '$500,000'
    },
    {
      id: '2',
      type: 'Life Insurance',
      number: 'LI-2024-002',
      status: 'active',
      premium: 800,
      startDate: '2024-02-01',
      endDate: '2025-01-31',
      coverage: '$1,000,000'
    },
    {
      id: '3',
      type: 'Auto Insurance',
      number: 'AI-2023-003',
      status: 'expired',
      premium: 600,
      startDate: '2023-06-01',
      endDate: '2024-05-31',
      coverage: '$100,000'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Users
          </button>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(user.status)}`}>
            {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* User Info Header */}
        <div className="flex items-start space-x-6 mb-8">
          <div className="bg-blue-100 rounded-full p-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{user.name}</h1>
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
                Joined {user.joinDate}
              </div>
              <div className="flex items-center">
                <MapPin className="h-4 w-4 mr-2" />
                New York, USA
              </div>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Total Policies</p>
                <p className="text-2xl font-bold text-blue-900">{user.policyCount}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Total Premium</p>
                <p className="text-2xl font-bold text-green-900">${user.totalPremium.toLocaleString()}</p>
              </div>
              <DollarSign className="h-8 w-8 text-green-600" />
            </div>
          </div>
          
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Active Policies</p>
                <p className="text-2xl font-bold text-purple-900">{policies.filter(p => p.status === 'active').length}</p>
              </div>
              <CreditCard className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Policies List */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Insurance Policies</h2>
          <div className="space-y-4">
            {policies.map((policy) => (
              <div key={policy.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-medium text-gray-900">{policy.type}</h3>
                    <p className="text-sm text-gray-600">Policy #{policy.number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(policy.status)}`}>
                    {policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Premium</p>
                    <p className="font-medium">${policy.premium}/year</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Coverage</p>
                    <p className="font-medium">{policy.coverage}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Start Date</p>
                    <p className="font-medium">{new Date(policy.startDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">End Date</p>
                    <p className="font-medium">{new Date(policy.endDate).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}