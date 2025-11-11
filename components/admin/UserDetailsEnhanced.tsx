import { useState, useEffect } from 'react';
import { 
  ArrowLeft, User, Mail, Phone, Calendar, MapPin, 
  FileText, DollarSign, AlertCircle, CheckCircle, 
  Edit, Save, X, Shield, Download, File, 
  Loader, ZoomIn, ExternalLink
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
  type: 'pdf' | 'image' | 'doc';
  name: string;
  path: string;
  category: 'application' | 'cancellation' | 'id_front' | 'id_back' | 'id_combined' | 'other';
  label: string;
  size?: number;
  createdAt?: string;
  mimeType?: string;
}

interface UserDetailsProps {
  user: UserData;
  onBack: () => void;
}

function DocumentModal({ 
  document, 
  onClose,
  onDownload 
}: { 
  document: UserDocument; 
  onClose: () => void;
  onDownload: (doc: UserDocument) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadClick = async () => {
    setDownloading(true);
    await onDownload(document);
    setDownloading(false);
  };

  const isPDF = document.type === 'pdf';
  const isDoc = document.type === 'doc';
  const isImage = document.type === 'image';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{document.label}</h3>
            <p className="text-sm text-gray-600 truncate">{document.name}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            title="Schließen"
          >
            <X className="h-6 w-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 bg-gray-50">
          {isPDF && (
            <iframe
              src={document.path}
              className="w-full h-full min-h-[600px] border-0 rounded-lg bg-white"
              title={document.name}
              onError={() => setImageError(true)}
            />
          )}

          {isDoc && (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              <div className="text-center">
                <File className="h-16 w-16 text-blue-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Word Document</p>
                <p className="text-sm text-gray-600 mb-4">{document.name}</p>
                <button
                  onClick={handleDownloadClick}
                  disabled={downloading}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {downloading ? 'Downloading...' : 'Download to View'}
                </button>
              </div>
            </div>
          )}

          {isImage && (
            <div className="flex items-center justify-center h-full min-h-[500px]">
              {!imageLoaded && !imageError && (
                <div className="text-center">
                  <Loader className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                  <p className="text-gray-600">Bild wird geladen...</p>
                </div>
              )}
              
              {imageError && (
                <div className="text-center text-red-600">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4" />
                  <p className="font-medium">Fehler beim Laden des Bildes</p>
                  <p className="text-sm text-gray-600 mt-2">Pfad: {document.path}</p>
                  <button
                    onClick={() => {
                      setImageError(false);
                      setImageLoaded(false);
                    }}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Erneut versuchen
                  </button>
                </div>
              )}
              
              <img
                src={document.path}
                alt={document.name}
                className={`max-w-full max-h-full object-contain rounded-lg shadow-lg ${
                  !imageLoaded ? 'hidden' : ''
                }`}
                onLoad={() => {
                  setImageLoaded(true);
                  setImageError(false);
                }}
                onError={() => {
                  setImageError(true);
                  setImageLoaded(false);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-white">
          <div className="flex items-center space-x-4 text-sm text-gray-600">
            {document.size && (
              <span>Größe: {formatFileSize(document.size)}</span>
            )}
            {document.createdAt && (
              <span>
                Erstellt: {new Date(document.createdAt).toLocaleDateString('de-CH')}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadClick}
              disabled={downloading}
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>Lädt...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Herunterladen</span>
                </>
              )}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Schließen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatFileSize(bytes?: number) {
  if (!bytes) return 'N/A';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export default function UserDetailsEnhanced({ user, onBack }: UserDetailsProps) {
  const [loading, setLoading] = useState(false);
  const [userDetails, setUserDetails] = useState<UserData | null>(null);
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStatus, setEditedStatus] = useState(user.status);
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [downloadingDoc, setDownloadingDoc] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<UserDocument | null>(null);

  // Signed documents from Express (Skribble)
  const EXPRESS_BASE = (process.env.NEXT_PUBLIC_EXPRESS_BASE_URL as string) || 'http://localhost:3001';
  const [signedDocuments, setSignedDocuments] = useState<any[]>([]);
  const [signedDocsLoading, setSignedDocsLoading] = useState(false);
  const [signedDocsError, setSignedDocsError] = useState('');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('de-CH', {
      style: 'currency',
      currency: 'CHF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

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
      
      await fetchUserDocuments(user.id);
      // Fetch signed documents from Express (skribble) for this user
      await fetchSignedDocuments(user.id);
    } catch (err) {
      console.error('Error fetching user details:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch user details');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDocuments = async (userId: number) => {
    try {
      console.log(`Fetching documents for user ${userId}...`);
      const response = await fetch(`/api/users/${userId}/documents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Documents received:', data.documents);
        setDocuments(data.documents || []);
      } else {
        console.error('Failed to fetch documents:', response.status);
        setDocuments([]);
      }
    } catch (err) {
      console.error('Error fetching documents:', err);
      setDocuments([]);
    }
  };

  // Fetch signed documents for a specific user from the Express endpoint
  const fetchSignedDocuments = async (userId: number) => {
    setSignedDocsLoading(true);
    setSignedDocsError('');
    try {
      const url = `${EXPRESS_BASE}/express/api/get-all-documents`;
      console.log('[UserDetailsEnhanced] Fetching signed documents for user', userId, 'from:', url);
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) {
        throw new Error(`Failed to fetch signed docs: ${res.status}`);
      }
      const body = await res.json();
      console.log('[UserDetailsEnhanced] Response received:', body);
      const arr = Array.isArray(body.data) ? body.data : (body.data || []);
      const userDocs = arr.filter((d: any) => String(d.userId) === String(userId));
      setSignedDocuments(userDocs);
      console.log('[UserDetailsEnhanced] Documents for user', userId, ':', userDocs);
    } catch (err) {
      console.error('Error fetching signed documents:', err);
      setSignedDocsError(err instanceof Error ? err.message : 'Failed to load signed documents');
      setSignedDocuments([]);
    } finally {
      setSignedDocsLoading(false);
    }
  };

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

  const handleDownload = async (doc: UserDocument) => {
    setDownloadingDoc(doc.name);
    setError('');
    
    try {
      console.log('Downloading document:', doc.path);
      // Use POST /api/users/[id]/documents so server serves the file buffer with correct headers
      const response = await fetch(`/api/users/${user.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filePath: doc.path })
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.name;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }, 100);
      
      console.log('Download successful');
    } catch (err) {
      console.error('Download error:', err);
      setError(`Download fehlgeschlagen: ${err instanceof Error ? err.message : 'Unbekannter Fehler'}`);
    } finally {
      setDownloadingDoc(null);
    }
  };

  const handleView = (doc: UserDocument) => {
    console.log('Viewing document:', doc);
    // Ensure path has leading slash so the browser requests /uploads/.. from site root
    const viewPath = doc.path.startsWith('/') ? doc.path : `/${doc.path}`;
    setViewingDocument({ ...doc, path: viewPath });
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
    if (doc.type === 'doc') return <File className="h-6 w-6 text-blue-600" />;
    return (
      <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    );
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
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
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
            <AlertCircle className="w-5 h-5 text-red-500 mr-2 flex-shrink-0" />
            <span className="text-red-700">{error}</span>
            <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">×</button>
          </div>
        )}

        <div className="p-6 space-y-8">
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

          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Dokumente
              </h2>
              <span className="text-sm text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                {documents.length} {documents.length === 1 ? 'Dokument' : 'Dokumente'}
              </span>
            </div>
            
            {documents.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {documents.map((doc, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        {getDocumentIcon(doc)}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 truncate">{doc.label}</h3>
                          <p className="text-xs text-gray-600 truncate">{doc.name}</p>
                          {(doc.size || doc.createdAt) && (
                            <p className="text-xs text-gray-500 mt-1">
                              {doc.size && formatFileSize(doc.size)}
                              {doc.size && doc.createdAt && ' • '}
                              {doc.createdAt && new Date(doc.createdAt).toLocaleDateString('de-CH')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleView(doc)}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                      >
                        <ZoomIn className="h-4 w-4" />
                        <span className="text-sm">Ansehen</span>
                      </button>
                      <button
                        onClick={() => handleDownload(doc)}
                        disabled={downloadingDoc === doc.name}
                        className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {downloadingDoc === doc.name ? (
                          <>
                            <Loader className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Lädt...</span>
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            <span className="text-sm">Download</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 border border-gray-200 rounded-lg bg-gray-50">
                <File className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p className="font-medium text-lg mb-2">Keine Dokumente verfügbar</p>
                <p className="text-sm">Es wurden noch keine Dokumente für diesen Benutzer hochgeladen.</p>
              </div>
            )}
          </div>

          {/* Signed Documents (from Express) */}
          <div className="mt-6 p-6 border-t border-gray-100 bg-white rounded-lg">
            <h3 className="text-md font-semibold text-gray-900 mb-3 flex items-center">
              <FileText className="h-5 w-5 mr-2" />
              Document Status
            </h3>

            {signedDocsLoading && <p className="text-sm text-gray-600">Loading documents...</p>}
            {signedDocsError && <p className="text-sm text-red-600">{signedDocsError}</p>}

            {signedDocuments.length === 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <AlertCircle className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <p className="text-blue-900 font-medium">No documents yet</p>
                <p className="text-blue-700 text-sm">Waiting for document signing to begin</p>
              </div>
            ) : (
              <div className="space-y-4">
                {signedDocuments.map((doc: any, idx: number) => {
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
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
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
                              <AlertCircle className="h-5 w-5 text-yellow-600" />
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
        </div>
      </div>

      {viewingDocument && (
        <DocumentModal
          document={viewingDocument}
          onClose={() => setViewingDocument(null)}
          onDownload={handleDownload}
        />
      )}
    </>
  );
}