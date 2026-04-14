import React, { createContext, useState, useEffect } from 'react';

import api from '../utils/api';



export const AuthContext = createContext();



export const AuthProvider = ({ children }) => {

  const [user, setUser] = useState(null);

  const [loading, setLoading] = useState(true);

  const [token, setToken] = useState(localStorage.getItem('token'));



  useEffect(() => {

    const loadUser = async () => {

      if (token) {

        try {

          const response = await api.get('/auth/me');

          setUser(response.data.user);

        } catch (error) {

          console.error('Error loading user:', error);

          localStorage.removeItem('token');

          setToken(null);

        }

      }

      setLoading(false);

    };



    loadUser();

  }, [token]);



  const login = async (credentials) => {

    try {

      const response = await api.post('/auth/login', credentials);

      const { token, user } = response.data;

      localStorage.setItem('token', token);

      setToken(token);

      setUser(user);

      return { success: true, user };

    } catch (error) {

      return {

        success: false,

        message: error.response?.data?.message || 'Login failed'

      };

    }

  };



  const register = async (userData) => {

    try {

      const response = await api.post('/auth/register', userData);

      const { token, user } = response.data;

      localStorage.setItem('token', token);

      setToken(token);

      setUser(user);

      return { success: true, user };

    } catch (error) {

      const errorMessage = error.response?.data?.details?.[0] || error.response?.data?.message || 'Registration failed';

      console.error('Register error:', errorMessage);

      return {

        success: false,

        message: errorMessage

      };

    }

  };



  const logout = () => {

    localStorage.removeItem('token');

    setToken(null);

    setUser(null);

  };



  return (

    <AuthContext.Provider

      value={{

        user,

        loading,

        login,

        register,

        logout,

        isAuthenticated: !!user

      }}

    >

      {children}

    </AuthContext.Provider>

  );

};

