import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Search, Filter, RotateCcw, Users, Pencil, Plus, FileText, X, Save, Loader2 } from 'lucide-react';
import ColumnFilterDropdown from '../components/ColumnFilter.jsx';
import ContractModal from '../components/ContractModal.jsx';

const COLUMNS = [
  { key: 'ClientNom', label: 'Nom', pct: 14 },
  { key: 'ClientSite', label: 'Site', pct: 10 },
  { key: 'ClientAdresse', label: 'Adresse', pct: 14 },
  { key: 'ClientCP', label: 'Code Postal', pct: 6 },
  { key: 'ClientTelephone', label: 'Téléphone', pct: 9 },
  { key: 'ClientEmail', label: 'Email', pct: 14 },
  { key: 'ClientContrat', label: 'Contrat', pct: 10 },
  { key: 'ClientContratType', label: 'Type Contrat', pct: 10 },
  { key: 'ClientDeleted', label: 'Deleted', pct: 5 },
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
  { key: 'IDContract', label: 'ID Contrat (lien)', type: 'number' },
  { key: 'ClientDeleted', label: 'Supprimé', type: 'checkbox' },
];

function makeDefaultFilters() {
  return { ClientDeleted: new Set(['0']) };
}

function pctToPx(total) {
  const out = {};
  for (const c of COLUMNS) out[c.key] = Math.max(40, Math.round((total * (c.pct || 8)) / 100));
  return out;
}

const WIDTHS_KEY = 'smart_clients_col_widths';

function loadWidths(total) {
  const base = pctToPx(total);
  try {
    const saved = JSON.parse(localStorage.getItem(WIDTHS_KEY) || '{}');
    for (const k of Object.keys(saved)) if (k in base) base[k] = saved[k];
  } catch { /* ignore */ }
  return base;
}

function persistWidths(widths) {
  try { localStorage.setItem(WIDTHS_KEY, JSON.stringify(widths)); } catch { /* ignore */ }
}

