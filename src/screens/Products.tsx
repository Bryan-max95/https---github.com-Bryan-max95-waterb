'use client';

import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { ShoppingBag, Plus, Edit2, Trash2 } from 'lucide-react';

export const Products: React.FC = () => {
  const [products, setProducts] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'botellon'
  });

  const fetchProducts = async () => {
    try {
      const data = await api.get('/api/products');
      setProducts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...formData,
      price: parseFloat(formData.price)
    };

    try {
      if (editingProduct) {
        await api.put(`/api/products/${editingProduct.id}`, data);
      } else {
        await api.post('/api/products', data);
      }
      setIsModalOpen(false);
      setEditingProduct(null);
      setFormData({ name: '', description: '', price: '', category: 'botellon' });
      fetchProducts();
    } catch (err) {
      console.error(err);
      alert('Error al guardar producto');
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      category: product.category || 'botellon'
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('¿Está seguro de eliminar este producto?')) {
      try {
        await api.delete(`/api/products/${id}`);
        fetchProducts();
      } catch (err) {
        console.error(err);
        alert('Error al eliminar producto');
      }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestión de Productos</h1>
          <p className="text-slate-500 text-sm">Administre catálogo y precios</p>
        </div>
        <button 
          onClick={() => {
            setEditingProduct(null);
            setFormData({ name: '', description: '', price: '', category: 'botellon' });
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Producto
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <div key={product.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleEdit(product)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600">
                  <Edit2 className="h-4 w-4" />
                </button>
                <button onClick={() => handleDelete(product.id)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-1">{product.name}</h3>
            <p className="text-xs text-slate-500 mb-4 h-8 line-clamp-2">{product.description}</p>
            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">{product.category}</span>
              <span className="text-xl font-black text-blue-600">L. {Number(product.price).toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <Plus className="h-6 w-6 rotate-45" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Precio (L.)</label>
                <input 
                  required
                  type="number" 
                  step="0.01"
                  value={formData.price}
                  onChange={(e) => setFormData({...formData, price: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Categoría</label>
                <select 
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="botellon">Botellón</option>
                  <option value="bolsa">Bolsa</option>
                  <option value="otros">Otros</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descripción</label>
                <textarea 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                ></textarea>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 py-3 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
                >
                  {editingProduct ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

