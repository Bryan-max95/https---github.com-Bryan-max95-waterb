'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './screens/Login';
import { AdminDashboard } from './screens/AdminDashboard';
import { SellerApp } from './screens/SellerApp';
import { Products } from './screens/Products';
import { Dispatches } from './screens/Dispatches';
import { BottleCheckins } from './screens/BottleCheckins';
import { Sales } from './screens/Sales';
import { Closures } from './screens/Closures';
import { Customers } from './screens/Customers';
import { Expenses } from './screens/Expenses';
import { Sellers } from './screens/Sellers';
import { Reports } from './screens/Reports';
import { Settings } from './screens/Settings';
import { Maintenance } from './screens/Maintenance';
import { Layout } from './components/Layout';

function AppRoutes() {
  const { profile, loading, isAdmin, isSeller, isIT } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-900"></div>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  // If user must change password, they should only see the login page (which handles the change)
  if (profile.mustChange) {
    return <Login />;
  }

  const isManagement = isAdmin || isIT;

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {isManagement ? (
          <>
            <Route index element={<AdminDashboard />} />
            <Route path="sellers" element={<Sellers />} />
            <Route path="products" element={<Products />} />
            <Route path="dispatches" element={<Dispatches />} />
            <Route path="bottle-checkins" element={<BottleCheckins />} />
            <Route path="sales" element={<Sales />} />
            <Route path="closures" element={<Closures />} />
            <Route path="customers" element={<Customers />} />
            <Route path="expenses" element={<Expenses />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
            <Route path="maintenance" element={<Maintenance />} />
          </>
        ) : isSeller ? (
          <>
            <Route index element={<SellerApp />} />
          </>
        ) : (
          <Route index element={<div className="p-8">Acceso no autorizado. Contacte al administrador.</div>} />
        )}
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}


