'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, MoreVertical, UserPlus, Phone, MapPin, Truck, Hash, Key, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export const Sellers: React.FC = () => {
  const [sellers, setSellers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newSeller, setNewSeller] = useState({
    name: '',
    email: '',
    role: 'seller',
    zone: '',
    vehicle: '',
    correlativeStart: 1,
    correlativeEnd: 500,
  });

  const fetchSellers = async () => {
    try {
      const data = await api.get('/api/users');
      setSellers(data.filter((u: any) => u.role === 'seller'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSellers();
  }, []);

  const handleAddSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api.post('/api/users', newSeller);
      alert(`Vendedor creado.\nID: ${data.id_number}\nContraseña Temporal: ${data.temp_password}`);
      setIsModalOpen(false);
      setNewSeller({
        name: '',
        email: '',
        role: 'seller',
        zone: '',
        vehicle: '',
        correlativeStart: 1,
        correlativeEnd: 500,
      });
      fetchSellers();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'Error al crear vendedor');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (id: number) => {
    if (!confirm('¿Está seguro de resetear la contraseña de este vendedor?')) return;
    try {
      const data = await api.post(`/api/users/${id}/reset-password`, {});
      alert(`Nueva Contraseña Temporal: ${data.tempPassword}`);
    } catch (err) {
      console.error(err);
      alert('Error al resetear contraseña');
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Vendedores</h1>
          <p className="text-slate-500 text-sm">Administre perfiles, rutas y correlativas</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <UserPlus className="h-4 w-4 mr-2" />
          Nuevo Vendedor
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre, zona o placa..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Zona / Vehículo</th>
                <th className="px-6 py-4">Correlativas</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sellers.map((seller) => (
                <tr key={seller.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
                        {seller.name?.[0]}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-slate-900">{seller.name}</p>
                        <p className="text-xs text-slate-500">ID: {seller.id_number}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="space-y-1">
                      <div className="flex items-center text-xs text-slate-600">
                        <MapPin className="h-3 w-3 mr-1 text-slate-400" />
                        {seller.zone || 'Sin zona'}
                      </div>
                      <div className="flex items-center text-xs text-slate-600">
                        <Truck className="h-3 w-3 mr-1 text-slate-400" />
                        {seller.vehicle || 'Sin vehículo'}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <div className="flex items-center text-xs font-bold text-slate-700">
                        <Hash className="h-3 w-3 mr-1 text-slate-400" />
                        {seller.current_correlative || 0} / {seller.correlative_end || 0}
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full" 
                          style={{ width: `${((seller.current_correlative || 0) / (seller.correlative_end || 1)) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      seller.status === 'active' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                    )}>
                      {seller.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleResetPassword(seller.id)}
                        className="p-2 hover:bg-blue-50 rounded-lg transition-colors text-blue-600"
                        title="Resetear Contraseña"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                      <button className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400">
                        <MoreVertical className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Nuevo Vendedor</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddSeller} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                  <input 
                    required
                    type="text" 
                    value={newSeller.name}
                    onChange={(e) => setNewSeller({...newSeller, name: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico (Opcional)</label>
                  <input 
                    type="email" 
                    value={newSeller.email}
                    onChange={(e) => setNewSeller({...newSeller, email: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Zona de Reparto</label>
                  <input 
                    type="text" 
                    value={newSeller.zone}
                    onChange={(e) => setNewSeller({...newSeller, zone: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Placa Vehículo</label>
                  <input 
                    type="text" 
                    value={newSeller.vehicle}
                    onChange={(e) => setNewSeller({...newSeller, vehicle: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Inicio Correlativa</label>
                  <input 
                    type="number" 
                    value={newSeller.correlativeStart}
                    onChange={(e) => setNewSeller({...newSeller, correlativeStart: Number(e.target.value || 0)})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fin Correlativa</label>
                  <input 
                    type="number" 
                    value={newSeller.correlativeEnd}
                    onChange={(e) => setNewSeller({...newSeller, correlativeEnd: Number(e.target.value || 0)})}
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
                  {loading ? 'Guardando...' : 'Guardar Vendedor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

