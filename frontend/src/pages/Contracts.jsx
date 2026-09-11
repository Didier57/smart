import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import { Search, Filter, RotateCcw, FileText, Pencil, X, Save, Loader2 } from 'lucide-react';
import ColumnFilterDropdown from '../components/ColumnFilter.jsx';
import ContractEditModal from '../components/ContractEditModal.jsx';

const FIELDS = [
  { key: 'IDContract', label: 'ID', type: 'num' },
  { key: 'SAP_EWP', label: 'SAP EWP', type: 'text' },
  { key: 'SAP_EUPAC', label: 'SAP EUPAC', type: 'text' },
  { key: 'WBS', label: 'WBS', type: 'text' },
  { key: 'SoldtoParty', label: 'Sold-to Party', type: 'text' },
  { key: 'Customer_name', label: 'Customer Name', type: 'text' },
  { key: 'Main_contractual_subject', label: 'Sujet du contrat', type: 'text' },
  { key: 'Acc_Manager', label: 'Acc Manager', type: 'text' },
  { key: 'Amount', label: 'Montant', type: 'num' },
  { key: 'Contract_type', label: 'Type Contrat', type: 'num' },
  { key: 'Service_Type', label: 'Type Service', type: 'text' },
  { key: 'SC', label: 'SC', type: 'bool' },
  { key: 'Contract_included', label: 'Contrat inclus', type: 'bool' },
  { key: 'RTP1', label: 'RTP1', type: 'num' },
  { key: 'RTP2', label: 'RTP2', type: 'num' },
  { key: 'RTP3', label: 'RTP3', type: 'num' },
  { key: 'Intervention_time', label: 'Temps intervention', type: 'num' },
  { key: 'Repair_time', label: 'Temps réparation', type: 'num' },
  { key: 'Service_window', label: 'Fenêtre service', type: 'text' },
  { key: 'Preventive_maintenance', label: 'Maintenance préventive', type: 'bool' },
  { key: 'Backups', label: 'Backups', type: 'bool' },
  { key: 'Remote_Service', label: 'Service à distance', type: 'bool' },
  { key: 'SW_Upgrades', label: 'Maj logiciel', type: 'bool' },
  { key: 'Created_date', label: 'Date création', type: 'date' },
  { key: 'CSO', label: 'CSO', type: 'text' },
  { key: 'Contract_start', label: 'Début contrat', type: 'date' },
  { key: 'Duration_month', label: 'Durée (mois)', type: 'num' },
  { key: 'Contract_end', label: 'Fin contrat', type: 'date' },
  { key: 'Renew_month', label: 'Mois renouvellement', type: 'num' },
  { key: 'Billing', label: 'Facturation', type: 'num' },
  { key: 'Garantie', label: 'Garantie', type: 'bool' },
  { key: 'Remarks_BAC', label: 'Remarques BAC', type: 'text' },
  { key: 'GA', label: 'GA', type: 'bool' },
  { key: 'Customer_Group', label: 'Groupe client', type: 'text' },
  { key: 'Product_Group', label: 'Groupe produit', type: 'text' },
  { key: 'F5', label: 'F5', type: 'bool' },
  { key: 'AM_Signature', label: 'Signature AM', type: 'bool' },
  { key: 'Contract_Stop', label: 'Contrat stop', type: 'bool' },
  { key: 'phone_include', label: 'Téléphone inclus', type: 'bool' },
  { key: 'COntract_stop_date', label: 'Date arrêt', type: 'date' },
  { key: 'Customer_name_sap', label: 'Customer Name SAP', type: 'text' },
  { key: 'IDClient', label: 'ID Client', type: 'num' },
  { key: 'Remote', label: 'Remote', type: 'bool' },
];

const WIDTHS_KEY = 'smart_contracts_col_widths';

function pctToPx(total) {
  const out = {};
  for (const f of FIELDS) out[f.key] = Math.max(40, Math.round((total * (f.pct || 2.2)) / 100));
  return out;
}

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

function makeDefaultFilters() {
  return { Contract_Stop: new Set(['0']) };
}

export default function Contracts() {
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
  const [editingContract, setEditingContract] = useState(null);

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
    api.get('/contracts').then(setData).catch(e => setError(e.message)).finally(() => setLoading(false));
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
      result = result.filter(row => FIELDS.some(f => String(row[f.key] ?? '').toLowerCase().includes(q)));
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

  async function handleSaved() {
    setEditingContract(null);
    const rows = await api.get('/contracts');
    setData(rows);
  }

  if (loading) return <div className="flex items-center justify-center py-20"><div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center"><p className="text-red-600 text-sm font-medium">{error}</p></div>;

  return (
    <div className="smart-page">
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}><FileText size={18} /> Contrats</h2>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{sortedData.length} contrat(s) affiché(s) sur {data.length}</div>
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
          <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>Aucun contrat trouvé</div>
        ) : (
          <table className="table table-compact clients-bordered">
            <thead>
              <tr>
                {FIELDS.map(c => (
                  <th key={c.key} style={{ width: colWidths[c.key] }} onClick={() => handleSort(c.key)}>
                    <span className="th-label">{c.label}</span>
                    <span className="th-meta">
                      <span className="th-sort">{sort.col === c.key ? (sort.dir === 'ASC' ? '▲' : '▼') : '⇅'}</span>
                      <button
                        className={`filter-funnel ${filters[c.key]?.size && !(c.key === 'Contract_Stop' && filters[c.key].size === 1 && filters[c.key].has('0')) ? 'active' : ''}`}
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
                {canEdit && <th style={{ width: 60, textAlign: 'center' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {sortedData.map((row, i) => (
                <tr key={row.IDContract || i}>
                  {FIELDS.map(f => (
                    <td key={f.key} title={row[f.key] != null ? String(row[f.key]) : ''}>
                      {f.type === 'bool' ? (
                        <input type="checkbox" checked={row[f.key] === 1 || row[f.key] === '1' || row[f.key] === true} disabled
                          style={{ accentColor: '#1d4ed8', width: 14, height: 14, pointerEvents: 'none' }} />
                      ) : (row[f.key] == null || row[f.key] === '' ? <span style={{ color: '#cbd5e1' }}>—</span> : String(row[f.key]))}
                    </td>
                  ))}
                  {canEdit && (
                    <td style={{ textAlign: 'center' }}>
                      <button
                        onClick={() => setEditingContract(row)}
                        style={{ color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', padding: 4, display: 'inline-flex', alignItems: 'center', gap: 4 }}
                        title="Éditer le contrat"
                        onMouseEnter={e => e.currentTarget.style.color = '#1d4ed8'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                      >
                        <Pencil size={13} /> Éditer
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ padding: '6px 12px', fontSize: 12, color: '#64748b', borderTop: '1px solid #e2e8f0' }}>
          {sortedData.length} ligne{sortedData.length > 1 ? 's' : ''}
        </div>
      </div>

      {editingContract && (
        <ContractEditModal contract={editingContract} onClose={() => setEditingContract(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}