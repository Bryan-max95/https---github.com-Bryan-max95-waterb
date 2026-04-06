'use client';

import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Users, 
  Package, 
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Droplet,
  DollarSign,
  Wrench,
  Calendar,
  ShieldCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { format, subDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color }: any) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col">
    <div className="flex items-center justify-between mb-4">
      <div className={cn("p-3 rounded-xl", color)}>
        <Icon className="h-6 w-6 text-white" />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center text-xs font-bold px-2 py-1 rounded-full",
          trend === 'up' ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
        )}>
          {trend === 'up' ? <ArrowUpRight className="h-3 w-3 mr-1" /> : <ArrowDownRight className="h-3 w-3 mr-1" />}
          {trendValue}%
        </div>
      )}
    </div>
    <h3 className="text-slate-500 text-sm font-medium mb-1">{title}</h3>
    <p className="text-2xl font-bold text-slate-900 tracking-tight">{value}</p>
  </div>
);

export const AdminDashboard: React.FC = () => {
  const { isIT } = useAuth();
  const [stats, setStats] = useState({
    dailySales: 0,
    dailyRevenue: 0,
    activeSellers: 0,
    alerts: 0,
  });
  const [chartData, setChartData] = useState<any[]>([]);
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [maintenance, setMaintenance] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const [sales, users, maint] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/users'),
        api.get('/api/maintenance')
      ]);

      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const todaySales = sales.filter((s: any) => (s.local_date || format(new Date(s.timestamp), 'yyyy-MM-dd')) === todayKey);
      
      setStats({
        dailySales: todaySales.reduce((acc: number, s: any) => acc + s.quantity, 0),
        dailyRevenue: todaySales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0),
        activeSellers: users.filter((u: any) => u.role === 'seller' && u.status === 'active').length,
        alerts: maint.filter((m: any) => new Date(m.next_maintenance) <= new Date()).length
      });

      setRecentSales(sales.slice(0, 5));
      setMaintenance(maint.slice(0, 3));

      // Generate chart data from real sales
      const last7Days = Array.from({ length: 7 }).map((_, i) => {
        const d = subDays(new Date(), 6 - i);
        const key = format(d, 'yyyy-MM-dd');
        const daySales = sales.filter((s: any) => (s.local_date || format(new Date(s.timestamp), 'yyyy-MM-dd')) === key);
        return {
          name: format(d, 'EEE', { locale: es }),
          sales: daySales.reduce((acc: number, s: any) => acc + s.quantity, 0),
          revenue: daySales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0),
        };
      });
      setChartData(last7Days);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {isIT ? 'Panel de Control IT' : 'Panel de Control Administrativo'}
          </h1>
          <p className="text-slate-500 text-sm">Resumen operativo en tiempo real</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm text-sm font-medium text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2 animate-pulse"></span>
            Sistema en Línea
          </div>
          {isIT && (
            <div className="flex items-center px-4 py-2 bg-blue-900 text-white rounded-lg shadow-sm text-xs font-bold uppercase tracking-widest">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Modo Superusuario
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard 
          title="Ventas del Día" 
          value={`${stats.dailySales} botellones`} 
          icon={Droplet} 
          trend="up" 
          trendValue={12} 
          color="bg-blue-600" 
        />
        <StatsCard 
          title="Ingresos Estimados" 
          value={`L. ${stats.dailyRevenue.toLocaleString()}`} 
          icon={DollarSign} 
          trend="up" 
          trendValue={8} 
          color="bg-emerald-600" 
        />
        <StatsCard 
          title="Vendedores en Ruta" 
          value={stats.activeSellers} 
          icon={Users} 
          color="bg-amber-600" 
        />
        <StatsCard 
          title="Alertas Mantenimiento" 
          value={stats.alerts} 
          icon={AlertTriangle} 
          color="bg-rose-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-lg font-bold text-slate-900">Tendencia de Ventas (7 días)</h2>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                  <span className="text-xs text-slate-500 font-medium">Ventas</span>
                </div>
              </div>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-slate-900">Próximos Mantenimientos</h2>
              <button className="text-xs font-bold text-blue-600 uppercase tracking-widest hover:underline">Gestionar</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {maintenance.map((m) => (
                <div key={m.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2 mb-2">
                    <Wrench className="h-4 w-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900 truncate">{m.type}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mb-3 line-clamp-2">{m.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-[10px] text-slate-400 font-bold">
                      <Calendar className="h-3 w-3 mr-1" />
                      {format(new Date(m.next_maintenance), 'dd MMM')}
                    </div>
                    <span className={cn(
                      "text-[8px] font-black uppercase px-1.5 py-0.5 rounded",
                      new Date(m.next_maintenance) <= new Date() ? "bg-rose-100 text-rose-600" : "bg-blue-100 text-blue-600"
                    )}>
                      {new Date(m.next_maintenance) <= new Date() ? 'Vencido' : 'Pendiente'}
                    </span>
                  </div>
                </div>
              ))}
              {maintenance.length === 0 && (
                <div className="col-span-3 py-8 text-center text-slate-400 text-xs italic">
                  No hay mantenimientos programados.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 h-fit">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Ventas Recientes</h2>
          <div className="space-y-6">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 font-bold">
                    {sale.seller_name?.[0]}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-bold text-slate-900">{sale.customer_name}</p>
                    <p className="text-xs text-slate-500">{format(new Date(sale.local_timestamp || sale.timestamp), 'HH:mm')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-900">{sale.quantity} bot.</p>
                  <p className="text-xs text-emerald-600 font-medium">L. {Number(sale.total_amount).toLocaleString()}</p>
                </div>
              </div>
            ))}
            {recentSales.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">No hay ventas registradas hoy.</p>
            )}
          </div>
          <button className="w-full mt-8 py-3 text-sm font-bold text-blue-600 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors">
            Ver Todas las Ventas
          </button>
        </div>
      </div>
    </div>
  );
};

