import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Bahan, Order, OrderItem, ProductionStatus, User as AuthUser, OrderStatus, Finishing, Employee } from '../../lib/supabaseClient';
import FilterBar from '../FilterBar';
import { useToast } from '../../hooks/useToast';

interface ProductionManagementProps {
    orders: Order[];
    customers: Customer[];
    bahanList: Bahan[];
    finishings: Finishing[];
    employees: Employee[];
    loggedInUser: AuthUser;
    updateOrderStatus: (orderId: number, status: OrderStatus, userId?: string | null) => void;
    updateOrderItemStatus: (orderId: number, itemId: number, status: ProductionStatus) => void;
}

type EnrichedOrderItem = OrderItem & {
  order_id: number;
  no_nota: string;
  pelanggan_id: number;
  status_pesanan: OrderStatus;
  pelaksana_produksi_id: string | null;
  tanggal: string;
};

const getStatusColor = (status: ProductionStatus) => {
    const colors: Record<ProductionStatus, string> = {
        'Belum Dikerjakan': 'bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200',
        'Proses': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Ready': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[status];
};

const ProductionManagement: React.FC<ProductionManagementProps> = ({ orders, customers, bahanList, finishings, employees, loggedInUser, updateOrderStatus, updateOrderItemStatus }) => {
    const { addToast } = useToast();
    
    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        status: 'all',
    });

    const getCustomerName = (id: number) => customers.find(c => c.id === id)?.name || 'N/A';
    
    const productionItemsByCustomer = useMemo(() => {
        const allProductionItems: EnrichedOrderItem[] = orders
            .filter(order => ['Waiting', 'Proses', 'Ready'].includes(order.status_pesanan))
            .flatMap(order => 
                order.order_items.map(item => ({
                    ...item,
                    order_id: order.id,
                    no_nota: order.no_nota,
                    pelanggan_id: order.pelanggan_id,
                    status_pesanan: order.status_pesanan,
                    pelaksana_produksi_id: order.pelaksana_produksi_id,
                    tanggal: order.tanggal
                }))
            );

        const filteredItems = allProductionItems.filter(item => {
            const customerMatch = filters.customerId === 'all' || item.pelanggan_id === Number(filters.customerId);
            const startDateMatch = !filters.startDate || item.tanggal >= filters.startDate;
            const endDateMatch = !filters.endDate || item.tanggal <= filters.endDate;
            const statusMatch = filters.status === 'all' || item.status_produksi === filters.status;
            return customerMatch && startDateMatch && endDateMatch && statusMatch;
        });

        const grouped = filteredItems.reduce((acc, item) => {
            const customerId = item.pelanggan_id;
            if (!acc[customerId]) acc[customerId] = [];
            acc[customerId].push(item);
            return acc;
        }, {} as Record<number, EnrichedOrderItem[]>);
        
        return Object.entries(grouped).sort(([idA], [idB]) => {
            const nameA = getCustomerName(Number(idA));
            const nameB = getCustomerName(Number(idB));
            return nameA.localeCompare(nameB);
        });
    }, [orders, customers, filters]);

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters({ customerId: 'all', startDate: '', endDate: '', status: 'all' });
    };
    
    const productionStatusOptions = [
        { value: 'Belum Dikerjakan', label: 'Belum Dikerjakan' },
        { value: 'Proses', label: 'Proses' },
        { value: 'Ready', label: 'Ready' },
    ];
    
    const getPelaksanaName = (userId: string | null): string => {
        if (!userId) return '-';
        const employee = employees.find(e => e.user_id === userId);
        if (!employee || !employee.name) return 'User Tdk Dikenal';
        return employee.name.split(' ')[0];
    };
    
    const handleProcessClick = async (item: EnrichedOrderItem) => {
        if (item.status_pesanan === 'Waiting') {
            await updateOrderStatus(item.order_id, 'Proses', loggedInUser.id);
        }
        await updateOrderItemStatus(item.order_id, item.id, 'Proses');
    };

    const handleReadyClick = async (item: EnrichedOrderItem) => {
        await updateOrderItemStatus(item.order_id, item.id, 'Ready');
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6 flex-shrink-0">Manajemen Produksi</h2>

            <FilterBar
                customers={customers}
                statusOptions={productionStatusOptions}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
            />

            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 no-scrollbar">
                {productionItemsByCustomer.length > 0 ? (
                    productionItemsByCustomer.map(([customerId, items]) => (
                        <div key={customerId} className="mb-8">
                            <h3 className="text-lg font-bold text-pink-600 dark:text-pink-400 mb-3 sticky top-0 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm py-2 -mt-2">
                                {getCustomerName(Number(customerId))}
                            </h3>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">
                                        <tr>
                                            <th scope="col" className="px-4 py-3">No Nota</th>
                                            <th scope="col" className="px-4 py-3">Deskripsi & Ukuran</th>
                                            <th scope="col" className="px-4 py-3 text-center">Qty</th>
                                            <th scope="col" className="px-4 py-3">Finishing</th>
                                            <th scope="col" className="px-4 py-3 text-center">Status</th>
                                            <th scope="col" className="px-4 py-3">Pelaksana</th>
                                            <th scope="col" className="px-4 py-3 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                        {items.map(item => (
                                            <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                                <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">{item.no_nota}</td>
                                                <td className="px-4 py-3">
                                                    <p>{item.deskripsi_pesanan || '-'}</p>
                                                    <p className="text-xs text-slate-500">{(item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : ''}</p>
                                                </td>
                                                <td className="px-4 py-3 text-center">{item.qty}</td>
                                                <td className="px-4 py-3">{finishings.find(f => f.id === item.finishing_id)?.name || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status_produksi)}`}>
                                                        {item.status_produksi}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 capitalize">{getPelaksanaName(item.pelaksana_produksi_id)}</td>
                                                <td className="px-4 py-3 text-center space-x-2">
                                                    <button 
                                                        onClick={() => handleProcessClick(item)}
                                                        disabled={item.status_produksi === 'Proses' || item.status_produksi === 'Ready'}
                                                        className="px-3 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Proses
                                                    </button>
                                                    <button 
                                                        onClick={() => handleReadyClick(item)}
                                                        disabled={item.status_produksi !== 'Proses'}
                                                        className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-md hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                    >
                                                        Ready
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tidak Ada Pekerjaan</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">Tidak ada item produksi yang perlu dikerjakan saat ini.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionManagement;