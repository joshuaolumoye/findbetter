import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  User,
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Filter,
  Trash2,
  Eye,
  RefreshCw
} from 'lucide-react';

interface Notification {
  id: number;
  type: 'new_registration' | 'form_completed' | 'status_change' | 'document_uploaded' | 'system';
  title: string;
  message: string;
  user_id?: number;
  user_name?: string;
  user_email?: string;
  is_read: boolean;
  priority: 'low' | 'medium' | 'high';
  metadata?: any;
  created_at: string;
}

export default function Notifications() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'read'>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null);

  const fetchNotifications = async () => {
    try {
      const params = new URLSearchParams();
      if (filter !== 'all') params.append('filter', filter);
      if (typeFilter !== 'all') params.append('type', typeFilter);

      const response = await fetch(`/api/notifications?${params}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.notifications || []);
      setError('');
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err.message : 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [filter, typeFilter]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchNotifications, 30000); // Refresh every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh, filter, typeFilter]);

  const markAsRead = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setNotifications(notifications.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        ));
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      }
    } catch (err) {
      console.error('Error marking all as read:', err);
    }
  };

  const deleteNotification = async (notificationId: number) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => n.id !== notificationId));
        if (selectedNotification?.id === notificationId) {
          setSelectedNotification(null);
        }
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const deleteAllRead = async () => {
    try {
      const response = await fetch('/api/notifications/delete-read', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        setNotifications(notifications.filter(n => !n.is_read));
      }
    } catch (err) {
      console.error('Error deleting read notifications:', err);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_registration':
        return <User className="h-5 w-5 text-blue-600" />;
      case 'form_completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'document_uploaded':
        return <FileText className="h-5 w-5 text-purple-600" />;
      case 'status_change':
        return <AlertCircle className="h-5 w-5 text-orange-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('de-CH');
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bell className="h-7 w-7 mr-3 text-blue-600" />
            Notifications
            {unreadCount > 0 && (
              <span className="ml-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </h1>
          <p className="text-gray-600 mt-1">Stay updated with customer activities</p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-3 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span className="text-sm">Auto</span>
          </button>
          <button
            onClick={fetchNotifications}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center space-x-2"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="text-sm">Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-2xl font-bold text-gray-900">{notifications.length}</p>
            </div>
            <Bell className="h-8 w-8 text-gray-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unread</p>
              <p className="text-2xl font-bold text-red-600">{unreadCount}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">New Users</p>
              <p className="text-2xl font-bold text-blue-600">
                {notifications.filter(n => n.type === 'new_registration').length}
              </p>
            </div>
            <User className="h-8 w-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">
                {notifications.filter(n => n.type === 'form_completed').length}
              </p>
            </div>
            <CheckCircle className="h-8 w-8 text-green-400" />
          </div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Notifications</option>
                <option value="unread">Unread Only</option>
                <option value="read">Read Only</option>
              </select>
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Types</option>
              <option value="new_registration">New Registrations</option>
              <option value="form_completed">Forms Completed</option>
              <option value="document_uploaded">Documents</option>
              <option value="status_change">Status Changes</option>
            </select>
          </div>
          <div className="flex items-center space-x-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="px-3 py-2 text-blue-600 hover:bg-blue-50 rounded-lg text-sm flex items-center space-x-1"
              >
                <Check className="h-4 w-4" />
                <span>Mark All Read</span>
              </button>
            )}
            <button
              onClick={deleteAllRead}
              className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm flex items-center space-x-1"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Read</span>
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
          <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Notifications List */}
      <div className="grid grid-cols-1 gap-3">
        {notifications.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
            <p className="text-gray-600">
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "There are no notifications to display."}
            </p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`bg-white rounded-xl shadow-sm border-2 p-5 hover:shadow-md transition-all cursor-pointer ${
                !notification.is_read
                  ? 'border-blue-300 bg-blue-50/30'
                  : 'border-gray-200'
              }`}
              onClick={() => {
                if (!notification.is_read) markAsRead(notification.id);
                if (notification.user_id) {
                  router.push(`/admin?user=${notification.user_id}`);
                }
              }}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className={`p-3 rounded-lg ${
                    !notification.is_read ? 'bg-blue-100' : 'bg-gray-100'
                  }`}>
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-semibold text-gray-900">{notification.title}</h3>
                      {notification.priority !== 'low' && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${getPriorityColor(notification.priority)}`}>
                          {notification.priority.toUpperCase()}
                        </span>
                      )}
                      {!notification.is_read && (
                        <span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 mb-2">{notification.message}</p>
                    {notification.user_name && (
                      <div className="flex items-center space-x-4 text-xs text-gray-600">
                        <span className="flex items-center">
                          <User className="h-3 w-3 mr-1" />
                          {notification.user_name}
                        </span>
                        {notification.user_email && (
                          <span className="truncate">{notification.user_email}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                      <span className="flex items-center">
                        <Clock className="h-3 w-3 mr-1" />
                        {formatTime(notification.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2 ml-4">
                  {notification.user_id && (
                    <a
                      href={`/admin?user=${notification.user_id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      title="View User"
                    >
                      <Eye className="h-4 w-4" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}