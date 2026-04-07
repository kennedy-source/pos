import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost } from '../lib/api';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, X, Loader } from 'lucide-react';

interface Variant {
  id: string;
  size?: string;
  color?: string;
  sku: string;
  barcode?: string;
  costPrice?: number;
  sellingPrice?: number;
  currentStock?: number;
  reorderLevel?: number;
}

export function AddProductPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    categoryId: '',
    schoolId: '',
    gender: 'UNISEX',
    costPrice: '',
    sellingPrice: '',
    reorderLevel: '5',
    notes: '',
  });

  const [variants, setVariants] = useState<Variant[]>([]);
  const [showVariantForm, setShowVariantForm] = useState(false);
  const [variantForm, setVariantForm] = useState({
    size: '',
    color: '',
    sku: '',
    barcode: '',
    costPrice: '',
    sellingPrice: '',
    currentStock: '0',
    reorderLevel: '',
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => apiGet('/products/categories'),
  });

  const { data: schools } = useQuery({
    queryKey: ['schools'],
    queryFn: () => apiGet('/products/schools'),
  });

  const createMutation = useMutation({
    mutationFn: async (productData: any) => {
      return apiPost('/products', productData);
    },
    onSuccess: (response: any) => {
      toast.success('Product created successfully!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      navigate(`/inventory/${response?.data?.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to create product');
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleVariantInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setVariantForm(prev => ({ ...prev, [name]: value }));
  };

  const addVariant = () => {
    if (!variantForm.sku) {
      toast.error('Variant SKU is required');
      return;
    }

    const newVariant: Variant = {
      id: `temp-${Date.now()}`,
      size: variantForm.size || undefined,
      color: variantForm.color || undefined,
      sku: variantForm.sku,
      barcode: variantForm.barcode || undefined,
      costPrice: variantForm.costPrice ? parseFloat(variantForm.costPrice) : undefined,
      sellingPrice: variantForm.sellingPrice ? parseFloat(variantForm.sellingPrice) : undefined,
      currentStock: parseInt(variantForm.currentStock) || 0,
      reorderLevel: variantForm.reorderLevel ? parseInt(variantForm.reorderLevel) : undefined,
    };

    setVariants(prev => [...prev, newVariant]);
    setVariantForm({
      size: '',
      color: '',
      sku: '',
      barcode: '',
      costPrice: '',
      sellingPrice: '',
      currentStock: '0',
      reorderLevel: '',
    });
    setShowVariantForm(false);
    toast.success('Variant added');
  };

  const removeVariant = (id: string) => {
    setVariants(prev => prev.filter(v => v.id !== id));
  };

  const handleSubmit = () => {
    // Validation
    if (!formData.name) {
      toast.error('Product name is required');
      return;
    }
    if (!formData.sku) {
      toast.error('SKU is required');
      return;
    }
    if (!formData.categoryId) {
      toast.error('Category is required');
      return;
    }
    if (!formData.costPrice) {
      toast.error('Cost price is required');
      return;
    }
    if (!formData.sellingPrice) {
      toast.error('Selling price is required');
      return;
    }

    const productData = {
      ...formData,
      costPrice: parseFloat(formData.costPrice),
      sellingPrice: parseFloat(formData.sellingPrice),
      reorderLevel: parseInt(formData.reorderLevel) || 5,
      schoolId: formData.schoolId || undefined,
      variants: variants.map(({ id, ...v }) => ({ ...v })),
    };

    createMutation.mutate(productData);
  };

  const categoryList = ((categories as any)?.data?.data || []) as any[];
  const schoolList = ((schools as any)?.data?.data || []) as any[];

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/inventory')}
          className="p-2 hover:bg-slate-800 rounded-lg transition-colors text-slate-400 hover:text-white"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-white text-2xl font-bold">Add New Product</h1>
          <p className="text-slate-400 text-sm">Create a new product with variants</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Information */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Product Information</h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Product Name *</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="e.g. School Blazer"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">SKU *</label>
                <input
                  type="text"
                  name="sku"
                  value={formData.sku}
                  onChange={handleInputChange}
                  placeholder="e.g. BLAZ-001"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Barcode</label>
                <input
                  type="text"
                  name="barcode"
                  value={formData.barcode}
                  onChange={handleInputChange}
                  placeholder="e.g. 1234567890123"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="UNISEX">Unisex</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-slate-400 text-xs mb-1 block font-medium">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Product description..."
                rows={3}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Category *</label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Select category</option>
                  {categoryList.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">School (Optional)</label>
                <select
                  name="schoolId"
                  value={formData.schoolId}
                  onChange={handleInputChange}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option value="">Generic (All Schools)</option>
                  {schoolList.map(school => (
                    <option key={school.id} value={school.id}>{school.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Pricing & Stock</h2>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Cost Price (KES) *</label>
                <input
                  type="number"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Selling Price (KES) *</label>
                <input
                  type="number"
                  name="sellingPrice"
                  value={formData.sellingPrice}
                  onChange={handleInputChange}
                  placeholder="0"
                  step="0.01"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs mb-1 block font-medium">Reorder Level</label>
                <input
                  type="number"
                  name="reorderLevel"
                  value={formData.reorderLevel}
                  onChange={handleInputChange}
                  placeholder="5"
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {formData.costPrice && formData.sellingPrice && (
              <div className="bg-slate-800/50 rounded-lg p-3 flex justify-between">
                <span className="text-slate-400 text-sm">Profit Margin:</span>
                <span className="text-green-400 font-semibold text-sm">
                  {((((parseFloat(formData.sellingPrice) - parseFloat(formData.costPrice)) / parseFloat(formData.sellingPrice)) * 100) || 0).toFixed(1)}%
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
            <h2 className="text-white font-semibold">Additional Notes</h2>
            
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              placeholder="Internal notes about this product..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>
        </div>

        {/* Variants Section */}
        <div className="lg:col-span-1">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 sticky top-6">
            <div className="flex items-center justify-between">
              <h2 className="text-white font-semibold">Variants ({variants.length})</h2>
              <button
                onClick={() => setShowVariantForm(!showVariantForm)}
                className="flex items-center gap-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg px-3 py-1.5 text-xs transition-colors"
              >
                <Plus size={14} />
                Add
              </button>
            </div>

            {showVariantForm && (
              <div className="bg-slate-800 rounded-lg p-4 space-y-3 border border-blue-500/30">
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Size</label>
                  <input
                    type="text"
                    name="size"
                    value={variantForm.size}
                    onChange={handleVariantInputChange}
                    placeholder="e.g. M, L, XL"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Color</label>
                  <input
                    type="text"
                    name="color"
                    value={variantForm.color}
                    onChange={handleVariantInputChange}
                    placeholder="e.g. Navy, Red"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">SKU *</label>
                  <input
                    type="text"
                    name="sku"
                    value={variantForm.sku}
                    onChange={handleVariantInputChange}
                    placeholder="e.g. BLAZ-001-M"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Barcode</label>
                  <input
                    type="text"
                    name="barcode"
                    value={variantForm.barcode}
                    onChange={handleVariantInputChange}
                    placeholder="e.g. 1234567890456"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Cost Price</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={variantForm.costPrice}
                    onChange={handleVariantInputChange}
                    placeholder="0"
                    step="0.01"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Selling Price</label>
                  <input
                    type="number"
                    name="sellingPrice"
                    value={variantForm.sellingPrice}
                    onChange={handleVariantInputChange}
                    placeholder="0"
                    step="0.01"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Initial Stock</label>
                  <input
                    type="number"
                    name="currentStock"
                    value={variantForm.currentStock}
                    onChange={handleVariantInputChange}
                    placeholder="0"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 text-xs mb-1 block">Reorder Level</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    value={variantForm.reorderLevel}
                    onChange={handleVariantInputChange}
                    placeholder="5"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={addVariant}
                  className="w-full bg-green-600 hover:bg-green-500 text-white rounded-lg py-1.5 text-xs font-medium transition-colors"
                >
                  Add Variant
                </button>
              </div>
            )}

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {variants.length === 0 && !showVariantForm && (
                <p className="text-slate-500 text-xs text-center py-4">No variants yet</p>
              )}
              {variants.map(variant => (
                <div key={variant.id} className="bg-slate-800 rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="text-white text-xs font-medium">
                        {[variant.size, variant.color].filter(Boolean).join(' / ') || 'Base Variant'}
                      </p>
                      <p className="text-slate-400 text-xs">SKU: {variant.sku}</p>
                    </div>
                    <button
                      onClick={() => removeVariant(variant.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {variant.currentStock > 0 && (
                    <p className="text-green-400 text-xs">Stock: {variant.currentStock}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => navigate('/inventory')}
              disabled={createMutation.isPending}
              className="flex-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-lg py-2.5 text-sm font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={createMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-500 disabled:bg-green-900 text-white rounded-lg py-2.5 text-sm font-bold transition-colors flex items-center justify-center gap-2"
            >
              {createMutation.isPending && <Loader size={16} className="animate-spin" />}
              {createMutation.isPending ? 'Creating...' : 'Create Product'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
