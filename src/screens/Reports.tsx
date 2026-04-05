'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { FileText, Download, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import { cn } from '../lib/utils';

export const Reports: React.FC = () => {
  const [summary, setSummary] = useState({
    revenue: 0,
    expenses: 0,
    profit: 0
  });

  const fetchSummary = async () => {
    try {
      const [sales, expenses] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/expenses')
      ]);

      const totalRevenue = sales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0);
      const totalExpenses = expenses.reduce((acc: number, e: any) => acc + Number(e.amount), 0);

      setSummary({
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const reportTypes = [
    { name: 'Ventas Diarias', desc: 'Resumen detallado de transacciones por día', icon: DollarSign, color: 'bg-blue-500' },
    { name: 'Cierre por Vendedor', desc: 'Desempeño individual y arqueos de caja', icon: Users, color: 'bg-emerald-500' },
    { name: 'Estado de Inventario', desc: 'Stock actual en planta y en ruta', icon: Package, color: 'bg-amber-500' },
    { name: 'Reporte de Gastos', desc: 'Egresos operativos y mantenimiento', icon: FileText, color: 'bg-rose-500' },
    { name: 'Utilidad Neta', desc: 'Estado de resultados mensual (P&L)', icon: TrendingUp, color: 'bg-purple-500' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reportes e Indicadores</h1>
        <p className="text-slate-500 text-sm">Generación de documentos y análisis de datos</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report) => (
          <div key={report.name} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-6">
              <div className={cn("p-3 rounded-xl text-white shadow-lg", report.color)}>
                <report.icon className="h-6 w-6" />
              </div>
              <button className="p-2 bg-slate-50 text-slate-400 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors">
                <Download className="h-5 w-5" />
              </button>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{report.name}</h3>
            <p className="text-xs text-slate-500 mb-6">{report.desc}</p>
            <div className="flex gap-2">
              <button className="flex-1 py-2 text-xs font-bold text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                Ver Vista Previa
              </button>
              <button className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                Generar PDF
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-blue-950 text-white p-8 rounded-3xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <TrendingUp className="h-48 w-48" />
        </div>
        <div className="relative z-10">
          <h2 className="text-2xl font-bold mb-2">Resumen Ejecutivo Mensual</h2>
          <p className="text-blue-300 text-sm mb-8">Consolidado de ingresos y egresos del mes en curso.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Ingresos Totales</p>
              <p className="text-3xl font-black">L. {summary.revenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Gastos Operativos</p>
              <p className="text-3xl font-black">L. {summary.expenses.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest mb-1">Utilidad Neta</p>
              <p className="text-3xl font-black text-emerald-400">L. {summary.profit.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

