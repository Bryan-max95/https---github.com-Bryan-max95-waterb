'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../lib/api';
import { Calendar, DollarSign, Droplet, Users } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const Sales: React.FC = () => {
  const [allSales, setAllSales] = useState<any[]>([]);
  const [sellers, setSellers] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedSellerId, setSelectedSellerId] = useState<string>('all');

  const fetchSales = async () => {
    try {
      const [salesData, usersData] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/users'),
      ]);
      setAllSales(salesData);
      setSellers(usersData.filter((u: any) => u.role === 'seller'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    return allSales.filter((s: any) => {
      const byDate = (s.local_date || format(new Date(s.timestamp), 'yyyy-MM-dd')) === filterDate;
      const bySeller = selectedSellerId === 'all' || String(s.seller_id) === selectedSellerId;
      return byDate && bySeller;
    });
  }, [allSales, filterDate, selectedSellerId]);

  const sellerSummary = useMemo(() => {
    const map = new Map<string, { sellerName: string; sales: number; bottles: number; revenue: number }>();
    filteredSales.forEach((sale) => {
      const key = String(sale.seller_id);
      const current = map.get(key) || {
        sellerName: sale.seller_name || 'Sin nombre',
        sales: 0,
        bottles: 0,
        revenue: 0,
      };
      current.sales += 1;
      current.bottles += Number(sale.quantity || 0);
      current.revenue += Number(sale.total_amount || 0);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([sellerId, data]) => ({ sellerId, ...data }));
  }, [filteredSales]);

  const totalBottles = filteredSales.reduce((acc, s) => acc + (s.quantity || 0), 0);
  const totalRevenue = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Ventas por Vendedor</h1>
          <p className="text-slate-500 text-sm">Filtre por día y revise ventas de cada vendedor con sus clientes</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            />
          </div>
          <select
            value={selectedSellerId}
            onChange={(e) => setSelectedSellerId(e.target.value)}
            className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="all">Todos los vendedores</option>
            {sellers.map((s: any) => (
              <option key={s.id} value={String(s.id)}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600 mr-4">
            <Droplet className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Botellones</p>
            <p className="text-2xl font-black text-slate-900">{totalBottles}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 mr-4">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Ingresos</p>
            <p className="text-2xl font-black text-slate-900">L. {totalRevenue.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600 mr-4">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendedores con Ventas</p>
            <p className="text-2xl font-black text-slate-900">{sellerSummary.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="text-sm font-bold text-slate-900">Resumen por Vendedor</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {sellerSummary.length > 0 ? sellerSummary.map((item) => (
            <div key={item.sellerId} className="px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <p className="text-sm font-bold text-slate-900">{item.sellerName}</p>
              <div className="flex items-center gap-4 text-xs">
                <span className="font-bold text-slate-600">{item.sales} ventas</span>
                <span className="font-bold text-blue-700">{item.bottles} bot.</span>
                <span className="font-black text-emerald-700">L. {item.revenue.toLocaleString()}</span>
              </div>
            </div>
          )) : (
            <div className="px-6 py-10 text-center text-slate-400 text-sm">No hay ventas para este filtro.</div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                <th className="px-6 py-4">Hora</th>
                <th className="px-6 py-4">Correlativa</th>
                <th className="px-6 py-4">Vendedor</th>
                <th className="px-6 py-4">Cliente</th>
                <th className="px-6 py-4">Pago</th>
                <th className="px-6 py-4">Cantidad</th>
                <th className="px-6 py-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSales.length > 0 ? filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-xs font-medium text-slate-600">{format(new Date(sale.local_timestamp || sale.timestamp), 'HH:mm')}</td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{sale.correlative}</span>
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-slate-900">{sale.seller_name}</td>
                  <td className="px-6 py-4 text-sm text-slate-600">{sale.customer_name || 'N/A'}</td>
                  <td className="px-6 py-4">
                    <span
                      className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                        sale.payment_type === 'cash'
                          ? "bg-emerald-50 text-emerald-600"
                          : sale.payment_type === 'transfer'
                            ? "bg-blue-50 text-blue-600"
                            : "bg-amber-50 text-amber-600"
                      )}
                    >
                      {sale.payment_type === 'cash' ? 'Efectivo' : sale.payment_type === 'transfer' ? 'Transf.' : 'Crédito'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-black text-slate-900">{sale.quantity} bot.</td>
                  <td className="px-6 py-4 text-right text-sm font-black text-slate-900">L. {Number(sale.total_amount).toLocaleString()}</td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    No hay ventas registradas para esta fecha y vendedor.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
