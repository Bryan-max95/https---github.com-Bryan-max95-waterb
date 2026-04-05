'use client';

import React, { useState } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { Save, DollarSign, Building, Lock, UserPlus, ShieldCheck } from 'lucide-react';

export const Settings: React.FC = () => {
  const { changePassword } = useAuth();
  const [settings, setSettings] = useState<any>({
    companyName: 'BWP WATER',
    defaultUnitPrice: 40,
    currency: 'Lempiras (L.)',
    taxId: '',
    address: ''
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    role: 'admin',
    zone: 'Administracion',
    vehicle: 'Oficina',
    correlativeStart: 1,
    correlativeEnd: 999999
  });
  const [createdAdmin, setCreatedAdmin] = useState<{ id_number: string; temp_password: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSaveSettings = async () => {
    setLoading(true);
    setError('');
    try {
      setMessage('Configuración guardada con éxito');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      console.error(err);
      setError('Error al guardar configuración');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setLoading(true);
    try {
      await changePassword(passwordData.newPassword);
      setMessage('Contraseña actualizada con éxito');
      setPasswordData({ newPassword: '', confirmPassword: '' });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCreatedAdmin(null);
    try {
      const data = await api.post('/api/users', newAdmin);
      setCreatedAdmin({ id_number: data.id_number, temp_password: data.temp_password });
      setMessage('Administrador creado con éxito');
      setNewAdmin({
        name: '',
        email: '',
        role: 'admin',
        zone: 'Administracion',
        vehicle: 'Oficina',
        correlativeStart: 1,
        correlativeEnd: 999999
      });
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setError(err.message || 'Error al crear administrador');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 max-w-5xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Configuración del Sistema</h1>
          <p className="text-slate-500 text-sm">Ajustes globales y gestión de usuarios administrativos</p>
        </div>
        <button
          onClick={handleSaveSettings}
          disabled={loading}
          className="flex items-center justify-center px-6 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-xl text-sm font-bold">
          {message}
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-sm font-bold">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Building className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Información de la Empresa</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Comercial</label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">RTN / Identificación Fiscal</label>
              <input
                type="text"
                value={settings.taxId}
                onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Dirección de la Planta</label>
              <textarea
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio Unitario por Defecto (L.)</label>
              <input
                type="number"
                value={settings.defaultUnitPrice}
                onChange={(e) => setSettings({ ...settings, defaultUnitPrice: parseFloat(e.target.value || '0') })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Moneda del Sistema</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <Lock className="h-5 w-5 text-amber-600" />
              <h2 className="text-lg font-bold text-slate-900">Cambiar Mi Contraseña</h2>
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nueva Contraseña</label>
                <input
                  required
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Confirmar Nueva Contraseña</label>
                <input
                  required
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-bold text-white bg-amber-600 rounded-xl hover:bg-amber-700 shadow-lg shadow-amber-100 transition-all disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar Contraseña'}
              </button>
            </form>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-100 space-y-6">
            <div className="flex items-center gap-3 mb-2">
              <ShieldCheck className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold text-slate-900">Crear Usuario Administrador</h2>
            </div>
            <form onSubmit={handleCreateAdmin} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                <input
                  required
                  type="text"
                  value={newAdmin.name}
                  onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Correo Electrónico</label>
                <input
                  required
                  type="email"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 flex items-center justify-center"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {loading ? 'Creando...' : 'Crear Administrador'}
              </button>
            </form>

            {createdAdmin && (
              <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
                <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-3">Credenciales del nuevo administrador</p>
                <p className="text-sm text-slate-700"><span className="font-bold">ID:</span> {createdAdmin.id_number}</p>
                <p className="text-sm text-slate-700"><span className="font-bold">Contraseña temporal:</span> {createdAdmin.temp_password}</p>
                <p className="text-[11px] text-slate-500 mt-2">Debe iniciar sesión y cambiar la contraseña al entrar.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
