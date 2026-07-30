import { useState, useEffect } from 'react';
import { usersAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  Users as UsersIcon, UserPlus, Shield, ShieldAlert, ShieldCheck,
  ToggleLeft, ToggleRight, Trash2, Loader2, X, AlertCircle,
  RefreshCw, Mail, Calendar,
} from 'lucide-react';

export default function Users() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '', role: 'business_user' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await usersAPI.list();
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    setError('');
    try {
      await usersAPI.create(formData);
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      await usersAPI.toggleStatus(userId);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle user status');
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await usersAPI.delete(userId);
      fetchUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'pricing_manager': return <ShieldCheck className="w-4 h-4 text-primary-500" />;
      default: return <Shield className="w-4 h-4 text-surface-400" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'pricing_manager': return 'badge-info';
      default: return 'badge-neutral';
    }
  };

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900 dark:text-white">User Management</h1>
          <p className="text-surface-500 dark:text-surface-400 mt-1">{users.length} users total</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchUsers} className="btn-secondary btn-sm">
            <RefreshCw className="w-4 h-4" />
          </button>
          <button onClick={() => { setError(''); setFormData({ username: '', email: '', password: '', full_name: '', role: 'business_user' }); setModalOpen(true); }} className="btn-primary btn-sm">
            <UserPlus className="w-4 h-4" />
            Add User
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-50 dark:bg-surface-800/50">
                <th className="table-header">User</th>
                <th className="table-header">Role</th>
                <th className="table-header">Status</th>
                <th className="table-header">Created</th>
                <th className="table-header text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-200 dark:divide-surface-700">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary-500" />
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16">
                    <UsersIcon className="w-12 h-12 text-surface-300 dark:text-surface-600 mx-auto mb-3" />
                    <p className="text-sm text-surface-500 dark:text-surface-400">No users found</p>
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="table-row">
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                          {u.full_name?.[0] || u.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium text-surface-900 dark:text-white">{u.full_name || u.username}</p>
                          <p className="text-xs text-surface-400 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> {u.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <div className="flex items-center gap-1.5">
                        {getRoleIcon(u.role)}
                        <span className={`badge ${getRoleBadge(u.role)}`}>
                          {u.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className={`badge ${u.is_active ? 'badge-success' : 'badge-danger'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="table-cell text-xs text-surface-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      {u.id !== currentUser?.id && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleStatus(u.id)}
                            className="btn-ghost btn-sm p-1.5"
                            title={u.is_active ? 'Deactivate user' : 'Activate user'}
                          >
                            {u.is_active
                              ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                              : <ToggleLeft className="w-4 h-4 text-surface-400" />
                            }
                          </button>
                          <button
                            onClick={() => handleDelete(u.id)}
                            className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                            title="Delete user"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Create User</h2>
              <button onClick={() => setModalOpen(false)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  {error}
                </div>
              )}
              <div>
                <label className="label">Full Name</label>
                <input className="input" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} />
              </div>
              <div>
                <label className="label">Username *</label>
                <input className="input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              </div>
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Password *</label>
                <input type="password" className="input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="business_user">Business User</option>
                  <option value="pricing_manager">Pricing Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button onClick={handleCreate} disabled={saving || !formData.username || !formData.email || !formData.password} className="btn-primary">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  Create User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
