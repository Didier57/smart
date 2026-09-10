import React, { useEffect, useRef, useState, useMemo } from 'react';

export default function ColumnFilterDropdown({ values, selected, onToggle, onSelectAll, onClear, onClose }) {
  const ref = useRef(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const allSelected = values.length > 0 && values.every(([v]) => selected.has(v));

  const displayed = useMemo(() => {
    if (!filter) return values;
    const q = filter.toLowerCase();
    return values.filter(([v]) => v.toLowerCase().includes(q));
  }, [values, filter]);

  return (
    <div
      ref={ref}
      className="absolute left-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 min-w-[220px] max-h-[320px] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-2 border-b border-slate-100">
        <input
          type="text"
          placeholder="Filtrer..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full px-2 py-1 border border-slate-200 rounded text-xs focus:outline-none focus:border-blue-400"
          autoFocus
        />
      </div>
      <div className="flex items-center gap-2 px-2 py-1.5 border-b border-slate-100 text-[11px]">
        <button onClick={onSelectAll} className="text-blue-600 hover:underline font-medium">
          {allSelected ? 'Tout désélectionner' : 'Tout sélectionner'}
        </button>
      </div>
      <div className="overflow-y-auto flex-1 p-1">
        {displayed.length === 0 && (
          <div className="text-xs text-slate-400 text-center py-2">Aucune valeur</div>
        )}
        {displayed.map(([value, count]) => (
          <label
            key={value || '__empty__'}
            className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded cursor-pointer text-xs"
          >
            <input
              type="checkbox"
              checked={selected.has(value)}
              onChange={() => onToggle(value)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="flex-1 truncate text-slate-700">{value || '(vide)'}</span>
            <span className="text-slate-400 text-[10px] tabular-nums">{count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
