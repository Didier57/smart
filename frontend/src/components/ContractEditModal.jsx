import React, { useState } from 'react';
import { api } from '../api.js';
import { X, Save, Loader2 } from 'lucide-react';

const FIELDS = [
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

function toInputVal(field, val) {
  if (field.type === 'bool') return val === 1 || val === '1' || val === true;
  if (val == null) return '';
  if (field.type === 'date') return String(val).slice(0, 10);
  return String(val);
}

export default function ContractEditModal({ contract, onClose, onSaved }) {
  const [form, setForm] = useState(() => {
    const f = {};
    FIELDS.forEach(field => { f[field.key] = toInputVal(field, contract[field.key]); });
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
      FIELDS.forEach(f => {
        if (f.type === 'bool') {
          body[f.key] = form[f.key] ? 1 : 0;
        } else if (f.type === 'num') {
          body[f.key] = form[f.key] === '' ? null : Number(form[f.key]);
        } else if (f.type === 'date') {
          body[f.key] = form[f.key] || null;
        } else {
          body[f.key] = form[f.key];
        }
      });
      await api.put(`/contracts/${contract.IDContract}`, body);
      onSaved();
    } catch (e) { setError(e.message); } finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900">Modifier contrat — #{contract.IDContract}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1"><X size={18} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-3">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 pb-4">
            {FIELDS.map(f => (
              <div key={f.key}>
                {f.type === 'bool' ? (
                  <label className="flex items-center gap-2 cursor-pointer py-1.5">
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
                      type={f.type === 'date' ? 'date' : 'text'}
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