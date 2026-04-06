'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Calendar, CheckCircle2, Package, Plus } from 'lucide-react';
import { format } from 'date-fns';

export const BottleCheckins: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formData, setFormData] = useState({
    sellerId: '',
    emptyCount: '',
    fullCount: '',
    notes: '',
  });

  const fetchData = async () => {
    try {
      const [users, data] = await Promise.all([
        api.get('/api/users'),
        api.get(`/api/bottle-checkins?date=${filterDate}`),
      ]);
      setSellers(users.filter((u: any) => u.role === 'seller' && u.status === 'active'));
      setCheckins(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const grouped = useMemo(() => {
    const map = new Map<number, { sellerName: string; empty: number; full: number; records: number }>();
    checkins.forEach((row: any) => {
      const id = Number(row.seller_id || 0);
      if (!map.has(id)) {
        map.set(id, {
          sellerName: row.seller_name || 'N/A',
          empty: 0,
          full: 0,
          records: 0,
        });
      }
      const item = map.get(id)!;
      item.empty += Number(row.empty_count || 0);
      item.full += Number(row.full_count || 0);
      item.records += 1;
    });
    return Array.from(map.entries()).map(([sellerId, v]) => ({ sellerId, ...v }));
  }, [checkins]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/bottle-checkins', {
        sellerId: Number(formData.sellerId),
        emptyCount: Number(formData.emptyCount || 0),
        fullCount: Number(formData.fullCount || 0),
        notes: formData.notes.trim(),
      });
      setFormData({
        sellerId: '',
        emptyCount: '',
        fullCount: '',
        notes: '',
      });
      await fetchData();
    } catch (err: any) {
      alert(err?.message || 'No se pudo registrar la recepción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Recepción de Botellones</h1>
          <p className="text-slate-500 text-sm">Chequeador registra vacíos y llenos recibidos por vendedor</p>
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          />
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-4">Registrar Recepción</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <select
            required
            value={formData.sellerId}
            onChange={(e) => setFormData({ ...formData, sellerId: e.target.value })}
            className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Seleccione vendedor</option>
            {sellers.map((s: any) => (
              <option key={s.id} value={s.id}>{s.name} ({s.id_number})</option>
            ))}
          </select>
          <input
            type="number"
            min={0}
            value={formData.emptyCount}
            onChange={(e) => setFormData({ ...formData, emptyCount: e.target.value })}
            placeholder="Vacíos"
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="number"
            min={0}
            value={formData.fullCount}
            onChange={(e) => setFormData({ ...formData, fullCount: e.target.value })}
            placeholder="Llenos"
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={loading}
            className="p-3 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            {loading ? 'Guardando...' : 'Registrar'}
          </button>
          <input
            type="text"
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            placeholder="Observación (opcional)"
            className="md:col-span-5 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          />
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recepciones del Día</p>
          <p className="text-2xl font-black text-slate-900">{checkins.length}</p>
        </div>
        <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Vacíos Recibidos</p>
          <p className="text-2xl font-black text-blue-700">{checkins.reduce((acc: number, r: any) => acc + Number(r.empty_count || 0), 0)}</p>
        </div>
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Llenos Recibidos</p>
          <p className="text-2xl font-black text-emerald-700">{checkins.reduce((acc: number, r: any) => acc + Number(r.full_count || 0), 0)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Resumen por Vendedor</h3>
          <div className="text-xs text-slate-500">Fecha: {filterDate}</div>
        </div>
        <div className="divide-y divide-slate-100">
          {grouped.length > 0 ? grouped.map((row) => (
            <div key={row.sellerId} className="p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Package className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-900">{row.sellerName}</p>
                  <p className="text-xs text-slate-500">{row.records} registros</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Vacíos: <span className="font-black text-blue-700">{row.empty}</span></p>
                <p className="text-xs text-slate-500">Llenos: <span className="font-black text-emerald-700">{row.full}</span></p>
              </div>
            </div>
          )) : (
            <div className="p-10 text-center text-sm text-slate-400">No hay recepciones registradas para esta fecha.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h3 className="text-sm font-bold text-slate-900">Historial del Día</h3>
        </div>
        <div className="divide-y divide-slate-100">
          {checkins.length > 0 ? checkins.map((row: any) => (
            <div key={row.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">{row.seller_name}</p>
                <p className="text-xs text-slate-500">
                  {format(new Date(row.timestamp), 'HH:mm')} | Chequeador: {row.checker_name || 'N/A'}
                </p>
                {row.notes && <p className="text-xs text-slate-500 mt-1">{row.notes}</p>}
              </div>
              <div className="flex items-center gap-4">
                <p className="text-xs font-bold text-blue-700">Vacíos: {row.empty_count}</p>
                <p className="text-xs font-bold text-emerald-700">Llenos: {row.full_count}</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
          )) : (
            <div className="p-10 text-center text-sm text-slate-400">Sin movimientos registrados.</div>
          )}
        </div>
      </div>
    </div>
  );
};

