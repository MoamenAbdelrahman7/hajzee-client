import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Component to protect routes that require authentication
// Supports either a single requiredRole string or an array via allowedRoles
const ProtectedRoute = ({ 
  requiredRole = null, // Optional single role requirement (back-compat)
  allowedRoles = null, // Optional array of roles
  redirectPath = '/login' // Default redirect path
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  
  // Show nothing while checking authentication
  if (isLoading) {
    return <div className="loading-auth">Checking authentication...</div>;
  }
  
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to={redirectPath} replace />;
  }
  
  // If a role is required and user doesn't have it, redirect
  if (requiredRole && (!user || user.role !== requiredRole)) {
    const redirectTo = requiredRole === 'admin' ? '/admin/login' : '/login';
    return <Navigate to={redirectTo} replace />;
  }

  // If a set of allowed roles is specified, check membership
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0) {
    if (!user || !allowedRoles.includes(user.role)) {
      const redirectTo = allowedRoles.includes('admin') && !allowedRoles.includes('user')
        ? '/admin/login'
        : '/login';
      return <Navigate to={redirectTo} replace />;
    }
  }
  
  // If authenticated and has required role (or no role required), render the children
  return <Outlet />;
};

export default ProtectedRoute;
