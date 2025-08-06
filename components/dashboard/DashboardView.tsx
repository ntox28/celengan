

import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, BarChart, XAxis, YAxis, Tooltip, Legend, Bar, PieChart, Pie, Cell } from 'recharts';
import { Order, Customer, Expense } from '../../lib/supabaseClient';
import StatCard from './StatCard';
import OrderIcon from '../icons/OrderIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import UsersGroupIcon from '../icons/UsersGroupIcon';
import ProductionIcon from '../icons/ProductionIcon';
import Pagination from '../Pagination';
import { useTheme } from '../../hooks/useTheme';

interface DashboardViewProps {
    orders: Order[];
    customers: Customer[];
    expenses: Expense[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
};

const DashboardView: React.FC<DashboardViewProps> = ({ orders, customers, expenses }) => {
    const today = new Date();
    const { theme } = useTheme();
    
    // Pagination state for recent orders
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 5;
    
    // Stats Cards Data
    const totalOrders = orders.length;
    const activeOrders = orders.filter(o => !['Lunas'].includes(o.status_pembayaran)).length;
    const itemsToProcess = orders
        .flatMap(o => o.order_items)
        .filter(item => item.status_produksi !== 'Selesai').length;
    const totalCustomers = customers.length;


    // Weekly Orders Chart Data
    const weeklyOrdersData = Array.from({ length: 7 }).map((_, i) => {
        const date = new Date();
        date.setDate(today.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        return {
            name: date.toLocaleDateString('id-ID', { weekday: 'short' }),
            orders: orders.filter(o => o.tanggal === dateStr).length,
        };
    }).reverse();

    // Production Status Chart Data
    const productionStatus = orders.flatMap(o => o.order_items).reduce((acc, item) => {
        acc[item.status_produksi] = (acc[item.status_produksi] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const productionData = Object.entries(productionStatus).map(([name, value]) => ({ name, value }));
    const PIE_COLORS = {
        'Selesai': '#22c55e', // green-500
        'Proses': '#f59e0b', // amber-500
        'Belum Dikerjakan': theme === 'dark' ? '#475569' : '#94a3b8', // slate-600 / slate-400
    };

    const sortedRecentOrders = useMemo(() => [...orders].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()), [orders]);

    const totalPages = Math.ceil(sortedRecentOrders.length / ITEMS_PER_PAGE);
    const currentOrders = sortedRecentOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const chartFontColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
    const chartGridColor = theme === 'dark' ? '#334155' : '#e2e8f0'; // slate-700 / slate-200

    return (
        <div className="space-y-8">
            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Total Pesanan" value={totalOrders.toString()} icon={<OrderIcon />} />
                <StatCard title="Pesanan Aktif" value={activeOrders.toString()} icon={<ClipboardListIcon />} />
                <StatCard title="Item Perlu Diproses" value={itemsToProcess.toString()} icon={<ProductionIcon />} />
                <StatCard title="Total Pelanggan" value={totalCustomers.toString()} icon={<UsersGroupIcon />} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pesanan Seminggu Terakhir</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={weeklyOrdersData}>
                            <XAxis dataKey="name" stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip
                                cursor={{fill: theme === 'dark' ? '#334155' : '#f1f5f9'}}
                                contentStyle={{ 
                                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                    border: `1px solid ${chartGridColor}`,
                                    borderRadius: '0.5rem' 
                                }}
                                labelStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#334155' }}
                            />
                            <Legend wrapperStyle={{fontSize: "14px", color: chartFontColor}}/>
                            <Bar dataKey="orders" name="Jumlah Pesanan" fill="#ec4899" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col justify-center">
                     <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 text-center">Status Produksi</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie 
                                data={productionData} 
                                dataKey="value" 
                                nameKey="name" 
                                cx="50%" 
                                cy="50%" 
                                outerRadius={100} 
                                labelLine={false}
                                label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                    if (percent === 0) return null;
                                    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                    const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                    const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                    return (
                                        <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={14} fontWeight="bold">
                                            {`${(percent * 100).toFixed(0)}%`}
                                        </text>
                                    );
                                }}
                            >
                                {productionData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={PIE_COLORS[entry.name as keyof typeof PIE_COLORS] || '#8884d8'} />
                                ))}
                            </Pie>
                            <Tooltip
                                 contentStyle={{ 
                                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                    border: `1px solid ${chartGridColor}`,
                                    borderRadius: '0.5rem' 
                                }}
                                labelStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#334155' }}
                             />
                            <Legend wrapperStyle={{fontSize: "14px", paddingTop: "20px", color: chartFontColor}}/>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

             {/* Recent Activity */}
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Aktivitas Terbaru</h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">No. Nota</th>
                                <th scope="col" className="px-6 py-3">Pelanggan</th>
                                <th scope="col" className="px-6 py-3">Tanggal</th>
                                <th scope="col" className="px-6 py-3 text-right">Status Bayar</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentOrders.map(order => (
                                <tr key={order.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50">
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{order.no_nota}</th>
                                    <td data-label="Pelanggan" className="px-6 py-4">{customers.find(c => c.id === order.pelanggan_id)?.name || 'N/A'}</td>
                                    <td data-label="Tanggal" className="px-6 py-4">{formatDate(order.tanggal)}</td>
                                    <td data-label="Status Bayar" className="px-6 py-4 text-right">{order.status_pembayaran}</td>
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

export default DashboardView;