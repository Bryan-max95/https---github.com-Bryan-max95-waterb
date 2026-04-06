'use client';

import React, { useMemo, useState } from 'react';
import { api } from '../lib/api';
import { Calendar, Download, FileBarChart2, Search } from 'lucide-react';
import { format } from 'date-fns';

type ReportType =
  | 'closures'
  | 'sales_by_seller'
  | 'daily_expenses'
  | 'maintenance_history'
  | 'inventory_current'
  | 'debt_customers'
  | 'seller_ranking_month';

const REPORT_OPTIONS: Array<{ id: ReportType; name: string; desc: string }> = [
  { id: 'closures', name: 'Cierre de caja', desc: 'Ventas, gastos y faltantes por cierre' },
  { id: 'sales_by_seller', name: 'Ventas por vendedor', desc: 'Totales por vendedor en rango' },
  { id: 'daily_expenses', name: 'Gastos del día/rango', desc: 'Todos los gastos y quién los registró' },
  { id: 'maintenance_history', name: 'Historial mantenimiento', desc: 'Servicios realizados y próximos' },
  { id: 'inventory_current', name: 'Inventario actual', desc: 'Llenos, vacíos, en ruta y en proceso' },
  { id: 'debt_customers', name: 'Clientes con deuda', desc: 'Clientes con balance pendiente' },
  { id: 'seller_ranking_month', name: 'Ranking de vendedores', desc: 'Quién vendió más en el mes' },
];

export const Reports: React.FC = () => {
  const [type, setType] = useState<ReportType>('closures');
  const [start, setStart] = useState(format(new Date(), 'yyyy-MM-01'));
  const [end, setEnd] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<any[]>([]);

  const fetchReport = async () => {
    setLoading(true);
    setError('');
    try {
      const query = `/api/reports?type=${type}&start=${start}&end=${end}`;
      const data = await api.get(query);
      const normalized = Array.isArray(data) ? data : data ? [data] : [];
      setRows(normalized);
    } catch (err: any) {
      setError(err?.message || 'No se pudo generar el reporte.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const headers = useMemo(() => {
    if (rows.length === 0) return [] as string[];
    return Object.keys(rows[0]);
  }, [rows]);

  const downloadAsPdf = () => {
    if (!rows.length) return;
    const title = REPORT_OPTIONS.find((r) => r.id === type)?.name || 'Reporte';
    const headerHtml = headers.map((h) => `<th style="padding:8px;border:1px solid #ddd;text-align:left;">${h}</th>`).join('');
    const bodyHtml = rows
      .map(
        (r) =>
          `<tr>${headers
            .map((h) => `<td style="padding:8px;border:1px solid #ddd;">${String(r[h] ?? '')}</td>`)
            .join('')}</tr>`
      )
      .join('');

    const html = `
      <html>
        <head><title>${title}</title></head>
        <body style="font-family:Arial,sans-serif;padding:24px;">
          <h2>${title}</h2>
          <p>Rango: ${start} a ${end}</p>
          <table style="border-collapse:collapse;width:100%;">
            <thead><tr>${headerHtml}</tr></thead>
            <tbody>${bodyHtml}</tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reportes Operativos</h1>
        <p className="text-slate-500 text-sm">Consultas empresariales por rango de fechas con exportación a PDF</p>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <select
            value={type}
            onChange={(e) => setType(e.target.value as ReportType)}
            className="md:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
          >
            {REPORT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.name}
              </option>
            ))}
          </select>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full pl-10 pr-3 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={fetchReport}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60 flex items-center gap-2"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Consultando...' : 'Generar Reporte'}
          </button>
          <button
            onClick={downloadAsPdf}
            disabled={rows.length === 0}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-black disabled:opacity-60 flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar PDF
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          {REPORT_OPTIONS.find((o) => o.id === type)?.desc}
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-700 text-sm font-medium">{error}</div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <FileBarChart2 className="h-4 w-4 text-blue-600" />
            Vista Previa
          </h2>
          <span className="text-xs text-slate-500">{rows.length} fila(s)</span>
        </div>
        <div className="overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-slate-500 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100">
                  {headers.map((h) => (
                    <th key={h} className="px-6 py-4">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((r, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                    {headers.map((h) => (
                      <td key={h} className="px-6 py-4 text-sm text-slate-700">
                        {String(r[h] ?? 'N/A')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">Genera un reporte para ver resultados.</div>
          )}
        </div>
      </div>
    </div>
  );
};

