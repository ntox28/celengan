

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Customer, Bahan, Order, OrderItem, ProductionStatus, User as AuthUser, OrderStatus, Finishing, Employee } from '../../lib/supabaseClient';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import Pagination from '../Pagination';
import FilterBar from '../FilterBar';
import { useToast } from '../../hooks/useToast';


interface ProductionManagementProps {
    orders: Order[];
    customers: Customer[];
    bahanList: Bahan[];
    finishings: Finishing[];
    employees: Employee[];
    loggedInUser: AuthUser;
    updateOrderStatus: (orderId: number, status: OrderStatus, pelaksana_id?: string | null) => void;
    updateOrderItemStatus: (orderId: number, itemId: number, status: ProductionStatus) => void;
}

const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const getStatusColor = (status: ProductionStatus) => {
    const colors: Record<ProductionStatus, string> = {
        'Belum Dikerjakan': 'bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200',
        'Proses': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Selesai': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[status];
};

const ProductionManagement: React.FC<ProductionManagementProps> = ({ orders, customers, bahanList, finishings, employees, loggedInUser, updateOrderStatus, updateOrderItemStatus }) => {
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    
    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        status: 'all',
    });

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                if (order.status_pesanan !== 'Proses') return false;
                
                const customerMatch = filters.customerId === 'all' || order.pelanggan_id === Number(filters.customerId);
                const startDateMatch = !filters.startDate || order.tanggal >= filters.startDate;
                const endDateMatch = !filters.endDate || order.tanggal <= filters.endDate;
                const statusMatch = filters.status === 'all' || order.order_items.some(item => item.status_produksi === filters.status);
                return customerMatch && startDateMatch && endDateMatch && statusMatch;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [orders, filters]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const currentOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);

    const handleFilterChange = (name: keyof typeof filters, value: string) => {
        setFilters(prev => ({ ...prev, [name]: value }));
    };

    const handleResetFilters = () => {
        setFilters({
            customerId: 'all',
            startDate: '',
            endDate: '',
            status: 'all',
        });
    };
    
    const productionStatusOptions = [
        { value: 'Belum Dikerjakan', label: 'Belum Dikerjakan' },
        { value: 'Proses', label: 'Proses' },
        { value: 'Selesai', label: 'Selesai' },
    ];

    const getCustomerName = (id: number | '' | undefined) => {
        return customers.find(c => c.id === id)?.name || 'N/A';
    }

    const getPelaksanaFirstName = (userId: string | null): string => {
        if (!userId) return 'Belum Diambil';
        const employee = employees.find(e => e.user_id === userId);
        if (!employee || !employee.name) return 'User Tdk Dikenal';
        return employee.name.split(' ')[0];
    };

    const toggleExpand = (orderId: number) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };
    
    const handleTakeJob = (orderId: number) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            updateOrderStatus(orderId, 'Proses', loggedInUser.id);
            addToast(`Pekerjaan untuk Nota ${order.no_nota} telah diambil.`, 'success');
        }
    };

    const handleReleaseJob = (orderId: number) => {
        const order = orders.find(o => o.id === orderId);
        if (order) {
            updateOrderStatus(orderId, 'Proses', ''); // Set pelaksana_id to empty or null
            addToast(`Pekerjaan untuk Nota ${order.no_nota} telah dilepaskan.`, 'info');
        }
    };


    const handleStatusChange = (orderId: number, itemId: number, newStatus: ProductionStatus) => {
        updateOrderItemStatus(orderId, itemId, newStatus);
        const order = orders.find(o => o.id === orderId);
        if(order) {
           addToast(`Status item untuk Nota ${order.no_nota} telah diubah.`, 'info');
        }
    };

    const getOverallOrderStatus = (order: Order): ProductionStatus => {
        if (!order.order_items || order.order_items.length === 0) {
            return 'Belum Dikerjakan';
        }
        const statuses = order.order_items.map(item => item.status_produksi);

        if (statuses.every(s => s === 'Selesai')) {
            return 'Selesai';
        }
        if (statuses.some(s => s === 'Proses')) {
            return 'Proses';
        }
        return 'Belum Dikerjakan';
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <div className="flex justify-between items-center mb-6 flex-shrink-0">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manajemen Produksi</h2>
            </div>

            <FilterBar
                customers={customers}
                statusOptions={productionStatusOptions}
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
            />

            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                 <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3">No. Nota</th>
                            <th scope="col" className="px-6 py-3">Tanggal</th>
                            <th scope="col" className="px-6 py-3">Pelanggan</th>
                            <th scope="col" className="px-6 py-3">Pelaksana</th>
                            <th scope="col" className="px-6 py-3 text-center">Detail Item</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                        {currentOrders.map((order) => {
                           const overallStatus = getOverallOrderStatus(order);
                           return (
                           <React.Fragment key={order.id}>
                            <tr 
                                className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
                            >
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(overallStatus)}`}>
                                        {order.no_nota}
                                    </span>
                                </th>
                                <td data-label="Tanggal" className="px-6 py-4">{formatDate(order.tanggal)}</td>
                                <td data-label="Pelanggan" className="px-6 py-4">{getCustomerName(order.pelanggan_id)}</td>
                                <td data-label="Pelaksana" className="px-6 py-4">
                                    {order.pelaksana_id ? (
                                        <div className="flex items-center justify-end md:justify-start gap-2">
                                            <span className="font-semibold capitalize text-slate-800 dark:text-slate-200">
                                                {getPelaksanaFirstName(order.pelaksana_id)}
                                            </span>
                                            {order.pelaksana_id === loggedInUser.id && (
                                                <button 
                                                    onClick={() => handleReleaseJob(order.id)} 
                                                    className="bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-600 dark:hover:bg-slate-500 dark:text-slate-200 font-semibold py-1 px-3 rounded-lg text-xs transition-colors"
                                                >
                                                    Lepaskan
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => handleTakeJob(order.id)} 
                                            className="bg-pink-600 hover:bg-pink-700 text-white font-bold py-1 px-3 rounded-lg text-xs transition-colors w-full md:w-auto"
                                        >
                                            Ambil Pekerjaan
                                        </button>
                                    )}
                                </td>
                                <td data-label="Detail Item" className="px-6 py-4 text-center">
                                    <button
                                        onClick={() => toggleExpand(order.id)}
                                        className="flex items-center justify-center w-full space-x-2 text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors"
                                    >
                                        <span>{order.order_items.length} item</span>
                                        <ChevronDownIcon className={`w-5 h-5 transition-transform duration-300 ${expandedOrderId === order.id ? 'rotate-180' : ''}`} />
                                    </button>
                                </td>
                            </tr>
                            {expandedOrderId === order.id && (
                                <tr className="bg-slate-50 dark:bg-slate-700/50 md:table-row">
                                    <td colSpan={5} className="p-0">
                                        <div className="px-4 sm:px-8 py-4">
                                            <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-3">Status Pengerjaan Item:</h4>
                                            <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700">
                                                        <tr>
                                                            <th scope="col" className="px-4 py-2">Bahan</th>
                                                            <th scope="col" className="px-4 py-2">Finishing</th>
                                                            <th scope="col" className="px-4 py-2">Ukuran</th>
                                                            <th scope="col" className="px-4 py-2 text-center">Qty</th>
                                                            <th scope="col" className="px-4 py-2 text-center">Status</th>
                                                            <th scope="col" className="px-4 py-2 text-center">Aksi</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                                                        {order.order_items.map(item => {
                                                            const bahan = bahanList.find(b => b.id === item.bahan_id);
                                                            const finishing = finishings.find(f => f.id === item.finishing_id);
                                                            return (
                                                                <tr key={item.id}>
                                                                    <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{bahan?.name || 'N/A'}</td>
                                                                    <td className="px-4 py-3">{finishing?.name || '-'}</td>
                                                                    <td className="px-4 py-3">{(item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : '-'}</td>
                                                                    <td className="px-4 py-3 text-center">{item.qty}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                         <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(item.status_produksi)}`}>
                                                                            {item.status_produksi}
                                                                        </span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center space-x-2">
                                                                        <button 
                                                                            onClick={() => handleStatusChange(order.id, item.id, 'Proses')}
                                                                            disabled={item.status_produksi === 'Proses' || item.status_produksi === 'Selesai'}
                                                                            className="px-3 py-1 text-xs font-semibold text-yellow-800 bg-yellow-100 rounded-md hover:bg-yellow-200 dark:bg-yellow-900/50 dark:text-yellow-300 dark:hover:bg-yellow-900/70 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 dark:disabled:text-slate-400 transition-colors"
                                                                        >
                                                                            Proses
                                                                        </button>
                                                                        <button 
                                                                            onClick={() => handleStatusChange(order.id, item.id, 'Selesai')}
                                                                            disabled={item.status_produksi === 'Selesai'}
                                                                            className="px-3 py-1 text-xs font-semibold text-green-800 bg-green-100 rounded-md hover:bg-green-200 dark:bg-green-900/50 dark:text-green-300 dark:hover:bg-green-900/70 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed dark:disabled:bg-slate-600 dark:disabled:text-slate-400 transition-colors"
                                                                        >
                                                                            Selesai
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                           </React.Fragment>
                        )})}
                    </tbody>
                </table>
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />

        </div>
    );
};

export default ProductionManagement;