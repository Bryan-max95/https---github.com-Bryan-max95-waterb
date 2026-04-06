'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Calendar, FileText, Plus, Receipt, Search, Wallet } from 'lucide-react';
import { format } from 'date-fns';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [query, setQuery] = useState('');
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    description: '',
    receiptNumber: '',
    occurredAt: `${format(new Date(), 'yyyy-MM-dd')}T${format(new Date(), 'HH:mm')}`,
  });

  const fetchExpenses = async () => {
    try {
      const data = await api.get('/api/expenses');
      setExpenses(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return expenses.filter((e: any) => {
      const byDate = (e.local_date || e.date || '').slice(0, 10) === filterDate;
      if (!byDate) return false;
      if (!q) return true;
      return (
        String(e.description || '').toLowerCase().includes(q) ||
        String(e.user_name || '').toLowerCase().includes(q) ||
        String(e.receipt_number || '').toLowerCase().includes(q)
      );
    });
  }, [expenses, query, filterDate]);

  const totals = useMemo(() => {
    const total = filtered.reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const sellers = filtered
      .filter((e: any) => e.user_role === 'seller')
      .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
    const admin = total - sellers;
    return { total, sellers, admin, count: filtered.length };
  }, [filtered]);

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/api/expenses', {
        amount: Number(newExpense.amount || 0),
        description: newExpense.description.trim(),
        receiptNumber: newExpense.receiptNumber.trim() || null,
        occurredAt: newExpense.occurredAt,
      });
      setIsModalOpen(false);
      setNewExpense({
        amount: '',
        description: '',
        receiptNumber: '',
        occurredAt: `${format(new Date(), 'yyyy-MM-dd')}T${format(new Date(), 'HH:mm')}`,
      });
      fetchExpenses();
    } catch (err: any) {
      setError(err?.message || 'No se pudo registrar el gasto.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control de Gastos</h1>
          <p className="text-slate-500 text-sm">Registro financiero operativo por usuario, fecha y comprobante</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Gasto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total del Día</p>
          <p className="text-2xl font-black text-slate-900">L. {totals.total.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 shadow-sm">
          <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Gastos Vendedores</p>
          <p className="text-2xl font-black text-blue-700">L. {totals.sellers.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-sm">
          <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Gastos IT/Admin</p>
          <p className="text-2xl font-black text-emerald-700">L. {totals.admin.toLocaleString()}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Registros</p>
          <p className="text-2xl font-black text-slate-900">{totals.count}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar por descripción, usuario o recibo..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Fecha/Hora</th>
                <th className="px-6 py-4">Registró</th>
                <th className="px-6 py-4">Descripción</th>
                <th className="px-6 py-4">Recibo</th>
                <th className="px-6 py-4 text-right">Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? filtered.map((expense: any) => (
                <tr key={expense.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">
                    {format(new Date(expense.timestamp), 'dd/MM/yyyy HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-bold text-slate-900">{expense.user_name || 'N/A'}</p>
                    <p className="text-[10px] text-slate-500 uppercase">{expense.user_role || 'N/A'}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-800">{expense.description}</td>
                  <td className="px-6 py-4 text-xs text-slate-600">{expense.receipt_number || 'N/A'}</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-rose-600">L. {Number(expense.amount || 0).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No hay gastos para este filtro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">Registrar Gasto Operativo</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleCreateExpense} className="p-6 space-y-4">
              {error && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">
                  {error}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Monto (L.)</label>
                  <div className="relative">
                    <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      required
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={newExpense.amount}
                      onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha y Hora</label>
                  <input
                    required
                    type="datetime-local"
                    value={newExpense.occurredAt}
                    onChange={(e) => setNewExpense({ ...newExpense, occurredAt: e.target.value })}
                    className="w-full px-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <div className="relative">
                  <FileText className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <textarea
                    required
                    rows={3}
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    placeholder="Ej: combustible, comida, llanta, repuesto..."
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Número de Recibo (Opcional)</label>
                <div className="relative">
                  <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={newExpense.receiptNumber}
                    onChange={(e) => setNewExpense({ ...newExpense, receiptNumber: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej: REC-5488"
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
                  disabled={saving}
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50"
                >
                  {saving ? 'Guardando...' : 'Guardar Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

