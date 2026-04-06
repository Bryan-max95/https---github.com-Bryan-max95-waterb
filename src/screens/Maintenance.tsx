'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Gauge, Plus, Wrench } from 'lucide-react';
import { addDays, format } from 'date-fns';

type ServiceType = 'oil_change' | 'tire_rotation' | 'general';

export const Maintenance: React.FC = () => {
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newMaint, setNewMaint] = useState({
    type: 'Vehículo de Reparto',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    serviceType: 'general' as ServiceType,
    sellerId: '',
    mileage: '',
    cost: '',
  });

  const nextDateSuggestion = useMemo(() => {
    const base = new Date(newMaint.date);
    if (Number.isNaN(base.getTime())) return '';
    if (newMaint.serviceType === 'oil_change') return format(addDays(base, 30), 'yyyy-MM-dd');
    if (newMaint.serviceType === 'tire_rotation') return format(addDays(base, 60), 'yyyy-MM-dd');
    return format(base, 'yyyy-MM-dd');
  }, [newMaint.date, newMaint.serviceType]);

  const fetchData = async () => {
    try {
      const [mData, users] = await Promise.all([
        api.get('/api/maintenance'),
        api.get('/api/users'),
      ]);
      setMaintenance(mData || []);
      setSellers((users || []).filter((u: any) => u.role === 'seller'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/api/maintenance', {
        type: newMaint.type,
        description: newMaint.description.trim(),
        date: newMaint.date,
        serviceType: newMaint.serviceType,
        nextMaintenance: nextDateSuggestion,
        sellerId: newMaint.sellerId ? Number(newMaint.sellerId) : null,
        mileage: newMaint.mileage ? Number(newMaint.mileage) : null,
        cost: newMaint.cost ? Number(newMaint.cost) : 0,
      });
      setIsModalOpen(false);
      setNewMaint({
        type: 'Vehículo de Reparto',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        serviceType: 'general',
        sellerId: '',
        mileage: '',
        cost: '',
      });
      fetchData();
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar mantenimiento.');
    } finally {
      setLoading(false);
    }
  };

  const totals = useMemo(() => {
    const overdue = maintenance.filter((m: any) => new Date(m.next_maintenance) <= new Date()).length;
    const alerts = maintenance.filter((m: any) => Boolean(m.alert_soon)).length;
    const totalCost = maintenance.reduce((acc: number, m: any) => acc + Number(m.cost || 0), 0);
    return { overdue, alerts, totalCost, total: maintenance.length };
  }, [maintenance]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mantenimiento</h1>
          <p className="text-slate-500 text-sm">Historial por unidad y alertas preventivas automáticas</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registros</p>
          <p className="text-2xl font-black text-slate-900">{totals.total}</p>
        </div>
        <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 shadow-sm">
          <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Vencidos</p>
          <p className="text-2xl font-black text-rose-700">{totals.overdue}</p>
        </div>
        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-sm">
          <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Alertas (7 días)</p>
          <p className="text-2xl font-black text-amber-700">{totals.alerts}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Costo Total</p>
          <p className="text-2xl font-black text-emerald-700">L. {totals.totalCost.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Unidad</th>
                <th className="px-6 py-4">Servicio</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Próximo</th>
                <th className="px-6 py-4">Costo</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.length > 0 ? maintenance.map((m: any) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{m.seller_name || m.type}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{m.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm text-slate-700">{m.description}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{m.service_type || 'general'}</p>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-600">{format(new Date(m.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-800">{format(new Date(m.next_maintenance), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 text-xs font-bold text-rose-600">L. {Number(m.cost || 0).toLocaleString()}</td>
                  <td className="px-6 py-4">
                    {new Date(m.next_maintenance) <= new Date() ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600">Vencido</span>
                    ) : m.alert_soon ? (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-600">Alerta</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600">Al Día</span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No hay registros de mantenimiento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Registrar Mantenimiento</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm">{error}</div>}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                  <input
                    required
                    type="text"
                    value={newMaint.type}
                    onChange={(e) => setNewMaint({ ...newMaint, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Servicio</label>
                  <select
                    value={newMaint.serviceType}
                    onChange={(e) => setNewMaint({ ...newMaint, serviceType: e.target.value as ServiceType })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="general">General</option>
                    <option value="oil_change">Cambio de aceite (+30 días)</option>
                    <option value="tire_rotation">Rotación de llantas (+60 días)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Realizado</label>
                  <input
                    required
                    type="date"
                    value={newMaint.date}
                    onChange={(e) => setNewMaint({ ...newMaint, date: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Próxima Fecha (auto)</label>
                  <input
                    readOnly
                    value={nextDateSuggestion}
                    className="w-full p-3 bg-slate-100 border border-slate-200 rounded-xl text-sm font-bold text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendedor/Camión (opcional)</label>
                  <select
                    value={newMaint.sellerId}
                    onChange={(e) => setNewMaint({ ...newMaint, sellerId: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">No aplica</option>
                    {sellers.map((s: any) => (
                      <option key={s.id} value={String(s.id)}>
                        {s.name} ({s.vehicle || 'Sin vehículo'})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Km (opcional)</label>
                    <div className="relative">
                      <Gauge className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="number"
                        min={0}
                        value={newMaint.mileage}
                        onChange={(e) => setNewMaint({ ...newMaint, mileage: e.target.value })}
                        className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Costo (L.)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      value={newMaint.cost}
                      onChange={(e) => setNewMaint({ ...newMaint, cost: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea
                  required
                  rows={3}
                  value={newMaint.description}
                  onChange={(e) => setNewMaint({ ...newMaint, description: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Detalle del mantenimiento realizado"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Wrench className="h-4 w-4" />
                  {loading ? 'Guardando...' : 'Guardar Mantenimiento'}
                </button>
              </div>
              <p className="text-[11px] text-slate-500">
                Si defines costo, el sistema también lo registra automáticamente como gasto operativo.
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