function ClientEditModal({ row, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const f = {};
    EDIT_FIELDS.forEach(field => {
      const val = row[field.key];
      if (field.type === 'checkbox') {
        f[field.key] = val === 1 || val === '1' || val === true;
      } else {
        f[field.key] = val != null ? String(val) : '';
      }
    });
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
        if (f.type === 'checkbox') {
          body[f.key] = form[f.key] ? 1 : 0;
        } else if (f.type === 'number') {
          body[f.key] = form[f.key] === '' ? null : Number(form[f.key]);
        } else {
          body[f.key] = form[f.key];
        }
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
                {f.type === 'checkbox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!form[f.key]}
                      onChange={e => handleChange(f.key, e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-slate-500">{f.label}</span>
                  </label>
                ) : (
                  <>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                    <input
                      type="text"
                      value={form[f.key]}
                      onChange={e => handleChange(f.key, e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                    />
                  </>
                )}
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
  const [editingClient, setEditingClient] = useState(null);
  const [contractModal, setContractModal] = useState(null);

  const wrapRef = useRef(null);
  const dragRef = useRef(false);

  const [colWidths, setColWidths] = useState(() => loadWidths(1400));

  useEffect(() => {
    if (wrapRef.current) setColWidths(loadWidths(wrapRef.current.clientWidth));
  }, []);

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

  function handleSort(colKey) {
    if (dragRef.current) return;
    setSort(prev => ({ col: colKey, dir: prev.col === colKey && prev.dir === 'ASC' ? 'DESC' : 'ASC' }));
  }

  function toggleFilterValue(colKey, value) {
    setFilters(prev => { const next = { ...prev }; const s = new Set(next[colKey] || []); if (s.has(value)) s.delete(value); else s.add(value); next[colKey] = s; return next; });
  }
  function selectAllFilter(colKey) { const vals = uniqueValues(colKey); setFilters(prev => ({ ...prev, [colKey]: new Set(vals.map(([v]) => v)) })); }
  function clearFilter(colKey) { setFilters(prev => { const next = { ...prev }; delete next[colKey]; return next; }); }
  function resetAll() { setFilters(makeDefaultFilters()); setSearch(''); setSort({ col: null, dir: 'ASC' }); }

  function startResize(e, key) {
    e.preventDefault(); e.stopPropagation();
    dragRef.current = false;
    const startX = e.clientX;
    const startW = colWidths[key] || 120;
    const onMove = (ev) => {
      const delta = ev.clientX - startX;
      if (Math.abs(delta) > 3) dragRef.current = true;
      setColWidths((prev) => {
        const next = { ...prev, [key]: Math.max(40, startW + delta) };
        persistWidths(next);
        return next;
      });
    };
    const onUp = () => {
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      setTimeout(() => { dragRef.current = false; }, 0);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  function resetColWidth(key) {
    const total = wrapRef.current ? wrapRef.current.clientWidth : 1400;
    setColWidths((prev) => {
      const next = { ...prev, [key]: pctToPx(total)[key] };
      persistWidths(next);
      return next;
    });
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
    <div className="smart-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><Users size={18} /> Clients</h2>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sortedData.length} client(s) affiché(s) sur {data.length}</div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#64748b' }} />
            <input type="text" placeholder="Rechercher dans toutes les colonnes..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ paddingLeft: 30, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, padding: '7px 12px 7px 30px', minWidth: 260 }} />
          </div>
          <button onClick={resetAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#475569', background: '#fff', cursor: 'pointer' }}>
            <RotateCcw size={14} /> Réinitialiser
          </button>
        </div>
      </div>

      <div className="table-wrap" ref={wrapRef}>
        {sortedData.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucun client trouvé</div>
        ) : (
          <table className="table table-compact clients-bordered">
            <thead>
              <tr>
                {COLUMNS.map(c => (
                  <th key={c.key} style={{ width: colWidths[c.key] }} onClick={() => handleSort(c.key)}>
                    <span className="th-label">{c.label}</span>
                    <span className="th-meta">
                      <span className="th-sort">{sort.col === c.key ? (sort.dir === 'ASC' ? '▲' : '▼') : '⇅'}</span>
                      <button
                        className={`filter-funnel ${filters[c.key]?.size && !(c.key === 'ClientDeleted' && filters[c.key].size === 1 && filters[c.key].has('0')) ? 'active' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === c.key ? null : c.key); }}
                        title="Filtrer"
                      >
                        <Filter size={11} />
                      </button>
                    </span>
                    <span
                      className="col-resize-handle"
                      onMouseDown={(e) => startResize(e, c.key)}
                      onDoubleClick={(e) => { e.stopPropagation(); resetColWidth(c.key); }}
                      title="Glisser pour redimensionner · Double-clic : largeur par défaut"
                    />
                    {openFilter === c.key && (
                      <ColumnFilterDropdown values={uniqueValues(c.key)} selected={filters[c.key] || new Set()}
                        onToggle={v => toggleFilterValue(c.key, v)} onSelectAll={() => selectAllFilter(c.key)} onClear={() => clearFilter(c.key)} onClose={() => setOpenFilter(null)} />
                    )}
                  </th>
                ))}
                {canEdit && <th style={{ width: 40, textAlign: 'center' }}>Edit</th>}
                <th style={{ width: 50, textAlign: 'center' }}>Contrat</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, i) => (
                <tr key={row.IDClient || i}>
                  {COLUMNS.map(col => (
                    <td key={col.key} title={row[col.key] != null ? String(row[col.key]) : ''}>
                      {col.key === 'ClientDeleted' ? (
                        String(row[col.key]) === '1' || row[col.key] === 1
                          ? <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} title="Supprimé" />
                          : <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} title="Actif" />
                      ) : (row[col.key] == null || row[col.key] === '' ? <span style={{ color: '#cbd5e1' }}>—</span> : String(row[col.key]))}
                    </td>
                  ))}
                  {canEdit && (
                    <td style={{ textAlign: 'center' }}>
                      <button onClick={() => setEditingClient(row)} style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title="Modifier le client">
                        <Pencil size={13} />
                      </button>
                    </td>
                  )}
                  <td style={{ textAlign: 'center' }}>
                    {row.IDContract > 0 && (row.Contract_Stop === 0 || row.Contract_Stop === '0') ? (
                      <button onClick={() => setContractModal({ contractId: row.IDContract, clientRow: row })}
                        style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title={`Contrat #${row.IDContract}`}>
                        <FileText size={13} />
                      </button>
                    ) : (
                      <button onClick={() => setContractModal({ contractId: row.IDContract || null, clientRow: row })}
                        style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', padding: 2 }} title={row.IDContract > 0 ? 'Contrat résilié — créer un nouveau' : 'Créer un contrat'}>
                        <Plus size={13} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: '6px 12px', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          {sortedData.length} ligne{sortedData.length > 1 ? 's' : ''}
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
