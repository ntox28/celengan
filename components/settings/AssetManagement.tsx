import React, { useState, useRef } from 'react';
import { Asset, AssetCategory, AssetStatus } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';

interface AssetManagementProps {
    assets: Asset[];
    addAsset: (data: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>) => Promise<Asset>;
    updateAsset: (id: number, data: Partial<Omit<Asset, 'id'|'created_at'|'is_dynamic'>>) => Promise<void>;
    deleteAsset: (id: number) => Promise<void>;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatDate = (isoDate: string) => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getCategoryColor = (category: AssetCategory) => {
    const colors: Record<AssetCategory, string> = {
        'Aset Lancar': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Aset Tetap': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Aset Tidak Terwujud': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Aset Lainnya': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return colors[category];
};

const getStatusColor = (status: AssetStatus) => {
    const colors: Record<AssetStatus, string> = {
        'Baik': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Perbaikan': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Rusak': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Dijual': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
    };
    return colors[status];
};

const initialFormData: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'> = {
    name: '',
    category: 'Aset Tetap',
    purchase_price: 0,
    purchase_date: new Date().toISOString().split('T')[0],
    status: 'Baik'
};

const AssetManagement: React.FC<AssetManagementProps> = ({ assets, addAsset, updateAsset, deleteAsset }) => {
    const [editingAsset, setEditingAsset] = useState<Asset | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(assets.length / ITEMS_PER_PAGE);
    const currentAssets = assets.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (asset: Asset) => {
        if (asset.is_dynamic) return;
        setEditingAsset(asset);
        setFormData({
            name: asset.name,
            category: asset.category,
            purchase_price: asset.purchase_price,
            purchase_date: asset.purchase_date,
            status: asset.status,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingAsset(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingAsset) {
                await updateAsset(editingAsset.id, formData);
            } else {
                await addAsset(formData);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save asset:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (assetId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus aset ini?')) {
            await deleteAsset(assetId);
            if (editingAsset?.id === assetId) {
                handleAddNew();
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Form Column */}
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingAsset ? 'Edit Aset' : 'Tambah Aset'}
                    </h3>
                    {editingAsset && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Aset</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Kategori Aset</label>
                            <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                <option value="Aset Lancar">Aset Lancar</option>
                                <option value="Aset Tetap">Aset Tetap</option>
                                <option value="Aset Tidak Terwujud">Aset Tidak Terwujud</option>
                                <option value="Aset Lainnya">Aset Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="purchase_price" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Beli</label>
                            <input type="number" name="purchase_price" id="purchase_price" value={formData.purchase_price} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label htmlFor="purchase_date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Beli</label>
                            <input type="date" name="purchase_date" id="purchase_date" value={formData.purchase_date} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status</label>
                             <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                <option value="Baik">Baik</option>
                                <option value="Perbaikan">Perbaikan</option>
                                <option value="Rusak">Rusak</option>
                                <option value="Dijual">Dijual</option>
                            </select>
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                            <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingAsset ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Aset Perusahaan</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama Aset</th>
                                <th scope="col" className="px-6 py-3">Kategori</th>
                                <th scope="col" className="px-6 py-3 text-right">Nilai/Harga Beli</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentAssets.map((asset) => (
                                <tr key={asset.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingAsset?.id === asset.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{asset.name}</th>
                                    <td data-label="Kategori" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(asset.category)}`}>
                                            {asset.category}
                                        </span>
                                    </td>
                                    <td data-label="Nilai" className="px-6 py-4 text-right">{formatCurrency(asset.purchase_price)}</td>
                                    <td data-label="Status" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(asset.status)}`}>
                                            {asset.status}
                                        </span>
                                    </td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(asset)} disabled={asset.is_dynamic} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(asset.id)} disabled={asset.is_dynamic} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed">
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

export default AssetManagement;