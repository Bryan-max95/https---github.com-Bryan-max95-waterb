'use client';

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Droplets, Lock, User, Eye, EyeOff, Key, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const Login: React.FC = () => {
  const { login, changePassword } = useAuth();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [mustChange, setMustChange] = useState(false);
  const brandImage = process.env.NEXT_PUBLIC_BRAND_IMAGE || '/window.svg';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await login(identifier, password);
      if (data.user.mustChange) setMustChange(true);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión. Intente de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) return setError('Las contraseñas no coinciden');
    if (newPassword.length < 4) return setError('La contraseña debe tener al menos 4 caracteres');
    setLoading(true);
    setError(null);
    try {
      await changePassword(newPassword);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || 'Error al cambiar contraseña');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-slate-900 p-4 md:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-6xl min-h-[calc(100vh-2rem)] md:min-h-[calc(100vh-4rem)] rounded-[2rem] overflow-hidden shadow-2xl bg-white grid grid-cols-1 lg:grid-cols-2"
      >
        <div className="relative hidden lg:flex items-end p-10 text-white">
          <img 
  src="/images/agua.jpg" 
  alt="Brand" 
  className="absolute inset-0 h-full w-full object-cover" 
/>

          <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-blue-950/65 to-blue-900/35" />
          <div className="relative z-10">
            <p className="text-xs uppercase tracking-[0.22em] text-blue-200 font-bold mb-2">Business Water Platform</p>
            <h2 className="text-4xl font-black tracking-tight">Operación diaria con control total</h2>
            <p className="mt-3 text-sm text-blue-100/90">Ventas, cierres y administración en una sola plataforma.</p>
          </div>
        </div>

        <div className="p-8 md:p-10 flex flex-col justify-center">
          <div className="mb-8 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-blue-50 flex items-center justify-center">
              <Droplets className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-black tracking-tight text-blue-950">BWP WATER</p>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 font-bold">{mustChange ? 'Actualizar Contraseña' : 'Acceso Seguro'}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-600 text-xs font-bold mb-5"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {!mustChange ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Usuario / ID</label>
                <div className="relative mt-1">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required value={identifier} onChange={(e) => setIdentifier(e.target.value)} className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Contraseña</label>
                <div className="relative mt-1">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-11 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all disabled:opacity-50">
                {loading ? 'Cargando...' : 'Entrar al Sistema'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="p-3 bg-blue-50 rounded-xl text-xs text-blue-700 font-medium">
                Debe cambiar su contraseña temporal para continuar.
              </div>
              <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input required type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nueva contraseña" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="relative">
                <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input required type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar contraseña" className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <button type="submit" disabled={loading} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                {loading ? 'Actualizando...' : 'Guardar y Continuar'}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
