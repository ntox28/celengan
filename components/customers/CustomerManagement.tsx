
import React, { useState, useEffect, useRef, useMemo } from 'react';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';
import { useToast } from '../../hooks/useToast';
import { Customer, CustomerLevel } from '../../lib/supabaseClient';
import SearchIcon from '../icons/SearchIcon';

interface CustomerManagementProps {
    customers: Customer[];
    addCustomer: (data: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
    updateCustomer: (id: number, data: Partial<Omit<Customer, 'id' | 'created_at'>>) => Promise<void>;
    deleteCustomer: (id: number) => Promise<void>;
}

const getLevelColor = (level: CustomerLevel) => {
    const colors: Record<CustomerLevel, string> = {
        'End Customer': 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
        'Retail': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
        'Grosir': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Reseller': 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300',
        'Corporate': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
    };
    return colors[level] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
};

const initialFormData: Omit<Customer, 'id' | 'created_at'> = { name: '', email: '', phone: '', address: '', level: 'End Customer' as CustomerLevel };

const CustomerManagement: React.FC<CustomerManagementProps> = ({ customers, addCustomer, updateCustomer, deleteCustomer }) => {
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);
    
    useEffect(() => {
        setCurrentPage(1);
    }, [searchQuery]);

    const filteredCustomers = useMemo(() => {
        if (!searchQuery) {
            return customers;
        }
        const lowercasedQuery = searchQuery.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedQuery) ||
            customer.email.toLowerCase().includes(lowercasedQuery) ||
            customer.phone.toLowerCase().includes(lowercasedQuery)
        );
    }, [customers, searchQuery]);

    const totalPages = Math.ceil(filteredCustomers.length / ITEMS_PER_PAGE);
    const currentCustomers = filteredCustomers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer);
        setFormData({
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            address: customer.address,
            level: customer.level,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingCustomer(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const customerData: Omit<Customer, 'id' | 'created_at'> = {
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            level: formData.level
        };

        try {
            if (editingCustomer) {
                await updateCustomer(editingCustomer.id, customerData);
            } else {
                await addCustomer(customerData);
                handleAddNew();
            }
        } catch (error) {
            console.error("Failed to save customer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (customerId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pelanggan ini?')) {
            await deleteCustomer(customerId);
            if (editingCustomer?.id === customerId) {
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
                        {editingCustomer ? 'Edit Pelanggan' : 'Tambah Pelanggan'}
                    </h3>
                    {editingCustomer && (
                         <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                         </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div>
                            <label htmlFor="level" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Level Pelanggan</label>
                            <select
                                name="level"
                                id="level"
                                value={formData.level}
                                onChange={handleInputChange}
                                required
                                className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em'
                                }}
                            >
                                <option value="End Customer">End Customer</option>
                                <option value="Retail">Retail</option>
                                <option value="Grosir">Grosir</option>
                                <option value="Reseller">Reseller</option>
                                <option value="Corporate">Corporate</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                            <input type="email" name="email" id="email" value={formData.email} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nomor Telepon</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div>
                            <label htmlFor="address" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Alamat</label>
                            <textarea name="address" id="address" value={formData.address} onChange={handleInputChange} required rows={3} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"></textarea>
                        </div>
                         <div className="flex justify-end pt-4 flex-shrink-0">
                            <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingCustomer ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Daftar Pelanggan</h2>
                    <div className="relative w-full sm:w-auto sm:max-w-xs">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-slate-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Cari pelanggan..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-pink-500 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500 transition duration-300"
                        />
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3">Level</th>
                                <th scope="col" className="px-6 py-3 hidden md:table-cell">Email</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentCustomers.map((customer) => (
                                <tr
                                    key={customer.id}
                                    className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingCustomer?.id === customer.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
                                >
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{customer.name}</th>
                                    <td data-label="Level" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getLevelColor(customer.level)}`}>
                                            {customer.level}
                                        </span>
                                    </td>
                                    <td data-label="Email" className="px-6 py-4 hidden md:table-cell">{customer.email}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(customer)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredCustomers.length === 0 && (
                        <div className="text-center py-10">
                            <p className="text-slate-500">Tidak ada pelanggan yang cocok dengan pencarian '{searchQuery}'.</p>
                        </div>
                    )}
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default CustomerManagement;
