import React, { useState, useMemo } from 'react';
import { Bahan } from '../../lib/supabaseClient';
import Pagination from '../Pagination';
import { useToast } from '../../hooks/useToast';

interface StockOpnameManagementProps {
    bahanList: Bahan[];
    updateBahanStock: (bahanId: number, newStockQty: number, notes: string) => Promise<void>;
}

const StockOpnameManagement: React.FC<StockOpnameManagementProps> = ({ bahanList, updateBahanStock }) => {
    const [opnameValues, setOpnameValues] = useState<Record<number, string>>({});
    const [isLoading, setIsLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;

    const sortedBahanList = useMemo(() => [...bahanList].sort((a, b) => a.name.localeCompare(b.name)), [bahanList]);
    const totalPages = Math.ceil(sortedBahanList.length / ITEMS_PER_PAGE);
    const currentBahanList = sortedBahanList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleInputChange = (bahanId: number, value: string) => {
        setOpnameValues(prev => ({ ...prev, [bahanId]: value }));
    };

    const changesToSave = useMemo(() => {
        return Object.entries(opnameValues)
            .map(([idStr, newValueStr]) => {
                const id = Number(idStr);
                const bahan = bahanList.find(b => b.id === id);
                if (!bahan || newValueStr === '') return null;

                const newStock = parseFloat(newValueStr);
                const oldStock = bahan.stock_qty || 0;
                
                // Compare with a small epsilon for floating point precision
                if (Math.abs(newStock - oldStock) > 0.001) {
                    return {
                        bahanId: id,
                        name: bahan.name,
                        oldStock: oldStock,
                        newStock: newStock,
                        difference: newStock - oldStock,
                    };
                }
                return null;
            })
            .filter(Boolean) as { bahanId: number; name: string; oldStock: number; newStock: number; difference: number }[];
    }, [opnameValues, bahanList]);

    const handleSave = async () => {
        if (changesToSave.length === 0) {
            addToast('Tidak ada perubahan untuk disimpan.', 'info');
            return;
        }

        setIsLoading(true);
        let successCount = 0;
        let errorCount = 0;

        for (const change of changesToSave) {
            try {
                await updateBahanStock(change.bahanId, change.newStock, 'Stock Opname Manual');
                successCount++;
            } catch (error) {
                console.error(`Failed to update stock for ${change.name}:`, error);
                errorCount++;
            }
        }

        setIsLoading(false);
        if (errorCount > 0) {
            addToast(`${successCount} stok berhasil diupdate, ${errorCount} gagal.`, 'error');
        } else {
            addToast(`Sebanyak ${successCount} stok bahan berhasil disesuaikan.`, 'success');
        }
        setOpnameValues({});
    };
    
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Stock Opname Bahan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Sesuaikan jumlah stok bahan berdasarkan perhitungan fisik. Perubahan akan tercatat di riwayat stok.</p>
            
            <div className="flex-1 overflow-y-auto -mx-6 px-6">
                <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3">Nama Bahan</th>
                            <th scope="col" className="px-6 py-3 text-right">Stok Sistem (m²)</th>
                            <th scope="col" className="px-6 py-3 text-center">Stok Fisik (Opname)</th>
                            <th scope="col" className="px-6 py-3 text-right">Selisih</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                        {currentBahanList.map((bahan) => {
                            const systemStock = bahan.stock_qty || 0;
                            const physicalStockStr = opnameValues[bahan.id];
                            const physicalStock = physicalStockStr !== undefined && physicalStockStr !== '' ? parseFloat(physicalStockStr) : systemStock;
                            const difference = physicalStock - systemStock;

                            return (
                                <tr key={bahan.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{bahan.name}</th>
                                    <td data-label="Stok Sistem" className="px-6 py-4 text-right font-semibold">{systemStock.toFixed(2)}</td>
                                    <td data-label="Stok Fisik" className="px-6 py-4">
                                        <input
                                            type="number"
                                            step="0.01"
                                            value={opnameValues[bahan.id] ?? ''}
                                            onChange={(e) => handleInputChange(bahan.id, e.target.value)}
                                            placeholder="Masukkan stok fisik"
                                            className="w-full max-w-[150px] mx-auto text-right px-2 py-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500"
                                        />
                                    </td>
                                    <td data-label="Selisih" className={`px-6 py-4 text-right font-bold ${Math.abs(difference) < 0.001 ? 'text-slate-500' : difference > 0 ? 'text-green-500' : 'text-red-500'}`}>
                                        {difference > 0 ? '+' : ''}{difference.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4">
                <p className="text-sm text-slate-500 dark:text-slate-400">
                    {changesToSave.length} perubahan akan disimpan.
                </p>
                <button
                    onClick={handleSave}
                    disabled={isLoading || changesToSave.length === 0}
                    className="w-full sm:w-auto px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300 disabled:cursor-not-allowed"
                >
                    {isLoading ? 'Menyimpan...' : 'Simpan Semua Perubahan'}
                </button>
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
};

export default StockOpnameManagement;
