'use client';

import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Minus, 
  ShoppingCart, 
  Truck, 
  CheckCircle2, 
  AlertCircle,
  History,
  DollarSign,
  Droplet,
  MapPin,
  Search,
  User,
  Printer,
  X,
  ChevronRight,
  CreditCard,
  Wallet,
  LogOut,
  UserCircle,
  LayoutDashboard,
  Users,
  Receipt
} from 'lucide-react';
import { format, startOfDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { cn } from '../lib/utils';

const DENOMINATIONS = [
  { label: 'L. 500', value: 500 },
  { label: 'L. 200', value: 200 },
  { label: 'L. 100', value: 100 },
  { label: 'L. 50', value: 50 },
  { label: 'L. 20', value: 20 },
  { label: 'L. 10', value: 10 },
  { label: 'L. 5', value: 5 },
  { label: 'L. 1', value: 1 },
];

export const SellerApp: React.FC = () => {
  const { profile, logout } = useAuth();
  const [view, setView] = useState<'home' | 'sale' | 'closure' | 'history' | 'customers' | 'expenses'>('home');
  const [stock, setStock] = useState(0);
  const [hasStartedDay, setHasStartedDay] = useState(false);
  const [soldToday, setSoldToday] = useState(0);
  const [revenueToday, setRevenueToday] = useState(0);
  const [cycleExpenses, setCycleExpenses] = useState(0);
  const [expectedCashCycle, setExpectedCashCycle] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [salesHistory, setSalesHistory] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  // Sale states
  const [saleQty, setSaleQty] = useState(1);
  const [paymentType, setPaymentType] = useState<'cash' | 'transfer' | 'credit'>('cash');
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customers, setCustomers] = useState<any[]>([]);
  const [showCustomerResults, setShowCustomerResults] = useState(false);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({
    name: '',
    phone: '',
    address: '',
    type: 'regular',
    rtn: '',
  });
  const [lastSale, setLastSale] = useState<any>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceData, setInvoiceData] = useState<any>(null);

  // Expense states
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseDescription, setExpenseDescription] = useState('');
  const [expenseReceipt, setExpenseReceipt] = useState('');

  // Closure states
  const [counts, setCounts] = useState<{ [key: number]: number }>(
    DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {})
  );

  const invoiceRef = useRef<HTMLDivElement>(null);

  const fetchData = async () => {
    try {
      const [salesData, customersData, productsData, profileData, closuresData, expensesData] = await Promise.all([
        api.get('/api/sales'),
        api.get('/api/customers'),
        api.get('/api/products'),
        api.get('/api/auth/profile'),
        api.get('/api/closures'),
        api.get('/api/expenses')
      ]);

      const sellerClosures = (closuresData || [])
        .filter((c: any) => Number(c.seller_id) === Number(profileData.id))
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      const lastClosureTs = sellerClosures.length > 0 ? new Date(sellerClosures[0].timestamp).getTime() : 0;
      const cycleSales = (salesData || []).filter((s: any) => new Date(s.timestamp).getTime() > lastClosureTs);
      const currentCycleExpenses = (expensesData || []).filter((e: any) => new Date(e.timestamp).getTime() > lastClosureTs);
      const cashSalesCycle = cycleSales
        .filter((s: any) => s.payment_type === 'cash')
        .reduce((acc: number, s: any) => acc + Number(s.total_amount || 0), 0);
      const expensesCycleTotal = currentCycleExpenses
        .reduce((acc: number, e: any) => acc + Number(e.amount || 0), 0);
      
      setSalesHistory(cycleSales);
      setSoldToday(cycleSales.reduce((acc: number, s: any) => acc + s.quantity, 0));
      setRevenueToday(cycleSales.reduce((acc: number, s: any) => acc + Number(s.total_amount), 0));
      setCycleExpenses(expensesCycleTotal);
      setExpectedCashCycle(cashSalesCycle - expensesCycleTotal);
      setCustomers(customersData);
      setProducts(productsData);
      setSelectedProduct(productsData.find((p: any) => p.is_default) || productsData[0]);
      setStock(profileData.current_stock || 0);
      
      // For demo/simulated start day
      const today = startOfDay(new Date());
      const todayKey = format(today, 'yyyy-MM-dd');
      setHasStartedDay(localStorage.getItem('dayStarted') === todayKey);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    (c.phone && c.phone.includes(customerSearch))
  );

  const handleCreateCustomerFromSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await api.post('/api/customers', {
        name: newCustomerData.name,
        phone: newCustomerData.phone,
        address: newCustomerData.address,
        type: newCustomerData.type,
        rtn: newCustomerData.rtn,
        balance: 0,
      });
      setSelectedCustomer(created);
      setCustomerSearch(created.name);
      setShowCustomerResults(false);
      setShowCreateCustomerModal(false);
      setNewCustomerData({ name: '', phone: '', address: '', type: 'regular', rtn: '' });
      await fetchData();
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'No se pudo crear el cliente' });
      setTimeout(() => setMessage(null), 2500);
    }
  };

  const handleStartDay = () => {
    const today = startOfDay(new Date());
    localStorage.setItem('dayStarted', format(today, 'yyyy-MM-dd'));
    localStorage.setItem('dayStartStock', String(stock || 0));
    setHasStartedDay(true);
    setMessage({ type: 'success', text: 'Jornada iniciada con éxito' });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRegisterSale = async () => {
    if (stock < saleQty) {
      setMessage({ type: 'error', text: 'Stock insuficiente' });
      return;
    }
    setLoading(true);
    try {
      const saleData = {
        customerId: selectedCustomer?.id || null,
        productId: selectedProduct.id,
        quantity: saleQty,
        unitPrice: selectedProduct.price,
        paymentType,
        isCredit: paymentType === 'credit',
        correlative: (profile?.current_correlative || 0) + 1
      };

      const result = await api.post('/api/sales', saleData);
      setLastSale(result);
      setInvoiceData({
        id: result.id,
        timestamp: result.timestamp || new Date().toISOString(),
        customerName: selectedCustomer?.name || 'N/A',
        productName: selectedProduct?.name || 'Botellón de Agua',
        quantity: saleQty,
        unitPrice: selectedProduct?.price || 0,
        totalAmount: (saleQty * (selectedProduct?.price || 0)),
        paymentType,
        correlative: saleData.correlative,
      });
      setShowInvoice(true);
      setMessage({ type: 'success', text: 'Venta registrada con éxito' });
      setView('home');
      setSaleQty(1);
      setSelectedCustomer(null);
      setCustomerSearch('');
      fetchData();
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al registrar venta' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleRegisterExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post('/api/expenses', {
        amount: parseFloat(expenseAmount),
        description: expenseDescription,
        receiptNumber: expenseReceipt
      });
      setMessage({ type: 'success', text: 'Gasto registrado con éxito' });
      setView('home');
      setExpenseAmount('');
      setExpenseDescription('');
      setExpenseReceipt('');
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al registrar gasto' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleClosure = async () => {
    setLoading(true);
    try {
      const totalDeclared = Object.entries(counts).reduce((acc: number, [val, count]) => acc + (Number(val) * (count as number)), 0);
      const creditSalesTotal = salesHistory
        .filter((s) => s.payment_type === 'credit')
        .reduce((acc, s) => acc + Number(s.total_amount || 0), 0);

      await api.post('/api/closures', {
        expectedCash: expectedCashCycle,
        declaredCash: totalDeclared,
        creditsTotal: creditSalesTotal,
        expensesTotal: 0,
        cashDenominations: counts,
        soldBottles: soldToday,
        loadedInitial: Number(localStorage.getItem('dayStartStock') || 0),
      });

      setMessage({ type: 'success', text: 'Cierre de jornada completado. Cerrando sesión...' });
      setView('home');
      setCounts(DENOMINATIONS.reduce((acc, d) => ({ ...acc, [d.value]: 0 }), {}));
      localStorage.removeItem('dayStarted');
      localStorage.removeItem('dayStartStock');
      setHasStartedDay(false);
      setTimeout(() => logout(), 1200);
    } catch (err) {
      setMessage({ type: 'error', text: 'Error al enviar cierre' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 pb-24 md:pt-8 font-sans">
      {message && (
        <div className={cn(
          "fixed top-4 left-4 right-4 z-[100] p-4 rounded-2xl shadow-2xl flex items-center animate-in slide-in-from-top-full duration-300 md:max-w-md md:left-auto md:right-8",
          message.type === 'success' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
        )}>
          {message.type === 'success' ? <CheckCircle2 className="mr-3 h-5 w-5" /> : <AlertCircle className="mr-3 h-5 w-5" />}
          <p className="font-bold text-sm">{message.text}</p>
        </div>
      )}

      {!hasStartedDay && view === 'home' && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 bg-blue-950/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl overflow-hidden p-8 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="h-24 w-24 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto text-blue-600 shadow-inner">
              <Truck className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-3xl font-black text-blue-950 tracking-tighter mb-2">¡Buen día, {profile?.name}!</h2>
              <p className="text-slate-500 text-sm font-medium">Confirme su carga inicial para comenzar la ruta de hoy.</p>
            </div>

            <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Carga en Vehículo</p>
              <p className="text-5xl font-black text-blue-900">{stock} <span className="text-lg font-medium text-blue-400">bot.</span></p>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleStartDay}
                disabled={loading}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                {loading ? 'Iniciando...' : 'Confirmar e Iniciar Ruta'}
              </button>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Si la cantidad es incorrecta, contacte a planta.
              </p>
            </div>
          </div>
        </div>
      )}

      {view === 'home' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Vendedor</p>
                <p className="text-lg font-black text-slate-900 tracking-tight">{profile?.name}</p>
              </div>
            </div>
            <button 
              onClick={logout}
              className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all shadow-sm group"
              title="Cerrar Sesión"
            >
              <LogOut className="h-6 w-6 group-hover:scale-110 transition-transform" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-blue-950 text-white p-8 md:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden border border-white/5">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Droplet className="h-48 w-48" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></div>
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-[0.2em]">En Ruta Ahora</p>
                </div>
                <h2 className="text-7xl md:text-8xl font-black mb-8 tracking-tighter">
                  {stock} <span className="text-xl font-medium text-blue-400 tracking-normal">botellones</span>
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                    <p className="text-[10px] text-blue-300 uppercase font-bold mb-1 tracking-widest">Entregas Corte</p>
                    <p className="text-2xl font-black">{soldToday}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md p-5 rounded-3xl border border-white/10">
                    <p className="text-[10px] text-blue-300 uppercase font-bold mb-1 tracking-widest">Recaudación</p>
                    <p className="text-2xl font-black">L. {revenueToday.toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <button 
                onClick={() => setView('sale')}
                className="flex-1 flex flex-col items-center justify-center p-8 bg-blue-600 text-white rounded-[2.5rem] shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-[0.98] group"
              >
                <div className="h-16 w-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                  <ShoppingCart className="h-8 w-8" />
                </div>
                <p className="font-black text-lg">Nueva Venta</p>
                <p className="text-xs text-blue-200 font-medium">Registrar entrega</p>
              </button>

              <button 
                onClick={() => setView('closure')}
                className="flex-1 flex flex-col items-center justify-center p-8 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all active:scale-[0.98] group"
              >
                <div className="h-16 w-16 bg-rose-50 rounded-2xl flex items-center justify-center mb-4 text-rose-600 group-hover:scale-110 transition-transform">
                  <History className="h-8 w-8" />
                </div>
                <p className="font-black text-lg text-slate-900">Cierre Caja</p>
                <p className="text-xs text-slate-400 font-medium">Finalizar jornada</p>
              </button>

              <button 
                onClick={() => setView('expenses')}
                className="flex items-center justify-center gap-2 p-4 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100 hover:bg-amber-100 transition-all active:scale-[0.98]"
              >
                <Receipt className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Registrar Gasto</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-blue-600" />
                Últimos Movimientos
              </h3>
              <button 
                onClick={() => setView('history')}
                className="text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:underline"
              >
                Ver Todo
              </button>
            </div>
            <div className="space-y-3">
              {salesHistory.slice(0, 3).map((sale) => (
                <div key={sale.id} className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                      <ShoppingCart className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900">{sale.customer_name || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 font-medium">
                        {format(new Date(sale.timestamp), 'HH:mm')} - {sale.payment_type}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm font-black text-slate-900">-{sale.quantity} bot.</p>
                </div>
              ))}
              {salesHistory.length === 0 && (
                <p className="text-center py-4 text-xs text-slate-400 font-medium italic">No hay ventas registradas hoy</p>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'history' && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-24">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Historial de Ventas</h2>
            <div className="w-9"></div>
          </div>

          <div className="space-y-3">
            {salesHistory.map((sale) => (
              <div key={sale.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                    <ShoppingCart className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900">{sale.customer_name || 'N/A'}</p>
                    <p className="text-xs text-slate-500 font-medium">
                      {format(new Date(sale.timestamp), 'dd/MM/yyyy HH:mm')}
                    </p>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">
                      {sale.payment_type}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">L. {Number(sale.total_amount).toLocaleString()}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase">{sale.quantity} botellones</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'customers' && (
        <div className="space-y-6 animate-in slide-in-from-right-8 duration-500 pb-24">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Mis Clientes</h2>
            <div className="w-9"></div>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500 outline-none shadow-sm transition-all"
            />
          </div>

          <div className="space-y-3">
            {filteredCustomers.map((customer) => (
              <div key={customer.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <UserCircle className="h-6 w-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{customer.name}</p>
                      <p className="text-[10px] text-slate-400 font-medium">{customer.phone || 'Sin teléfono'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Saldo</p>
                    <p className={cn(
                      "text-sm font-black",
                      Number(customer.balance) > 0 ? "text-rose-600" : "text-emerald-600"
                    )}>
                      L. {Number(customer.balance).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 font-medium">
                  <MapPin className="h-3 w-3" />
                  {customer.address}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {view === 'expenses' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Registrar Gasto</h2>
            <div className="w-9"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <form onSubmit={handleRegisterExpense} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Monto (L.)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-lg font-black focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Descripción</label>
                <textarea 
                  required
                  value={expenseDescription}
                  onChange={(e) => setExpenseDescription(e.target.value)}
                  placeholder="¿En qué se gastó el dinero?"
                  rows={3}
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Número de Recibo (Opcional)</label>
                <input 
                  type="text" 
                  value={expenseReceipt}
                  onChange={(e) => setExpenseReceipt(e.target.value)}
                  placeholder="Ej: REC-001"
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full py-5 bg-amber-600 text-white font-black rounded-2xl shadow-xl shadow-amber-100 hover:bg-amber-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
              >
                {loading ? 'Guardando...' : 'Registrar Gasto'}
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'sale' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Nueva Venta</h2>
            <div className="w-9"></div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100">
            <div className="mb-10">
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 text-center">Cantidad de Botellones</label>
              <div className="flex items-center justify-center gap-8">
                <button 
                  onClick={() => setSaleQty(Math.max(1, saleQty - 1))}
                  className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                >
                  <Minus className="h-8 w-8" />
                </button>
                <div className="text-center">
                  <span className="text-7xl font-black text-blue-950 tabular-nums">{saleQty}</span>
                  <p className="text-xs font-bold text-slate-300 uppercase mt-1">Unidades</p>
                </div>
                <button 
                  onClick={() => setSaleQty(saleQty + 1)}
                  className="h-16 w-16 rounded-3xl bg-slate-50 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                >
                  <Plus className="h-8 w-8" />
                </button>
              </div>
              <div className="mt-4 max-w-xs mx-auto">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 text-center">Ingresar cantidad manual</label>
                <input
                  type="number"
                  min={1}
                  value={saleQty}
                  onChange={(e) => {
                    const parsed = Number(e.target.value);
                    setSaleQty(Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 1);
                  }}
                  className="w-full p-3 text-center rounded-xl border border-slate-200 bg-white text-lg font-black text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="mt-8 p-4 bg-emerald-50 rounded-2xl flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Total a Cobrar</span>
                <span className="text-2xl font-black text-emerald-700">L. {(saleQty * (selectedProduct?.price || 40)).toLocaleString()}</span>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Cliente</label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={selectedCustomer ? selectedCustomer.name : customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setSelectedCustomer(null);
                      setShowCustomerResults(true);
                    }}
                    onFocus={() => setShowCustomerResults(true)}
                    placeholder="Buscar cliente..."
                    className="w-full pl-12 pr-10 py-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>

                {showCustomerResults && customerSearch && !selectedCustomer && (
                  <div className="absolute z-50 left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    {filteredCustomers.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto">
                        {filteredCustomers.map(c => (
                          <button
                            key={c.id}
                            onClick={() => {
                              setSelectedCustomer(c);
                              setShowCustomerResults(false);
                            }}
                            className="w-full p-4 text-left hover:bg-blue-50 flex items-center justify-between group transition-colors"
                          >
                            <div>
                              <p className="text-sm font-bold text-slate-900 group-hover:text-blue-700">{c.name}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{c.address || 'Sin dirección'}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-500" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center">
                        <p className="text-xs text-slate-400 font-bold mb-3">No se encontró el cliente</p>
                        <button 
                          onClick={() => {
                            setNewCustomerData((prev) => ({ ...prev, name: customerSearch }));
                            setShowCreateCustomerModal(true);
                          }}
                          className="text-xs font-bold text-blue-600 hover:underline"
                        >
                          Crear &quot;{customerSearch}&quot; como nuevo cliente
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Método de Pago</label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { id: 'cash', label: 'Efectivo', icon: Wallet },
                    { id: 'transfer', label: 'Transf.', icon: CreditCard },
                    { id: 'credit', label: 'Crédito', icon: User }
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setPaymentType(type.id as any)}
                      className={cn(
                        "flex flex-col items-center gap-2 py-4 rounded-2xl text-[10px] font-bold border transition-all uppercase tracking-widest",
                        paymentType === type.id 
                          ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100" 
                          : "bg-white border-slate-100 text-slate-500 hover:border-blue-200"
                      )}
                    >
                      <type.icon className="h-5 w-5" />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                onClick={handleRegisterSale}
                disabled={loading || stock < saleQty}
                className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 mt-4 uppercase tracking-widest"
              >
                {loading ? 'Procesando...' : 'Confirmar Entrega'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateCustomerModal && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-black text-slate-900">Nuevo Cliente</h3>
              <button
                onClick={() => setShowCreateCustomerModal(false)}
                className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="h-5 w-5 mx-auto" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomerFromSeller} className="p-6 space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nombre</label>
                <input
                  required
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Teléfono</label>
                <input
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Dirección</label>
                <input
                  value={newCustomerData.address}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tipo</label>
                  <select
                    value={newCustomerData.type}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, type: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="regular">Regular</option>
                    <option value="frequent">Frecuente</option>
                    <option value="credit">Crédito</option>
                    <option value="individual">Individual</option>
                    <option value="company">Empresa</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">RTN (opcional)</label>
                  <input
                    value={newCustomerData.rtn}
                    onChange={(e) => setNewCustomerData({ ...newCustomerData, rtn: e.target.value })}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {view === 'closure' && (
        <div className="max-w-2xl mx-auto space-y-6 animate-in slide-in-from-right-8 duration-500">
          <div className="flex items-center justify-between mb-2">
            <button onClick={() => setView('home')} className="p-2 bg-slate-100 rounded-xl text-slate-600 hover:bg-slate-200 transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Cierre de Jornada</h2>
            <div className="w-9"></div>
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 bg-blue-950 text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign className="h-32 w-32" />
              </div>
              <div className="relative z-10">
                <p className="text-blue-300 text-[10px] uppercase font-bold mb-1 tracking-widest">Ventas Totales Corte</p>
                <h3 className="text-5xl font-black">L. {revenueToday.toLocaleString()}</h3>
              </div>
            </div>

            <div className="p-8 space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Arqueo de Efectivo</p>
                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">Lempiras (HNL)</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DENOMINATIONS.map((d) => (
                  <div key={d.value} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                    <span className="font-black text-slate-700 text-sm">{d.label}</span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => setCounts(prev => ({ ...prev, [d.value]: Math.max(0, prev[d.value] - 1) }))}
                        className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="font-black text-blue-900 w-6 text-center tabular-nums">{counts[d.value]}</span>
                      <button 
                        onClick={() => setCounts(prev => ({ ...prev, [d.value]: prev[d.value] + 1 }))}
                        className="h-8 w-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-8 border-t border-slate-100">
                <div className="mb-6 p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Control de Botellones</p>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Vendidos corte</label>
                      <input
                        value={soldToday}
                        readOnly
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white text-sm font-black text-blue-900"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between mb-8 p-6 bg-blue-50 rounded-3xl">
                  <div>
                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Total Declarado</p>
                    <p className="text-3xl font-black text-blue-900">
                      L. {Object.entries(counts).reduce((acc: number, [val, count]) => acc + (Number(val) * (count as number)), 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Esperado Efectivo</p>
                    <p className="text-xl font-black text-slate-900">L. {expectedCashCycle.toLocaleString()}</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 mb-1">Diferencia</p>
                    <p className={cn(
                      "text-xl font-black",
                      (Object.entries(counts).reduce((acc: number, [val, count]) => acc + (Number(val) * (count as number)), 0) - expectedCashCycle) === 0 ? "text-emerald-600" : "text-rose-600"
                    )}>
                      L. {(Object.entries(counts).reduce((acc: number, [val, count]) => acc + (Number(val) * (count as number)), 0) - expectedCashCycle).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-bold text-amber-700 uppercase tracking-widest">Gastos del Corte</p>
                  <p className="text-xl font-black text-amber-800">L. {cycleExpenses.toLocaleString()}</p>
                </div>

                <button 
                  onClick={handleClosure}
                  disabled={loading}
                  className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all disabled:opacity-50 uppercase tracking-widest"
                >
                  {loading ? 'Procesando...' : 'Finalizar y Enviar Cierre'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showInvoice && invoiceData && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden">
            <div ref={invoiceRef} className="p-6">
              <div className="text-center border-b border-slate-100 pb-4 mb-4">
                <p className="text-xl font-black text-blue-900 tracking-tight">BWP WATER</p>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Factura de Venta</p>
              </div>
              <div className="space-y-2 text-sm text-slate-700">
                <p><span className="font-bold">Factura:</span> #{invoiceData.correlative || invoiceData.id}</p>
                <p><span className="font-bold">Fecha:</span> {format(new Date(invoiceData.timestamp), 'dd/MM/yyyy HH:mm')}</p>
                <p><span className="font-bold">Vendedor:</span> {profile?.name}</p>
                <p><span className="font-bold">Cliente:</span> {invoiceData.customerName}</p>
              </div>
              <div className="mt-4 border border-slate-100 rounded-2xl overflow-hidden">
                <div className="grid grid-cols-4 gap-2 p-3 bg-slate-50 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  <span className="col-span-2">Producto</span>
                  <span className="text-right">Cant.</span>
                  <span className="text-right">Total</span>
                </div>
                <div className="grid grid-cols-4 gap-2 p-3 text-sm">
                  <span className="col-span-2 font-bold text-slate-900">{invoiceData.productName}</span>
                  <span className="text-right">{invoiceData.quantity}</span>
                  <span className="text-right font-black text-slate-900">L. {Number(invoiceData.totalAmount).toLocaleString()}</span>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase text-slate-500 tracking-widest">Pago</p>
                <p className="text-sm font-black text-blue-700 uppercase">{invoiceData.paymentType}</p>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <p className="text-sm font-bold text-slate-500">Total a pagar</p>
                <p className="text-2xl font-black text-emerald-700">L. {Number(invoiceData.totalAmount).toLocaleString()}</p>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3">
              <button
                onClick={() => setShowInvoice(false)}
                className="flex-1 py-3 rounded-xl bg-slate-200 text-slate-700 text-sm font-bold hover:bg-slate-300 transition-colors"
              >
                Cerrar
              </button>
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="h-4 w-4" />
                Imprimir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-slate-100 px-6 py-3 z-[90] flex items-center justify-between shadow-2xl">
        <button 
          onClick={() => setView('home')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'home' ? "text-blue-600 scale-110" : "text-slate-400"
          )}
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Inicio</span>
        </button>
        <button 
          onClick={() => setView('sale')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'sale' ? "text-blue-600 scale-110" : "text-slate-400"
          )}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Venta</span>
        </button>
        <button 
          onClick={() => setView('history')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'history' ? "text-blue-600 scale-110" : "text-slate-400"
          )}
        >
          <History className="h-5 w-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Historial</span>
        </button>
        <button 
          onClick={() => setView('customers')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'customers' ? "text-blue-600 scale-110" : "text-slate-400"
          )}
        >
          <Users className="h-5 w-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Clientes</span>
        </button>
        <button 
          onClick={() => setView('closure')}
          className={cn(
            "flex flex-col items-center gap-1 transition-all",
            view === 'closure' ? "text-blue-600 scale-110" : "text-slate-400"
          )}
        >
          <CheckCircle2 className="h-5 w-5" />
          <span className="text-[8px] font-bold uppercase tracking-widest">Cierre</span>
        </button>
      </div>
    </div>
  );
};
