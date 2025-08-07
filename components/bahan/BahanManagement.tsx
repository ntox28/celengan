import React, { useState, useEffect, useRef } from 'react';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';
import { useToast } from '../../hooks/useToast';
import { Bahan } from '../../lib/supabaseClient';


const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

interface BahanManagementProps {
    bahanList: Bahan[];
    addBahan: (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => Promise<Bahan>;
    updateBahan: (id: number, data: Partial<Omit<Bahan, 'id' | 'created_at'>>) => Promise<void>;
    deleteBahan: (id: number) => Promise<void>;
}

const initialFormData: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'> = {
    name: '',
    harga_end_customer: 0,
    harga_retail: 0,
    harga_grosir: 0,
    harga_reseller: 0,
    harga_corporate: 0,
};

const BahanManagement: React.FC<BahanManagementProps> = ({ bahanList, addBahan, updateBahan, deleteBahan }) => {
    const [editingBahan, setEditingBahan] = useState<Bahan | null>(null);
    const [formData, setFormData] = useState<Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>>(initialFormData);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(bahanList.length / ITEMS_PER_PAGE);
    const currentBahanList = bahanList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (bahan: Bahan) => {
        setEditingBahan(bahan);
        setFormData({
            name: bahan.name,
            harga_end_customer: bahan.harga_end_customer,
            harga_retail: bahan.harga_retail,
            harga_grosir: bahan.harga_grosir,
            harga_reseller: bahan.harga_reseller,
            harga_corporate: bahan.harga_corporate,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingBahan(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const processedValue = name === 'name' ? value : (value === '' ? 0 : Number(value));
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingBahan) {
                await updateBahan(editingBahan.id, formData);
            } else {
                await addBahan(formData);
                handleAddNew();
            }
        } catch (error) {
            console.error("Failed to save bahan:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (bahanId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus bahan ini?')) {
            await deleteBahan(bahanId);
            if (editingBahan?.id === bahanId) {
                handleAddNew();
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
            {/* Form Column */}
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingBahan ? 'Edit Bahan' : 'Tambah Bahan'}
                    </h3>
                    {editingBahan && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Bahan</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="harga_end_customer" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga End Customer</label>
                                <input type="number" name="harga_end_customer" id="harga_end_customer" value={formData.harga_end_customer} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label htmlFor="harga_retail" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Retail</label>
                                <input type="number" name="harga_retail" id="harga_retail" value={formData.harga_retail} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label htmlFor="harga_grosir" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Grosir</label>
                                <input type="number" name="harga_grosir" id="harga_grosir" value={formData.harga_grosir} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label htmlFor="harga_reseller" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Reseller</label>
                                <input type="number" name="harga_reseller" id="harga_reseller" value={formData.harga_reseller} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                             <div className="md:col-span-2">
                                <label htmlFor="harga_corporate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Corporate</label>
                                <input type="number" name="harga_corporate" id="harga_corporate" value={formData.harga_corporate} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                           <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingBahan ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Bahan</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Bahan</th>
                                <th scope="col" className="px-6 py-3 text-right">End Customer</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentBahanList.map((bahan) => (
                                <tr key={bahan.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingBahan?.id === bahan.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{bahan.name}</th>
                                    <td data-label="End Customer" className="px-6 py-4 text-right">{formatCurrency(bahan.harga_end_customer)}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(bahan)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(bahan.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default BahanManagement;