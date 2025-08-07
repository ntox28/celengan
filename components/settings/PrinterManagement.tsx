import React, { useState, useRef } from 'react';
import { Printer, PrintTarget, PrinterType } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';

interface PrinterManagementProps {
    printers: Printer[];
    addPrinter: (data: Omit<Printer, 'id' | 'created_at'>) => Promise<Printer>;
    updatePrinter: (id: number, data: Partial<Omit<Printer, 'id' | 'created_at'>>) => Promise<void>;
    deletePrinter: (id: number) => Promise<void>;
}

const initialFormData: Omit<Printer, 'id' | 'created_at'> = { name: '', type: 'Thermal 80mm', target: 'Struk', is_default: false };

const PrinterManagement: React.FC<PrinterManagementProps> = ({ printers, addPrinter, updatePrinter, deletePrinter }) => {
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
    const [formData, setFormData] = useState(initialFormData);
    const [isLoading, setIsLoading] = useState(false);
    const formRef = useRef<HTMLDivElement>(null);

    const handleEdit = (printer: Printer) => {
        setEditingPrinter(printer);
        setFormData({
            name: printer.name,
            type: printer.type,
            target: printer.target,
            is_default: printer.is_default,
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingPrinter(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type, checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (editingPrinter) {
                await updatePrinter(editingPrinter.id, formData);
            } else {
                await addPrinter(formData);
                handleAddNew();
            }
        } catch(error) {
            console.error("Failed to save printer:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (printerId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus printer ini?')) {
            await deletePrinter(printerId);
            if (editingPrinter?.id === printerId) {
                handleAddNew();
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingPrinter ? 'Edit Printer' : 'Tambah Printer'}
                    </h3>
                    {editingPrinter && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama Printer</label>
                        <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500" placeholder="cth: Printer Kasir" />
                    </div>
                    <div>
                        <label htmlFor="type" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tipe Printer</label>
                        <select name="type" id="type" value={formData.type} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                            <option value="Thermal 58mm">Thermal 58mm</option>
                            <option value="Thermal 80mm">Thermal 80mm</option>
                            <option value="Dot Matrix">Dot Matrix</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="target" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Target Cetak</label>
                        <select name="target" id="target" value={formData.target} onChange={handleInputChange} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                            <option value="SPK">SPK (Surat Perintah Kerja)</option>
                            <option value="Nota">Nota</option>
                            <option value="Struk">Struk</option>
                        </select>
                    </div>
                     <div className="flex items-center mt-4">
                        <input
                            id="is_default"
                            name="is_default"
                            type="checkbox"
                            checked={formData.is_default}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                        />
                        <label htmlFor="is_default" className="ml-2 block text-sm text-slate-700 dark:text-slate-300">
                            Jadikan printer default untuk target ini
                        </label>
                    </div>
                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingPrinter ? 'Simpan Perubahan' : 'Simpan')}</button>
                    </div>
                </form>
            </div>
            
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar Printer</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3">Tipe</th>
                                <th scope="col" className="px-6 py-3">Target</th>
                                <th scope="col" className="px-6 py-3 text-center">Default</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {printers.map((printer) => (
                                <tr key={printer.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingPrinter?.id === printer.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{printer.name}</th>
                                    <td data-label="Tipe" className="px-6 py-4">{printer.type}</td>
                                    <td data-label="Target" className="px-6 py-4">{printer.target}</td>
                                    <td data-label="Default" className="px-6 py-4 text-center">
                                        {printer.is_default && (
                                            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300">Ya</span>
                                        )}
                                    </td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(printer)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(printer.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
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

export default PrinterManagement;