import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    const t = localStorage.getItem('token');
    return t ? decodeJwt(t) : null;
  });

  function login(jwt) {
    localStorage.setItem('token', jwt);
    setToken(jwt);
    setUser(decodeJwt(jwt));
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  }

  const isAuthenticated = !!token && !!user;
  const isProfessor = user?.role === 'professor';

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated, isProfessor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
