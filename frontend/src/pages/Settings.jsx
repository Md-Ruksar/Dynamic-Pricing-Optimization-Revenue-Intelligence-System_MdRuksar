import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Moon, Sun, User, Lock, Settings as SettingsIcon, 
  Save, Loader2, Mail, Shield, CheckCircle2 } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState('profile');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'password', label: 'Password', icon: Lock },
    { id: 'system', label: 'System', icon: SettingsIcon },
  ];

  const handleSaveProfile = async () => {
    setSaving(true);
    setSuccess('');
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess('Profile updated successfully');
    setSaving(false);
  };

  const handleSavePassword = async () => {
    setSaving(true);
    setSuccess('');
    await new Promise((r) => setTimeout(r, 1000));
    setSuccess('Password changed successfully');
    setSaving(false);
  };

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
            {success && (
              <div className="mx-6 mt-6 p-3 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                {success}
              </div>
            )}

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
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Full Name</label>
                    <input className="input" defaultValue={user?.full_name || ''} placeholder="John Doe" />
                  </div>
                  <div>
                    <label className="label">Username</label>
                    <input className="input" defaultValue={user?.username || ''} disabled />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input type="email" className="input" defaultValue={user?.email || ''} placeholder="john@example.com" />
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
                    <input type="password" className="input" />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input type="password" className="input" />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input type="password" className="input" />
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
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">API Configuration</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                        Backend API: http://localhost:8000
                      </p>
                      <p className="text-xs text-surface-500 dark:text-surface-400">
                        App Version: 2.0.0
                      </p>
                    </div>
                  </div>
                </div>

                {/* System Health */}
                <div className="p-4 rounded-xl bg-surface-50 dark:bg-surface-700/50 border border-surface-200 dark:border-surface-700">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-surface-900 dark:text-white">System Health</p>
                      <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">All core systems operational</p>
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
