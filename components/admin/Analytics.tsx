import { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  Clock,
  MousePointer,
  Eye,
  Activity,
  BarChart3,
  Calendar,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface AnalyticsData {
  currentVisitors: number;
  totalVisitorsToday: number;
  totalVisitorsWeek: number;
  totalVisitorsMonth: number;
  avgSessionDuration: number;
  bounceRate: number;
  pageViews: number;
  uniqueVisitors: number;
  conversionRate: number;
  topPages: Array<{
    page: string;
    views: number;
    avgDuration: string;
  }>;
  visitorsByHour: Array<{
    hour: string;
    visitors: number;
  }>;
  userBehavior: {
    newUsers: number;
    returningUsers: number;
    completedForms: number;
    abandonedForms: number;
  };
  deviceBreakdown: Array<{
    device: string;
    percentage: number;
    count: number;
  }>;
  geographicData: Array<{
    canton: string;
    visitors: number;
    percentage: number;
  }>;
}

export default function Analytics() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month'>('today');
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/analytics?range=${timeRange}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const data = await response.json();
      setAnalytics(data);
    } catch (err) {
      console.error('Analytics fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(fetchAnalytics, 60000); // Refresh every minute
      return () => clearInterval(interval);
    }
  }, [autoRefresh, timeRange]);

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const exportData = () => {
    if (!analytics) return;
    
    const csvContent = `Analytics Report - ${timeRange}\n\n` +
      `Current Visitors,${analytics.currentVisitors}\n` +
      `Total Visitors,${analytics.totalVisitorsToday}\n` +
      `Avg Session Duration,${formatDuration(analytics.avgSessionDuration)}\n` +
      `Bounce Rate,${analytics.bounceRate}%\n` +
      `Conversion Rate,${analytics.conversionRate}%\n\n` +
      `Top Pages\n` +
      analytics.topPages.map(p => `${p.page},${p.views},${p.avgDuration}`).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeRange}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && !analytics) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
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

  if (!analytics) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Track visitor behavior and site performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Filter className="h-4 w-4 text-gray-600" />
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value as any)}
              className="border-0 focus:ring-0 text-sm"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`px-4 py-2 rounded-lg flex items-center space-x-2 ${
              autoRefresh ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
            <span>Auto</span>
          </button>
          <button
            onClick={exportData}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Real-time Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl shadow-sm p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Live Visitors</p>
              <p className="text-3xl font-bold">{analytics.currentVisitors}</p>
              <p className="text-blue-100 text-xs mt-1">Right now</p>
            </div>
            <Activity className="h-10 w-10 text-blue-200 animate-pulse" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Total Visitors</p>
              <p className="text-2xl font-bold text-gray-900">
                {timeRange === 'today' ? analytics.totalVisitorsToday :
                 timeRange === 'week' ? analytics.totalVisitorsWeek :
                 analytics.totalVisitorsMonth}
              </p>
              <div className="flex items-center mt-1">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 text-sm ml-1">+12.5%</span>
              </div>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Avg. Session</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatDuration(analytics.avgSessionDuration)}
              </p>
              <div className="flex items-center mt-1">
                <ArrowUp className="h-4 w-4 text-green-600" />
                <span className="text-green-600 text-sm ml-1">+8.3%</span>
              </div>
            </div>
            <Clock className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900">{analytics.conversionRate}%</p>
              <div className="flex items-center mt-1">
                <ArrowDown className="h-4 w-4 text-red-600" />
                <span className="text-red-600 text-sm ml-1">-2.1%</span>
              </div>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Page Views</h3>
            <Eye className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.pageViews.toLocaleString()}</p>
          <p className="text-sm text-gray-600 mt-1">{analytics.uniqueVisitors} unique visitors</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Bounce Rate</h3>
            <MousePointer className="h-5 w-5 text-gray-400" />
          </div>
          <p className="text-3xl font-bold text-gray-900">{analytics.bounceRate}%</p>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
            <div 
              className="bg-orange-500 h-2 rounded-full" 
              style={{ width: `${analytics.bounceRate}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">User Behavior</h3>
            <Activity className="h-5 w-5 text-gray-400" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">New Users</span>
              <span className="font-semibold">{analytics.userBehavior.newUsers}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Returning</span>
              <span className="font-semibold">{analytics.userBehavior.returningUsers}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Visitors by Hour */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
            Visitors by Hour
          </h3>
          <div className="space-y-3">
            {analytics.visitorsByHour.map((data, index) => (
              <div key={index} className="flex items-center space-x-3">
                <span className="text-xs text-gray-600 w-12">{data.hour}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div
                    className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${(data.visitors / 70) * 100}%` }}
                  >
                    <span className="text-white text-xs font-semibold">{data.visitors}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Pages */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center">
            <Eye className="h-5 w-5 mr-2 text-purple-600" />
            Top Pages
          </h3>
          <div className="space-y-3">
            {analytics.topPages.map((page, index) => (
              <div key={index} className="border-b border-gray-100 pb-3 last:border-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-sm font-medium text-gray-900 truncate">{page.page}</span>
                  <span className="text-sm font-semibold text-blue-600">{page.views}</span>
                </div>
                <div className="flex items-center text-xs text-gray-600">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>Avg. {page.avgDuration}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Device & Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Device Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Device Breakdown</h3>
          <div className="space-y-4">
            {analytics.deviceBreakdown.map((device, index) => (
              <div key={index}>
                <div className="flex justify-between mb-2">
                  <span className="text-sm text-gray-700">{device.device}</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {device.percentage}% ({device.count})
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full ${
                      index === 0 ? 'bg-blue-600' :
                      index === 1 ? 'bg-green-600' : 'bg-purple-600'
                    }`}
                    style={{ width: `${device.percentage}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Geographic Data */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Visitors by Canton</h3>
          <div className="space-y-3">
            {analytics.geographicData.map((location, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-700">{location.canton}</span>
                    <span className="text-sm font-semibold text-gray-900">{location.visitors}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${location.percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form Performance */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Form Performance</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{analytics.userBehavior.completedForms}</p>
            <p className="text-sm text-gray-600 mt-1">Completed Forms</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-red-600">{analytics.userBehavior.abandonedForms}</p>
            <p className="text-sm text-gray-600 mt-1">Abandoned Forms</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600">
              {((analytics.userBehavior.completedForms / (analytics.userBehavior.completedForms + analytics.userBehavior.abandonedForms)) * 100).toFixed(1)}%
            </p>
            <p className="text-sm text-gray-600 mt-1">Completion Rate</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-purple-600">{analytics.conversionRate}%</p>
            <p className="text-sm text-gray-600 mt-1">Conversion Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
}