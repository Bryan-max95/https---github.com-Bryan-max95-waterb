'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Calendar, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../lib/utils';

export const Closures: React.FC = () => {
  const [closures, setClosures] = useState<any[]>([]);
  const [filterDate, setFilterDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchClosures = async () => {
    try {
      const data = await api.get('/api/closures');
      const filtered = data.filter((c: any) => (c.local_date || c.date?.slice?.(0, 10)) === filterDate);
      setClosures(filtered);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchClosures();
  }, [filterDate]);

  const handleConfirmReceived = async (closure: any) => {
    const sold = Number(closure.sold_bottles || 0);
    const fullDeclared = Number(closure.returned_full_declared || 0);

    try {
      setProcessingId(closure.id);
      await api.put(`/api/closures/${closure.id}`, {
        confirmReceived: true,
        returnedEmptyReceived: sold,
        returnedFullReceived: fullDeclared,
        soldBottles: sold,
        soldCompleteConfirmed: true,
      });
      fetchClosures();
    } catch (err: any) {
      console.error(err);
      alert(err?.message || 'No se pudo confirmar el cierre');
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Cierres de Caja</h1>
          <p className="text-slate-500 text-sm">Verificación de efectivo y botellones por vendedor</p>
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
        {closures.length > 0 ? closures.map((closure) => {
          const sold = Number(closure.sold_bottles || 0);

          return (
            <div key={closure.id} className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="p-6 flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center">
                    <div className="h-12 w-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                      {closure.seller_name?.[0]}
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-bold text-slate-900">{closure.seller_name}</h3>
                      <p className="text-xs text-slate-500">
                        {format(new Date(closure.timestamp), 'HH:mm')} - {(closure.local_date || closure.date || '').toString().slice(0, 10)}
                      </p>
                    </div>
                  </div>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                    closure.admin_confirmed ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {closure.admin_confirmed ? 'Confirmado' : 'Pendiente'}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Llevó Inicial</p>
                    <p className="text-lg font-black text-blue-900">{Number(closure.loaded_initial || 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recargó</p>
                    <p className="text-lg font-black text-blue-900">{Number(closure.loaded_reload || 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Vendió</p>
                    <p className="text-lg font-black text-blue-700">{sold}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Vacíos Esperados</p>
                    <p className="text-lg font-black text-emerald-700">{sold}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Esperado Efectivo</p>
                    <p className="text-lg font-black text-slate-900">L. {Number(closure.expected_cash || 0).toLocaleString()}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Declarado Efectivo</p>
                    <p className="text-lg font-black text-slate-900">L. {Number(closure.declared_cash || 0).toLocaleString()}</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Despachos en Corte</p>
                  <p className="text-lg font-black text-slate-900">{Number(closure.dispatch_count || 0)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Chequeo Vacíos</p>
                    <p className="text-lg font-black text-blue-700">{Number(closure.checkin_empty_total || 0)}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Chequeo Llenos</p>
                    <p className="text-lg font-black text-emerald-700">{Number(closure.checkin_full_total || 0)}</p>
                  </div>
                </div>

                {!closure.admin_confirmed && (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Verificación del Chequeador</p>

                    <button
                      onClick={() => handleConfirmReceived(closure)}
                      disabled={processingId === closure.id}
                      className="px-4 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      {processingId === closure.id ? 'Confirmando...' : 'Confirmar Recibido'}
                    </button>
                  </div>
                )}

                {closure.admin_confirmed && (
                  <div className="px-4 py-3 bg-emerald-50 border border-emerald-100 rounded-xl">
                    <p className="text-xs text-emerald-700 font-medium">
                      Confirmado por: {closure.admin_name || 'Administrador'} {closure.admin_confirmed_at ? `| ${format(new Date(closure.admin_confirmed_at), 'dd/MM/yyyy HH:mm')}` : ''}
                    </p>
                    <p className="text-xs text-emerald-700 font-bold mt-1">
                      Recibido: Vacíos {Number(closure.returned_empty_received || closure.sold_bottles || 0)} | Llenos {Number(closure.returned_full_received || closure.returned_full_declared || 0)}
                    </p>
                  </div>
                )}
              </div>
            </div>
          );
        }) : (
          <div className="bg-white p-12 rounded-2xl shadow-sm border border-slate-100 text-center text-slate-400 text-sm">
            No hay cierres registrados para esta fecha.
          </div>
        )}
      </div>
    </div>
  );
};
