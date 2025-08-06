import React, { useState, useEffect, useMemo, useRef } from 'react';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';
import { useToast } from '../../hooks/useToast';
import { Expense, ExpenseCategory, Supplier, Bahan } from '../../lib/supabaseClient';

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

interface ExpenseManagementProps {
    expenses: Expense[];
    suppliers: Supplier[];
    bahanList: Bahan[];
    addExpense: (data: Omit<Expense, 'id' | 'created_at'>) => Promise<void>;
    updateExpense: (id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>) => Promise<void>;
    deleteExpense: (id: number) => Promise<void>;
}

const getCategoryColor = (category: ExpenseCategory) => {
    const colors: Record<ExpenseCategory, string> = {
        'Bahan': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Konsumsi': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Bulanan': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Operasional': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Lain-lain': 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300',
    };
    return colors[category];
};

const initialFormData: Omit<Expense, 'id' | 'created_at'> = { 
    tanggal: new Date().toISOString().split('T')[0], 
    jenis_pengeluaran: 'Operasional', 
    keterangan: '',
    qty: 1, 
    harga: 0,
    bahan_id: null,
    supplier_id: null,
};

const ExpenseManagement: React.FC<ExpenseManagementProps> = ({ expenses, suppliers, bahanList, addExpense, updateExpense, deleteExpense }) => {
    const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
    const [formData, setFormData] = useState<Omit<Expense, 'id' | 'created_at'>>(initialFormData);
    const [totalHarga, setTotalHarga] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const sortedExpenses = useMemo(() => [...expenses].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()), [expenses]);

    const totalPages = Math.ceil(sortedExpenses.length / ITEMS_PER_PAGE);
    const currentExpenses = sortedExpenses.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setTotalHarga(formData.qty * formData.harga);
    }, [formData.qty, formData.harga]);

    useEffect(() => {
        // Reset bahan and supplier if type is not 'Bahan'
        if (formData.jenis_pengeluaran !== 'Bahan') {
            setFormData(prev => ({...prev, bahan_id: null, supplier_id: null}));
        }
    }, [formData.jenis_pengeluaran]);

    const handleEdit = (expense: Expense) => {
        setEditingExpense(expense);
        setFormData({
            tanggal: expense.tanggal,
            jenis_pengeluaran: expense.jenis_pengeluaran,
            keterangan: expense.keterangan,
            qty: expense.qty,
            harga: expense.harga,
            bahan_id: expense.bahan_id,
            supplier_id: expense.supplier_id,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };
    
    const handleAddNew = () => {
        setEditingExpense(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let processedValue: string | number | null = value;
        if (type === 'number' || name === 'bahan_id' || name === 'supplier_id') {
            processedValue = value === '' ? null : Number(value);
        }
        setFormData(prev => ({ ...prev, [name]: processedValue }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (formData.jenis_pengeluaran === 'Bahan' && (!formData.bahan_id || !formData.supplier_id)) {
            addToast('Untuk jenis "Bahan", nama bahan dan suplier harus diisi.', 'error');
            return;
        }

        setIsLoading(true);

        const payload = {
            ...formData,
            bahan_id: formData.jenis_pengeluaran === 'Bahan' ? formData.bahan_id : null,
            supplier_id: formData.jenis_pengeluaran === 'Bahan' ? formData.supplier_id : null,
        };

        try {
            if (editingExpense) {
                await updateExpense(editingExpense.id, payload);
            } else {
                await addExpense(payload);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save expense:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (expenseId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus data pengeluaran ini?')) {
            await deleteExpense(expenseId);
            if (editingExpense?.id === expenseId) {
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
                        {editingExpense ? 'Edit Pengeluaran' : 'Tambah Pengeluaran'}
                    </h3>
                    {editingExpense && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="tanggal" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal</label>
                            <input type="date" name="tanggal" id="tanggal" value={formData.tanggal} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        </div>
                        <div>
                            <label htmlFor="jenis_pengeluaran" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Jenis Pengeluaran</label>
                            <select name="jenis_pengeluaran" id="jenis_pengeluaran" value={formData.jenis_pengeluaran} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                <option value="Bahan">Bahan</option>
                                <option value="Konsumsi">Konsumsi</option>
                                <option value="Bulanan">Bulanan</option>
                                <option value="Operasional">Operasional</option>
                                <option value="Lain-lain">Lain-lain</option>
                            </select>
                        </div>
                        
                        {formData.jenis_pengeluaran === 'Bahan' && (
                            <>
                                <div>
                                    <label htmlFor="bahan_id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Bahan</label>
                                    <select name="bahan_id" id="bahan_id" value={formData.bahan_id || ''} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                        <option value="" disabled>Pilih Bahan</option>
                                        {bahanList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label htmlFor="supplier_id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Suplier</label>
                                    <select name="supplier_id" id="supplier_id" value={formData.supplier_id || ''} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                        <option value="" disabled>Pilih Suplier</option>
                                        {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </select>
                                </div>
                            </>
                        )}
                        
                        <div>
                            <label htmlFor="keterangan" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Keterangan</label>
                            <textarea name="keterangan" id="keterangan" value={formData.keterangan || ''} onChange={handleInputChange} required rows={2} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"></textarea>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label htmlFor="qty" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Qty</label>
                                <input type="number" name="qty" id="qty" value={formData.qty} onChange={handleInputChange} required min="1" className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                            <div>
                                <label htmlFor="harga" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Harga Satuan</label>
                                <input type="number" name="harga" id="harga" value={formData.harga} onChange={handleInputChange} required min="0" className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                            </div>
                        </div>
                        <div className="bg-slate-100 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg p-4 mt-4">
                            <div className="flex justify-between items-center">
                                <span className="text-slate-600 dark:text-slate-300 font-medium">Jumlah Harga:</span>
                                <span className="text-pink-600 font-bold text-xl">{formatCurrency(totalHarga)}</span>
                            </div>
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                           <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingExpense ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                 <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Pengeluaran</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Keterangan</th>
                                <th scope="col" className="px-6 py-3">Kategori</th>
                                <th scope="col" className="px-6 py-3 text-right">Jumlah Harga</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentExpenses.map((expense) => (
                                <tr key={expense.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingExpense?.id === expense.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                        {expense.keterangan}
                                        <p className="font-normal text-xs text-slate-500">{formatDate(expense.tanggal)}</p>
                                    </th>
                                    <td data-label="Kategori" className="px-6 py-4">
                                         <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(expense.jenis_pengeluaran)}`}>
                                            {expense.jenis_pengeluaran}
                                        </span>
                                    </td>
                                    <td data-label="Jumlah Harga" className="px-6 py-4 text-right font-semibold">{formatCurrency(expense.qty * expense.harga)}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(expense)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(expense.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
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

export default ExpenseManagement;