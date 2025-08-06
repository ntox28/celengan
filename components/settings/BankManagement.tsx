import React, { useState, useRef } from 'react';
import { Bank } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';

interface BankManagementProps {
    banks: Bank[];
    addBank: (data: Omit<Bank, 'id' | 'created_at'>) => Promise<void>;
    updateBank: (id: number, data: Partial<Omit<Bank, 'id' | 'created_at'>>) => Promise<void>;
    deleteBank: (id: number) => Promise<void>;
}

type BankCategory = 'Bank' | 'Digital Wallet' | 'Qris';

const getCategoryColor = (category: BankCategory) => {
    const colors: Record<BankCategory, string> = {
        'Bank': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Digital Wallet': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Qris': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[category] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
};

const initialFormData: Omit<Bank, 'id' | 'created_at'> = { name: '', account_holder: '', account_number: '', category: 'Bank' };

const BankManagement: React.FC<BankManagementProps> = ({ banks, addBank, updateBank, deleteBank }) => {
    const [editingBank, setEditingBank] = useState<Bank | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handleEdit = (bank: Bank) => {
        setEditingBank(bank);
        setFormData({
            name: bank.name,
            account_holder: bank.account_holder,
            account_number: bank.account_number,
            category: bank.category
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingBank(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingBank) {
                await updateBank(editingBank.id, formData);
            } else {
                await addBank(formData);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save bank:", error);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleDelete = async (bankId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus sumber dana ini?')) {
            await deleteBank(bankId);
            if (editingBank?.id === bankId) {
                handleAddNew();
            }
        }
    };

    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                 <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingBank ? 'Edit Sumber Dana' : 'Tambah Sumber Dana'}
                    </h3>
                    {editingBank && (
                         <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                         </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="category" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Kategori</label>
                        <select name="category" id="category" value={formData.category} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                            <option value="Bank">Bank</option>
                            <option value="Digital Wallet">Digital Wallet</option>
                            <option value="Qris">Qris</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" placeholder={formData.category === 'Bank' ? 'cth: BRI, BCA' : 'cth: Gopay, Dana'} />
                    </div>
                    <div>
                        <label htmlFor="account_holder" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Pemilik</label>
                        <input type="text" name="account_holder" id="account_holder" value={formData.account_holder} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                    </div>
                    <div>
                        <label htmlFor="account_number" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nomor / ID</label>
                        <input type="text" name="account_number" id="account_number" value={formData.account_number} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingBank ? 'Simpan Perubahan' : 'Simpan')}</button>
                    </div>
                </form>
            </div>
            
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Sumber Dana</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3">Kategori</th>
                                <th scope="col" className="px-6 py-3">Pemilik</th>
                                <th scope="col" className="px-6 py-3">No. Rekening/ID</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {banks.map((bank) => (
                                <tr key={bank.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingBank?.id === bank.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{bank.name}</th>
                                    <td data-label="Kategori" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getCategoryColor(bank.category)}`}>
                                            {bank.category}
                                        </span>
                                    </td>
                                    <td data-label="Pemilik" className="px-6 py-4">{bank.account_holder}</td>
                                    <td data-label="No. Rekening/ID" className="px-6 py-4">{bank.account_number}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(bank)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(bank.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
      </div>
    );
};

export default BankManagement;