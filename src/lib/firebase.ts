import { useState, useEffect } from 'react';

// Mock Auth
class MockAuth {
  private _currentUser: any = null;
  private _listeners: ((user: any) => void)[] = [];

  constructor() {
    const saved = localStorage.getItem('bwp_user');
    if (saved) this._currentUser = JSON.parse(saved);
  }

  get currentUser() {
    return this._currentUser;
  }

  onAuthStateChanged(callback: (user: any) => void) {
    this._listeners.push(callback);
    callback(this._currentUser);
    return () => {
      this._listeners = this._listeners.filter(l => l !== callback);
    };
  }

  async signInWithEmailAndPassword(email: string, role: 'admin' | 'seller') {
    const userRecord = db['_data'].users.find((u: any) => u.email === email);
    const user = {
      uid: userRecord?.id || `mock-${role}-${Date.now()}`,
      email: email,
      displayName: userRecord?.name || (role === 'admin' ? 'Administrador' : 'Vendedor'),
    };
    this._currentUser = user;
    localStorage.setItem('bwp_user', JSON.stringify(user));
    this._notify();
    return { user };
  }

  async signOut() {
    this._currentUser = null;
    localStorage.removeItem('bwp_user');
    this._notify();
  }

  private _notify() {
    this._listeners.forEach(l => l(this._currentUser));
  }
}

// Mock Firestore
class MockFirestore {
  private _data: { [key: string]: any[] } = {};
  private _listeners: { [key: string]: ((snapshot: any) => void)[] } = {};

  constructor() {
    const saved = localStorage.getItem('bwp_data');
    if (saved) this._data = JSON.parse(saved);
    
    // Initial data if empty
    if (Object.keys(this._data).length === 0) {
      this._data = {
        users: [
          { id: 'admin-1', name: 'Administrador Principal', email: 'admin@bwpwater.com', role: 'admin', status: 'active', currentStock: 0, currentCorrelative: 0, defaultUnitPrice: 40 },
          { id: 'seller-1', name: 'Vendedor 1', email: 'vendedor1@bwpwater.com', role: 'seller', status: 'active', currentStock: 50, currentCorrelative: 100, defaultUnitPrice: 40, lastStartDay: '' },
          { id: 'seller-2', name: 'Vendedor 2', email: 'vendedor2@bwpwater.com', role: 'seller', status: 'active', currentStock: 45, currentCorrelative: 200, defaultUnitPrice: 40, lastStartDay: '' },
          { id: 'seller-3', name: 'Vendedor 3', email: 'vendedor3@bwpwater.com', role: 'seller', status: 'active', currentStock: 60, currentCorrelative: 300, defaultUnitPrice: 40, lastStartDay: '' }
        ],
        inventory: [{ id: 'global', plantStock: 1000, inRoute: 155 }],
        customers: [
          { id: 'c1', name: 'Juan Pérez', phone: '99887766', address: 'Col. Kennedy', balance: 0 },
          { id: 'c2', name: 'María López', phone: '88776655', address: 'Res. Honduras', balance: 120 },
          { id: 'c3', name: 'Tienda La Bendición', phone: '33445566', address: 'Av. Principal', balance: 0 },
          { id: 'c4', name: 'Pulpería Doña Rosa', phone: '77889900', address: 'Calle 5', balance: 50 },
          { id: 'c5', name: 'Restaurante El Sabor', phone: '22334455', address: 'Boulevard Morazán', balance: 300 },
          { id: 'c6', name: 'Carlos Rodríguez', phone: '99001122', address: 'Col. Miraflores', balance: 0 }
        ],
        sales: [
          { id: 's1', sellerId: 'seller-1', sellerName: 'Vendedor 1', customerId: 'c1', customerName: 'Juan Pérez', bottleCount: 2, unitPrice: 40, totalAmount: 80, paymentType: 'cash', timestamp: new Date().toISOString(), correlative: 101 },
          { id: 's2', sellerId: 'seller-1', sellerName: 'Vendedor 1', customerId: 'c2', customerName: 'María López', bottleCount: 3, unitPrice: 40, totalAmount: 120, paymentType: 'transfer', timestamp: new Date().toISOString(), correlative: 102 }
        ],
        dispatches: [],
        closures: [],
        reload_requests: []
      };
      this._save();
    }
  }

  private _save() {
    localStorage.setItem('bwp_data', JSON.stringify(this._data));
    this._notifyAll();
  }

  private _notifyAll() {
    Object.keys(this._listeners).forEach(path => {
      this._notify(path);
    });
  }

  private _notify(path: string) {
    if (this._listeners[path]) {
      const snapshot = {
        forEach: (cb: any) => (this._data[path] || []).forEach(d => cb({ id: d.id, data: () => d })),
        docs: (this._data[path] || []).map(d => ({ id: d.id, data: () => d }))
      };
      this._listeners[path].forEach(l => l(snapshot));
    }
  }

  collection(_db: any, path: string) {
    return path;
  }

  doc(_db: any, path: string, id?: string) {
    return { path, id };
  }

