// File: src/components/admin/Policies.tsx
'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Eye,
  Filter,
  Search,
  Calendar,
  User,
  Building,
  Shield,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  X as XIcon,
  Mail,
  Phone,
  MapPin,
  File,
  Image as ImageIcon,
  ExternalLink,
  TrendingUp,
  TrendingDown
} from 'lucide-react';

// Insurance Companies Mapping
const insuranceCompanies = [
  { id: "0", name: "None" },
  { id: "1560", name: "Agrisano" },
  { id: "1507", name: "AMB Assurances SA" },
  { id: "0032", name: "Aquilana" },
  { id: "1569", name: "Arcosana (CSS)" },
  { id: "1542", name: "Assura" },
  { id: "0312", name: "Atupri" },
  { id: "0343", name: "Avenir (Groupe Mutuel)" },
  { id: "1322", name: "Birchmeier" },
  { id: "1575", name: "Compact" },
  { id: "0290", name: "Concordia" },
  { id: "0008", name: "CSS" },
  { id: "0774", name: "Easy Sana (Groupe Mutuel)" },
  { id: "0881", name: "EGK" },
  { id: "0134", name: "Einsiedler" },
  { id: "1386", name: "Galenos" },
  { id: "0780", name: "Glarner" },
  { id: "1562", name: "Helsana" },
  { id: "1142", name: "Ingenbohl" },
  { id: "1529", name: "Intras (CSS)" },
  { id: "0829", name: "KluG" },
  { id: "0762", name: "Kolping (Sympany)" },
  { id: "0376", name: "KPT" },
  { id: "0558", name: "KVF" },
  { id: "0820", name: "Lumneziana" },
  { id: "0360", name: "Luzerner Hinterland" },
  { id: "0057", name: "Moove (Sympany)" },
  { id: "1479", name: "Mutuel" },
  { id: "0455", name: "ÖKK" },
  { id: "1535", name: "Philos (Groupe Mutuel)" },
  { id: "1998", name: "Prezisa" },
  { id: "0994", name: "Progrès" },
  { id: "0182", name: "Provita" },
  { id: "1401", name: "Rhenusana" },
  { id: "1568", name: "sana24" },
  { id: "1577", name: "Sanagate (CSS)" },
  { id: "0901", name: "Sanavals" },
  { id: "1509", name: "Sanitas" },
  { id: "0923", name: "SLKK" },
  { id: "0941", name: "Sodalis" },
  { id: "0246", name: "Steffisburg" },
  { id: "1331", name: "Stoffel Mels" },
  { id: "0194", name: "Sumiswalder" },
  { id: "0062", name: "Supra" },
  { id: "1384", name: "Swica" },
  { id: "0509", name: "Sympany" },
  { id: "1113", name: "Vallée d'Entremont" },
  { id: "1555", name: "Visana" },
  { id: "1040", name: "Visperterminen" },
  { id: "0966", name: "Vita" },
  { id: "1570", name: "Vivacare" },
  { id: "1318", name: "Wädenswil" },
];

interface Policy {
  id: number;
  userId: number;
  userName: string;
  userEmail: string;
  userPhone: string;
  userAddress: string;
  userCanton: string;
  userPostalCode: string;
  birthDate: string;

  // Current Insurance (OLD INSURER)
  oldInsurer?: string;
  currentInsurer?: string;
  currentPolicyNumber?: string;
  currentPremium?: number;
  insuranceStartDate?: string;

  // New/Selected Insurance
  selectedInsurer: string;
  selectedTariffName: string;
  selectedPremium: number;
  selectedFranchise: string;
  selectedAccidentInclusion: string;
  annualSavings: number;

  // Status
  status: 'pending' | 'active' | 'approved' | 'rejected' | 'cancelled';
  quoteStatus: string;
  complianceStatus: 'Complete' | 'Incomplete';

  // Documents
  documents: PolicyDocument[];

  // Dates
  createdAt: string;
  updatedAt: string;
}

interface PolicyDocument {
  id: string;
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined' | 'other';
  label: string;
  size?: number;
  uploadedAt: string;
}

