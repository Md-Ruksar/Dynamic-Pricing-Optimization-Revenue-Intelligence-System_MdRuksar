import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getSidebarItems } from '../config/features';
import {
  LayoutDashboard, Package, DollarSign, Database, Users,
  Settings, LogOut, ChevronLeft, ChevronRight, TrendingUp,
  Sparkles,
} from 'lucide-react';

const iconMap = {
  LayoutDashboard, Package, DollarSign, Database, Users, Settings,
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const sidebarItems = getSidebarItems();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-white dark:bg-surface-900 border-r border-surface-200 dark:border-surface-700 z-40 transition-all duration-300 flex flex-col ${
        collapsed ? 'w-[72px]' : 'w-[280px]'
      }`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-[72px] border-b border-surface-200 dark:border-surface-700 flex-shrink-0">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="text-sm font-bold text-surface-900 dark:text-white truncate">
              PricePilot
            </span>
            <span className="text-[10px] font-medium text-primary-600 dark:text-primary-400 truncate">
              Revenue Intelligence
            </span>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto overflow-x-hidden">
        {sidebarItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `sidebar-item group relative ${isActive ? 'sidebar-item-active' : 'sidebar-item-inactive'}`
              }
              title={collapsed ? item.label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-surface-900 dark:bg-surface-100 text-white dark:text-surface-900 text-xs rounded whitespace-nowrap opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="p-3 border-t border-surface-200 dark:border-surface-700 space-y-1">
        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          className="sidebar-item-inactive w-full"
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
          {!collapsed && <span>Collapse</span>}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="sidebar-item-inactive w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-5 h-5" />
          {!collapsed && <span>Logout</span>}
        </button>

        {/* User info */}
        {!collapsed && user && (
          <div className="px-4 py-3 rounded-lg bg-surface-50 dark:bg-surface-800/50">
            <p className="text-sm font-medium text-surface-900 dark:text-white truncate">
              {user.full_name || user.username}
            </p>
            <p className="text-xs text-surface-500 dark:text-surface-400 truncate">
              {user.role?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
