import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import LoadingSpinner  from '../components/LoadingSpinner.jsx'; 

const PrivateRoute = ({ roles, children }) => {
  const { user, loading } = useAuth();

  if (loading) { 
    return <div className="flex justify-center items-center h-screen"><LoadingSpinner size="lg"/></div>;
  }

  if (!user) { 
    return <Navigate to="/login" replace />;
  }

  if (roles && !roles.includes(user.TitreUtil)) { 
    return <Navigate to="/unauthorized" replace />;
  }

  return children ? children : <Outlet />;
};

export default PrivateRoute;