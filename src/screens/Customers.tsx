'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Search, Phone, MapPin, Edit2, Plus } from 'lucide-react';
import { cn } from '../lib/utils';

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'regular',
    balance: '0'
  });

  const fetchCustomers = async () => {
    try {
      const data = await api.get('/api/customers');
      setCustomers(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      balance: parseFloat(formData.balance)
    };

    try {
      if (editingCustomer) {
        await api.put(`/api/customers/${editingCustomer.id}`, data);
      } else {
        await api.post('/api/customers', data);
      }
      setIsModalOpen(false);
      setEditingCustomer(null);
      setFormData({ name: '', phone: '', address: '', type: 'regular', balance: '0' });
      fetchCustomers();
    } catch (err) {
      console.error(err);
      alert('Error al guardar cliente');
    }
  };

  const handleEdit = (customer: any) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name,
      phone: customer.phone || '',
      address: customer.address || '',
      type: customer.type || 'regular',
      balance: customer.balance?.toString() || '0'
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Clientes</h1>
          <p className="text-slate-500 text-sm">Base de datos y control de créditos</p>
        </div>
        <button 
          onClick={() => {
            setEditingCustomer(null);
            setFormData({ name: '', phone: '', address: '', type: 'regular', balance: '0' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente por nombre o teléfono..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">#</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Contacto</th>
                <th className="px-6 py-4">Tipo</th>
                <th className="px-6 py-4">Saldo Pendiente</th>
                <th className="px-6 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {customers.map((customer, idx) => (
                <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-black text-slate-500">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                        {customer.name?.[0]}
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-bold text-slate-900">{customer.name}</p>
                        <div className="flex items-center text-[10px] text-slate-400">
                          <MapPin className="h-3 w-3 mr-1" />
                          {customer.address || 'Sin dirección'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center text-sm text-slate-600">
                      <Phone className="h-4 w-4 mr-2 text-slate-400" />
                      {customer.phone || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      customer.type === 'frequent' ? "bg-emerald-50 text-emerald-600" : 
                      customer.type === 'credit' ? "bg-amber-50 text-amber-600" : "bg-slate-50 text-slate-600"
                    )}>
                      {customer.type === 'frequent' ? 'Frecuente' : customer.type === 'credit' ? 'Crédito' : 'Regular'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <p className={cn(
                      "text-sm font-black",
                      Number(customer.balance) > 0 ? "text-rose-600" : "text-slate-900"
                    )}>
                      L. {Number(customer.balance).toLocaleString()}
                    </p>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(customer)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit2 className="h-4 w-4" />
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
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Teléfono</label>
                <input 
                  type="text" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección</label>
                <input 
                  type="text" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo</label>
                  <select 
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="frequent">Frecuente</option>
                    <option value="credit">Crédito</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Saldo Inicial</label>
                  <input 
                    type="number" 
                    value={formData.balance}
                    onChange={(e) => setFormData({...formData, balance: e.target.value})}
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
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  {editingCustomer ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

