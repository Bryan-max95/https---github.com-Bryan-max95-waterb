'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Plus, Search, Filter, Calendar, DollarSign } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'maintenance',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
  });

  const fetchExpenses = async () => {
    try {
      const data = await api.get('/api/expenses');
      setExpenses(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/api/expenses', {
        ...newExpense,
        amount: parseFloat(newExpense.amount),
      });
      setIsModalOpen(false);
      setNewExpense({
        category: 'maintenance',
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
      });
      fetchExpenses();
    } catch (err) {
      console.error(err);
      alert('Error al guardar gasto');
    }
  };

  const categories = [
    { id: 'maintenance', label: 'Mantenimiento', color: 'bg-blue-100 text-blue-600' },
    { id: 'fuel', label: 'Combustible', color: 'bg-amber-100 text-amber-600' },
    { id: 'supplies', label: 'Insumos', color: 'bg-emerald-100 text-emerald-600' },
    { id: 'payroll', label: 'Nómina', color: 'bg-purple-100 text-purple-600' },
    { id: 'services', label: 'Servicios', color: 'bg-rose-100 text-rose-600' },
    { id: 'other', label: 'Otros', color: 'bg-slate-100 text-slate-600' },
  ];

  const getCategoryTotal = (catId: string) => {
    return expenses
      .filter(e => e.category === catId)
      .reduce((acc, e) => acc + Number(e.amount), 0);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Gastos</h1>
          <p className="text-slate-500 text-sm">Control de egresos operativos y mantenimiento</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Registrar Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 col-span-1">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Resumen por Categoría</h3>
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className={cn("h-2 w-2 rounded-full mr-3", cat.color.split(' ')[0])}></div>
                  <span className="text-xs font-medium text-slate-600">{cat.label}</span>
                </div>
                <span className="text-xs font-bold text-slate-900">L. {getCategoryTotal(cat.id).toLocaleString()}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 col-span-2 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar gasto..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"
              />
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600">
              <Filter className="h-5 w-5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                  <th className="px-6 py-4">Fecha</th>
                  <th className="px-6 py-4">Categoría</th>
                  <th className="px-6 py-4">Descripción</th>
                  <th className="px-6 py-4 text-right">Monto</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.length > 0 ? expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 text-xs font-medium text-slate-600">
                      {format(new Date(expense.date), 'dd MMM, yyyy', { locale: es })}
                    </td>
                    <td className="px-6 py-4">
                      <span className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        categories.find(c => c.id === expense.category)?.color
                      )}>
                        {categories.find(c => c.id === expense.category)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-900 max-w-[200px] truncate">
                      {expense.description}
                    </td>
                    <td className="px-6 py-4 text-right text-sm font-black text-rose-600">
                      L. {Number(expense.amount).toLocaleString()}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No hay gastos registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Registrar Gasto</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleAddExpense} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                <select 
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto (L.)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    required
                    type="number" 
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    required
                    type="date" 
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({...newExpense, date: e.target.value})}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea 
                  required
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                  placeholder="Ej: Cambio de aceite camión placa ABC-123"
                ></textarea>
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
                  Guardar Gasto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

