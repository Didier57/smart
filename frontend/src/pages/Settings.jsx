import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Settings as SettingsIcon, CheckCircle, AlertTriangle, Save, UserCog } from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState({
    username: user?.username || '',
    email: user?.email || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    api.get('/health').then(setHealth).catch(() => setHealth({ odbc: { ok: false } })).finally(() => setLoading(false));
  }, []);

  async function handleProfileSave(e) {
    e.preventDefault();
    setMsg({ type: '', text: '' });

    if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
      setMsg({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    setSaving(true);
    try {
      const body = {
        username: profileForm.username,
        email: profileForm.email
      };
      if (profileForm.newPassword) {
        body.currentPassword = profileForm.currentPassword;
        body.newPassword = profileForm.newPassword;
      }
      const updated = await api.put('/auth/profile', body);
      setMsg({ type: 'success', text: 'Profil mis à jour' });
      setProfileForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuration et informations système</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <SettingsIcon size={16} className="text-blue-600" />
            Connexion ODBC
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-24">Statut</span>
              {health?.odbc?.ok ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
                  <CheckCircle size={14} /> Connecté
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                  <AlertTriangle size={14} /> Non connecté
                </span>
              )}
            </div>
            {health?.odbc?.message && (
              <div className="flex items-start gap-3">
                <span className="text-xs text-slate-500 w-24">Message</span>
                <span className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 break-all">{health.odbc.message}</span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 w-24">Chaîne ODBC</span>
              <span className={`text-xs font-medium ${health?.hasConnectionString ? 'text-green-700' : 'text-amber-700'}`}>
                {health?.hasConnectionString ? 'Définie via variable d\'environnement' : 'Non définie (ODBC_CONNECTION_STRING)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-3">
              Pour configurer la connexion ODBC, définissez la variable <code className="bg-slate-100 px-1.5 py-0.5 rounded">ODBC_CONNECTION_STRING</code> dans votre fichier <code className="bg-slate-100 px-1.5 py-0.5 rounded">.env</code> ou dans docker-compose.yml.
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-4">
            <UserCog size={16} className="text-blue-600" />
            Mon profil
          </div>
          <form onSubmit={handleProfileSave} className="space-y-3">
            {msg.text && (
              <div className={`text-sm px-3 py-2 rounded-lg ${msg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {msg.text}
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nom d'utilisateur</label>
              <input
                type="text"
                value={profileForm.username}
                onChange={e => setProfileForm(f => ({ ...f, username: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Email</label>
              <input
                type="email"
                value={profileForm.email}
                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <hr className="border-slate-100" />
            <p className="text-xs text-slate-400">Laisser vide pour ne pas changer le mot de passe</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe actuel</label>
                <input
                  type="password"
                  value={profileForm.currentPassword}
                  onChange={e => setProfileForm(f => ({ ...f, currentPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nouveau</label>
                <input
                  type="password"
                  value={profileForm.newPassword}
                  onChange={e => setProfileForm(f => ({ ...f, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Confirmer</label>
                <input
                  type="password"
                  value={profileForm.confirmPassword}
                  onChange={e => setProfileForm(f => ({ ...f, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
            >
              {saving ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
