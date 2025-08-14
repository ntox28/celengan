import React, { forwardRef, useMemo } from 'react';
import { Order, Customer, Bahan, CustomerLevel, OrderItem, Payment, Employee, Bank } from '../../lib/supabaseClient';

interface CustomerReportProps {
    orders: Order[];
    customer: Customer;
    filters: {
        customerId: string;
        status: string;
        startDate: string;
        endDate: string;
    };
    bahanList: Bahan[];
    employees: Employee[];
    banks: Bank[];
    calculateTotal: (order: Order) => number;
    formatCurrency: (value: number) => string;
    getPriceForCustomer: (bahan: Bahan, level: CustomerLevel) => number;
}

const formatDate = (isoDate: string) => {
    if (!isoDate) return '';
    return new Date(isoDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
};

const getKasirName = (kasirId: string | null, employees: Employee[]): string => {
    if (!kasirId) return 'N/A';
    const employee = employees.find(e => e.user_id === kasirId);
    return employee?.name || 'User Tidak Dikenal';
};

type EnrichedOrderItem = OrderItem & {
    no_nota: string;
    status_pembayaran: Order['status_pembayaran'];
    sub_total: number;
};

const CustomerReport = forwardRef<HTMLDivElement, CustomerReportProps>(({ orders, customer, filters, bahanList, employees, banks, calculateTotal, formatCurrency, getPriceForCustomer }, ref) => {

    const groupedByDate = useMemo(() => {
        type EnrichedPayment = Payment & { no_nota: string };
        const groups: Record<string, { items: EnrichedOrderItem[], dailyTotal: number, payments: EnrichedPayment[] }> = {};
        
        orders.forEach(order => {
            const date = formatDate(order.tanggal);
            if (!groups[date]) {
                groups[date] = { items: [], dailyTotal: 0, payments: [] };
            }
            
            order.order_items.forEach(item => {
                const bahan = bahanList.find(b => b.id === item.bahan_id);
                if (bahan) {
                    const price = getPriceForCustomer(bahan, customer.level);
                    const itemArea = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
                    const subTotal = price * itemArea * item.qty;
                    groups[date].items.push({ ...item, no_nota: order.no_nota, status_pembayaran: order.status_pembayaran, sub_total: subTotal });
                    groups[date].dailyTotal += subTotal;
                }
            });

            order.payments.forEach(payment => {
                groups[date].payments.push({ ...payment, no_nota: order.no_nota });
            });
        });

        Object.values(groups).forEach(group => {
            group.payments.sort((a, b) => new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime());
        });

        return Object.entries(groups).sort(([dateA], [dateB]) => {
            const findDate = (d: string) => orders.find(o => formatDate(o.tanggal) === d)?.tanggal || '1970-01-01';
            return new Date(findDate(dateA)).getTime() - new Date(findDate(dateB)).getTime();
        });
    }, [orders, bahanList, customer.level, getPriceForCustomer]);


    const grandTotal = useMemo(() => {
        const totalTagihan = orders.reduce((sum, order) => sum + calculateTotal(order), 0);
        const totalDibayar = orders.flatMap(o => o.payments).reduce((sum, p) => sum + p.amount, 0);
        return {
            totalTagihan,
            totalDibayar,
            sisaTagihan: Math.max(0, totalTagihan - totalDibayar),
        };
    }, [orders, calculateTotal]);
    
    return (
        <div ref={ref} className="bg-white text-gray-800 p-8 font-sans" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
                <div className="w-1/2">
                    <h1 className="text-3xl font-bold">
                        <span className="text-pink-600">NALA</span>
                        <span className="text-slate-800">MEDIA</span>
                        <span className="text-sm font-normal text-gray-700"> Digital Printing</span>
                    </h1>
                    <p className="text-xs mt-2 text-gray-500">
                        Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar<br/>
                        Telp/WA: 0813-9872-7722
                    </p>
                </div>
                <div className="w-1/2 text-right">
                    <h2 className="text-2xl font-bold text-gray-800 uppercase">Laporan Pelanggan</h2>
                    <p className="text-xs text-gray-500 mt-1">Dicetak pada: {formatDate(new Date().toISOString())}</p>
                </div>
            </header>

            <section className="flex justify-between mt-4 text-xs">
                <div>
                    <p className="font-bold text-gray-500">Pelanggan:</p>
                    <p className="font-semibold text-gray-800 text-sm">{customer.name}</p>
                    <p className="text-gray-600">{customer.phone}</p>
                </div>
                <div className="text-right">
                    <p><span className="font-bold text-gray-500">Periode Laporan:</span></p>
                    <p className="text-gray-600">{filters.startDate ? formatDate(filters.startDate) : 'Awal'} - {filters.endDate ? formatDate(filters.endDate) : 'Akhir'}</p>
                    <p className="text-gray-600">Status: {filters.status === 'all' ? 'Semua' : filters.status}</p>
                </div>
            </section>
            
            <section className="mt-4">
                {groupedByDate.map(([date, { items, dailyTotal, payments }], dateIndex) => (
                    <div key={dateIndex} className="mb-4 break-inside-avoid">
                        <h3 className="text-base font-bold bg-slate-100 p-1.5 rounded-t-md border-b-2 border-gray-500">{date}</h3>
                        <table className="w-full text-[9px] text-left">
                            <thead className="border-b border-slate-300">
                                <tr>
                                    <th className="py-0.5 px-1 w-[5%]">No</th>
                                    <th className="py-0.5 px-1 w-[13%]">No Nota</th>
                                    <th className="py-0.5 px-1 w-[35%]">Deskripsi</th>
                                    <th className="py-0.5 px-1 w-[12%] text-center">Ukuran</th>
                                    <th className="py-0.5 px-1 w-[8%] text-center">Qty</th>
                                    <th className="py-0.5 px-1 w-[12%] text-center">Status</th>
                                    <th className="py-0.5 px-1 w-[15%] text-right">Sub Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, itemIndex) => (
                                    <tr key={item.id} className="border-b border-slate-100">
                                        <td className="py-0.5 px-1 align-top">{itemIndex + 1}</td>
                                        <td className="py-0.5 px-1 align-top">{item.no_nota}</td>
                                        <td className="py-0.5 px-1 align-top">{item.deskripsi_pesanan}</td>
                                        <td className="py-0.5 px-1 align-top text-center">{(item.panjang || 0) > 0 ? `${item.panjang}x${item.lebar}m` : '-'}</td>
                                        <td className="py-0.5 px-1 align-top text-center">{item.qty}</td>
                                        <td className="py-0.5 px-1 align-top text-center">{item.status_pembayaran}</td>
                                        <td className="py-0.5 px-1 align-top text-right">{formatCurrency(item.sub_total)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="text-right font-bold text-[10px] p-1 bg-slate-100 rounded-b-md">
                            Total Transaksi {date}: {formatCurrency(dailyTotal)}
                        </div>
                        {payments.length > 0 && (
                            <div className="mt-1.5 mb-2 px-2 py-1 border-l-2 border-slate-200">
                                <h4 className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-1">Rincian Pembayaran</h4>
                                <div className="space-y-0.5">
                                {payments.map(p => (
                                    <div key={p.id} className="text-[8px] flex justify-between items-center">
                                        <span>
                                            <span className="font-semibold">{formatDate(p.payment_date)}</span> - Nota {p.no_nota} (Kasir: {getKasirName(p.kasir_id, employees)})
                                        </span>
                                        <span className="font-bold">{formatCurrency(p.amount)}</span>
                                    </div>
                                ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </section>

             <section className="flex justify-end mt-6 pt-3 border-t-2 border-gray-300 break-inside-avoid">
                <div className="w-full max-w-xs text-xs">
                    <h3 className="text-base font-bold text-gray-800 mb-2">Ringkasan Total</h3>
                    <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Total Tagihan</span>
                        <span className="font-medium text-gray-800">{formatCurrency(grandTotal.totalTagihan)}</span>
                    </div>
                    <div className="flex justify-between py-1.5 border-b border-gray-200">
                        <span className="text-gray-600">Total Dibayar</span>
                        <span className="font-medium text-gray-800">{formatCurrency(grandTotal.totalDibayar)}</span>
                    </div>
                    <div className="flex justify-between py-2 bg-slate-100 px-2 rounded-md mt-2">
                        <span className="font-bold text-sm text-gray-800">Sisa Tagihan</span>
                        <span className="font-bold text-sm text-pink-600">{formatCurrency(grandTotal.sisaTagihan)}</span>
                    </div>
                </div>
            </section>
            
            <footer className="mt-4 pt-2 border-t border-gray-200 text-xs text-gray-500">
                <p className="font-bold">Informasi Pembayaran:</p>
                <p>Pembayaran resmi hanya melalui rekening a/n <span className="font-semibold text-gray-700">Ariska Prima Diastari</span>.</p>
                <div className="flex gap-4 mt-1">
                {banks.filter(b=>b.category === 'Bank').map(b => (
                    <p key={b.id}><span className="font-semibold">{b.name}:</span> {b.account_number}</p>
                ))}
                </div>
                <p className="text-center mt-3">Terima kasih atas kepercayaan Anda!</p>
            </footer>
        </div>
    );
});

export default CustomerReport;