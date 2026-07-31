import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useToast } from '../context/ToastContext';
import { authAPI } from '../api/client';
import {
  Moon, Sun, User, Lock, Settings as SettingsIcon,
  Save, Loader2, Mail, Shield, CheckCircle2, Bell, Eye, EyeOff, Database, Cpu,
} from 'lucide-react';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);

  // Profile form
  const [profile, setProfile] = useState({ full_name: '', email: '', notifications_enabled: true });

  // Password form
  const [passwordForm, setPasswordForm] = useState({
    current_password: '', new_password: '', confirm_password: '',
  });
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);

  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.full_name || '',
        email: user.email || '',
        notifications_enabled: user.notifications_enabled ?? true,
      });
    }
  }, [user]);

  const handleSaveProfile = async () => {
    if (!profile.email?.includes('@')) {
      toast.error('Invalid email', 'Please enter a valid email address');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.updateMe({
        full_name: profile.full_name,
        email: profile.email,
        notifications_enabled: profile.notifications_enabled,
      });
      updateUser(res.data);
      toast.success('Profile updated', 'Your profile changes were saved');
    } catch (err) {
      toast.error('Update failed', err.response?.data?.detail || 'Could not save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSavePassword = async () => {
    if (passwordForm.new_password.length < 6) {
      toast.error('Invalid password', 'New password must be at least 6 characters');
      return;
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      toast.error('Passwords do not match', 'Please re-enter your new password');
      return;
    }
    setSaving(true);
    try {
      const res = await authAPI.changePassword({
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });
      toast.success('Password changed', res.data.message);
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      toast.error('Password change failed', err.response?.data?.detail || 'Could not change password');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System', icon: SettingsIcon },
  ];

  return (
    <div className="page-transition space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900 dark:text-white">Settings</h1>
        <p className="text-surface-500 dark:text-surface-400 mt-1">
          Manage your account preferences and system configuration
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tabs Sidebar */}
        <div className="lg:w-64 flex-shrink-0">
          <nav className="card p-2 space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                      : 'text-surface-600 dark:text-surface-400 hover:bg-surface-100 dark:hover:bg-surface-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="card">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div className="card-body space-y-5">
                <div className="flex items-center gap-4 pb-4 border-b border-surface-200 dark:border-surface-700">
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white text-2xl font-bold">
                    {user?.full_name?.[0] || user?.username?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-surface-900 dark:text-white">{user?.full_name || user?.username}</h2>
                    <p className="text-sm text-surface-500">{user?.email}</p>
                    <span className="badge-info mt-1">{user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input
                      className="input"
                      value={profile.full_name}
                      onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                      placeholder="John Doe"
                    />
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <input className="input" value={user?.username || ''} disabled />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input
                      type="email"
                      className="input"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label">Role</label>
                    <div className="input flex items-center gap-2 cursor-not-allowed opacity-75">
                      <Shield className="w-4 h-4 text-primary-500" />
                      <span>{user?.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === 'password' && (
              <div className="card-body space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Change Password</h2>
                  <p className="text-sm text-surface-500 mt-1">Update your account password</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Current Password</label>
                    <div className="relative">
                      <input
                        type={showPw ? 'text' : 'password'}
                        className="input pr-10"
                        value={passwordForm.current_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                        {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPw ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder="Min. 6 characters"
                        value={passwordForm.new_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                        {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <div className="relative">
                      <input
                        type={showConfirmPw ? 'text' : 'password'}
                        className="input pr-10"
                        placeholder="Re-enter new password"
                        value={passwordForm.confirm_password}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                      />
                      <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-surface-400">
                        {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <button onClick={handleSavePassword} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Password
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="card-body space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">Notifications</h2>
                  <p className="text-sm text-surface-500 mt-1">Manage your notification preferences</p>
                </div>

                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-5 h-5 text-primary-500" />
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">Email Notifications</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          Receive pricing alerts, AI recommendation updates, and system notices
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setProfile((p) => ({ ...p, notifications_enabled: !p.notifications_enabled }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        profile.notifications_enabled ? 'bg-primary-600' : 'bg-surface-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          profile.notifications_enabled ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <button onClick={handleSaveProfile} disabled={saving} className="btn-primary">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Preferences
                  </button>
                </div>
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div className="card-body space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-surface-900 dark:text-white">System Configuration</h2>
                  <p className="text-sm text-surface-500 mt-1">Manage application preferences</p>
                </div>

                {/* Theme */}
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {theme === 'dark' ? (
                        <Moon className="w-5 h-5 text-primary-500" />
                      ) : (
                        <Sun className="w-5 h-5 text-amber-500" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">Theme</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          Current: {theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={toggleTheme}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        theme === 'dark' ? 'bg-primary-600' : 'bg-surface-300'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>

                {/* API Info */}
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-surface-500" />
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">API Configuration</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                          Backend API: http://localhost:8000 · App Version: 2.0.0
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Cpu className="w-5 h-5 text-surface-500" />
                      <div>
                        <p className="text-sm font-medium text-surface-900 dark:text-white">System Health</p>
                        <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                          All core systems operational · AI engine, API, and database online
                        </p>
                      </div>
                    </div>
                    <span className="badge-success">Healthy</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
