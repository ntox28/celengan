import React, { useState, useRef } from 'react';
import { Debt, DebtCategory, DebtStatus } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';

interface DebtManagementProps {
    debts: Debt[];
    addDebt: (data: Omit<Debt, 'id' | 'created_at'>) => Promise<void>;
    updateDebt: (id: number, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => Promise<void>;
    deleteDebt: (id: number) => Promise<void>;
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

const formatDate = (isoDate: string) => {
    if (!isoDate) return 'N/A';
    return new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getCategoryColor = (category: DebtCategory) => {
    const colors: Record<DebtCategory, string> = {
        'Pinjaman Bank': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Kredit Aset': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Hutang Pemasok': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Lainnya': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return colors[category];
};

const getStatusColor = (status: DebtStatus) => {
    const colors: Record<DebtStatus, string> = {
        'Belum Lunas': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Lunas Sebagian': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Lunas': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[status];
};

const initialFormData: Omit<Debt, 'id' | 'created_at'> = {
    creditor_name: '',
    category: 'Hutang Pemasok',
    description: '',
    total_amount: 0,
    due_date: new Date().toISOString().split('T')[0],
    status: 'Belum Lunas'
};

const DebtManagement: React.FC<DebtManagementProps> = ({ debts, addDebt, updateDebt, deleteDebt }) => {
    const [editingDebt, setEditingDebt] = useState<Debt | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(debts.length / ITEMS_PER_PAGE);
    const currentDebts = debts.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (debt: Debt) => {
        setEditingDebt(debt);
        setFormData({
            creditor_name: debt.creditor_name,
            category: debt.category,
            description: debt.description,
            total_amount: debt.total_amount,
            due_date: debt.due_date,
            status: debt.status,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingDebt(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingDebt) {
                await updateDebt(editingDebt.id, formData);
            } else {
                await addDebt(formData);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save debt:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (debtId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data hutang ini?')) {
            await deleteDebt(debtId);
            if (editingDebt?.id === debtId) {
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
                        {editingDebt ? 'Edit Hutang' : 'Tambah Hutang'}
                    </h3>
                    {editingDebt && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="creditor_name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Kreditur</label>
                            <input type="text" name="creditor_name" id="creditor_name" value={formData.creditor_name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div>
                            <label htmlFor="category" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Kategori Hutang</label>
                            <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                <option value="Hutang Pemasok">Hutang Pemasok</option>
                                <option value="Pinjaman Bank">Pinjaman Bank</option>
                                <option value="Kredit Aset">Kredit Aset</option>
                                <option value="Lainnya">Lainnya</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="description" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Deskripsi</label>
                            <textarea name="description" id="description" value={formData.description} onChange={handleInputChange} rows={2} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100"></textarea>
                        </div>
                        <div>
                            <label htmlFor="total_amount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Jumlah Total</label>
                            <input type="number" name="total_amount" id="total_amount" value={formData.total_amount} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label htmlFor="due_date" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Jatuh Tempo</label>
                            <input type="date" name="due_date" id="due_date" value={formData.due_date} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label htmlFor="status" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Status Pembayaran</label>
                             <select name="status" id="status" value={formData.status} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                <option value="Belum Lunas">Belum Lunas</option>
                                <option value="Lunas Sebagian">Lunas Sebagian</option>
                                <option value="Lunas">Lunas</option>
                            </select>
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                            <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingDebt ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Hutang Perusahaan</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Kreditur</th>
                                <th scope="col" className="px-6 py-3">Kategori</th>
                                <th scope="col" className="px-6 py-3 text-right">Jumlah</th>
                                <th scope="col" className="px-6 py-3">Jatuh Tempo</th>
                                <th scope="col" className="px-6 py-3">Status</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentDebts.map((debt) => (
                                <tr key={debt.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingDebt?.id === debt.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{debt.creditor_name}</th>
                                    <td data-label="Kategori" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(debt.category)}`}>
                                            {debt.category}
                                        </span>
                                    </td>
                                    <td data-label="Jumlah" className="px-6 py-4 text-right">{formatCurrency(debt.total_amount)}</td>
                                    <td data-label="Jatuh Tempo" className="px-6 py-4">{formatDate(debt.due_date)}</td>
                                    <td data-label="Status" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(debt.status)}`}>
                                            {debt.status}
                                        </span>
                                    </td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(debt)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(debt.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
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

export default DebtManagement;