import React, { useState, useCallback } from 'react';
import { supabase, CustomerLevel, Database } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import DownloadIcon from '../icons/DownloadIcon';
import UploadIcon from '../icons/UploadIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';

declare const XLSX: any;

const tablesToBackup: (keyof Database['public']['Tables'])[] = [
    'customers', 'employees', 'bahan', 'expenses', 'orders', 'order_items', 'payments',
    'banks', 'assets', 'debts', 'suppliers', 'stock_movements', 'finishings', 
    'settings', 'printers', 'display_settings'
];

type InsertPayload<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert'];

const DataManagement: React.FC = () => {
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExcelImporting, setIsExcelImporting] = useState(false);
    const [importFile, setImportFile] = useState<File | null>(null);
    const [excelFile, setExcelFile] = useState<File | null>(null);
    const { addToast } = useToast();

    const handleExport = useCallback(async () => {
        setIsExporting(true);
        addToast('Memulai proses ekspor data...', 'info');

        try {
            const backupData: Record<string, any[]> = {};
            for (const table of tablesToBackup) {
                const { data, error } = await supabase.from(table).select('*');
                if (error) throw new Error(`Gagal mengambil data dari tabel ${table}: ${error.message}`);
                backupData[table] = data;
            }
            
            const jsonString = JSON.stringify(backupData, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `celengan_backup_${date}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            addToast('Ekspor data berhasil!', 'success');
        } catch (error: any) {
            console.error("Export failed:", error);
            addToast(`Ekspor Gagal: ${error.message}`, 'error');
        } finally {
            setIsExporting(false);
        }
    }, [addToast]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'application/json') {
            setImportFile(file);
        } else {
            addToast('Harap pilih file .json yang valid.', 'error');
            setImportFile(null);
        }
    };

    const handleExcelFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel'];
        if (file && validTypes.includes(file.type)) {
            setExcelFile(file);
        } else {
            addToast('Harap pilih file .xlsx yang valid.', 'error');
            setExcelFile(null);
        }
    };

    const handleImport = async () => {
        if (!importFile) {
            addToast('Tidak ada file yang dipilih untuk diimpor.', 'error');
            return;
        }

        const confirmation = window.prompt("Operasi ini akan MENGHAPUS SEMUA DATA saat ini dan menggantinya. Tindakan ini tidak dapat diurungkan. Ketik 'IMPOR DATA' untuk melanjutkan.");
        if (confirmation !== 'IMPOR DATA') {
            addToast('Proses impor dibatalkan.', 'info');
            return;
        }

        setIsImporting(true);
        addToast('Memulai proses impor data...', 'info');

        try {
            const fileContent = await importFile.text();
            const backupData = JSON.parse(fileContent);

            const { error } = await supabase.rpc('import_backup_data', { backup_data: backupData });

            if (error) {
                throw new Error(error.message);
            }

            addToast('Impor data berhasil! Aplikasi akan dimuat ulang.', 'success');
            setTimeout(() => window.location.reload(), 2000);
        } catch (error: any) {
            console.error("Import failed:", error);
            addToast(`Impor Gagal: ${error.message}`, 'error');
        } finally {
            setIsImporting(false);
            setImportFile(null);
        }
    };
    
    const handleDownloadTemplate = () => {
        const wb = XLSX.utils.book_new();

        // Customers Sheet
        const customersHeader = [['Nama', 'Level', 'Email', 'Telepon', 'Alamat']];
        const customersData = [...customersHeader, ['John Doe', 'End Customer', 'john@example.com', '08123456789', 'Jl. Contoh No. 1']];
        const customersWS = XLSX.utils.aoa_to_sheet(customersData);
        XLSX.utils.book_append_sheet(wb, customersWS, 'Pelanggan');

        // Bahan Sheet
        const bahanHeader = [['Nama Bahan', 'Harga End Customer', 'Harga Retail', 'Harga Grosir', 'Harga Reseller', 'Harga Corporate']];
        const bahanData = [...bahanHeader, ['Flexi 280g', 25000, 24000, 23000, 22000, 20000]];
        const bahanWS = XLSX.utils.aoa_to_sheet(bahanData);
        XLSX.utils.book_append_sheet(wb, bahanWS, 'Bahan');

        // Supplier Sheet
        const suppliersHeader = [['Nama Suplier', 'Kontak Person', 'Telepon', 'Spesialisasi']];
        const suppliersData = [...suppliersHeader, ['PT. Tinta Abadi', 'Budi', '08987654321', 'Tinta & Bahan Cetak']];
        const suppliersWS = XLSX.utils.aoa_to_sheet(suppliersData);
        XLSX.utils.book_append_sheet(wb, suppliersWS, 'Suplier');

        // Finishing Sheet
        const finishingHeader = [['Nama Finishing', 'Panjang Tambahan (m)', 'Lebar Tambahan (m)']];
        const finishingData = [...finishingHeader, ['Lipat Pinggir', 0.05, 0.05]];
        const finishingWS = XLSX.utils.aoa_to_sheet(finishingData);
        XLSX.utils.book_append_sheet(wb, finishingWS, 'Finishing');

        XLSX.writeFile(wb, 'celengan_import_template.xlsx');
        addToast('Template berhasil diunduh.', 'success');
    };

    const handleExcelImport = async () => {
        if (!excelFile) {
            addToast('Tidak ada file Excel yang dipilih.', 'error');
            return;
        }

        setIsExcelImporting(true);
        addToast('Membaca file Excel...', 'info');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let summary = [];

                // Process Customers
                const customersSheet = workbook.Sheets['Pelanggan'];
                if (customersSheet) {
                    const customersData = XLSX.utils.sheet_to_json(customersSheet) as any[];
                    const customersPayload: InsertPayload<'customers'>[] = customersData.map(row => ({
                        name: String(row['Nama'] || ''),
                        level: row['Level'] as CustomerLevel || 'End Customer',
                        email: String(row['Email'] || ''),
                        phone: String(row['Telepon'] || ''),
                        address: String(row['Alamat'] || ''),
                    })).filter(p => p.name && p.email);
                    if(customersPayload.length > 0) {
                        const { error } = await supabase.from('customers').insert(customersPayload as any);
                        if(error) throw new Error(`Pelanggan: ${error.message}`);
                        summary.push(`${customersPayload.length} pelanggan`);
                    }
                }
                
                // Process Bahan
                const bahanSheet = workbook.Sheets['Bahan'];
                if(bahanSheet) {
                    const bahanData = XLSX.utils.sheet_to_json(bahanSheet) as any[];
                    const bahanPayload: InsertPayload<'bahan'>[] = bahanData.map(row => ({
                        name: String(row['Nama Bahan'] || ''),
                        harga_end_customer: Number(row['Harga End Customer'] || 0),
                        harga_retail: Number(row['Harga Retail'] || 0),
                        harga_grosir: Number(row['Harga Grosir'] || 0),
                        harga_reseller: Number(row['Harga Reseller'] || 0),
                        harga_corporate: Number(row['Harga Corporate'] || 0),
                        stock_qty: 0,
                    })).filter(b => b.name);
                    if(bahanPayload.length > 0) {
                        const { error } = await supabase.from('bahan').insert(bahanPayload as any);
                        if(error) throw new Error(`Bahan: ${error.message}`);
                        summary.push(`${bahanPayload.length} bahan`);
                    }
                }

                // Process Suppliers
                const suppliersSheet = workbook.Sheets['Suplier'];
                if(suppliersSheet) {
                    const suppliersData = XLSX.utils.sheet_to_json(suppliersSheet) as any[];
                    const suppliersPayload: InsertPayload<'suppliers'>[] = suppliersData.map(row => ({
                        name: String(row['Nama Suplier'] || ''),
                        contact_person: String(row['Kontak Person'] || null),
                        phone: String(row['Telepon'] || null),
                        specialty: String(row['Spesialisasi'] || null),
                    })).filter(s => s.name);
                     if(suppliersPayload.length > 0) {
                        const { error } = await supabase.from('suppliers').insert(suppliersPayload as any);
                        if(error) throw new Error(`Suplier: ${error.message}`);
                        summary.push(`${suppliersPayload.length} suplier`);
                    }
                }

                // Process Finishings
                const finishingSheet = workbook.Sheets['Finishing'];
                if(finishingSheet) {
                    const finishingData = XLSX.utils.sheet_to_json(finishingSheet) as any[];
                    const finishingPayload: InsertPayload<'finishings'>[] = finishingData.map(row => ({
                        name: String(row['Nama Finishing'] || ''),
                        panjang_tambahan: Number(row['Panjang Tambahan (m)'] || 0),
                        lebar_tambahan: Number(row['Lebar Tambahan (m)'] || 0),
                    })).filter(f => f.name);
                    if(finishingPayload.length > 0) {
                        const { error } = await supabase.from('finishings').insert(finishingPayload as any);
                        if(error) throw new Error(`Finishing: ${error.message}`);
                        summary.push(`${finishingPayload.length} finishing`);
                    }
                }
                
                addToast(`Impor berhasil: ${summary.join(', ')}. Aplikasi akan dimuat ulang.`, 'success');
                setTimeout(() => window.location.reload(), 2000);

            } catch (error: any) {
                 addToast(`Impor Gagal: ${error.message}`, 'error');
            } finally {
                setIsExcelImporting(false);
                setExcelFile(null);
            }
        };
        reader.readAsArrayBuffer(excelFile);
    };


    return (
        <div className="space-y-8">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Impor Data Massal dari Excel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Gunakan fitur ini untuk menambah data pelanggan, bahan, suplier, dan finishing secara massal. Fitur ini hanya untuk <strong className="uppercase">menambah data baru</strong>, bukan memperbarui data yang sudah ada.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300 font-bold text-xl mb-3">1</div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Unduh Template</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Dapatkan file Excel dengan format kolom yang benar.</p>
                        <button onClick={handleDownloadTemplate} className="w-full text-sm flex justify-center items-center gap-2 px-4 py-2 rounded-lg text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/50 hover:bg-pink-200 dark:hover:bg-pink-900 transition-colors">
                            <DownloadIcon className="w-4 h-4" /> Unduh Template
                        </button>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300 font-bold text-xl mb-3">2</div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Isi & Unggah File</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Salin data Anda ke template, simpan, lalu unggah di sini.</p>
                         <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={handleExcelFileChange}
                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-100 dark:hover:file:bg-slate-600"
                        />
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-pink-100 dark:bg-pink-900/50 text-pink-600 dark:text-pink-300 font-bold text-xl mb-3">3</div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Impor Data</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">Klik untuk memulai proses penambahan data baru ke sistem.</p>
                        <button onClick={handleExcelImport} disabled={isExcelImporting || !excelFile} className="w-full text-sm flex justify-center items-center gap-2 px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">
                             {isExcelImporting ? 'Mengimpor...' : 'Impor dari Excel'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Ekspor Data Cadangan (JSON)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Simpan salinan semua data (termasuk transaksi) ke dalam satu file JSON.</p>
                    <button
                        onClick={handleExport}
                        disabled={isExporting}
                        className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg text-white bg-cyan-600 hover:bg-cyan-700 transition-colors disabled:bg-cyan-300"
                    >
                        {isExporting ? (
                            <>
                                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Mengekspor...
                            </>
                        ) : (
                            <>
                                <DownloadIcon className="w-5 h-5" />
                                Ekspor Cadangan Lengkap
                            </>
                        )}
                    </button>
                </div>

                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Impor & Pulihkan (JSON)</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Pulihkan data dari file cadangan JSON.</p>
                    
                    <div className="bg-red-100 dark:bg-red-900/40 border-l-4 border-red-500 text-red-700 dark:text-red-200 p-4 mb-6" role="alert">
                        <div className="flex">
                            <div className="py-1"><ExclamationCircleIcon className="w-6 h-6 text-red-500 mr-4"/></div>
                            <div>
                                <p className="font-bold">PERINGATAN!</p>
                                <p className="text-sm">Tindakan ini akan <strong className="uppercase">menghapus semua data yang ada</strong> dan menggantinya dengan data dari file cadangan.</p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <input
                            type="file"
                            accept=".json"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-slate-50 dark:file:bg-slate-700 file:text-slate-700 dark:file:text-slate-300 hover:file:bg-slate-100 dark:hover:file:bg-slate-600"
                        />
                        <button
                            onClick={handleImport}
                            disabled={isImporting || !importFile}
                            className="w-full flex justify-center items-center gap-2 px-6 py-3 rounded-lg text-white bg-red-600 hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                        >
                            {isImporting ? (
                                 <>
                                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    Mengimpor...
                                </>
                            ) : (
                                <>
                                    <UploadIcon className="w-5 h-5" />
                                    Impor & Ganti Semua Data
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DataManagement;