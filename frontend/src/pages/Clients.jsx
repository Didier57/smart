import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Filter, RotateCcw, Users, Pencil, Plus, FileText, X, Save, Loader2 } from 'lucide-react';
import ColumnFilterDropdown from '../components/ColumnFilter.jsx';
import ContractModal from '../components/ContractModal.jsx';

const STORAGE_KEY = 'smart_clients_col_widths';
const DEFAULT_WIDTHS = { ClientNom: 180, ClientSite: 150, ClientAdresse: 180, ClientCP: 80, ClientTelephone: 120, ClientEmail: 200, ClientContrat: 120, ClientContratType: 120, ClientDeleted: 80 };

const COLUMNS = [
  { key: 'ClientNom', label: 'Nom' },
  { key: 'ClientSite', label: 'Site' },
  { key: 'ClientAdresse', label: 'Adresse' },
  { key: 'ClientCP', label: 'Code Postal' },
  { key: 'ClientTelephone', label: 'Téléphone' },
  { key: 'ClientEmail', label: 'Email' },
  { key: 'ClientContrat', label: 'Contrat' },
  { key: 'ClientContratType', label: 'Type Contrat' },
  { key: 'ClientDeleted', label: 'Deleted' },
];

const EDIT_FIELDS = [
  { key: 'ClientNom', label: 'Nom' },
  { key: 'ClientSite', label: 'Site' },
  { key: 'ClientAdresse', label: 'Adresse' },
  { key: 'ClientCP', label: 'Code Postal' },
  { key: 'ClientTelephone', label: 'Téléphone' },
  { key: 'ClientEmail', label: 'Email' },
  { key: 'ClientContrat', label: 'Contrat' },
  { key: 'ClientContratType', label: 'Type Contrat' },
  { key: 'ClientDeleted', label: 'Deleted (0/1)', type: 'number' },
];

function makeDefaultFilters() {
  return { ClientDeleted: new Set(['0']) };
}

function loadWidths() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch { return {}; }
}

function ClientEditModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const f = {};
    EDIT_FIELDS.forEach(field => { f[field.key] = row[field.key] != null ? String(row[field.key]) : ''; });
    return f;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(key, val) { setForm(prev => ({ ...prev, [key]: val })); }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const body = {};
      EDIT_FIELDS.forEach(f => {
        body[f.key] = f.type === 'number' ? (form[f.key] === '' ? null : Number(form[f.key])) : form[f.key];
      });
      await api.put(`/clients/${row.IDClient}`, body);
      onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Modifier client — {row.ClientNom}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">{error}</div>}
          <div className="space-y-3">
            {EDIT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                <input
                  type={f.type === 'number' ? 'text' : 'text'}
                  value={form[f.key]}
                  onChange={e => handleChange(f.key, e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuler</button>
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Clients() {
  const { user } = useAuth();
  const canEdit = user?.role === 'admin' || user?.gestionClient;

  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [sort, setSort] = useState({ col: null, dir: 'ASC' });
  const [filters, setFilters] = useState(makeDefaultFilters);
  const [openFilter, setOpenFilter] = useState(null);
  const [colWidths, setColWidths] = useState(loadWidths);
  const [editingClient, setEditingClient] = useState(null);
  const [contractModal, setContractModal] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/clients').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
  }, []);

  const uniqueValues = useCallback((colKey) => {
    const map = new Map();
    data.forEach(row => { const v = String(row[colKey] ?? ''); map.set(v, (map.get(v) || 0) + 1); });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    for (const [colKey, selected] of Object.entries(filters)) {
      if (selected && selected.size > 0) { const s = selected; result = result.filter(row => s.has(String(row[colKey] ?? ''))); }
    }
    if (searchDebounce) {
      const q = searchDebounce.toLowerCase();
      result = result.filter(row => COLUMNS.some(col => String(row[col.key] ?? '').toLowerCase().includes(q)));
    }
    return result;
  }, [data, filters, searchDebounce]);

  const sortedData = useMemo(() => {
    if (!sort.col) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const av = String(a[sort.col] ?? ''); const bv = String(b[sort.col] ?? '');
      return av.localeCompare(bv, 'fr');
    });
    if (sort.dir === 'DESC') sorted.reverse();
    return sorted;
  }, [filteredData, sort]);

  function handleSort(colKey) { setSort(prev => ({ col: colKey, dir: prev.col === colKey && prev.dir === 'ASC' ? 'DESC' : 'ASC' })); }

  function toggleFilterValue(colKey, value) {
    setFilters(prev => { const next = { ...prev }; const s = new Set(next[colKey] || []); if (s.has(value)) s.delete(value); else s.add(value); next[colKey] = s; return next; });
  }
  function selectAllFilter(colKey) { const vals = uniqueValues(colKey); setFilters(prev => ({ ...prev, [colKey]: new Set(vals.map(([v]) => v)) })); }
  function clearFilter(colKey) { setFilters(prev => { const next = { ...prev }; delete next[colKey]; return next; }); }
  function resetAll() { setFilters(makeDefaultFilters()); setSearch(''); setSort({ col: null, dir: 'ASC' }); }

  function onResizeStart(e, colKey) {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startW = colWidths[colKey] || 150;
    document.body.style.cursor = 'col-resize'; document.body.style.userSelect = 'none';
    function onMove(ev) {
      const w = Math.max(50, startW + (ev.clientX - startX));
      setColWidths(prev => {
        const next = { ...prev, [colKey]: w };
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
        return next;
      });
    }
    function onUp() {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = ''; document.body.style.userSelect = '';
    }
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  }

  async function handleContractSaved({ newContractId }) {
    if (newContractId && contractModal?.clientRow) {
      try {
        await api.put(`/clients/${contractModal.clientRow.IDClient}`, { IDContract: Number(newContractId) });
      } catch (e) { console.error(e); }
    }
    setContractModal(null);
    const rows = await api.get('/clients');
    setData(rows);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600 text-sm font-medium">{error}</p></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2"><Users size={20} /> Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">{sortedData.length} client(s) affiché(s) sur {data.length}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Rechercher dans toutes les colonnes..." value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 min-w-[280px]" />
          </div>
          <button onClick={resetAll} className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
            <RotateCcw size={14} /> Réinitialiser
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-sm border-collapse">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key} className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border border-slate-200 whitespace-nowrap relative group"
                    style={{ width: colWidths[col.key] || 150, minWidth: 50 }}>
                    <div className="flex items-center gap-1.5">
                      <span onClick={() => handleSort(col.key)} className="cursor-pointer hover:text-blue-600 select-none flex items-center gap-1 flex-1 min-w-0">
                        {col.label}
                        {sort.col === col.key ? (sort.dir === 'ASC' ? <ArrowUp size={12} className="text-blue-500 flex-shrink-0" /> : <ArrowDown size={12} className="text-blue-500 flex-shrink-0" />) : <ArrowUpDown size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition flex-shrink-0" />}
                      </span>
                      <button onClick={e => { e.stopPropagation(); setOpenFilter(openFilter === col.key ? null : col.key); }}
                        className={`p-0.5 rounded hover:bg-slate-200 transition flex-shrink-0 ${filters[col.key]?.size && !(col.key === 'ClientDeleted' && filters[col.key].size === 1 && filters[col.key].has('0')) ? 'text-blue-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`} title="Filtrer">
                        <Filter size={12} />
                      </button>
                    </div>
                    {openFilter === col.key && (
                      <ColumnFilterDropdown values={uniqueValues(col.key)} selected={filters[col.key] || new Set()}
                        onToggle={v => toggleFilterValue(col.key, v)} onSelectAll={() => selectAllFilter(col.key)} onClear={() => clearFilter(col.key)} onClose={() => setOpenFilter(null)} />
                    )}
                    <div
                      style={{ position: 'absolute', top: 0, right: -4, width: 9, height: '100%', cursor: 'col-resize', zIndex: 40 }}
                      onMouseDown={e => onResizeStart(e, col.key)} />
                  </th>
                ))}
                {canEdit && <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border border-slate-200 w-[50px]" />}
                <th className="text-center px-2 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border border-slate-200 w-[50px]">Contrat</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr><td colSpan={COLUMNS.length + (canEdit ? 2 : 1)} className="text-center py-10 text-slate-400 text-sm border border-slate-200">Aucun client trouvé</td></tr>
              ) : sortedData.map((row, i) => (
                <tr key={row.IDClient || i} className="hover:bg-blue-50/40 transition-colors">
                  {COLUMNS.map(col => (
                    <td key={col.key} className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap max-w-[300px] truncate border border-slate-200"
                      title={row[col.key] != null ? String(row[col.key]) : ''}>
                      {col.key === 'ClientDeleted' ? (
                        String(row[col.key]) === '1' || row[col.key] === 1
                          ? <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Supprimé" />
                          : <span className="inline-block w-2 h-2 rounded-full bg-green-500" title="Actif" />
                      ) : (row[col.key] == null || row[col.key] === '' ? <span className="text-slate-300">—</span> : String(row[col.key]))}
                    </td>
                  ))}
                  {canEdit && (
                    <td className="text-center px-2 py-2 border border-slate-200">
                      <button onClick={() => setEditingClient(row)} className="text-slate-400 hover:text-blue-600 transition p-1" title="Modifier le client">
                        <Pencil size={14} />
                      </button>
                    </td>
                  )}
                  <td className="text-center px-2 py-2 border border-slate-200">
                    {row.IDContract > 0 && (row.Contract_Stop === 0 || row.Contract_Stop === '0') ? (
                      <button onClick={() => setContractModal({ contractId: row.IDContract, clientRow: row })}
                        className="text-slate-400 hover:text-blue-600 transition p-1" title={`Contrat #${row.IDContract}`}>
                        <FileText size={14} />
                      </button>
                    ) : (
                      <button onClick={() => setContractModal({ contractId: row.IDContract || null, clientRow: row })}
                        className="text-slate-300 hover:text-green-600 transition p-1" title={row.IDContract > 0 ? 'Contrat résilié — créer un nouveau' : 'Créer un contrat'}>
                        <Plus size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editingClient && (
        <ClientEditModal row={editingClient} onClose={() => setEditingClient(null)} onSaved={async () => { setEditingClient(null); const rows = await api.get('/clients'); setData(rows); }} />
      )}
      {contractModal && (
        <ContractModal contractId={contractModal.contractId} clientName={contractModal.clientRow?.ClientNom}
          onClose={() => setContractModal(null)} onSaved={handleContractSaved} />
      )}
    </div>
  );
}
