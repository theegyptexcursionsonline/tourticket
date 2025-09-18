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
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch discounts');
      if (data.success) {
        setDiscounts(data.data); // Corrected: Use data.data to get the array
      } else {
        throw new Error(data.error || 'API returned an error');
      }
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
    if (!code || value === '') {
        setFormError('Please fill out all fields.');
        return;
    }
    setIsSubmitting(true);
    setFormError(null);

    try {
      const response = await fetch('/api/admin/discounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: code.toUpperCase(),
          discountType,
          value,
          isActive: true, // Set default active status
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to create discount');

      if (data.success) {
        setDiscounts([data.data, ...discounts]); // Corrected: Use data.data for the new discount object
        // Reset form
        setCode('');
        setDiscountType('percentage');
        setValue('');
      } else {
         throw new Error(data.error || 'API returned an error');
      }
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
        method: 'PUT', // Corrected: Method should be PUT as defined in your API route
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentStatus }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to update status');
      
      if (data.success) {
        // Update the state locally
        setDiscounts(discounts.map(d => d._id === id ? data.data : d)); // Corrected: Use data.data for the updated object
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };

  // --- Delete Discount ---
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code? This action cannot be undone.')) return;
    try {
      const response = await fetch(`/api/admin/discounts/${id}`, {
        method: 'DELETE',
      });
       const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to delete discount');
      
      if(data.success) {
        // Remove from state locally
        setDiscounts(discounts.filter(d => d._id !== id));
      } else {
        throw new Error(data.error || 'API returned an error');
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  };


  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="flex items-center mb-6">
        <Tag className="h-8 w-8 mr-3 text-slate-600" />
        <h1 className="text-3xl font-bold text-slate-800">Discount Codes</h1>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-slate-200">
        <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center"><Plus className="h-5 w-5 mr-2" />Create New Discount</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          <input type="text" placeholder="Coupon Code (e.g., SUMMER20)" value={code} onChange={e => setCode(e.target.value.toUpperCase())} required className="lg:col-span-2 p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          <input type="number" placeholder="Value" value={value} onChange={e => setValue(e.target.value === '' ? '' : Number(e.target.value))} required className="p-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-red-500" />
          <select value={discountType} onChange={e => setDiscountType(e.target.value as 'percentage' | 'fixed')} className="p-2 border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-red-500">
            <option value="percentage">Percentage (%)</option>
            <option value="fixed">Fixed Amount ($)</option>
          </select>
          <button type="submit" disabled={isSubmitting} className="md:col-span-2 lg:col-span-1 p-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 disabled:bg-red-300 transition-colors">
            {isSubmitting ? 'Creating...' : 'Create Discount'}
          </button>
          {formError && <p className="text-red-500 text-sm col-span-full mt-2">{formError}</p>}
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md border border-slate-200">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">Usage</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
              {isLoading ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500">Loading discounts...</td></tr>
              ) : error ? (
                <tr><td colSpan={5} className="text-center py-10 text-red-500">Error: {error}</td></tr>
              ) : discounts.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-10 text-slate-500">No discount codes found. Create one above to get started!</td></tr>
              ) : (
                discounts.map(d => (
                  <tr key={d._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-slate-800">{d.code}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold">
                      <span className="flex items-center">
                        {d.discountType === 'percentage' ? <Percent className="h-4 w-4 mr-1 text-slate-500" /> : <DollarSign className="h-4 w-4 mr-1 text-slate-500" />}
                        {d.value}{d.discountType === 'percentage' ? '%' : ''}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 font-semibold leading-tight rounded-full ${d.isActive ? 'text-green-700 bg-green-100' : 'text-gray-700 bg-gray-100'}`}>
                        {d.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-slate-600">{d.timesUsed} / {d.usageLimit || '∞'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button onClick={() => handleToggle(d._id, d.isActive)} title={d.isActive ? 'Deactivate' : 'Activate'} className="text-slate-500 hover:text-slate-700 mr-4">
                        {d.isActive ? <ToggleRight className="h-6 w-6 text-green-500" /> : <ToggleLeft className="h-6 w-6" />}
                      </button>
                      <button onClick={() => handleDelete(d._id)} title="Delete" className="text-red-500 hover:text-red-700">
                        <Trash2 className="h-5 w-5" />
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