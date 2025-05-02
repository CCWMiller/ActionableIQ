import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectUser, logout } from '../../store/slices/authSlice';

const Navbar: React.FC = () => {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);
  const dispatch = useDispatch();
  const location = useLocation();

  // Function to determine if a link is active
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  // Handle logout
  const handleLogout = () => {
    dispatch(logout());
  };

  return (
    <nav className="bg-indigo-600 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            {/* Logo */}
            <Link to="/" className="flex-shrink-0 flex items-center">
              <span className="text-white text-xl font-bold">ActionableIQ</span>
            </Link>
            
            {/* Navigation Links - Only show if authenticated */}
            {isAuthenticated && (
              <div className="ml-10 flex items-baseline space-x-4">
                <Link
                  to="/query"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/query')
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-100 hover:bg-indigo-500'
                  }`}
                >
                  Query
                </Link>
                <Link
                  to="/excel-upload"
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive('/excel-upload')
                      ? 'bg-indigo-700 text-white'
                      : 'text-indigo-100 hover:bg-indigo-500'
                  }`}
                >
                  Excel Upload
                </Link>
              </div>
            )}
          </div>
          
          {/* User Info and Logout Button */}
          {isAuthenticated && user && (
            <div className="flex items-center">
              <div className="flex items-center">
                {user.picture && (
                  <img
                    className="h-8 w-8 rounded-full mr-2"
                    src={user.picture}
                    alt={user.name || 'User profile'}
                  />
                )}
                <span className="text-white text-sm mr-4">{user.name || user.email}</span>
              </div>
              <button
                onClick={handleLogout}
                className="px-3 py-2 rounded-md text-sm font-medium text-white bg-indigo-800 hover:bg-indigo-700"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar; 