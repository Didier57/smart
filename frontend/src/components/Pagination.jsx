import React from 'react';

export default function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const range = [];
    for (let i = Math.max(1, page - delta); i <= Math.min(pages, page + delta); i++) {
      range.push(i);
    }
    if (range[0] > 1) range.unshift(1);
    if (range[range.length - 1] < pages) range.push(pages);
    return range;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className="flex items-center justify-between text-sm text-slate-500 py-3 px-4">
      <span>{total.toLocaleString('fr-FR')} résultat{total > 1 ? 's' : ''}</span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="px-2 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-100"
        >
          ←
        </button>
        {visiblePages.map((p, i) => (
          <React.Fragment key={p}>
            {i > 0 && visiblePages[i - 1] !== p - 1 && <span className="px-1 text-slate-300">…</span>}
            <button
              onClick={() => onPageChange(p)}
              className={`w-7 h-7 rounded text-xs font-medium transition ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-100 text-slate-600'}`}
            >
              {p}
            </button>
          </React.Fragment>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= pages}
          className="px-2 py-1 rounded border border-slate-200 text-xs disabled:opacity-40 hover:bg-slate-100"
        >
          →
        </button>
      </div>
    </div>
  );
}
