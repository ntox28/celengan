
import React, { useState, useRef } from 'react';
import { Finishing } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';

interface FinishingManagementProps {
    finishings: Finishing[];
    addFinishing: (data: Omit<Finishing, 'id' | 'created_at'>) => void;
    updateFinishing: (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => void;
    deleteFinishing: (id: number) => void;
}

const initialFormData: Omit<Finishing, 'id' | 'created_at'> = {
    name: '',
    panjang_tambahan: 0,
    lebar_tambahan: 0
};

const FinishingManagement: React.FC<FinishingManagementProps> = ({ finishings, addFinishing, updateFinishing, deleteFinishing }) => {
    const [editingFinishing, setEditingFinishing] = useState<Finishing | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handleEdit = (finishing: Finishing) => {
        setEditingFinishing(finishing);
        setFormData({
            name: finishing.name,
            panjang_tambahan: finishing.panjang_tambahan,
            lebar_tambahan: finishing.lebar_tambahan,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingFinishing(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) || 0 : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        if (editingFinishing) {
            updateFinishing(editingFinishing.id, formData);
        } else {
            addFinishing(formData);
            handleAddNew();
        }
        setIsLoading(false);
    };

    const handleDelete = (id: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus jenis finishing ini?')) {
            deleteFinishing(id);
            if (editingFinishing?.id === id) {
                handleAddNew();
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingFinishing ? 'Edit Finishing' : 'Tambah Finishing'}
                    </h3>
                    {editingFinishing && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Finishing</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" placeholder="cth: Lipat Pinggir, Laminasi" />
                    </div>
                    <div>
                        <label htmlFor="panjang_tambahan" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Panjang Tambahan (meter)</label>
                        <input type="number" name="panjang_tambahan" id="panjang_tambahan" value={formData.panjang_tambahan} onChange={handleInputChange} step="0.01" required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                        <p className="text-xs text-slate-400 mt-1">Tambahan bahan untuk sisi panjang. Isi 0 jika tidak ada.</p>
                    </div>
                    <div>
                        <label htmlFor="lebar_tambahan" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Lebar Tambahan (meter)</label>
                        <input type="number" name="lebar_tambahan" id="lebar_tambahan" value={formData.lebar_tambahan} onChange={handleInputChange} step="0.01" required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                         <p className="text-xs text-slate-400 mt-1">Tambahan bahan untuk sisi lebar. Isi 0 jika tidak ada.</p>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingFinishing ? 'Simpan Perubahan' : 'Simpan')}</button>
                    </div>
                </form>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Jenis Finishing</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3 text-right">Panjang Tambahan</th>
                                <th scope="col" className="px-6 py-3 text-right">Lebar Tambahan</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {finishings.map((finishing) => (
                                <tr key={finishing.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingFinishing?.id === finishing.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{finishing.name}</th>
                                    <td className="px-6 py-4 text-right">{finishing.panjang_tambahan} m</td>
                                    <td className="px-6 py-4 text-right">{finishing.lebar_tambahan} m</td>
                                    <td className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(finishing)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(finishing.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
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

export default FinishingManagement;
