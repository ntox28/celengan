import React, { useState, useMemo } from 'react';
import { Bahan, Supplier, StockMovement, StockMovementType } from '../../lib/supabaseClient';
import Pagination from '../Pagination';
import DocumentReportIcon from '../icons/DocumentReportIcon';

interface StockManagementProps {
    bahanList: Bahan[];
    suppliers: Supplier[];
    stockMovements: StockMovement[];
}

const StockManagement: React.FC<StockManagementProps> = ({ bahanList, suppliers, stockMovements }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedBahan, setSelectedBahan] = useState<Bahan | null>(null);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(bahanList.length / ITEMS_PER_PAGE);
    const currentBahanList = bahanList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleViewHistory = (bahan: Bahan) => {
        setSelectedBahan(bahan);
        setIsHistoryModalOpen(true);
    };
    
    const historyForSelectedBahan = useMemo(() => {
        if (!selectedBahan) return [];
        return stockMovements
            .filter(m => m.bahan_id === selectedBahan.id)
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [selectedBahan, stockMovements]);

    return (
        <>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Stok Bahan Terkini</h2>
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nama Bahan</th>
                            <th scope="col" className="px-6 py-3 text-right">Sisa Stok (m²)</th>
                            <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                        {currentBahanList.map((bahan) => (
                            <tr key={bahan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{bahan.name}</th>
                                <td data-label="Sisa Stok" className="px-6 py-4 text-right font-bold text-lg">{bahan.stock_qty?.toFixed(2) || '0.00'}</td>
                                <td data-label="Aksi" className="px-6 py-4 text-center">
                                    <button onClick={() => handleViewHistory(bahan)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                        Lihat Riwayat
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>

        {isHistoryModalOpen && selectedBahan && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setIsHistoryModalOpen(false)}>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex-shrink-0">Riwayat Stok: {selectedBahan.name}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 flex-shrink-0">Total Stok Saat Ini: <span className="font-bold text-pink-600">{selectedBahan.stock_qty?.toFixed(2) || '0.00'} m²</span></p>

                    <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                        {historyForSelectedBahan.length > 0 ? (
                            <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0">
                                    <tr>
                                        <th scope="col" className="px-4 py-2">Tanggal</th>
                                        <th scope="col" className="px-4 py-2">Tipe</th>
                                        <th scope="col" className="px-4 py-2 text-right">Jumlah (m²)</th>
                                        <th scope="col" className="px-4 py-2">Suplier/Catatan</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {historyForSelectedBahan.map(m => (
                                        <tr key={m.id}>
                                            <td className="px-4 py-3 whitespace-nowrap">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                                            <td className="px-4 py-3">
                                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${m.type === 'in' ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'}`}>
                                                    {m.type === 'in' ? 'Masuk' : 'Keluar'}
                                                </span>
                                            </td>
                                            <td className={`px-4 py-3 text-right font-semibold ${m.type === 'in' ? 'text-green-600' : 'text-red-600'}`}>
                                                {m.type === 'in' ? '+' : '-'}{m.quantity.toFixed(2)}
                                            </td>
                                            <td className="px-4 py-3">
                                                {m.supplier_id ? `Dari: ${suppliers.find(s=>s.id === m.supplier_id)?.name || 'N/A'}` : ''}
                                                {m.notes ? <p className="text-xs text-slate-500 italic">{m.notes}</p> : ''}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="text-center py-10">
                                <p className="text-slate-500">Belum ada riwayat pergerakan stok untuk bahan ini.</p>
                            </div>
                        )}
                    </div>

                    <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex justify-end">
                        <button onClick={() => setIsHistoryModalOpen(false)} className="px-6 py-2 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                            Tutup
                        </button>
                    </div>
                </div>
            </div>
        )}
        </>
    );
};

export default StockManagement;