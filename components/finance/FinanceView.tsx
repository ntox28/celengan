

import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Line } from 'recharts';
import { Order, Customer, CustomerLevel, Bahan, Expense, Employee, Bank, Asset, Debt } from '../../lib/supabaseClient';
import StatCard from '../dashboard/StatCard';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import TrendingDownIcon from '../icons/TrendingDownIcon';
import FinanceIcon from '../icons/FinanceIcon';
import OrderIcon from '../icons/OrderIcon';
import Pagination from '../Pagination';
import DocumentReportIcon from '../icons/DocumentReportIcon';
import Reports from './Reports';
import { useTheme } from '../../hooks/useTheme';
import UserIcon from '../icons/UserIcon';

interface FinanceViewProps {
    orders: Order[];
    expenses: Expense[];
    customers: Customer[];
    bahanList: Bahan[];
    employees: Employee[];
    banks: Bank[];
    assets: Asset[];
    debts: Debt[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const getPriceForCustomer = (bahan: Bahan, level: CustomerLevel): number => {
    switch (level) {
        case 'End Customer': return bahan.harga_end_customer;
        case 'Retail': return bahan.harga_retail;
        case 'Grosir': return bahan.harga_grosir;
        case 'Reseller': return bahan.harga_reseller;
        case 'Corporate': return bahan.harga_corporate;
        default: return 0;
    }
};

const calculateOrderTotal = (order: Order, customers: Customer[], bahanList: Bahan[]): number => {
    const customer = customers.find(c => c.id === order.pelanggan_id);
    if (!customer) return 0;

    const total = order.order_items.reduce((total, item) => {
        const bahan = bahanList.find(b => b.id === item.bahan_id);
        if (!bahan) return total;

        const price = getPriceForCustomer(bahan, customer.level);
        const itemArea = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
        const itemTotal = price * itemArea * item.qty;
        return total + itemTotal;
    }, 0);
    return Math.round(total);
};

const OwnerFinancialView: React.FC<{ assets: Asset[], debts: Debt[], orders: Order[], expenses: Expense[] }> = ({ assets, debts, orders, expenses }) => {
    const { theme } = useTheme();

    const totalAssets = useMemo(() => assets.reduce((sum, asset) => sum + asset.purchase_price, 0), [assets]);
    const totalDebts = useMemo(() => debts.filter(d => d.status !== 'Lunas').reduce((sum, debt) => sum + debt.total_amount, 0), [debts]);
    const netWorth = totalAssets - totalDebts;

    const monthlyPerformanceData = useMemo(() => {
        const data = [];
        const today = new Date();
        for (let i = 11; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthStartStr = date.toISOString().split('T')[0];
            const nextMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
            const monthEndStr = new Date(nextMonth.getTime() - 1).toISOString().split('T')[0];

            const monthName = date.toLocaleString('id-ID', { month: 'short', year: '2-digit' });
            
            const revenueThisMonth = orders.flatMap(o => o.payments)
                .filter(p => p.payment_date >= monthStartStr && p.payment_date <= monthEndStr)
                .reduce((sum, p) => sum + p.amount, 0);
            
            const expensesThisMonth = expenses
                .filter(e => e.tanggal >= monthStartStr && e.tanggal <= monthEndStr)
                .reduce((sum, e) => sum + (e.harga * e.qty), 0);
            
            data.push({
                name: monthName,
                Pendapatan: revenueThisMonth,
                Pengeluaran: expensesThisMonth,
                'Laba Bersih': revenueThisMonth - expensesThisMonth,
            });
        }
        return data;
    }, [orders, expenses]);
    
    const chartFontColor = theme === 'dark' ? '#94a3b8' : '#64748b';
    const chartGridColor = theme === 'dark' ? '#334155' : '#e2e8f0';

    return (
        <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg border border-green-500/30`}>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Aset</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-1">{formatCurrency(totalAssets)}</p>
                </div>
                <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg border border-red-500/30`}>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Total Hutang</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-1">{formatCurrency(totalDebts)}</p>
                </div>
                 <div className={`bg-white dark:bg-slate-800 p-6 rounded-lg border ${netWorth >= 0 ? 'border-green-500/30' : 'border-red-500/30'}`}>
                    <p className="text-sm text-slate-600 dark:text-slate-400">Modal Bersih</p>
                    <p className={`text-3xl font-bold mt-1 ${netWorth >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>{formatCurrency(netWorth)}</p>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Tren Laba Bersih (12 Bulan Terakhir)</h3>
                <ResponsiveContainer width="100%" height={350}>
                    <LineChart data={monthlyPerformanceData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                        <XAxis dataKey="name" stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value as number).replace('Rp', '')}`} />
                        <Tooltip
                            contentStyle={{ 
                                backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                border: `1px solid ${chartGridColor}`,
                                borderRadius: '0.5rem' 
                            }}
                            labelStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#334155' }}
                            formatter={(value, name) => [formatCurrency(value as number), name]}
                        />
                        <Legend wrapperStyle={{fontSize: "14px", color: chartFontColor}}/>
                        <Line type="monotone" dataKey="Pendapatan" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                        <Line type="monotone" dataKey="Pengeluaran" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
                        <Line type="monotone" dataKey="Laba Bersih" name="Laba Bersih" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

const FinanceView: React.FC<FinanceViewProps> = (props) => {
    const [activeTab, setActiveTab] = useState('summary');

    const SummaryView: React.FC = () => {
        const { theme } = useTheme();
        const [transactionsPage, setTransactionsPage] = useState(1);
        const [expensesPage, setExpensesPage] = useState(1);
        const ITEMS_PER_PAGE = 5;

        const { totalRevenue, totalExpenses, netProfit, totalReceivables, cashflowData, revenueBySource } = useMemo(() => {
            const totalRevenue = props.orders.flatMap(o => o.payments).reduce((sum, p) => sum + p.amount, 0);
            const totalExpenses = props.expenses.reduce((sum, exp) => sum + (exp.harga * exp.qty), 0);
            const netProfit = totalRevenue - totalExpenses;
            
            const totalReceivables = props.orders.reduce((sum, order) => {
                if (order.status_pembayaran === 'Lunas') return sum;
                const totalTagihan = calculateOrderTotal(order, props.customers, props.bahanList);
                const totalPaid = order.payments.reduce((acc, p) => acc + p.amount, 0);
                return sum + (totalTagihan - totalPaid);
            }, 0);

            const dataByDate: Record<string, { revenue: number, expense: number }> = {};
            
            props.orders.flatMap(o => o.payments).forEach(payment => {
                const date = payment.payment_date;
                if (!dataByDate[date]) dataByDate[date] = { revenue: 0, expense: 0 };
                dataByDate[date].revenue += payment.amount;
            });

            props.expenses.forEach(expense => {
                const date = expense.tanggal;
                if (!dataByDate[date]) dataByDate[date] = { revenue: 0, expense: 0 };
                dataByDate[date].expense += expense.harga * expense.qty;
            });
            
            const cashflowData = Object.keys(dataByDate)
                .sort((a,b) => new Date(a).getTime() - new Date(b).getTime())
                .slice(-30) // Show last 30 days
                .map(date => ({
                    name: new Date(date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'}),
                    Pendapatan: dataByDate[date].revenue,
                    Pengeluaran: dataByDate[date].expense,
                }));

            const revenueBySource: Record<string, number> = {
                'Cash': 0,
                'Bank': 0,
                'Digital Wallet': 0,
                'Qris': 0,
            };
        
            props.orders.flatMap(o => o.payments).forEach(payment => {
                if (payment.bank_id) {
                    const bank = props.banks.find(b => b.id === payment.bank_id);
                    if (bank) {
                        revenueBySource[bank.category] = (revenueBySource[bank.category] || 0) + payment.amount;
                    }
                } else {
                    revenueBySource['Cash'] += payment.amount;
                }
            });

            return { totalRevenue, totalExpenses, netProfit, totalReceivables, cashflowData, revenueBySource };
        }, [props.orders, props.expenses, props.customers, props.bahanList, props.banks]);

        const recentTransactions = useMemo(() => {
            return props.orders
                .flatMap(order => {
                    const customer = props.customers.find(c => c.id === order.pelanggan_id);
                    return order.payments.map((p) => ({
                        orderNoNota: order.no_nota,
                        customerName: customer?.name || 'N/A',
                        amount: p.amount,
                        date: p.payment_date,
                        id: p.id
                    }));
                })
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }, [props.orders, props.customers]);

        const totalTransactionPages = Math.ceil(recentTransactions.length / ITEMS_PER_PAGE);
        const currentTransactions = recentTransactions.slice((transactionsPage - 1) * ITEMS_PER_PAGE, transactionsPage * ITEMS_PER_PAGE);

        const recentExpenses = useMemo(() => [...props.expenses].sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()), [props.expenses]);
        const totalExpensePages = Math.ceil(recentExpenses.length / ITEMS_PER_PAGE);
        const currentExpenses = recentExpenses.slice((expensesPage - 1) * ITEMS_PER_PAGE, expensesPage * ITEMS_PER_PAGE);
        
        const chartFontColor = theme === 'dark' ? '#94a3b8' : '#64748b'; // slate-400 / slate-500
        const chartGridColor = theme === 'dark' ? '#334155' : '#e2e8f0'; // slate-700 / slate-200

        return (
            <div className="space-y-8">
                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatCard title="Total Pendapatan" value={formatCurrency(totalRevenue)} icon={<TrendingUpIcon />} />
                    <StatCard title="Total Pengeluaran" value={formatCurrency(totalExpenses)} icon={<TrendingDownIcon />} />
                    <StatCard title="Laba Bersih" value={formatCurrency(netProfit)} icon={<FinanceIcon />} />
                    <StatCard title="Total Piutang" value={formatCurrency(totalReceivables)} icon={<OrderIcon />} />
                </div>
                
                {/* Revenue by Source */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pendapatan Berdasarkan Sumber Dana</h3>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-center">
                        {Object.entries(revenueBySource).map(([source, amount]) => (
                            <div key={source} className="bg-slate-50 dark:bg-slate-700/50 p-4 rounded-lg">
                                <p className="text-sm text-slate-500 dark:text-slate-400">{source}</p>
                                <p className="text-xl font-bold text-slate-800 dark:text-slate-100">{formatCurrency(amount)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cashflow Chart */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Arus Kas (30 Hari Terakhir)</h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <LineChart data={cashflowData}>
                            <CartesianGrid strokeDasharray="3 3" stroke={chartGridColor} />
                            <XAxis dataKey="name" stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis stroke={chartFontColor} fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${formatCurrency(value as number).split(',')[0]}`} />
                            <Tooltip
                                contentStyle={{ 
                                    backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff',
                                    border: `1px solid ${chartGridColor}`,
                                    borderRadius: '0.5rem' 
                                }}
                                labelStyle={{ color: theme === 'dark' ? '#f1f5f9' : '#334155' }}
                                formatter={(value) => formatCurrency(value as number)}
                            />
                            <Legend wrapperStyle={{fontSize: "14px", color: chartFontColor}}/>
                            <Line type="monotone" dataKey="Pendapatan" stroke="#ec4899" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="Pengeluaran" stroke="#f43f5e" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }}/>
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                
                 {/* Recent Transactions & Expenses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Transaksi Terbaru</h3>
                        <div className="overflow-x-auto flex-1">
                             <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {currentTransactions.map(tx => (
                                        <tr key={tx.id}>
                                            <td className="py-3">
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{tx.orderNoNota}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{tx.customerName}</p>
                                            </td>
                                            <td className="py-3 text-right">
                                                <p className="font-semibold text-green-600 dark:text-green-400">{formatCurrency(tx.amount)}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(tx.date).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</p>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                         <Pagination currentPage={transactionsPage} totalPages={totalTransactionPages} onPageChange={setTransactionsPage} />
                    </div>
                     <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">Pengeluaran Terbaru</h3>
                        <div className="overflow-x-auto flex-1">
                            <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300">
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {currentExpenses.map(exp => (
                                        <tr key={exp.id}>
                                            <td className="py-3">
                                                <p className="font-medium text-slate-900 dark:text-slate-100">{exp.jenis_pengeluaran}</p>
                                                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(exp.tanggal).toLocaleDateString('id-ID', {day:'numeric', month:'long'})}</p>
                                            </td>
                                            <td className="py-3 text-right font-semibold text-red-600 dark:text-red-400">{formatCurrency(exp.harga * exp.qty)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={expensesPage} totalPages={totalExpensePages} onPageChange={setExpensesPage} />
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className="space-y-8">
             <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    <button
                        onClick={() => setActiveTab('summary')}
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'summary'
                                ? 'border-pink-600 text-pink-600'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                    >
                        Ringkasan
                    </button>
                    <button
                        onClick={() => setActiveTab('reports')}
                        className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'reports'
                                ? 'border-pink-600 text-pink-600'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                    >
                        <DocumentReportIcon className="w-5 h-5 mr-2" />
                        Laporan
                    </button>
                    <button
                        onClick={() => setActiveTab('owner')}
                        className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                            activeTab === 'owner'
                                ? 'border-pink-600 text-pink-600'
                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                        }`}
                    >
                        <UserIcon className="w-5 h-5 mr-2" />
                        Owner Financial
                    </button>
                </nav>
            </div>
            
            <div>
                {activeTab === 'summary' && <SummaryView />}
                {activeTab === 'reports' && <Reports {...props} calculateOrderTotal={calculateOrderTotal} getPriceForCustomer={getPriceForCustomer} formatCurrency={formatCurrency} />}
                {activeTab === 'owner' && <OwnerFinancialView assets={props.assets} debts={props.debts} orders={props.orders} expenses={props.expenses} />}
            </div>
        </div>
    );
};

export default FinanceView;