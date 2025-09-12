// app/admin/discounts/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import withAuth from '@/components/admin/withAuth';
import { Tag, Plus, ToggleLeft, ToggleRight, Trash2, Percent, DollarSign } from 'lucide-react';

// --- Type Definitions ---
interface IDiscount {
  _id: string;
  code: string;
  discountType: 'percentage' | 'fixed';
  value: number;
  isActive: boolean;
  expiresAt?: string;
  usageLimit?: number;
  timesUsed: number;
}

const DiscountsPage = () => {
  const [discounts, setDiscounts] = useState<IDiscount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // --- Form State ---
  const [code, setCode] = useState('');
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // --- Fetch Discounts ---
  const fetchDiscounts = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/discounts');
      if (!response.ok) throw new Error('Failed to fetch discounts');
      const data = await response.json();
      setDiscounts(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDiscounts();
  }, []);
  
  // --- Form Submission ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setFormError(null);

    try {
        const response = await fetch('/api/admin/discounts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, discountType, value }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || 'Failed to create discount');
        
        setDiscounts([data, ...discounts]);
        setCode('');
        setDiscountType('percentage');
        setValue('');
    } catch (err) {
        setFormError((err as Error).message);
    } finally {
        setIsSubmitting(false);
    }
  };

  // --- Toggle Active Status ---
  const handleToggle = async (id: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      const updatedDiscount = await response.json();
      
      // Update the state locally
      setDiscounts(discounts.map(d => d._id === id ? updatedDiscount : d));
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };
  
  // --- Delete Discount ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete discount');
      
      // Remove from state locally
      setDiscounts(discounts.filter(d => d._id !== id));
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };


  return (
    <div className="p-6">
      <div className="flex items-center mb-6">
        <Tag className="h-8 w-8 mr-3 text-slate-600" />
        <h1 className="text-3xl font-bold text-slate-800">Discount Codes</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Plus className="h-5 w-5 mr-2"/>Create New Discount</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <input type="text" placeholder="Coupon Code (e.g., SUMMER20)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required className="lg:col-span-2 p-2 border rounded"/>
          <input type="number" placeholder="Value" value={value} onChange={e => setValue(Number(e.target.value))} required className="p-2 border rounded"/>
          <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} className="p-2 border rounded bg-white">
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 lg:col-span-1 p-2 bg-red-600 text-white font-semibold rounded hover:bg-red-700 disabled:bg-red-300">
            {isSubmitting ? 'Creating...' : 'Create'}
          </button>
          {formError && <p className="text-red-500 text-sm col-span-full">{formError}</p>}
        </form>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase text-center">Usage</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10">Loading discounts...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center py-10 text-red-500">Error: {error}</td></tr>
              ) : (
                discounts.map(d => (
                  <tr key={d._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{d.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                        <span className="flex items-center">
                            {d.discountType === 'percentage' ? <Percent className="h-4 w-4 mr-1 text-slate-500"/> : <DollarSign className="h-4 w-4 mr-1 text-slate-500"/>}
                            {d.value}{d.discountType === 'percentage' ? '%' : ''}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 font-semibold leading-tight rounded-full ${d.isActive ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center">{d.timesUsed} / {d.usageLimit || '∞'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button onClick={() => handleToggle(d._id, d.isActive)} className="text-slate-500 hover:text-slate-700 mr-4">
                           {d.isActive ? <ToggleRight className="h-6 w-6"/> : <ToggleLeft className="h-6 w-6"/>}
                        </button>
                        <button onClick={() => handleDelete(d._id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-5 w-5"/>
                        </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default withAuth(DiscountsPage);