import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { Menu, Bell, Search } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
}

const breadcrumbLabels: Record<string, string> = {
  dashboard: 'Dashboard',
  income: 'Income',
  expenses: 'Expenses',
  charity: 'Charity',
  accounts: 'Accounts',
  loans: 'Loans',
  analytics: 'Analytics',
  categories: 'Categories',
  profile: 'Profile',
};

export const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const location = useLocation();
  const { user } = useAuth();

  // Generate breadcrumbs from current path
  const pathSegments = location.pathname.split('/').filter(Boolean);
  const breadcrumbs = pathSegments.map((segment, index) => {
    const path = '/' + pathSegments.slice(0, index + 1).join('/');
    const label = breadcrumbLabels[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
    return { path, label };
  });

  // Get current page title
  const currentPageTitle = breadcrumbs.length > 0 
    ? breadcrumbs[breadcrumbs.length - 1].label 
    : 'Dashboard';

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          {/* Breadcrumbs */}
          <nav className="flex" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <div>
                  <Link
                    to="/dashboard"
                    className="text-gray-400 hover:text-gray-500"
                  >
                    Home
                  </Link>
                </div>
              </li>
              {breadcrumbs.map((breadcrumb, index) => (
                <li key={breadcrumb.path}>
                  <div className="flex items-center">
                    <svg
                      className="flex-shrink-0 h-5 w-5 text-gray-300"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path d="M5.555 17.776l8-16 .894.448-8 16-.894-.448z" />
                    </svg>
                    <Link
                      to={breadcrumb.path}
                      className={`ml-4 text-sm font-medium ${
                        index === breadcrumbs.length - 1
                          ? 'text-gray-900'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                      aria-current={index === breadcrumbs.length - 1 ? 'page' : undefined}
                    >
                      {breadcrumb.label}
                    </Link>
                  </div>
                </li>
              ))}
            </ol>
          </nav>
        </div>

        {/* Page title for mobile */}
        <div className="flex-1 flex justify-center lg:hidden">
          <h1 className="text-lg font-semibold text-gray-900">{currentPageTitle}</h1>
        </div>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {/* Search button */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500">
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 rounded-md focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 relative">
            <Bell className="h-5 w-5" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
          </button>

          {/* User menu */}
          <div className="relative ml-3">
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900">
                  {user?.full_name || user?.username}
                </p>
                <p className="text-xs text-gray-500">
                  {user?.email}
                </p>
              </div>
              <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.full_name?.charAt(0) || user?.username?.charAt(0) || 'U'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