interface DocumentModalProps {
  document: PolicyDocument;
  onClose: () => void;
}

// Helper function to get insurance name from ID
const getInsuranceNameById = (id: string): string => {
  if (!id) return 'N/A';
  const company = insuranceCompanies.find(c => c.id === id);
  return company ? company.name : id;
};

function DocumentModal({ document, onClose }: DocumentModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{document.label}</h3>
            <p className="text-sm text-gray-600">{document.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XIcon className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {document.type === 'pdf' ? (
            <iframe
              src={document.path}
              className="w-full h-full min-h-[600px] border-0 rounded-lg"
              title={document.name}
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <img
                src={document.path}
                alt={document.name}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 p-4 border-t border-gray-200">
          <a
            href={document.path}
            download={document.name}
            className="px-4 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Download</span>
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Policies() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [filteredPolicies, setFilteredPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedPolicy, setExpandedPolicy] = useState<number | null>(null);
  const [viewingDocument, setViewingDocument] = useState<PolicyDocument | null>(null);
  const [sortBy, setSortBy] = useState<'date' | 'premium' | 'savings'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Signed documents fetched from the Express server (Skribble results)
  const EXPRESS_BASE = (process.env.NEXT_PUBLIC_EXPRESS_BASE_URL as string) || 'http://localhost:3001';
  const [signedDocsMap, setSignedDocsMap] = useState<Record<string, any>>({});
  const [docsLoading, setDocsLoading] = useState(false);
  const [docsError, setDocsError] = useState('');

  const fetchPolicies = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/policies', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch policies');
      }

      const data = await response.json();
      setPolicies(data.policies || []);
      setFilteredPolicies(data.policies || []);
    } catch (err) {
      console.error('Error fetching policies:', err);
      setError(err instanceof Error ? err.message : 'Failed to load policies');
    } finally {
      setLoading(false);
    }
  };

  // Fetch signed documents from Express (Skribble results)
  const fetchSignedDocuments = async () => {
    setDocsLoading(true);
    setDocsError('');
    try {
      const url = `${EXPRESS_BASE}/api/get-all-documents`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`Failed to fetch signed docs: ${res.status}`);
      const body = await res.json();
      const arr = Array.isArray(body.data) ? body.data : (body.data || []);
      const map: Record<string, any[]> = {};
      arr.forEach((d: any) => {
        const uid = String(d.userId);
        if (!map[uid]) map[uid] = [];
        map[uid].push(d);
      });
      setSignedDocsMap(map);
    } catch (err) {
      console.error('Error fetching signed documents:', err);
      setDocsError(err instanceof Error ? err.message : 'Failed to load signed documents');
    } finally {
      setDocsLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
    fetchSignedDocuments();
  }, []);

  useEffect(() => {
    let filtered = [...policies];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.userName.toLowerCase().includes(term) ||
          p.userEmail.toLowerCase().includes(term) ||
          p.selectedInsurer.toLowerCase().includes(term) ||
          getInsuranceNameById(p.oldInsurer || '').toLowerCase().includes(term) ||
          p.userPostalCode.includes(term)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((p) => p.status === statusFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'premium':
          aVal = a.selectedPremium;
          bVal = b.selectedPremium;
          break;
        case 'savings':
          aVal = a.annualSavings;
          bVal = b.annualSavings;
          break;
        default:
          aVal = new Date(a.createdAt).getTime();
          bVal = new Date(b.createdAt).getTime();
      }

      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredPolicies(filtered);
  }, [policies, searchTerm, statusFilter, sortBy, sortOrder]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-CH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'rejected':
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'rejected':
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getDocumentIcon = (doc: PolicyDocument) => {
    if (doc.type === 'pdf') return <FileText className="h-5 w-5 text-red-600" />;
    return <ImageIcon className="h-5 w-5 text-blue-600" />;
  };

  const handleDownload = async (doc: PolicyDocument) => {
    try {
      const response = await fetch(doc.path);
      if (!response.ok) throw new Error('Document not found');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download document');
    }
  };

  const stats = {
    total: policies.length,
    pending: policies.filter((p) => p.status === 'pending').length,
    active: policies.filter((p) => p.status === 'active' || p.status === 'approved').length,
    totalSavings: policies.reduce((sum, p) => sum + (p.annualSavings || 0), 0),
    avgPremium: policies.length > 0 
      ? policies.reduce((sum, p) => sum + p.selectedPremium, 0) / policies.length 
      : 0
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Policies Management</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Policies Management</h1>
            <p className="text-gray-600">Manage customer insurance policies and documents</p>
          </div>
          <button
            onClick={fetchPolicies}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Policies</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Policies</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Savings</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(stats.totalSavings)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, email, insurer..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <select
                value={`${sortBy}-${sortOrder}`}
                onChange={(e) => {
                  const [sort, order] = e.target.value.split('-');
                  setSortBy(sort as any);
                  setSortOrder(order as any);
                }}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="date-desc">Newest First</option>
                <option value="date-asc">Oldest First</option>
                <option value="premium-desc">Highest Premium</option>
                <option value="premium-asc">Lowest Premium</option>
                <option value="savings-desc">Highest Savings</option>
                <option value="savings-asc">Lowest Savings</option>
              </select>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
              ×
            </button>
          </div>
        )}

        {/* Policies List */}
        <div className="space-y-4">
          {filteredPolicies.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Policies Found</h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : 'No policies have been created yet'}
              </p>
            </div>
          ) : (
            filteredPolicies.map((policy) => (
              <div
                key={policy.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Policy Header */}
                <div
                  className="p-6 cursor-pointer"
                  onClick={() => setExpandedPolicy(expandedPolicy === policy.id ? null : policy.id)}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="bg-blue-100 rounded-full p-3">
                        <User className="h-6 w-6 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">{policy.userName}</h3>
                          <span className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(policy.status)}`}>
                            {getStatusIcon(policy.status)}
                            <span>{policy.status.charAt(0).toUpperCase() + policy.status.slice(1)}</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-2" />
                            {policy.userEmail}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-2" />
                            {policy.userPhone}
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-2" />
                            {policy.userPostalCode} {policy.userCanton}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      {expandedPolicy === policy.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Quick Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
                    <div>
                      <p className="text-xs text-gray-500">Selected Insurer</p>
                      <p className="text-sm font-semibold text-gray-900">{policy.selectedInsurer}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Monthly Premium</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(policy.selectedPremium)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Annual Savings</p>
                      <p className="text-sm font-semibold text-green-600 flex items-center">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        {formatCurrency(policy.annualSavings)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Documents</p>
                      <p className="text-sm font-semibold text-gray-900">{policy.documents.length} files</p>
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedPolicy === policy.id && (
                  <div className="border-t border-gray-200 p-6 bg-gray-50 space-y-6">
                    {/* Current vs New Insurance Comparison */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4">Insurance Comparison</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Current Insurance (OLD INSURER) */}
                        <div className="bg-white rounded-lg border border-gray-200 p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Building className="h-5 w-5 text-gray-600" />
                            <h5 className="font-semibold text-gray-900">Current Insurance</h5>
                          </div>
                          {policy.oldInsurer ? (
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Insurer:</span>
                                <span className="font-medium">{getInsuranceNameById(policy.oldInsurer)}</span>
                              </div>
                            </div>
                          ) : (
                            <p className="text-sm text-gray-500">No current insurance information</p>
                          )}
                        </div>

                        {/* New Insurance */}
                        <div className="bg-green-50 rounded-lg border border-green-200 p-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Shield className="h-5 w-5 text-green-600" />
                            <h5 className="font-semibold text-gray-900">New Insurance</h5>
                          </div>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Insurer:</span>
                              <span className="font-medium">{policy.selectedInsurer}</span>
                            </div>
                            {policy.currentPolicyNumber && (
                              <div className="flex justify-between">
                                <span className="text-gray-600">Policy #:</span>
                                <span className="font-medium">{policy.currentPolicyNumber}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-gray-600">Tariff:</span>
                              <span className="font-medium">{policy.selectedTariffName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Premium:</span>
                              <span className="font-medium">{formatCurrency(policy.selectedPremium)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Franchise:</span>
                              <span className="font-medium">{policy.selectedFranchise}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Accident:</span>
                              <span className="font-medium">{policy.selectedAccidentInclusion}</span>
                            </div>
                            <div className="flex justify-between pt-2 border-t border-green-200">
                              <span className="text-green-700 font-medium">Annual Savings:</span>
                              <span className="font-bold text-green-700">{formatCurrency(policy.annualSavings)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Documents */}
                    <div>
                      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <File className="h-5 w-5 mr-2" />
                        Documents ({policy.documents.length})
                      </h4>
                      {policy.documents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {policy.documents.map((doc) => (
                            <div key={doc.id} className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
                              <div className="flex items-start space-x-3 mb-3">
                                {getDocumentIcon(doc)}
                                <div className="flex-1 min-w-0">
                                  <h5 className="font-medium text-gray-900 truncate">{doc.label}</h5>
                                  <p className="text-xs text-gray-500 truncate">{doc.name}</p>
                                  <p className="text-xs text-gray-400 mt-1">
                                    {formatDate(doc.uploadedAt)}
                                  </p>
                                </div>
                              </div>
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => setViewingDocument(doc)}
                                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-sm"
                                >
                                  <Eye className="h-4 w-4" />
                                  <span>View</span>
                                </button>
                                <button
                                  onClick={() => handleDownload(doc)}
                                  className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors text-sm"
                                >
                                  <Download className="h-4 w-4" />
                                  <span>Download</span>
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
                          <File className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                          <p className="text-gray-600">No documents uploaded yet</p>
                        </div>
                      )}
                    </div>

                    {/* Signed Documents from Skribble/Express */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center">
                        <FileText className="h-5 w-5 mr-2" />
                        Document Status
                      </h4>

                      {docsLoading && <p className="text-sm text-gray-600">Loading documents...</p>}
                      {docsError && <p className="text-sm text-red-600">{docsError}</p>}

                      {((signedDocsMap[String(policy.userId)] || []).length === 0) ? (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                          <AlertCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                          <p className="text-blue-900 font-medium">No documents yet</p>
                          <p className="text-blue-700 text-sm">Waiting for user to initiate document signing</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(signedDocsMap[String(policy.userId)] || []).map((doc: any, idx: number) => {
                            // Application Document Status
                            const appSigned = !!doc.pdfPath && doc.status === 'signed';
                            const appPending = doc.signingUrl && !doc.pdfPath;
                            const appDate = doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('de-CH') : (doc.createdAt ? new Date(doc.createdAt).toLocaleString('de-CH') : 'N/A');
                            
                            // Cancellation Document Status
                            const cancellationSigned = !!doc.cancellationPdfPath && doc.cancellationStatus === 'signed';
                            const cancellationPending = doc.cancellationSigningUrl && !doc.cancellationPdfPath;
                            const cancellationDate = doc.updatedAt ? new Date(doc.updatedAt).toLocaleString('de-CH') : (doc.createdAt ? new Date(doc.createdAt).toLocaleString('de-CH') : 'N/A');
                            
                            return (
                              <div key={doc.documentId || doc._id || `doc-${idx}`} className="space-y-2">
                                {/* Application Document */}
                                <div
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    appSigned
                                      ? 'bg-green-50 border-green-200'
                                      : appPending
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div>
                                      {appSigned ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                      ) : appPending ? (
                                        <Clock className="h-5 w-5 text-yellow-600" />
                                      ) : (
                                        <FileText className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className={`text-sm font-medium ${
                                          appSigned ? 'text-green-900' : appPending ? 'text-yellow-900' : 'text-gray-700'
                                        }`}>
                                          {appSigned ? '✓ Application Signed' : appPending ? '⏳ Application Pending' : 'Application Processing'}
                                        </p>
                                        {doc.documentType && (
                                          <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                                            {doc.documentType}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-xs text-gray-600">{appDate}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-3">
                                    {appSigned && doc.pdfPath && (
                                      <button
                                        onClick={() => {
                                          const a = document.createElement('a');
                                          a.href = doc.pdfPath;
                                          a.download = `application-${doc.documentId || doc._id}.pdf`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                        }}
                                        className="px-3 py-1 text-xs text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors flex items-center space-x-1"
                                        title="Download signed application"
                                      >
                                        <Download className="h-3 w-3" />
                                        <span>Download</span>
                                      </button>
                                    )}
                                    {appPending && doc.signingUrl && (
                                      <button
                                        onClick={() => window.open(doc.signingUrl, '_blank')}
                                        className="px-3 py-1 text-xs text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors flex items-center space-x-1"
                                        title="Sign application"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span>Sign</span>
                                      </button>
                                    )}
                                  </div>
                                </div>

                                {/* Cancellation Document */}
                                <div
                                  className={`flex items-center justify-between p-3 rounded-lg border ${
                                    cancellationSigned
                                      ? 'bg-green-50 border-green-200'
                                      : cancellationPending
                                      ? 'bg-yellow-50 border-yellow-200'
                                      : 'bg-gray-50 border-gray-200'
                                  }`}
                                >
                                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                                    <div>
                                      {cancellationSigned ? (
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                      ) : cancellationPending ? (
                                        <Clock className="h-5 w-5 text-yellow-600" />
                                      ) : (
                                        <FileText className="h-5 w-5 text-gray-400" />
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center space-x-2">
                                        <p className={`text-sm font-medium ${
                                          cancellationSigned ? 'text-green-900' : cancellationPending ? 'text-yellow-900' : 'text-gray-700'
                                        }`}>
                                          {cancellationSigned ? '✓ Cancellation Signed' : cancellationPending ? '⏳ Cancellation Pending' : 'Cancellation Processing'}
                                        </p>
                                        <span className="text-xs px-2 py-0.5 bg-blue-200 text-blue-700 rounded">
                                          Cancellation
                                        </span>
                                      </div>
                                      <p className="text-xs text-gray-600">{cancellationDate}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2 ml-3">
                                    {cancellationSigned && doc.cancellationPdfPath && (
                                      <button
                                        onClick={() => {
                                          const a = document.createElement('a');
                                          a.href = doc.cancellationPdfPath;
                                          a.download = `cancellation-${doc.cancellationDocumentId || doc._id}.pdf`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                        }}
                                        className="px-3 py-1 text-xs text-green-700 bg-green-100 hover:bg-green-200 rounded transition-colors flex items-center space-x-1"
                                        title="Download signed cancellation"
                                      >
                                        <Download className="h-3 w-3" />
                                        <span>Download</span>
                                      </button>
                                    )}
                                    {cancellationPending && doc.cancellationSigningUrl && (
                                      <button
                                        onClick={() => window.open(doc.cancellationSigningUrl, '_blank')}
                                        className="px-3 py-1 text-xs text-yellow-700 bg-yellow-100 hover:bg-yellow-200 rounded transition-colors flex items-center space-x-1"
                                        title="Sign cancellation"
                                      >
                                        <ExternalLink className="h-3 w-3" />
                                        <span>Sign</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Additional Info */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 mb-1">Compliance Status</p>
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                          policy.complianceStatus === 'Complete'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-orange-100 text-orange-800'
                        }`}>
                          {policy.complianceStatus === 'Complete' ? (
                            <CheckCircle className="h-3 w-3" />
                          ) : (
                            <AlertCircle className="h-3 w-3" />
                          )}
                          <span>{policy.complianceStatus}</span>
                        </span>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 mb-1">Created</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(policy.createdAt)}</p>
                      </div>
                      <div className="bg-white rounded-lg border border-gray-200 p-4">
                        <p className="text-xs text-gray-500 mb-1">Last Updated</p>
                        <p className="text-sm font-medium text-gray-900">{formatDate(policy.updatedAt)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Document Modal */}
      {viewingDocument && (
        <DocumentModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
        />
      )}
    </>
  );
}