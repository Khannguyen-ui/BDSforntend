import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { AdminAuthContext } from '../contexts/AdminAuthContext';

// ✅ USER AUTH
const useAuth = () => {
  return useContext(AuthContext);
};

// ✅ ADMIN AUTH
const useAdminAuth = () => {
  return useContext(AdminAuthContext);
};

export { useAuth, useAdminAuth };
export default useAuth;