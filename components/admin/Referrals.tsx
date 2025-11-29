'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Link2, RefreshCw, Users, AlertCircle, Check, X } from 'lucide-react';

interface Referral {
  id: number;
  name: string;
  code: string;
  created_at: string;
  usage_count: number;
}

export default function Referrals() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchReferrals = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await fetch('/api/referrals');
      if (!response.ok) throw new Error('Failed to fetch referrals');
      const data = await response.json();
      setReferrals(data.referrals || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load referrals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReferrals();
  }, []);

  const resetForm = () => {
    setFormName('');
    setFormCode('');
    setFormError('');
    setShowAddForm(false);
    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Both name and code are required');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName, code: formCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create referral');
      resetForm();
      fetchReferrals();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = async () => {
    if (!formName.trim() || !formCode.trim()) {
      setFormError('Both name and code are required');
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      const response = await fetch('/api/referrals', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editingId, name: formName, code: formCode }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update referral');
      resetForm();
      fetchReferrals();
    } catch (err: any) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this referral code?')) return;
    try {
      const response = await fetch(`/api/referrals/${id}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete referral');
      fetchReferrals();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (referral: Referral) => {
    setEditingId(referral.id);
    setFormName(referral.name);
    setFormCode(referral.code);
    setShowAddForm(false);
    setFormError('');
  };

  const copyLink = (code: string) => {
    const link = `${window.location.origin}/referral/${code}`;
    navigator.clipboard.writeText(link);
    alert('Link copied to clipboard!');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Referral Codes</h1>
          <p className="text-gray-600">Manage referral codes and track usage</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchReferrals}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2"
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={() => { setShowAddForm(true); setEditingId(null); setFormName(''); setFormCode(''); setFormError(''); }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Referral</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Add/Edit Form */}
      {(showAddForm || editingId !== null) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4">{editingId ? 'Edit Referral' : 'Add New Referral'}</h3>
          {formError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{formError}</div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g., Partner Campaign" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code</label>
              <input type="text" value={formCode} onChange={(e) => setFormCode(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))} placeholder="e.g., PARTNER2024" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
              <p className="text-xs text-gray-500 mt-1">Letters and numbers only, no spaces</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={editingId ? handleEdit : handleAdd} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 disabled:opacity-50">
              {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              {editingId ? 'Save Changes' : 'Create Referral'}
            </button>
            <button onClick={resetForm} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2">
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* Referrals Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-600">Loading referrals...</p>
          </div>
        ) : referrals.length === 0 ? (
          <div className="p-8 text-center">
            <Link2 className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No referral codes yet</p>
            <p className="text-sm text-gray-500">Click "Add Referral" to create your first code</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usage</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {referrals.map((referral) => (
                  <tr key={referral.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-medium text-gray-900">{referral.name}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono text-blue-600">{referral.code}</code>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-900">{referral.usage_count}</span>
                        <span className="text-gray-500 text-sm">users</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(referral.created_at).toLocaleDateString('de-CH')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex justify-end gap-2">
                        <button onClick={() => copyLink(referral.code)} title="Copy Link" className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg">
                          <Link2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => startEdit(referral)} title="Edit" className="p-2 text-gray-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg">
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => handleDelete(referral.id)} title="Delete" className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

