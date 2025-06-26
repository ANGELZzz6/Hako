import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface AdminOnlyProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const AdminOnly: React.FC<AdminOnlyProps> = ({ children, fallback = null }) => {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default AdminOnly; 