'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

const API_URL = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');

async function parseJsonResponse(res: Response) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  const raw = await res.text();
  if (raw.trim().startsWith('<!DOCTYPE') || raw.trim().startsWith('<html')) {
    throw new Error('El servidor devolvio HTML en vez de JSON. Verifica NEXT_PUBLIC_API_URL y que el backend este activo.');
  }
  throw new Error(raw || 'Respuesta invalida del servidor');
}

async function safeFetch(input: RequestInfo | URL, init?: RequestInit) {
  const inputStr = String(input);
  try {
    return await fetch(input, init);
  } catch {
    if (API_URL && inputStr.startsWith(API_URL)) {
      const fallbackInput = inputStr.replace(API_URL, '');
      try {
        return await fetch(fallbackInput, init);
      } catch {
        // Ignore and throw unified error below.
      }
    }
    throw new Error('No se pudo conectar con el servidor API. Verifica que el servidor este activo en el mismo puerto de la app.');
  }
}

interface AuthContextType {
  user: any | null;
  profile: any | null;
  loading: boolean;
  isAdmin: boolean;
  isSeller: boolean;
  isIT: boolean;
  login: (identifier: string, password: string) => Promise<any>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  isAdmin: false,
  isSeller: false,
  isIT: false,
  login: async () => {},
  logout: () => {},
  changePassword: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (token: string) => {
    try {
      const res = await safeFetch(`${API_URL}/api/auth/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await parseJsonResponse(res);
        setProfile(data);
        setUser(data);
      } else {
        logout();
      }
    } catch (err) {
      console.error(err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchProfile(token);
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (identifier: string, password: string) => {
    const res = await safeFetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password })
    });

    const data = await parseJsonResponse(res);
    if (res.ok) {
      localStorage.setItem('token', data.token);
      setUser(data.user);
      setProfile(data.user);
      if (!data.user.mustChange) {
        await fetchProfile(data.token);
      }
      return data;
    } else {
      throw new Error(data.message || 'Error al iniciar sesión');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setProfile(null);
  };

  const changePassword = async (newPassword: string) => {
    const token = localStorage.getItem('token');
    const res = await safeFetch(`${API_URL}/api/auth/change-password`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ newPassword })
    });

    if (!res.ok) {
      const data = await parseJsonResponse(res);
      throw new Error(data.message || 'Error al cambiar contraseña');
    }
  };

  const isAdmin = profile?.role === 'admin';
  const isSeller = profile?.role === 'seller';
  const isIT = profile?.role === 'it';

  return (
    <AuthContext.Provider value={{ user, profile, loading, isAdmin, isSeller, isIT, login, logout, changePassword }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

