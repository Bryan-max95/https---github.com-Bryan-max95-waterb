'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Wrench, Plus, Calendar, AlertTriangle, CheckCircle2, Search, MoreVertical } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

export const Maintenance: React.FC = () => {
  const [maintenance, setMaintenance] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newMaint, setNewMaint] = useState({
    type: 'Planta Purificadora',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    nextMaintenance: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchMaintenance = async () => {
    try {
      const data = await api.get('/api/maintenance');
      setMaintenance(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchMaintenance();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/maintenance', newMaint);
      setIsModalOpen(false);
      setNewMaint({
        type: 'Planta Purificadora',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        nextMaintenance: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchMaintenance();
    } catch (err) {
      console.error(err);
      alert('Error al registrar mantenimiento');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mantenimiento Preventivo</h1>
          <p className="text-slate-500 text-sm">Gestión de equipos y maquinaria</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Registro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            <Wrench className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Registros</p>
            <p className="text-2xl font-black text-slate-900">{maintenance.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-rose-50 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-rose-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Vencidos / Hoy</p>
            <p className="text-2xl font-black text-slate-900">
              {maintenance.filter(m => new Date(m.next_maintenance) <= new Date()).length}
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Al Día</p>
            <p className="text-2xl font-black text-slate-900">
              {maintenance.filter(m => new Date(m.next_maintenance) > new Date()).length}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar mantenimiento..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Equipo / Tipo</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Último</th>
                <th className="px-6 py-4">Próximo</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{m.type}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{m.description}</p>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-xs text-slate-600">
                      <Calendar className="h-3 w-3 mr-1 text-slate-400" />
                      {format(new Date(m.date), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-xs font-bold text-slate-900">
                      <Calendar className="h-3 w-3 mr-1 text-blue-600" />
                      {format(new Date(m.next_maintenance), 'dd/MM/yyyy')}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      new Date(m.next_maintenance) <= new Date() ? "bg-rose-50 text-rose-600" : "bg-emerald-50 text-emerald-600"
                    )}>
                      {new Date(m.next_maintenance) <= new Date() ? 'Vencido' : 'Al día'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                      <MoreVertical className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
              {maintenance.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm italic">
                    No hay registros de mantenimiento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Registro</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Equipo</label>
                <select 
                  value={newMaint.type}
                  onChange={(e) => setNewMaint({...newMaint, type: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option>Planta Purificadora</option>
                  <option>Vehículo de Reparto</option>
                  <option>Maquinaria de Llenado</option>
                  <option>Sistema de Filtrado</option>
                  <option>Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción del Trabajo</label>
                <textarea 
                  required
                  value={newMaint.description}
                  onChange={(e) => setNewMaint({...newMaint, description: e.target.value})}
                  placeholder="Detalle el mantenimiento realizado..."
                  rows={3}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha Realizado</label>
                  <input 
                    required
                    type="date" 
                    value={newMaint.date}
                    onChange={(e) => setNewMaint({...newMaint, date: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Próxima Fecha</label>
                  <input 
                    required
                    type="date" 
                    value={newMaint.nextMaintenance}
                    onChange={(e) => setNewMaint({...newMaint, nextMaintenance: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
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
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
                >
                  {loading ? 'Guardando...' : 'Guardar Registro'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

