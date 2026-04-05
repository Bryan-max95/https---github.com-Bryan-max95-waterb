'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Package, History, Droplets, RefreshCw } from 'lucide-react';
import { cn } from '../lib/utils';

export const Inventory: React.FC = () => {
  const [inventory, setInventory] = useState<any>({
    plant_stock: 0,
    in_route: 0,
    sold: 0,
    returned: 0,
    in_process: 0
  });
  const [loading, setLoading] = useState(false);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'production' | 'return'>('production');

  const fetchInventory = async () => {
    try {
      const data = await api.get('/api/inventory');
      setInventory(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjust = async () => {
    if (adjustQty <= 0) return;
    setLoading(true);
    try {
      await api.post('/api/inventory/adjust', {
        type: adjustType,
        quantity: adjustQty
      });
      setAdjustQty(0);
      fetchInventory();
    } catch (err) {
      console.error(err);
      alert('Error al ajustar inventario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Control de Inventario</h1>
        <p className="text-slate-500 text-sm">Gestión de botellones en planta y producción</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-600">
              <Package className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Stock en Planta</h3>
          <p className="text-3xl font-black text-slate-900">{inventory.plant_stock} <span className="text-xs font-normal text-slate-400 uppercase">unid.</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-amber-600">
              <RefreshCw className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">En Producción</h3>
          <p className="text-3xl font-black text-slate-900">{inventory.in_process} <span className="text-xs font-normal text-slate-400 uppercase">unid.</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-600">
              <Droplets className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Total Vendidos</h3>
          <p className="text-3xl font-black text-slate-900">{inventory.sold} <span className="text-xs font-normal text-slate-400 uppercase">unid.</span></p>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-slate-600">
              <History className="h-6 w-6 text-white" />
            </div>
          </div>
          <h3 className="text-slate-500 text-sm font-medium mb-1">Vacíos Recibidos</h3>
          <p className="text-3xl font-black text-slate-900">{inventory.returned} <span className="text-xs font-normal text-slate-400 uppercase">unid.</span></p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Ajuste de Inventario</h2>
          <div className="space-y-6">
            <div className="flex p-1 bg-slate-100 rounded-xl">
              <button 
                onClick={() => setAdjustType('production')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                  adjustType === 'production' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                Ingreso Producción
              </button>
              <button 
                onClick={() => setAdjustType('return')}
                className={cn(
                  "flex-1 py-3 text-sm font-bold rounded-lg transition-all",
                  adjustType === 'return' ? "bg-white text-blue-600 shadow-sm" : "text-slate-500"
                )}
              >
                Ingreso de Vacíos
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Cantidad de Botellones</label>
              <input 
                type="number" 
                value={adjustQty}
                onChange={(e) => setAdjustQty(parseInt(e.target.value) || 0)}
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl text-2xl font-black text-blue-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button 
              onClick={handleAdjust}
              disabled={loading || adjustQty <= 0}
              className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Procesando...' : 'Confirmar Ajuste'}
            </button>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Tipos de Productos</h2>
          <div className="space-y-4">
            {[
              { name: 'Botellón 20 Litros', price: 'L. 40.00', desc: 'Estándar de mercado' },
              { name: 'Botellón 18.9 Litros', price: 'L. 38.00', desc: 'Formato americano' },
              { name: 'Botellón 5 Litros', price: 'L. 15.00', desc: 'Familiar pequeño' },
              { name: 'Bolsas de Agua', price: 'L. 2.00', desc: 'Unidades empaquetadas' },
            ].map((item) => (
              <div key={item.name} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <p className="text-sm font-bold text-slate-900">{item.name}</p>
                  <p className="text-xs text-slate-500">{item.desc}</p>
                </div>
                <p className="text-sm font-black text-blue-600">{item.price}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

