import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { api } from '../api.js';
import { Search, ArrowUp, ArrowDown, ArrowUpDown, Filter, RotateCcw, Users } from 'lucide-react';
import ColumnFilterDropdown from '../components/ColumnFilter.jsx';

const COLUMNS = [
  { key: 'ClientNom', label: 'Nom' },
  { key: 'ClientSite', label: 'Site' },
  { key: 'ClientAdresse', label: 'Adresse' },
  { key: 'ClientCP', label: 'Code Postal' },
  { key: 'ClientTelephone', label: 'Téléphone' },
  { key: 'ClientEmail', label: 'Email' },
  { key: 'ClientContrat', label: 'Contrat' },
  { key: 'ClientContratType', label: 'Type Contrat' },
];

function makeDefaultFilters() {
  return { ClientDeleted: new Set(['0']) };
}

export default function Clients() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const [sort, setSort] = useState({ col: null, dir: 'ASC' });
  const [filters, setFilters] = useState(makeDefaultFilters);
  const [openFilter, setOpenFilter] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    api.get('/clients')
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const uniqueValues = useCallback((colKey) => {
    const map = new Map();
    data.forEach(row => {
      const v = String(row[colKey] ?? '');
      map.set(v, (map.get(v) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0], 'fr'));
  }, [data]);

  const filteredData = useMemo(() => {
    let result = data;
    for (const [colKey, selected] of Object.entries(filters)) {
      if (selected && selected.size > 0) {
        const s = selected;
        result = result.filter(row => s.has(String(row[colKey] ?? '')));
      }
    }
    if (searchDebounce) {
      const q = searchDebounce.toLowerCase();
      result = result.filter(row =>
        COLUMNS.some(col => String(row[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    return result;
  }, [data, filters, searchDebounce]);

  const sortedData = useMemo(() => {
    if (!sort.col) return filteredData;
    const sorted = [...filteredData].sort((a, b) => {
      const av = String(a[sort.col] ?? '');
      const bv = String(b[sort.col] ?? '');
      return av.localeCompare(bv, 'fr');
    });
    if (sort.dir === 'DESC') sorted.reverse();
    return sorted;
  }, [filteredData, sort]);

  function handleSort(colKey) {
    setSort(prev => ({
      col: colKey,
      dir: prev.col === colKey && prev.dir === 'ASC' ? 'DESC' : 'ASC'
    }));
  }

  function toggleFilterValue(colKey, value) {
    setFilters(prev => {
      const next = { ...prev };
      const s = new Set(next[colKey] || []);
      if (s.has(value)) s.delete(value); else s.add(value);
      next[colKey] = s;
      return next;
    });
  }

  function selectAllFilter(colKey) {
    const vals = uniqueValues(colKey);
    setFilters(prev => ({ ...prev, [colKey]: new Set(vals.map(([v]) => v)) }));
  }

  function clearFilter(colKey) {
    setFilters(prev => {
      const next = { ...prev };
      delete next[colKey];
      return next;
    });
  }

  function resetAll() {
    setFilters(makeDefaultFilters());
    setSearch('');
    setSort({ col: null, dir: 'ASC' });
  }

  const activeFilterCount = Object.keys(filters).filter(k => k !== 'ClientDeleted' || filters[k]?.size !== 1 || !filters[k].has('0')).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-[3px] border-slate-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600 text-sm font-medium">{error}</p>
      </div>
    );
  }

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
            <input
              type="text"
              placeholder="Rechercher dans toutes les colonnes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500 min-w-[280px]"
            />
          </div>
          <button
            onClick={resetAll}
            className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
          >
            <RotateCcw size={14} /> Réinitialiser
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto max-h-[75vh]">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 sticky top-0 z-10">
              <tr>
                {COLUMNS.map(col => (
                  <th
                    key={col.key}
                    className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 whitespace-nowrap relative group"
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        onClick={() => handleSort(col.key)}
                        className="cursor-pointer hover:text-blue-600 select-none flex items-center gap-1"
                      >
                        {col.label}
                        {sort.col === col.key ? (
                          sort.dir === 'ASC' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
                        ) : (
                          <ArrowUpDown size={10} className="text-slate-300 opacity-0 group-hover:opacity-100 transition" />
                        )}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setOpenFilter(openFilter === col.key ? null : col.key); }}
                        className={`p-0.5 rounded hover:bg-slate-200 transition ${filters[col.key]?.size && !(col.key === 'ClientDeleted' && filters[col.key].size === 1 && filters[col.key].has('0')) ? 'text-blue-600' : 'text-slate-300 opacity-0 group-hover:opacity-100'}`}
                        title="Filtrer"
                      >
                        <Filter size={12} />
                      </button>
                    </div>
                    {openFilter === col.key && (
                      <ColumnFilterDropdown
                        values={uniqueValues(col.key)}
                        selected={filters[col.key] || new Set()}
                        onToggle={(v) => toggleFilterValue(col.key, v)}
                        onSelectAll={() => selectAllFilter(col.key)}
                        onClear={() => clearFilter(col.key)}
                        onClose={() => setOpenFilter(null)}
                      />
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedData.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="text-center py-10 text-slate-400 text-sm">
                    Aucun client trouvé
                  </td>
                </tr>
              ) : (
                sortedData.map((row, i) => (
                  <tr key={row.IDClient || i} className="hover:bg-blue-50/40 border-b border-slate-100 transition-colors">
                    {COLUMNS.map(col => (
                      <td
                        key={col.key}
                        className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap max-w-[300px] truncate"
                        title={row[col.key] != null ? String(row[col.key]) : ''}
                      >
                        {row[col.key] == null || row[col.key] === '' ? (
                          <span className="text-slate-300">—</span>
                        ) : (
                          String(row[col.key])
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
