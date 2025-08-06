
import React, { useState, useRef } from 'react';
import { Supplier } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';

interface SupplierManagementProps {
    suppliers: Supplier[];
    addSupplier: (data: Omit<Supplier, 'id' | 'created_at'>) => Promise<void>;
    updateSupplier: (id: number, data: Partial<Omit<Supplier, 'id' | 'created_at'>>) => Promise<void>;
    deleteSupplier: (id: number) => Promise<void>;
}

const initialFormData: Omit<Supplier, 'id' | 'created_at'> = { name: '', contact_person: '', phone: '', specialty: '' };

const SupplierManagement: React.FC<SupplierManagementProps> = ({ suppliers, addSupplier, updateSupplier, deleteSupplier }) => {
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(suppliers.length / ITEMS_PER_PAGE);
    const currentSuppliers = suppliers.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (supplier: Supplier) => {
        setEditingSupplier(supplier);
        setFormData({
            name: supplier.name,
            contact_person: supplier.contact_person || '',
            phone: supplier.phone || '',
            specialty: supplier.specialty || '',
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingSupplier(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingSupplier) {
                await updateSupplier(editingSupplier.id, formData);
            } else {
                await addSupplier(formData);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save supplier:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (supplierId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus suplier ini?')) {
            await deleteSupplier(supplierId);
            if (editingSupplier?.id === supplierId) {
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
                        {editingSupplier ? 'Edit Suplier' : 'Tambah Suplier'}
                    </h3>
                    {editingSupplier && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Suplier</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div>
                            <label htmlFor="contact_person" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Kontak Person</label>
                            <input type="text" name="contact_person" id="contact_person" value={formData.contact_person || ''} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Telepon</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div>
                            <label htmlFor="specialty" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Spesialisasi</label>
                            <input type="text" name="specialty" id="specialty" value={formData.specialty || ''} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" />
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                            <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingSupplier ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Suplier</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3">Telepon</th>
                                <th scope="col" className="px-6 py-3">Spesialisasi</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentSuppliers.map((supplier) => (
                                <tr key={supplier.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingSupplier?.id === supplier.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{supplier.name}</th>
                                    <td data-label="Telepon" className="px-6 py-4">{supplier.phone}</td>
                                    <td data-label="Spesialisasi" className="px-6 py-4">{supplier.specialty}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(supplier)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(supplier.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
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

export default SupplierManagement;
