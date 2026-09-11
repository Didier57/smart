import React, { createContext, useContext, useState } from 'react';
import { Navigate, Routes, Route } from 'react-router-dom';
import { getStoredUser, clearSession } from './api.js';
import Login from './pages/Login.jsx';
import Clients from './pages/Clients.jsx';
import Contracts from './pages/Contracts.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Explorer from './pages/Explorer.jsx';
import Settings from './pages/Settings.jsx';
import Layout from './components/Layout.jsx';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function RequireAdmin({ children }) {
  const { user } = useAuth();
  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default function App() {
  const [user, setUser] = useState(getStoredUser());

  const login = (u) => setUser(u);
  const logout = () => {
    clearSession();
    setUser(null);
  };
  const updateUser = (u) => {
    setUser(u);
    localStorage.setItem('user', JSON.stringify(u));
  };

  if (!user) {
    return (
      <AuthContext.Provider value={{ user, login, logout, updateUser }}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, updateUser }}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Clients />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/dashboard" element={<RequireAdmin><Dashboard /></RequireAdmin>} />
          <Route path="/explorer" element={<RequireAdmin><Explorer /></RequireAdmin>} />
          <Route path="/explorer/:tableName" element={<RequireAdmin><Explorer /></RequireAdmin>} />
          <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}
