import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { Database, Search, Download, ChevronDown, ArrowUpDown, ArrowUp, ArrowDown, RefreshCw } from 'lucide-react';
import Pagination from '../components/Pagination.jsx';

export default function Explorer() {
  const { tableName } = useParams();
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [selectedTable, setSelectedTable] = useState(tableName || '');
  const [columns, setColumns] = useState([]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState({ col: null, dir: 'ASC' });
  const [search, setSearch] = useState('');
  const [searchDebounce, setSearchDebounce] = useState('');
  const limit = 100;

  useEffect(() => {
    api.get('/explorer/tables').then(setTables).catch(() => setTables([]));
  }, []);

  useEffect(() => {
    if (tableName && tableName !== selectedTable) {
      setSelectedTable(tableName);
      setPage(1);
      setSort({ col: null, dir: 'ASC' });
      setSearch('');
      setSearchDebounce('');
    }
  }, [tableName]);

  useEffect(() => {
    const timer = setTimeout(() => setSearchDebounce(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!selectedTable) return;
    setPage(1);
    setSort({ col: null, dir: 'ASC' });
  }, [selectedTable]);

  const loadData = useCallback(async () => {
    if (!selectedTable) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit });
      if (sort.col) {
        params.set('sort', sort.col);
        params.set('dir', sort.dir);
      }
      if (searchDebounce) params.set('search', searchDebounce);

      const [colRes, dataRes] = await Promise.all([
        api.get(`/explorer/columns/${encodeURIComponent(selectedTable)}`),
        api.get(`/explorer/data/${encodeURIComponent(selectedTable)}?${params}`)
      ]);
      setColumns(colRes);
      setData(dataRes);
    } catch (err) {
      console.error(err);
      setData({ data: [], total: 0, page: 1, limit, pages: 0 });
    } finally {
      setLoading(false);
    }
  }, [selectedTable, page, sort, searchDebounce]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleSort(col) {
    setSort(prev => ({
      col,
      dir: prev.col === col && prev.dir === 'ASC' ? 'DESC' : 'ASC'
    }));
    setPage(1);
  }

  function handleTableChange(name) {
    navigate(`/explorer/${name}`);
  }

  const userTables = tables.filter(t => t.type === 'TABLE' || t.type === 'BASE TABLE' || t.type === '');

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Explorateur</h1>
          <p className="text-sm text-slate-500 mt-0.5">Consultez les données de votre base HFSQL</p>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative">
          <select
            value={selectedTable}
            onChange={(e) => handleTableChange(e.target.value)}
            className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-sm font-medium focus:outline-none focus:border-blue-500 min-w-[200px]"
          >
            <option value="">— Sélectionner une table —</option>
            {userTables.map(t => (
              <option key={t.name} value={t.name}>{t.name}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {selectedTable && (
          <>
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition"
            >
              <RefreshCw size={14} /> Actualiser
            </button>
            <a
              href={`/api/export/${encodeURIComponent(selectedTable)}/csv`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition"
            >
              <Download size={14} /> Export CSV
            </a>
          </>
        )}
      </div>

      {!selectedTable && (
        <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
          <Database size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 text-sm">Sélectionnez une table pour explorer ses données</p>
          {userTables.length > 0 && (
            <p className="text-xs text-slate-400 mt-2">{userTables.length} table(s) disponible(s)</p>
          )}
        </div>
      )}

      {selectedTable && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          {loading && !data ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto max-h-[70vh]">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      {columns.map(col => (
                        <th
                          key={col.name}
                          onClick={() => handleSort(col.name)}
                          className="text-left px-3 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap"
                        >
                          <div className="flex items-center gap-1.5">
                            <span>{col.name}</span>
                            <span className="text-[10px] text-slate-400 font-normal normal-case">{col.type}</span>
                            {sort.col === col.name ? (
                              sort.dir === 'ASC' ? <ArrowUp size={12} className="text-blue-500" /> : <ArrowDown size={12} className="text-blue-500" />
                            ) : (
                              <ArrowUpDown size={10} className="text-slate-300" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!data?.data || data.data.length === 0) ? (
                      <tr>
                        <td colSpan={columns.length} className="text-center py-10 text-slate-400 text-sm">
                          Aucune donnée
                        </td>
                      </tr>
                    ) : (
                      data.data.map((row, i) => (
                        <tr key={i} className="hover:bg-slate-50 border-b border-slate-100">
                          {columns.map(col => (
                            <td key={col.name} className="px-3 py-2 text-xs text-slate-700 whitespace-nowrap max-w-[300px] truncate" title={row[col.name] != null ? String(row[col.name]) : ''}>
                              {row[col.name] == null ? <span className="text-slate-300">null</span> : String(row[col.name])}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              {data && (
                <Pagination
                  page={data.page}
                  pages={data.pages}
                  total={data.total}
                  onPageChange={setPage}
                />
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
