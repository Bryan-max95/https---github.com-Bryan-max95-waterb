'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Truck, Plus, Search, CheckCircle2, Clock, Package } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

export const Dispatches: React.FC = () => {
  const [dispatches, setDispatches] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    sellerId: '',
    bottleCount: '',
    type: 'initial'
  });

  const fetchData = async () => {
    try {
      const [dispatchData, userData] = await Promise.all([
        api.get('/api/dispatches'),
        api.get('/api/users')
      ]);
      setDispatches(dispatchData);
      setSellers(userData.filter((u: any) => u.role === 'seller'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/dispatches', {
        seller_id: parseInt(formData.sellerId),
        quantity: parseInt(formData.bottleCount),
        type: formData.type
      });
      setIsModalOpen(false);
      setFormData({ sellerId: '', bottleCount: '', type: 'initial' });
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Error al registrar despacho');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Despachos</h1>
          <p className="text-slate-500 text-sm">Control de salida de botellones a ruta</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Despacho
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por vendedor o folio..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Fecha / Hora</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Cantidad</th>
                <th className="px-6 py-4">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dispatches.map((dispatch) => (
                <tr key={dispatch.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {format(new Date(dispatch.timestamp), 'dd MMM, HH:mm', { locale: es })}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xs font-bold">
                        {dispatch.seller_name?.[0]}
                      </div>
                      <span className="ml-3 text-sm font-bold text-slate-900">{dispatch.seller_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      (dispatch.type || 'reload') === 'initial' ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"
                    )}>
                      {(dispatch.type || 'reload') === 'initial' ? 'Inicial' : 'Recarga'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">
                    {dispatch.quantity} bot.
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-emerald-600 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirmado
                    </div>
                  </td>
                </tr>
              ))}
              {dispatches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No hay despachos registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Despacho</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Vendedor</label>
                <select 
                  required
                  value={formData.sellerId}
                  onChange={(e) => setFormData({...formData, sellerId: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccione un vendedor</option>
                  {sellers.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.id_number})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Cantidad de Botellones</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    required
                    type="number" 
                    value={formData.bottleCount}
                    onChange={(e) => setFormData({...formData, bottleCount: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Despacho</label>
                <div className="grid grid-cols-2 gap-2">
                  {(['initial', 'reload'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({...formData, type})}
                      className={cn(
                        "py-3 rounded-xl text-xs font-bold border transition-all uppercase tracking-widest",
                        formData.type === type 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                          : "bg-white border-slate-200 text-slate-600"
                      )}
                    >
                      {type === 'initial' ? 'Inicial' : 'Recarga'}
                    </button>
                  ))}
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
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  Confirmar Despacho
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