  query(path: string, ..._constraints: any[]) {
    return path;
  }

  onSnapshot(path: any, callback: any) {
    const p = typeof path === 'string' ? path : path.path;
    if (!this._listeners[p]) this._listeners[p] = [];
    this._listeners[p].push(callback);
    
    // Initial call
    const snapshot = {
      forEach: (cb: any) => (this._data[p] || []).forEach(d => cb({ id: d.id, data: () => d })),
      docs: (this._data[p] || []).map(d => ({ id: d.id, data: () => d })),
      exists: () => !!(this._data[p]?.find((d: any) => d.id === path.id)),
      data: () => this._data[p]?.find((d: any) => d.id === path.id)
    };
    
    // If it's a doc reference
    if (path.id) {
      const docData = this._data[p]?.find((d: any) => d.id === path.id);
      callback({
        exists: () => !!docData,
        data: () => docData,
        id: path.id
      });
    } else {
      callback(snapshot);
    }

    return () => {
      this._listeners[p] = this._listeners[p].filter(l => l !== callback);
    };
  }

  async addDoc(path: string, data: any) {
    const id = Math.random().toString(36).substring(7);
    const newDoc = { id, ...data };
    if (!this._data[path]) this._data[path] = [];
    this._data[path].push(newDoc);
    this._save();
    return { id };
  }

  async setDoc(docRef: any, data: any) {
    const { path, id } = docRef;
    if (!this._data[path]) this._data[path] = [];
    const index = this._data[path].findIndex((d: any) => d.id === id);
    if (index >= 0) {
      this._data[path][index] = { ...this._data[path][index], ...data };
    } else {
      this._data[path].push({ id, ...data });
    }
    this._save();
  }

  async updateDoc(docRef: any, data: any) {
    const { path, id } = docRef;
    if (!this._data[path]) return;
    const index = this._data[path].findIndex((d: any) => d.id === id);
    if (index >= 0) {
      // Handle increment
      const updated = { ...this._data[path][index] };
      Object.keys(data).forEach(key => {
        if (data[key] && typeof data[key] === 'object' && data[key].__type === 'increment') {
          updated[key] = (updated[key] || 0) + data[key].value;
        } else {
          updated[key] = data[key];
        }
      });
      this._data[path][index] = updated;
      this._save();
    }
  }

  async getDoc(docRef: any) {
    const { path, id } = docRef;
    const docData = this._data[path]?.find((d: any) => d.id === id);
    return {
      exists: () => !!docData,
      data: () => docData,
      id
    };
  }

  async deleteDoc(docRef: any) {
    const { path, id } = docRef;
    if (!this._data[path]) return;
    this._data[path] = this._data[path].filter((d: any) => d.id !== id);
    this._save();
  }

  increment(value: number) {
    return { __type: 'increment', value };
  }
}

export const auth: any = new MockAuth();
export const db: any = new MockFirestore();

// Re-export Firestore functions as mocks
export const collection: any = (db: any, path: string) => db.collection(db, path);
export const doc: any = (db: any, path: string, id?: string) => db.doc(db, path, id);
export const query: any = (path: any, ...constraints: any[]) => db.query(path, ...constraints);
export const onSnapshot: any = (path: any, callback: any) => db.onSnapshot(path, callback);
export const addDoc: any = (path: any, data: any) => db.addDoc(path, data);
export const setDoc: any = (docRef: any, data: any) => db.setDoc(docRef, data);
export const updateDoc: any = (docRef: any, data: any) => db.updateDoc(docRef, data);
export const getDoc: any = (docRef: any) => db.getDoc(docRef);
export const deleteDoc: any = (docRef: any) => db.deleteDoc(docRef);
export const increment: any = (value: number) => db.increment(value);

// Dummy constraints
export const where: any = (...args: any[]) => ({ type: 'where', args });
export const orderBy: any = (...args: any[]) => ({ type: 'orderBy', args });
export const limit: any = (val: number) => ({ type: 'limit', val });
export const serverTimestamp: any = () => new Date().toISOString();
export const startOfDay: any = (d: Date) => d.toISOString();
export const getDocFromServer: any = (docRef: any) => db.getDoc(docRef);

// Mock Auth functions
export const signInWithEmailAndPassword: any = (auth: any, email: string, _pass: string) => {
  const users = db.collection(db, 'users');
  const userRecord = db['_data'].users.find((u: any) => u.email === email);
  
  if (!userRecord) {
    throw { code: 'auth/user-not-found' };
  }
  
  return auth.signInWithEmailAndPassword(email, userRecord.role);
};
export const signInWithPopup: any = async (auth: any, _provider: any) => {
  return auth.signInWithEmailAndPassword('google-user@demo.com', 'seller');
};
export const onAuthStateChanged: any = (auth: any, callback: any) => auth.onAuthStateChanged(callback);
export const GoogleAuthProvider: any = class {};

// Mock App functions
export const initializeApp: any = () => ({});
export const getAuth: any = () => auth;
export const getFirestore: any = () => db;

// Types
export type User = {
  uid: string;
  email: string | null;
  displayName: string | null;
};
