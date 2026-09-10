import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Database, Activity, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';

export default function Dashboard() {
  const [health, setHealth] = useState(null);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function load() {
      try {
        const [h, t] = await Promise.all([
          api.get('/health'),
          api.get('/explorer/tables').catch(() => [])
        ]);
        setHealth(h);
        setTables(t || []);
      } catch {
        setHealth({ odbc: { ok: false, message: 'Erreur de connexion' } });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const odbcOk = health?.odbc?.ok === true;
  const userTables = tables.filter(t => t.type === 'TABLE' || t.type === 'BASE TABLE' || t.type === '');

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-1">Vue d'ensemble de la connexion ODBC</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Statut ODBC</div>
          <div className="flex items-center gap-2">
            {odbcOk ? (
              <><CheckCircle size={20} className="text-green-600" /><span className="text-lg font-bold text-green-600">Connecté</span></>
            ) : (
              <><AlertTriangle size={20} className="text-amber-600" /><span className="text-lg font-bold text-amber-600">Non connecté</span></>
            )}
          </div>
          {health?.odbc?.message && (
            <p className="text-xs text-slate-500 mt-2 truncate">{health.odbc.message}</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Tables disponibles</div>
          <div className="text-2xl font-bold text-blue-600">{userTables.length}</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="text-xs text-slate-400 uppercase tracking-wide font-semibold mb-2">Chaîne de connexion</div>
          <div className="flex items-center gap-2">
            {health?.hasConnectionString ? (
              <><CheckCircle size={16} className="text-green-600" /><span className="text-sm font-medium text-green-700">Configurée</span></>
            ) : (
              <><AlertTriangle size={16} className="text-amber-600" /><span className="text-sm font-medium text-amber-700">Non définie</span></>
            )}
          </div>
        </div>
      </div>

      {userTables.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-4">Tables détectées</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {userTables.map((t) => (
              <button
                key={t.name}
                onClick={() => navigate(`/explorer/${t.name}`)}
                className="flex items-center justify-between px-3 py-2.5 border border-slate-200 rounded-lg text-sm hover:bg-blue-50 hover:border-blue-300 transition text-left group"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Database size={14} className="text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
                  <span className="truncate font-medium text-slate-700">{t.name}</span>
                </div>
                <ExternalLink size={12} className="text-slate-300 group-hover:text-blue-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tables.length > 0 && (
        <div className="mt-4 text-xs text-slate-400">
          {tables.length} objet(s) détecté(s) au total (tables, vues, etc.)
        </div>
      )}
    </div>
  );
}
