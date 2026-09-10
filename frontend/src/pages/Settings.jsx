import React, { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import {
  Settings as SettingsIcon,
  CheckCircle,
  AlertTriangle,
  Save,
  UserCog,
  Plug,
  Loader2,
  Info
} from 'lucide-react';

export default function Settings() {
  const { user } = useAuth();
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  const [hfsql, setHfsql] = useState({
    dsn: '',
    host: '',
    port: '',
    uid: '',
    pwd: '',
    database: '',
    driver: 'HFSQL',
    passwordSet: false,
    source: null,
    envFallback: false,
    dbPath: ''
  });
  const [hfsqlMsg, setHfsqlMsg] = useState({ type: '', text: '' });
  const [testing, setTesting] = useState(false);
  const [savingHfsql, setSavingHfsql] = useState(false);

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
    async function load() {
      try {
        const [h, s] = await Promise.all([
          api.get('/health'),
          api.get('/settings/hfsql')
        ]);
        setHealth(h);
        setHfsql({
          dsn: s.dsn || '',
          host: s.host || '',
          port: s.port || '',
          uid: s.uid || '',
          pwd: '',
          database: s.database || '',
          driver: s.driver || 'HFSQL',
          passwordSet: !!s.passwordSet,
          source: s.source || null,
          envFallback: !!s.envFallback,
          dbPath: s.dbPath || ''
        });
      } catch (err) {
        setHealth({ odbc: { ok: false, message: err.message } });
        setHfsqlMsg({ type: 'error', text: 'Impossible de charger la configuration : ' + err.message });
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function submitConfig() {
    const body = {
      dsn: hfsql.dsn,
      host: hfsql.host,
      port: hfsql.port,
      uid: hfsql.uid,
      database: hfsql.database,
      driver: hfsql.driver
    };
    if (hfsql.pwd) body.pwd = hfsql.pwd;
    const res = await api.put('/settings/hfsql', body);
    setHfsql(f => ({ ...f, pwd: '', passwordSet: res.passwordSet }));
    if (res.test?.ok) {
      setHfsqlMsg({
        type: 'success',
        text: `Configuration enregistrée — connexion établie${res.test.latencyMs != null ? ` (${res.test.latencyMs} ms)` : ''}`
      });
    } else {
      setHfsqlMsg({
        type: 'error',
        text: 'Configuration enregistrée, mais la connexion a échoué : ' + (res.test?.message || 'erreur inconnue')
      });
    }
    const h = await api.get('/health');
    setHealth(h);
  }

  async function handleTest(e) {
    e.preventDefault();
    setTesting(true);
    setHfsqlMsg({ type: '', text: '' });
    try {
      await submitConfig();
    } catch (err) {
      setHfsqlMsg({ type: 'error', text: err.message });
    } finally {
      setTesting(false);
    }
  }

  async function handleSaveHfsql(e) {
    e.preventDefault();
    setSavingHfsql(true);
    setHfsqlMsg({ type: '', text: '' });
    try {
      await submitConfig();
    } catch (err) {
      setHfsqlMsg({ type: 'error', text: err.message });
    } finally {
      setSavingHfsql(false);
    }
  }

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
      await api.put('/auth/profile', body);
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

  const srcDesc = (hfsql.source?.type === 'settings')
    ? 'Configurée depuis cette page'
    : (hfsql.source?.type === 'environment')
      ? 'Définie via ODBC_CONNECTION_STRING (variable d\'environnement)'
      : 'Aucune connexion configurée';

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-900">Paramètres</h1>
        <p className="text-sm text-slate-500 mt-0.5">Configuration et informations système</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-1">
            <Plug size={16} className="text-blue-600" />
            Connexion HFSQL
          </div>

          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-slate-500">Statut</span>
            {health?.odbc?.ok ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-green-700 font-medium">
                <CheckCircle size={14} /> Connecté
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-sm text-amber-700 font-medium">
                <AlertTriangle size={14} /> Non connecté
              </span>
            )}
            <span className="text-xs text-slate-400">— {srcDesc}</span>
          </div>

          {health?.odbc?.message && !health?.odbc?.ok && (
            <div className="flex items-start gap-2 mb-4">
              <span className="text-xs text-slate-500">Message :</span>
              <span className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1 break-all">{health.odbc.message}</span>
            </div>
          )}
          {hfsql.envFallback && hfsql.source?.type === 'environment' && (
            <div className="flex gap-2 items-start bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-4">
              <Info size={13} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-800">
                Une connexion est déjà définie via <code className="bg-blue-100 px-1 rounded">ODBC_CONNECTION_STRING</code>.
                Renseigner les champs ci-dessous la remplacera.
              </p>
            </div>
          )}

          <form className="space-y-3" onSubmit={handleSaveHfsql}>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Source de données (DSN, optionnel)</label>
              <input
                type="text"
                value={hfsql.dsn}
                onChange={e => setHfsql(f => ({ ...f, dsn: e.target.value }))}
                placeholder="MaSourceODBC"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Mode documenté par PCSoft sous Linux. Si renseigné, il est prioritaire sur les champs ci-dessous.
                Le DSN doit être défini dans <code className="bg-slate-100 px-1 rounded">~/.odbc.ini</code> (ou l'outil iODBC).
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Serveur (hôte)</label>
                <input
                  type="text"
                  value={hfsql.host}
                  onChange={e => setHfsql(f => ({ ...f, host: e.target.value }))}
                  placeholder="192.168.1.100"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Port</label>
                <input
                  type="text"
                  value={hfsql.port}
                  onChange={e => setHfsql(f => ({ ...f, port: e.target.value }))}
                  placeholder="4900"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Nom d'utilisateur</label>
                <input
                  type="text"
                  value={hfsql.uid}
                  onChange={e => setHfsql(f => ({ ...f, uid: e.target.value }))}
                  autoComplete="off"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Mot de passe {hfsql.passwordSet ? <span className="font-normal text-slate-400">(laisser vide pour conserver)</span> : null}
                </label>
                <input
                  type="password"
                  value={hfsql.pwd}
                  onChange={e => setHfsql(f => ({ ...f, pwd: e.target.value }))}
                  autoComplete="new-password"
                  placeholder={hfsql.passwordSet ? '••••••••' : ''}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Base de données <span className="font-normal text-red-500">(obligatoire)</span>
              </label>
              <input
                type="text"
                value={hfsql.database}
                onChange={e => setHfsql(f => ({ ...f, database: e.target.value }))}
                placeholder="Nom de la base HFSQL sur le serveur"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Nom de la base créée sur le serveur HFSQL (obligatoire en mode Client/Serveur — le driver refuse une chaîne sans base).
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Nom du pilote ODBC</label>
              <input
                type="text"
                value={hfsql.driver}
                onChange={e => setHfsql(f => ({ ...f, driver: e.target.value }))}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Doit correspondre au nom du pilote installé. Linux (pack PCSoft) : <code className="bg-slate-100 px-1 rounded">HFSQL</code> ou chemin du <code className="bg-slate-100 px-1 rounded">.so</code> (ex : /opt/hfsql-odbc/lib/wd290hfo64.so).
                Windows : Administrateur ODBC → Pilotes (ex : <code className="bg-slate-100 px-1 rounded">HFSQL ODBC Driver</code>).
              </p>
            </div>

            {hfsqlMsg.text && (
              <div className={`text-sm px-3 py-2 rounded-lg ${hfsqlMsg.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {hfsqlMsg.text}
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="inline-flex items-center gap-1.5 border border-blue-200 text-blue-700 hover:bg-blue-50 text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {testing ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                Tester la connexion
              </button>
              <button
                type="submit"
                disabled={savingHfsql}
                className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition disabled:opacity-50"
              >
                {savingHfsql ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                Enregistrer
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Chaque clic (« Tester la connexion » ou « Enregistrer ») enregistre les paramètres puis teste la connexion.
            </p>
            {hfsql.dbPath && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <Info size={11} />
                Stockage des paramètres : <code className="bg-slate-100 px-1 rounded break-all">{hfsql.dbPath}</code>
              </p>
            )}
          </form>
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
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Enregistrer
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}