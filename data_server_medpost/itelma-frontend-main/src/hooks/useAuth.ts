import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService, userService } from '../services/api';
import { useUserStore } from '../store/userStore';
import type { LoginRequest } from '../types/auth';

export const useAuth = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { user, setUser, setLoading: setUserLoading, clearUser } = useUserStore();

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setLoading(false);
        return;
      }

      try {
        setUserLoading(true);
        const userData = await userService.getMe();
        setUser(userData);
        setIsAuthenticated(true);
      } catch (error) {
        console.error('Failed to get user data:', error);
        localStorage.removeItem('token');
        clearUser();
        setIsAuthenticated(false);
      } finally {
        setUserLoading(false);
        setLoading(false);
      }
    };

    checkAuth();
  }, [setUser, setUserLoading, clearUser]);

  const login = async (credentials: LoginRequest) => {
    try {
      const response = await authService.login(credentials);
      localStorage.setItem('token', response.access_token);

      const userData = await userService.getMe();
      setUser(userData);
      setIsAuthenticated(true);
      navigate('/');
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    clearUser();
    setIsAuthenticated(false);
    navigate('/login');
  };

  return {
    isAuthenticated,
    loading,
    user,
    login,
    logout,
  };
};
