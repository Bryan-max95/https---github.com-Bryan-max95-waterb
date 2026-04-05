'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { cn } from '../lib/utils';

export const Closures: React.FC = () => {
  const [closures, setClosures] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchClosures = async () => {
    try {
      const data = await api.get('/api/closures');
      const selected = startOfDay(new Date(filterDate)).getTime();
      const filtered = data.filter((c: any) => {
        const byDateField = c.date ? startOfDay(new Date(c.date)).getTime() === selected : false;
        const byTimestamp = c.timestamp ? startOfDay(new Date(c.timestamp)).getTime() === selected : false;
        return byDateField || byTimestamp;
      });
      setClosures(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClosures();
  }, [filterDate]);

  const handleConfirmReceived = async (id: number) => {
    try {
      setProcessingId(id);
      await api.put(`/api/closures/${id}`, { confirmReceived: true });
      fetchClosures();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cierres de Caja</h1>
          <p className="text-slate-500 text-sm">Vea quién ya cerró caja y confirme que recibió ese cierre</p>
        </div>
        <div className="flex items-center gap-3">
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
      </div>

      <div className="grid grid-cols-1 gap-6">
        {closures.length > 0 ? closures.map((closure) => (
          <div key={closure.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center">
                <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                  {closure.seller_name?.[0]}
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-bold text-slate-900">{closure.seller_name}</h3>
                  <p className="text-xs text-slate-500">
                    {format(new Date(closure.timestamp), 'HH:mm')} - {closure.date}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-8 flex-1 max-w-2xl">
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Esperado</p>
                  <p className="text-sm font-bold text-slate-900">L. {Number(closure.expected_cash).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Declarado</p>
                  <p className="text-sm font-bold text-slate-900">L. {Number(closure.declared_cash).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Diferencia</p>
                  <p className={cn(
                    "text-sm font-black",
                    Number(closure.difference) === 0 ? "text-emerald-600" : "text-rose-600"
                  )}>
                    L. {Number(closure.difference).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Recepción</p>
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    closure.admin_confirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {closure.admin_confirmed ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleConfirmReceived(closure.id)}
                  disabled={closure.admin_confirmed || processingId === closure.id}
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  {closure.admin_confirmed ? 'Recibido' : processingId === closure.id ? 'Confirmando...' : 'Confirmar Recibido'}
                </button>
              </div>
            </div>
            {closure.admin_confirmed && (
              <div className="px-6 py-4 bg-emerald-50 border-t border-emerald-100">
                <p className="text-xs text-emerald-700 font-medium">
                  Confirmado por: {closure.admin_name || 'Administrador'} {closure.admin_confirmed_at ? `| ${format(new Date(closure.admin_confirmed_at), 'dd/MM/yyyy HH:mm')}` : ''}
                </p>
              </div>
            )}
            {closure.observations && (
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100">
                <p className="text-xs text-slate-500 italic">Observaciones: {closure.observations}</p>
              </div>
            )}
          </div>
        )) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
            No hay cierres registrados para esta fecha.
          </div>
        )}
      </div>
    </div>
  );
};
