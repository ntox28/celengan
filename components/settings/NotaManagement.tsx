
import React, { useState, useEffect } from 'react';
import { NotaSetting } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';

interface NotaManagementProps {
    settings: NotaSetting;
    onUpdate: (settings: NotaSetting) => void;
}

const NotaManagement: React.FC<NotaManagementProps> = ({ settings, onUpdate }) => {
    const [formData, setFormData] = useState(settings);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        onUpdate(formData);
        // We call the toast directly from the hook which already shows a success message.
        setIsLoading(false);
    };

    const exampleNota = `${formData.prefix}-${formData.start_number_str}`;

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Pengaturan Penomoran Nota</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Atur format nomor nota otomatis yang akan dibuat saat order baru.</p>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="prefix" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Kode Nota (Prefix)</label>
                        <input
                            type="text"
                            name="prefix"
                            id="prefix"
                            value={formData.prefix}
                            onChange={handleInputChange}
                            required
                            className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="cth: INV, NTA, F"
                        />
                        <p className="text-xs text-slate-400 mt-1">Kode awalan untuk nomor nota. Contoh: INV</p>
                    </div>
                    <div>
                        <label htmlFor="start_number_str" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Mulai Nomor</label>
                        <input
                            type="text"
                            name="start_number_str"
                            id="start_number_str"
                            value={formData.start_number_str}
                            onChange={handleInputChange}
                            required
                            pattern="\d+"
                            title="Harus berupa angka"
                            className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="cth: 1, 001, 1000"
                        />
                        <p className="text-xs text-slate-400 mt-1">Nomor awal. Jumlah digit menentukan padding (misal: '001' akan membuat nomor berikutnya '002').</p>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg border border-slate-200 dark:border-slate-600">
                        <p className="text-sm text-slate-600 dark:text-slate-300">Contoh nomor nota pertama:</p>
                        <p className="font-mono font-bold text-lg text-pink-600 dark:text-pink-400 mt-1">{exampleNota}</p>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button type="submit" disabled={isLoading} className="px-8 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-400">
                            {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NotaManagement;
