'use client';

import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  LogOut,
  Menu,
  X,
  Truck,
  ShoppingBag,
  FileText,
  Settings,
  UserCircle,
  History,
  Wrench,
  Package
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';

export const Layout: React.FC = () => {
  const { profile, isAdmin, isIT, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const isManagement = isAdmin || isIT;

  const navItems = isManagement ? [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Vendedores', path: '/sellers', icon: Users },
    { name: 'Productos', path: '/products', icon: ShoppingBag },
    { name: 'Despachos', path: '/dispatches', icon: Truck },
    { name: 'Ventas', path: '/sales', icon: Package },
    { name: 'Cierre de Caja', path: '/closures', icon: History },
    { name: 'Clientes', path: '/customers', icon: UserCircle },
    { name: 'Gastos', path: '/expenses', icon: CreditCard },
    { name: 'Mantenimiento', path: '/maintenance', icon: Wrench },
    { name: 'Reportes', path: '/reports', icon: FileText },
    { name: 'Configuración', path: '/settings', icon: Settings },
  ] : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-blue-50/30 flex">
      {isManagement && (
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-72 bg-blue-950 text-white transform transition-transform duration-200 md:translate-x-0 md:relative",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          <div className="h-full flex flex-col">
            <div className="p-6 border-b border-blue-900/70 flex items-start justify-between">
              <div>
                <p className="text-xl font-black tracking-tight">BWP WATER</p>
                <p className="text-[10px] text-blue-300 uppercase tracking-[0.2em] font-bold mt-1">Business Platform</p>
              </div>
              <button onClick={() => setIsMobileMenuOpen(false)} className="md:hidden text-blue-200 hover:text-white">
                <X className="h-6 w-6" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={cn(
                    "flex items-center px-4 py-3 rounded-xl text-sm font-bold transition-all",
                    location.pathname === item.path
                      ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40"
                      : "text-blue-100 hover:bg-blue-900/70"
                  )}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              ))}
            </nav>

            <div className="p-5 border-t border-blue-900/70">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-xl bg-blue-700 flex items-center justify-center text-xs font-black">
                  {profile?.name?.[0]}
                </div>
                <div className="ml-3 overflow-hidden">
                  <p className="text-sm font-bold truncate">{profile?.name}</p>
                  <p className="text-[10px] text-blue-300 uppercase font-bold tracking-widest truncate">{profile?.role}</p>
                </div>
              </div>
              <button
                onClick={logout}
                className="w-full flex items-center justify-center px-4 py-2 text-sm font-bold rounded-xl bg-blue-900/70 hover:bg-blue-800 transition-colors"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar Sesión
              </button>
            </div>
          </div>
        </aside>
      )}

      <main className="flex-1 min-w-0">
        {isManagement && (
          <header className="md:hidden sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200 px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-base font-black text-blue-950">BWP WATER</p>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Panel Empresarial</p>
            </div>
            <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-lg bg-slate-100 text-slate-700">
              <Menu className="h-5 w-5" />
            </button>
          </header>
        )}

        <div className="p-4 md:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
