import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Bahan, Order, OrderItem, Finishing, Employee, OrderStatus, User as AuthUser } from '../../lib/supabaseClient';
<<<<<<< HEAD
=======
import ChevronDownIcon from '../icons/ChevronDownIcon';
>>>>>>> 82cb78960309d78304c4ab9a91cbcd6ee1ec9130
import Pagination from '../Pagination';
import FilterBar from '../FilterBar';
import DeliveredIcon from '../icons/DeliveredIcon';

interface WarehouseManagementProps {
    orders: Order[];
    customers: Customer[];
    bahanList: Bahan[];
    finishings: Finishing[];
    employees: Employee[];
    loggedInUser: AuthUser;
    updateOrderStatus: (orderId: number, status: OrderStatus, userId?: string | null) => void;
}

type EnrichedReadyItem = OrderItem & {
    order_id: number;
    no_nota: string;
    pelanggan_id: number;
};

<<<<<<< HEAD
type EnrichedDeliveredItem = OrderItem & {
    order_id: number;
    no_nota: string;
    pelanggan_id: number;
    pelaksana_order_id: string | null;
    pelaksana_produksi_id: string | null;
    pelaksana_delivery_id: string | null;
    tanggal: string;
};


const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ orders, customers, finishings, employees, loggedInUser, updateOrderStatus }) => {
=======
const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ orders, customers, bahanList, finishings, employees, loggedInUser, updateOrderStatus }) => {
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
>>>>>>> 82cb78960309d78304c4ab9a91cbcd6ee1ec9130
    const [currentPage, setCurrentPage] = useState(1);
    const [activeTab, setActiveTab] = useState<'ready' | 'delivered'>('ready');
    const ITEMS_PER_PAGE = 10;
    
    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        status: 'all', // For FilterBar compatibility
    });

    // Data for "Ready" tab: individual items from orders marked as 'Ready'
    const readyItems: EnrichedReadyItem[] = useMemo(() => {
        return orders
            .filter(order => order.status_pesanan === 'Ready')
            .flatMap(order => 
                order.order_items
                    .filter(item => item.status_produksi === 'Ready')
                    .map(item => ({
                        ...item,
                        order_id: order.id,
                        no_nota: order.no_nota,
                        pelanggan_id: order.pelanggan_id,
                    }))
            );
    }, [orders]);

    // Data for "Delivered" tab: items from orders marked as 'Delivered'
    const deliveredItems: EnrichedDeliveredItem[] = useMemo(() => {
        return orders
            .filter(order => order.status_pesanan === 'Delivered')
            .flatMap(order =>
                order.order_items.map(item => ({
                    ...item,
                    order_id: order.id,
                    no_nota: order.no_nota,
                    pelanggan_id: order.pelanggan_id,
                    pelaksana_order_id: order.pelaksana_order_id,
                    pelaksana_produksi_id: order.pelaksana_produksi_id,
                    pelaksana_delivery_id: order.pelaksana_delivery_id,
                    tanggal: order.tanggal,
                }))
            );
    }, [orders]);
    
    // Filtering logic for the currently active tab
    const filteredData = useMemo(() => {
        const dataToFilter = activeTab === 'ready' ? readyItems : deliveredItems;

        return dataToFilter.filter((item: EnrichedReadyItem | EnrichedDeliveredItem) => {
            const pelanggan_id = item.pelanggan_id;
            
            // For delivered items, the date is attached. For ready items, we need to find it.
            const tanggal = 'tanggal' in item ? item.tanggal : (orders.find(o => o.id === item.order_id)?.tanggal || '');
            
            const customerMatch = filters.customerId === 'all' || pelanggan_id === Number(filters.customerId);
            const startDateMatch = !filters.startDate || tanggal >= filters.startDate;
            const endDateMatch = !filters.endDate || tanggal <= filters.endDate;
            
            return customerMatch && startDateMatch && endDateMatch;
        });
    }, [orders, filters, activeTab, readyItems, deliveredItems]);

    const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);
    const currentData = filteredData.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters, activeTab]);

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

    const getEmployeeName = (userId: string | null): string => {
<<<<<<< HEAD
        if (!userId) return '-';
        const employee = employees.find(e => e.user_id === userId);
        return employee ? employee.name.split(' ')[0] : 'User Tdk Dikenal';
    };

    const handleMarkAsDelivered = (orderId: number) => {
        if (window.confirm('Apakah Anda yakin barang ini sudah diambil oleh pelanggan? Status akan diubah menjadi "Delivered".')) {
=======
        if (!userId) return 'N/A';
        const employee = employees.find(e => e.user_id === userId);
        return employee ? employee.name.split(' ')[0] : 'User';
    };

    const toggleExpand = (orderId: number) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

    const handleMarkAsDelivered = (orderId: number) => {
        if (window.confirm('Apakah Anda yakin barang ini sudah diambil oleh pelanggan?')) {
>>>>>>> 82cb78960309d78304c4ab9a91cbcd6ee1ec9130
            updateOrderStatus(orderId, 'Delivered', loggedInUser.id);
        }
    };
    
    const tabs = [
        { key: 'ready', label: 'Ready (Barang Siap Ambil)' },
        { key: 'delivered', label: 'Delivered (Barang Telah Dikirim)' },
    ];

    const renderReadyTab = () => (
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                <tr>
                    <th scope="col" className="px-6 py-3">No Nota</th>
                    <th scope="col" className="px-6 py-3">Nama Pelanggan</th>
                    <th scope="col" className="px-6 py-3">Deskripsi & Ukuran</th>
                    <th scope="col" className="px-6 py-3 text-center">Qty</th>
                    <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                {(currentData as EnrichedReadyItem[]).map((item) => (
                   <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                       <td data-label="No Nota" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.no_nota}</td>
                       <td data-label="Nama Pelanggan" className="px-6 py-4">{customers.find(c => c.id === item.pelanggan_id)?.name || 'N/A'}</td>
                       <td data-label="Deskripsi & Ukuran" className="px-6 py-4">
                           <p>{item.deskripsi_pesanan || '-'}</p>
                           <p className="text-xs text-slate-500">{(item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : ''}</p>
                       </td>
                       <td data-label="Qty" className="px-6 py-4 text-center">{item.qty}</td>
                       <td data-label="Aksi" className="px-6 py-4 text-center">
                           <button
                               onClick={() => handleMarkAsDelivered(item.order_id)}
                               className="inline-flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors"
                           >
                               <DeliveredIcon className="w-4 h-4" />
                               Delivered
                           </button>
                       </td>
                   </tr>
                ))}
            </tbody>
        </table>
    );

    const renderDeliveredTab = () => (
        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                <tr>
                    <th scope="col" className="px-6 py-3">No.Nota</th>
                    <th scope="col" className="px-6 py-3">Nama Pelanggan</th>
                    <th scope="col" className="px-6 py-3">Deskripsi Ukuran</th>
                    <th scope="col" className="px-6 py-3 text-center">Qty</th>
                    <th scope="col" className="px-6 py-3">Di Buat</th>
                    <th scope="col" className="px-6 py-3">Di Kerjakan</th>
                    <th scope="col" className="px-6 py-3">Di Kirim</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                {(currentData as EnrichedDeliveredItem[]).map((item) => (
                   <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                       <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{item.no_nota}</th>
                       <td data-label="Nama Pelanggan" className="px-6 py-4">{customers.find(c => c.id === item.pelanggan_id)?.name || 'N/A'}</td>
                       <td data-label="Deskripsi Ukuran" className="px-6 py-4">
                           <p>{item.deskripsi_pesanan || '-'}</p>
                           <p className="text-xs text-slate-500">{(item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : ''}</p>
                       </td>
                       <td data-label="Qty" className="px-6 py-4 text-center">{item.qty}</td>
                       <td data-label="Di Buat" className="px-6 py-4 capitalize">{getEmployeeName(item.pelaksana_order_id)}</td>
                       <td data-label="Di Kerjakan" className="px-6 py-4 capitalize">{getEmployeeName(item.pelaksana_produksi_id)}</td>
                       <td data-label="Di Kirim" className="px-6 py-4 capitalize">{getEmployeeName(item.pelaksana_delivery_id)}</td>
                   </tr>
                ))}
            </tbody>
        </table>
    );

    return (
        <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4 flex-shrink-0">Gudang Produksi</h2>
            
            <div className="border-b border-slate-200 dark:border-slate-700 mb-6 flex-shrink-0">
                <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key as 'ready' | 'delivered')}
                            className={`whitespace-nowrap pb-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                                activeTab === tab.key
                                    ? 'border-pink-600 text-pink-600'
                                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                            }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <FilterBar 
                customers={customers}
                statusOptions={[]} // No status filter needed
                filters={filters}
                onFilterChange={handleFilterChange}
                onReset={handleResetFilters}
            />
            
<<<<<<< HEAD
            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6 no-scrollbar">
                {currentData.length > 0 ? (
                    activeTab === 'ready' ? renderReadyTab() : renderDeliveredTab()
                ) : (
=======
            <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                        <tr>
                            <th scope="col" className="px-6 py-3">No. Nota</th>
                            <th scope="col" className="px-6 py-3">Pelanggan</th>
                            {activeTab === 'delivered' && <th scope="col" className="px-6 py-3">Dikirim Oleh</th>}
                            <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            <th scope="col" className="px-6 py-3 text-center">Detail Item</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                        {currentOrders.map((order) => (
                           <React.Fragment key={order.id}>
                            <tr className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200">
                                <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{order.no_nota}</th>
                                <td data-label="Pelanggan" className="px-6 py-4">{customers.find(c => c.id === order.pelanggan_id)?.name || 'N/A'}</td>
                                {activeTab === 'delivered' && <td data-label="Dikirim Oleh" className="px-6 py-4 capitalize">{getEmployeeName(order.pelaksana_delivery_id)}</td>}
                                <td data-label="Aksi" className="px-6 py-4 text-center space-x-2">
                                    {activeTab === 'ready' ? (
                                        <>
                                            <span className="inline-flex items-center gap-2 bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs font-medium px-3 py-1.5 rounded-full">
                                                <CheckCircleIcon className="w-4 h-4" />
                                                Ready
                                            </span>
                                            <button
                                                onClick={() => handleMarkAsDelivered(order.id)}
                                                className="inline-flex items-center gap-2 bg-slate-600 hover:bg-slate-700 text-white text-xs font-medium px-3 py-1.5 rounded-full transition-colors"
                                            >
                                                <DeliveredIcon className="w-4 h-4" />
                                                Delivered
                                            </button>
                                        </>
                                    ) : (
                                        <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-medium px-3 py-1.5 rounded-full">
                                            <DeliveredIcon className="w-4 h-4" />
                                            Delivered
                                        </span>
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
                                            <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-3">Rincian Item:</h4>
                                            <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                                                <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                                    <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700">
                                                        <tr>
                                                            <th scope="col" className="px-4 py-2">Bahan</th>
                                                            <th scope="col" className="px-4 py-2">Finishing</th>
                                                            <th scope="col" className="px-4 py-2">Ukuran</th>
                                                            <th scope="col" className="px-4 py-2 text-center">Qty</th>
                                                            <th scope="col" className="px-4 py-2 text-center">Status Produksi</th>
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
                                                                         <span className={`px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300`}>
                                                                            {item.status_produksi}
                                                                        </span>
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
                        ))}
                    </tbody>
                </table>
                 {filteredOrders.length === 0 && (
>>>>>>> 82cb78960309d78304c4ab9a91cbcd6ee1ec9130
                    <div className="text-center py-10">
                        <p className="text-slate-500">Tidak ada data untuk ditampilkan pada tab '{activeTab === 'ready' ? 'Ready' : 'Delivered'}'.</p>
                    </div>
                )}
            </div>

            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
    );
};

export default WarehouseManagement;