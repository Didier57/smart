import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { LayoutDashboard, Database, Settings, LogOut, UserCircle, Menu, X, Users } from 'lucide-react';
import { useAuth } from '../App.jsx';

export default function Layout() {
  const { user, logout } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-slate-900 text-slate-200 flex items-center h-13 px-4 flex-shrink-0 sticky top-0 z-20">
        <div className="font-bold text-sm flex items-center gap-2 pr-5 mr-2 border-r border-white/10 whitespace-nowrap">
          <Database size={16} /> Smart
        </div>

        <button className="md:hidden ml-auto text-slate-400 hover:text-white" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <nav className={`${mobileOpen ? 'flex' : 'hidden'} md:flex flex-col md:flex-row absolute md:static top-13 left-0 right-0 bg-slate-900 md:bg-transparent z-30 p-3 md:p-0 gap-1`}>
          <NavLink to="/" end className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => setMobileOpen(false)}>
            <Users size={16} /> Clients
          </NavLink>
          {isAdmin && (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => setMobileOpen(false)}>
                <LayoutDashboard size={16} /> Dashboard
              </NavLink>
              <NavLink to="/explorer" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => setMobileOpen(false)}>
                <Database size={16} /> Explorateur
              </NavLink>
              <NavLink to="/settings" className={({ isActive }) => `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${isActive ? 'bg-blue-600 text-white' : 'text-slate-400 hover:bg-white/10 hover:text-white'}`} onClick={() => setMobileOpen(false)}>
                <Settings size={16} /> Paramètres
              </NavLink>
            </>
          )}
        </nav>

        <div className="ml-auto hidden md:flex items-center gap-3 text-sm">
          <span className="text-slate-400 text-xs">{user?.role === 'admin' ? 'Admin' : 'Lecteur'}</span>
          <span className="font-semibold text-white text-xs">{user?.username}</span>
          <button className="text-slate-400 hover:text-white" onClick={logout} title="Déconnexion">
            <LogOut size={14} />
          </button>
        </div>

        {mobileOpen && (
          <div className="md:hidden absolute top-13 right-0 bg-slate-900 border-t border-white/10 p-3 flex items-center gap-3 text-sm z-30">
            <span className="text-white font-semibold">{user?.username}</span>
            <button className="text-slate-400 hover:text-white" onClick={logout}><LogOut size={14} /></button>
          </div>
        )}
      </header>
      <main className="flex-1 p-4 overflow-x-auto">
        <Outlet />
      </main>
    </div>
  );
}
