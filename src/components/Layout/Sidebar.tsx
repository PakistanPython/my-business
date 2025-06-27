import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Heart,
  Wallet,
  CreditCard,
  Settings,
  LogOut,
  User,
  BarChart3,
  Building2
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Income', href: '/income', icon: TrendingUp },
  { name: 'Expenses', href: '/expenses', icon: TrendingDown },
  { name: 'Charity', href: '/charity', icon: Heart },
  { name: 'Accounts', href: '/accounts', icon: Wallet },
  { name: 'Loans', href: '/loans', icon: CreditCard },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Categories', href: '/categories', icon: Settings },
];

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    onClose();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-50 transition-opacity lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white">
            <Building2 className="h-8 w-8 mr-2" />
            <span className="text-xl font-bold">My Business</span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 mt-6 px-3">
            <div className="space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.href || 
                  (item.href !== '/dashboard' && location.pathname.startsWith(item.href));

                return (
                  <NavLink
                    key={item.name}
                    to={item.href}
                    onClick={onClose}
                    className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }`}
                  >
                    <Icon
                      className={`mr-3 h-5 w-5 ${
                        isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500'
                      }`}
                    />
                    {item.name}
                  </NavLink>
                );
              })}
            </div>
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex items-center space-x-3 mb-3">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {user?.email}
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <NavLink
                to="/profile"
                onClick={onClose}
                className="group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors duration-200"
              >
                <Settings className="mr-3 h-4 w-4 text-gray-400 group-hover:text-gray-500" />
                Profile Settings
              </NavLink>

              <button
                onClick={handleLogout}
                className="w-full group flex items-center px-3 py-2 text-sm font-medium text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-700 transition-colors duration-200"
              >
                <LogOut className="mr-3 h-4 w-4 text-gray-400 group-hover:text-red-500" />
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
