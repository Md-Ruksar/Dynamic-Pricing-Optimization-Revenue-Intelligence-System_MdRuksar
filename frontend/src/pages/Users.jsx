import { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  Users as UsersIcon, UserPlus, Shield, ShieldAlert, ShieldCheck,
  ToggleLeft, ToggleRight, Trash2, Loader2, X, AlertCircle,
  RefreshCw, Mail, Calendar, Edit2, KeyRound,
} from 'lucide-react';

export default function Users() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [formData, setFormData] = useState({ username: '', email: '', password: '', full_name: '', role: 'data_analyst' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [resetTarget, setResetTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersAPI.list();
      setUsers(res.data);
    } catch (err) {
      toast.error('Failed to load users', err.response?.data?.detail);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const openCreate = () => {
    setEditingUser(null);
    setFormData({ username: '', email: '', password: '', full_name: '', role: 'data_analyst' });
    setError('');
    setModalOpen(true);
  };

  const openEdit = (u) => {
    setEditingUser(u);
    setFormData({
      username: u.username,
      email: u.email,
      password: '',
      full_name: u.full_name || '',
      role: u.role,
    });
    setError('');
    setModalOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role,
          email: formData.email,
        });
        toast.success('User updated', `${formData.full_name || formData.username} was updated`);
      } else {
        await usersAPI.create(formData);
        toast.success('User created', `${formData.full_name || formData.username} added`);
      }
      setModalOpen(false);
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.detail?.[0]?.msg || err.response?.data?.detail || 'Failed to save user');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (userId) => {
    try {
      const res = await usersAPI.toggleStatus(userId);
      toast.success('Status updated', res.data.message);
      fetchUsers();
    } catch (err) {
      toast.error('Failed to toggle status', err.response?.data?.detail);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await usersAPI.delete(deleteTarget);
      toast.success('User deleted', 'The user was removed');
      fetchUsers();
    } catch (err) {
      toast.error('Delete failed', err.response?.data?.detail);
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget || newPassword.length < 6) {
      toast.error('Invalid password', 'Password must be at least 6 characters');
      return;
    }
    setResetting(true);
    try {
      const res = await usersAPI.resetPassword(resetTarget, newPassword);
      toast.success('Password reset', res.data.message);
      setResetTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.error('Reset failed', err.response?.data?.detail);
    } finally {
      setResetting(false);
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldAlert className="w-4 h-4 text-red-500" />;
      case 'pricing_manager': return <ShieldCheck className="w-4 h-4 text-primary-500" />;
      case 'data_analyst': return <Shield className="w-4 h-4 text-emerald-500" />;
      default: return <Shield className="w-4 h-4 text-surface-400" />;
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin': return 'badge-danger';
      case 'pricing_manager': return 'badge-info';
      case 'data_analyst': return 'badge-success';
      default: return 'badge-neutral';
    }
  };

  const resetTargetUser = users.find((u) => u.id === resetTarget);

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
          <button onClick={openCreate} className="btn-primary btn-sm">
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
                      <button
                        onClick={() => handleToggleStatus(u.id)}
                        disabled={u.id === currentUser?.id}
                        className={`badge cursor-pointer transition-all hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-60 ${u.is_active ? 'badge-success' : 'badge-danger'}`}
                        title={u.id === currentUser?.id ? 'Cannot change your own status' : 'Click to toggle'}
                      >
                        {u.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="table-cell text-xs text-surface-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}
                      </div>
                    </td>
                    <td className="table-cell text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {u.id !== currentUser?.id && (
                          <>
                            <button onClick={() => openEdit(u)} className="btn-ghost btn-sm p-1.5" title="Edit user">
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button onClick={() => { setResetTarget(u.id); setNewPassword(''); }} className="btn-ghost btn-sm p-1.5" title="Reset password">
                              <KeyRound className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleToggleStatus(u.id)}
                              className="btn-ghost btn-sm p-1.5"
                              title={u.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {u.is_active
                                ? <ToggleRight className="w-4 h-4 text-emerald-500" />
                                : <ToggleLeft className="w-4 h-4 text-surface-400" />}
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u.id)}
                              className="btn-ghost btn-sm p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete user"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        {u.id === currentUser?.id && (
                          <button onClick={() => openEdit(u)} className="btn-ghost btn-sm p-1.5" title="Edit yourself">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create/Edit User Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white">
                {editingUser ? 'Edit User' : 'Create User'}
              </h2>
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
              {!editingUser && (
                <>
                  <div>
                    <label className="label">Username *</label>
                    <input className="input" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
                  </div>
                  <div>
                    <label className="label">Password *</label>
                    <input type="password" className="input" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} required />
                  </div>
                </>
              )}
              <div>
                <label className="label">Email *</label>
                <input type="email" className="input" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div>
                <label className="label">Role</label>
                <select className="input" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })}>
                  <option value="data_analyst">Data Analyst</option>
                  <option value="pricing_manager">Pricing Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
                <button
                  onClick={handleSave}
                  disabled={saving || (!editingUser && (!formData.username || !formData.email || !formData.password))}
                  className="btn-primary"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {editingUser ? 'Save Changes' : 'Create User'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete user?"
        message="This user will lose access to the platform immediately. This action cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Reset password modal */}
      {resetTarget !== null && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal-content max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="card-header flex items-center justify-between">
              <h2 className="text-lg font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                <KeyRound className="w-5 h-5 text-primary-500" />
                Reset Password
              </h2>
              <button onClick={() => setResetTarget(null)} className="btn-ghost p-1">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-surface-500 dark:text-surface-400">
                Set a new password for <span className="font-semibold text-surface-900 dark:text-white">{resetTargetUser?.full_name || resetTargetUser?.username}</span>
              </p>
              <div>
                <label className="label">New Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Min. 6 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setResetTarget(null)} className="btn-secondary">Cancel</button>
                <button onClick={handleResetPassword} disabled={resetting || newPassword.length < 6} className="btn-primary">
                  {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
                  Reset Password
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
