import React, { useState, useEffect } from 'react';
import { X, Save, Loader2 } from 'lucide-react';
import { api } from '../api.js';

const FIELDS = [
  { key: 'Customer_name', label: 'Client', type: 'text', col: 2 },
  { key: 'Main_contractual_subject', label: 'Sujet', type: 'text', col: 2 },
  { key: 'SAP_EUPAC', label: 'SAP EUPAC', type: 'text' },
  { key: 'WBS', label: 'WBS', type: 'text' },
  { key: 'SoldtoParty', label: 'Sold to Party', type: 'text' },
  { key: 'Acc_Manager', label: 'Acc Manager', type: 'text' },
  { key: 'Amount', label: 'Montant', type: 'number' },
  { key: 'Contract_type', label: 'Type', type: 'number' },
  { key: 'Service_Type', label: 'Service', type: 'text' },
  { key: 'Service_window', label: 'Fenêtre', type: 'text' },
  { key: 'Contract_start', label: 'Début', type: 'text' },
  { key: 'Duration_month', label: 'Durée (mois)', type: 'number' },
  { key: 'Contract_end', label: 'Fin', type: 'text' },
  { key: 'Renew_month', label: 'Renouvellement', type: 'number' },
  { key: 'Billing', label: 'Facturation', type: 'number' },
  { key: 'Remarks_BAC', label: 'Remarques', type: 'textarea' },
];

function FieldInput({ field, value, onChange }) {
  if (field.type === 'textarea') {
    return (
      <textarea
        value={value ?? ''}
        onChange={e => onChange(field.key, e.target.value)}
        rows={3}
        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
      />
    );
  }
  return (
    <input
      type={field.type === 'number' ? 'text' : 'text'}
      value={value ?? ''}
      onChange={e => onChange(field.key, field.type === 'number' ? e.target.value : e.target.value)}
      className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:border-blue-500"
    />
  );
}

export default function ContractModal({ contractId, clientName, onClose, onSaved }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(!!contractId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const isNew = !contractId;

  useEffect(() => {
    if (!contractId) {
      setData({ Customer_name: clientName || '' });
      return;
    }
    setLoading(true);
    api.get(`/contracts/${contractId}`)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [contractId, clientName]);

  function handleChange(key, val) {
    setData(prev => ({ ...prev, [key]: val }));
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (isNew) {
        const res = await api.post('/contracts', data);
        if (res.ok && res.id) {
          await onSaved({ newContractId: res.id });
        }
      } else {
        await api.put(`/contracts/${contractId}`, data);
        await onSaved({});
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">
            {isNew ? 'Nouveau contrat' : `Contrat #${contractId}`}
            {clientName && <span className="text-slate-400 font-normal ml-2">— {clientName}</span>}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={24} className="animate-spin text-blue-600" />
            </div>
          )}
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">{error}</div>}
          {data && (
            <div className="grid grid-cols-2 gap-3">
              {FIELDS.map(f => (
                <div key={f.key} className={f.col === 2 ? 'col-span-2' : ''}>
                  <label className="block text-xs font-medium text-slate-500 mb-1">{f.label}</label>
                  <FieldInput field={f} value={data[f.key]} onChange={handleChange} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-200">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition">Annuler</button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition disabled:opacity-50"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isNew ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
