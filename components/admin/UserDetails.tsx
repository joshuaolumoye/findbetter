import { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, MapPin, 
  FileText, DollarSign, AlertCircle, CheckCircle, 
  Edit, Save, X, Shield, Download, File, Image as ImageIcon,
  ExternalLink, Loader
} from 'lucide-react';

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
  birth_date?: string;
  address?: string;
  street?: string;
  city?: string;
  nationality?: string;
  ahv_number?: string;
}

interface UserDocument {
  type: 'pdf' | 'image';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined';
  label: string;
}

interface UserDetailsProps {
  user: UserData;
  onBack: () => void;
}

export default function UserDetails({ user, onBack }: UserDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(user.status);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  // Fetch user details and documents
  const fetchUserDetails = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch user details: ${response.status}`);
      }

      const data = await response.json();
      setUserDetails(data.user);
      
      // Fetch documents
      await fetchUserDocuments(user.id);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  // Fetch user documents (PDFs and ID cards)
  const fetchUserDocuments = async (userId: number) => {
    try {
      const response = await fetch(`/api/users/${userId}/documents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
    }
  };

  // Update user status
  const updateUserStatus = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await fetch(`/api/users/${user.id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: editedStatus,
          notes: adminNotes
        })
      });
      
      if (!response.ok) {
        throw new Error(`Failed to update user status: ${response.status}`);
      }
      
      await fetchUserDetails();
      setIsEditing(false);
      setAdminNotes('');
    } catch (err) {
      console.error('Error updating user status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update user status');
    } finally {
      setLoading(false);
    }
  };

  // Download document
  const handleDownload = async (doc: UserDocument) => {
    setDownloadingDoc(doc.name);
    try {
      const response = await fetch(`/api/users/${user.id}/documents/download?path=${encodeURIComponent(doc.path)}`);
      
      if (!response.ok) throw new Error('Download failed');
      
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
    } finally {
      setDownloadingDoc(null);
    }
  };

  // View document in new tab
  const handleView = (doc: UserDocument) => {
    window.open(doc.path, '_blank');
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
      case 'pending': return <AlertCircle className="h-4 w-4" />;
      default: return <X className="h-4 w-4" />;
    }
  };

  const getDocumentIcon = (doc: UserDocument) => {
    if (doc.type === 'pdf') return <FileText className="h-6 w-6 text-red-600" />;
    return <ImageIcon className="h-6 w-6 text-blue-600" />;
  };

  if (loading && !userDetails) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Zurück zu Benutzern
          </button>
        </div>
        <div className="p-6 flex justify-center">
          <Loader className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  const displayUser = userDetails || user;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-5 w-5 mr-2" />
            Zurück zu Benutzern
          </button>
          <div className="flex items-center space-x-3">
            {!isEditing ? (
              <>
                <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg border ${getStatusColor(displayUser.status)}`}>
                  {getStatusIcon(displayUser.status)}
                  <span className="text-sm font-medium">
                    {displayUser.status === 'active' ? 'Aktiv' : 
                     displayUser.status === 'pending' ? 'Ausstehend' : 
                     displayUser.status === 'inactive' ? 'Inaktiv' : 'Abgelehnt'}
                  </span>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                >
                  <Edit className="h-4 w-4" />
                  <span>Bearbeiten</span>
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
                  className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>Speichern</span>
                </button>
                <button
                  onClick={() => {
                    setIsEditing(false);
                    setEditedStatus(displayUser.status);
                    setAdminNotes('');
                  }}
                  className="flex items-center space-x-1 px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
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
          <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
        </div>
      )}

      <div className="p-6 space-y-8">
        {/* User Info */}
        <div className="flex items-start space-x-6">
          <div className="bg-blue-100 rounded-full p-4">
            <User className="h-8 w-8 text-blue-600" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {displayUser.name || displayUser.full_name || `${displayUser.first_name} ${displayUser.last_name}`}
            </h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
              <div className="flex items-center">
                <Mail className="h-4 w-4 mr-2" />
                {displayUser.email}
              </div>
              <div className="flex items-center">
                <Phone className="h-4 w-4 mr-2" />
                {displayUser.phone}
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                Geboren: {displayUser.birth_date ? new Date(displayUser.birth_date).toLocaleDateString('de-CH') : 'N/A'}
              </div>
              {displayUser.canton && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  {displayUser.canton}, Schweiz
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Versicherungen</p>
                <p className="text-2xl font-bold text-blue-900">{displayUser.policyCount || 1}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Jahresprämie</p>
                <p className="text-2xl font-bold text-green-900">
                  {formatCurrency(displayUser.totalPremium || displayUser.total_premium || 0)}
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
                  {formatCurrency(displayUser.annual_savings || 0)}
                </p>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Documents Section */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <FileText className="h-5 w-5 mr-2" />
            Dokumente
          </h2>
          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3 flex-1">
                      {getDocumentIcon(doc)}
                      <div>
                        <h3 className="font-medium text-gray-900">{doc.label}</h3>
                        <p className="text-sm text-gray-600">{doc.name}</p>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Anzeigen"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingDoc === doc.name}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                        title="Herunterladen"
                      >
                        {downloadingDoc === doc.name ? (
                          <Loader className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 border border-gray-200 rounded-lg">
              <File className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Keine Dokumente verfügbar</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}