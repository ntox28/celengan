import React, { useState, useMemo, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { Customer, CustomerLevel, Bahan, Order, Payment, PaymentStatus, ProductionStatus, Employee, User as AuthUser, Bank, Printer, Finishing } from '../../lib/supabaseClient';
import PrintIcon from '../icons/PrintIcon';
import WhatsAppIcon from '../icons/WhatsAppIcon';
import ImageIcon from '../icons/ImageIcon';
import Nota from './Nota';
import Pagination from '../Pagination';
import FilterBar from '../FilterBar';
import StatCard from '../dashboard/StatCard';
import TrendingUpIcon from '../icons/TrendingUpIcon';
import ClipboardListIcon from '../icons/ClipboardListIcon';
import Struk from './Struk';
import ReceiptIcon from '../icons/ReceiptIcon';
import { useToast } from '../../hooks/useToast';
import TransactionReport from './TransactionReport';

interface TransactionManagementProps {
    orders: Order[];
    customers: Customer[];
    bahanList: Bahan[];
    loggedInUser: AuthUser;
    employees: Employee[];
    addPaymentToOrder: (orderId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'>) => Promise<void>;
    banks: Bank[];
    printers: Printer[];
    finishings: Finishing[];
}

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const getPaymentStatusColor = (status: PaymentStatus) => {
    const colors: Record<PaymentStatus, string> = {
        'Belum Lunas': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Lunas': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[status];
};

const getProductionStatusColor = (status: ProductionStatus) => {
    const colors: Record<ProductionStatus, string> = {
        'Belum Dikerjakan': 'bg-gray-100 text-gray-800 dark:bg-slate-600 dark:text-slate-200',
        'Proses': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300',
        'Selesai': 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
    };
    return colors[status];
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

const calculateTotalPaid = (order: Order): number => {
    if (!order.payments || order.payments.length === 0) {
        return 0;
    }
    return order.payments.reduce((sum, payment) => sum + payment.amount, 0);
};

const TransactionManagement: React.FC<TransactionManagementProps> = ({ orders, customers, bahanList, loggedInUser, employees, addPaymentToOrder, banks, printers, finishings }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isActionMenuOpen, setIsActionMenuOpen] = useState<number | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
    const [newPaymentAmount, setNewPaymentAmount] = useState(0);
    const [newPaymentDate, setNewPaymentDate] = useState(new Date().toISOString().split('T')[0]);
    const [newPaymentBankId, setNewPaymentBankId] = useState<string>('cash');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const notaRef = useRef<HTMLDivElement>(null);
    const strukRef = useRef<HTMLDivElement>(null);
    const actionMenuRef = useRef<HTMLDivElement>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    
    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        status: 'all',
    });

    const calculateTotal = (order: Order): number => {
        const customer = customers.find(c => c.id === order.pelanggan_id);
        if (!customer) return 0;

        return order.order_items.reduce((total, item) => {
            const bahan = bahanList.find(b => b.id === item.bahan_id);
            if (!bahan) return total;

            const price = getPriceForCustomer(bahan, customer.level);
            const itemArea = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
            const itemTotal = price * itemArea * item.qty;
            return total + itemTotal;
        }, 0);
    };
    
    const todayStats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];

        const revenueToday = orders.flatMap(o => o.payments)
            .filter(p => p.payment_date === todayStr)
            .reduce((sum, p) => sum + p.amount, 0);
        
        const todaysOrders = orders.filter(o => o.tanggal === todayStr);

        const unpaidToday = todaysOrders
            .filter(o => o.status_pembayaran !== 'Lunas')
            .reduce((sum, o) => {
                const total = calculateTotal(o);
                const paid = calculateTotalPaid(o);
                return sum + (total - paid);
            }, 0);
            
        const totalOrdersToday = todaysOrders.length;

        return { revenueToday, unpaidToday, totalOrdersToday };
    }, [orders, customers, bahanList]);

    const transactions = useMemo(() => {
        return orders
            .filter(order => {
                if (order.status_pesanan !== 'Proses') return false;

                const customerMatch = filters.customerId === 'all' || order.pelanggan_id === Number(filters.customerId);
                const startDateMatch = !filters.startDate || order.tanggal >= filters.startDate;
                const endDateMatch = !filters.endDate || order.tanggal <= filters.endDate;
                const statusMatch = filters.status === 'all' || order.status_pembayaran === filters.status;
                
                return customerMatch && startDateMatch && endDateMatch && statusMatch;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [orders, filters]);

    const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
    const currentTransactions = transactions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        setCurrentPage(1);
    }, [filters]);
    
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (actionMenuRef.current && !actionMenuRef.current.contains(event.target as Node)) {
                setIsActionMenuOpen(null);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [actionMenuRef]);

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

    const paymentStatusOptions = [
        { value: 'Belum Lunas', label: 'Belum Lunas' },
        { value: 'Lunas', label: 'Lunas' },
    ];

    const handleOpenModal = (order: Order) => {
        setSelectedOrder(order);
        setNewPaymentAmount(0);
        setNewPaymentDate(new Date().toISOString().split('T')[0]);
        setNewPaymentBankId('cash');
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
        setNewPaymentAmount(0);
    };

    const handlePaymentSubmit = async () => {
        if (!selectedOrder || newPaymentAmount <= 0) {
            addToast('Jumlah pembayaran harus lebih besar dari 0.', 'error');
            return;
        }
        
        setIsSubmitting(true);
        const paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'> = {
            amount: newPaymentAmount,
            payment_date: newPaymentDate,
            kasir_id: loggedInUser.id,
            bank_id: newPaymentBankId === 'cash' ? null : Number(newPaymentBankId)
        };

        try {
            await addPaymentToOrder(selectedOrder.id, paymentData);
            handleCloseModal();
        } catch(error) {
            console.error("Failed to add payment:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getKasirName = (order: Order) => {
        if (!order.payments || order.payments.length === 0) return '-';
        const lastPayment = order.payments[order.payments.length - 1];
        if (!lastPayment.kasir_id) return 'N/A';
        const employee = employees.find(e => e.user_id === lastPayment.kasir_id);
        return employee ? employee.name : 'Akun Tidak Dikenal';
    };
    
    const getPrintStyles = (printerType: Printer['type'], target: 'Nota' | 'Struk'): string => {
        switch (printerType) {
            case 'Thermal 58mm':
                return `@page { size: 58mm auto; margin: 2mm; } body { font-family: sans-serif; font-size: 8pt; width: 54mm; color: #000; } .struk-container { width: 100%; }`;
            case 'Thermal 80mm':
                 return `@page { size: 80mm auto; margin: 3mm; } body { font-family: sans-serif; font-size: 9pt; width: 74mm; color: #000; } .struk-container { width: 100%; }`;
            case 'Dot Matrix':
                 return `@page { margin: 10mm; } body { font-family: sans-serif; font-size: 10pt; color: #000; } .nota-dot-matrix { width: 100%; }`;
            default:
                return `@page { margin: 10mm; } body { font-family: sans-serif; font-size: 10pt; }`;
        }
    }

    const handlePrint = () => {
       const defaultPrinter = printers.find(p => p.target === 'Nota' && p.is_default);
       if (!defaultPrinter) {
            addToast('Tidak ada printer default untuk Nota. Atur di menu Pengaturan.', 'error');
            return;
       }
       if (!notaRef.current) {
            addToast('Gagal memuat data nota.', 'error');
            return;
        }
    
        addToast(`Mencetak nota menggunakan ${defaultPrinter.name}...`, 'info');
        const printContents = notaRef.current.innerHTML;
        const printWindow = window.open('', '', 'height=800,width=800');

        if (printWindow) {
            printWindow.document.write('<html><head><title>Cetak Nota</title>');
            printWindow.document.write(`<style>${getPrintStyles(defaultPrinter.type, 'Nota')} .nota-header, .nota-footer { text-align: center; } .company-name { font-size: 14pt; font-weight: bold; margin-bottom: 5px; } .nota-info, .summary-row { display: flex; justify-content: space-between; margin: 2px 0; } hr.separator { border: none; border-top: 1px dashed black; margin: 10px 0; } hr.my-1 { margin-top: 4px; margin-bottom: 4px; } .nota-summary { margin-top: 10px; } .summary-row.total { font-weight: bold; margin-top: 5px; padding-top: 5px; border-top: 1px solid black; } .nota-footer { margin-top: 20px; } .flex { display: flex; } .font-bold { font-weight: bold; } .items-start { align-items: flex-start; } .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; } .pr-1 { padding-right: 4px; } .text-center { text-align: center; } .text-right { text-align: right; } .break-words { word-wrap: break-word; } .w-\\[10\\%\\] { width: 10%; } .w-\\[15\\%\\] { width: 15%; } .w-\\[20\\%\\] { width: 20%; } .w-\\[25\\%\\] { width: 25%; } .w-\\[30\\%\\] { width: 30%; } .w-\\[35\\%\\] { width: 35%; } .text-\\[9px\\] { font-size: 9px; } .italic { font-style: italic; }</style>`);
            printWindow.document.write('</head><body>');
            printWindow.document.write(printContents);
            printWindow.document.write('</body></html>');
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
        }
    };
    
    const handlePrintStruk = () => {
       const defaultPrinter = printers.find(p => p.target === 'Struk' && p.is_default);
       if (!defaultPrinter) {
            addToast('Tidak ada printer default untuk Struk. Atur di menu Pengaturan.', 'error');
            return;
       }
       addToast(`Mencetak struk menggunakan ${defaultPrinter.name}...`, 'info');
       const printContents = strukRef.current?.innerHTML;
       if(printContents) {
         const printWindow = window.open('', '', 'height=600,width=400');
         if (!printWindow) return;
         printWindow.document.write('<html><head><title>Cetak Struk</title>');
         printWindow.document.write(`<style>${getPrintStyles(defaultPrinter.type, 'Struk')} h1, h2, h3, p, div, span, td, th { font-family: inherit !important; } hr { border: none; border-top: 1px dashed black; margin: 8px 0; } .flex { display: flex; } .font-bold { font-weight: bold; } .items-start { align-items: flex-start; } .justify-between { justify-content: space-between; } .text-center { text-align: center; } .text-right { text-align: right; } .break-words { word-wrap: break-word; } .my-1 { margin-top: 4px; margin-bottom: 4px; } .my-2 { margin-top: 8px; margin-bottom: 8px; } .mb-1 { margin-bottom: 4px; } .pr-1 { padding-right: 4px; } .py-0\\.5 { padding-top: 2px; padding-bottom: 2px; } .w-\\[10\\%\\] { width: 10%; } .w-\\[20\\%\\] { width: 20%; } .w-\\[30\\%\\] { width: 30%; } .w-\\[50\\%\\] { width: 50%; } .w-\\[60\\%\\] { width: 60%; } .w-\\[90\\%\\] { width: 90%; } .space-y-1 > * + * { margin-top: 4px; } .mt-2 { margin-top: 8px; } .leading-tight { line-height: 1.25; } .text-\\[9px\\] { font-size: 9px; }</style>`);
         printWindow.document.write('</head><body class="bg-white">');
         printWindow.document.write(`<div class="struk-container">${printContents}</div>`);
         printWindow.document.write('</body></html>');
         printWindow.document.close();
         printWindow.focus();
         setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
       }
    };
    
    const handleSaveImage = () => {
        if(notaRef.current && selectedOrder){
            addToast('Menyimpan nota sebagai gambar...', 'info');
            html2canvas(notaRef.current, {scale: 2, backgroundColor: '#ffffff'}).then(canvas => {
                const link = document.createElement('a');
                link.download = `nota-${selectedOrder.no_nota}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
            });
        }
    };
    
    const handleSendWhatsApp = () => {
        if(!selectedOrder) return;
        const customer = customers.find(c => c.id === selectedOrder.pelanggan_id);
        const totalTagihan = calculateTotal(selectedOrder);
        const kasir = getKasirName(selectedOrder);
        
        let itemsList = '';
        selectedOrder.order_items.forEach(item => {
            const bahan = bahanList.find(b => b.id === item.bahan_id);
            if (!bahan || !customer) return;
            const hargaSatuan = getPriceForCustomer(bahan, customer.level);
            const itemArea = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
            const jumlah = hargaSatuan * itemArea * item.qty;

            itemsList += `${item.deskripsi_pesanan || bahan.name}\n`;
            if ((item.panjang || 0) > 0 && (item.lebar || 0) > 0) {
                 itemsList += `${item.panjang}m x ${item.lebar}m\n`;
            }
            itemsList += `  ${item.qty} x ${formatCurrency(hargaSatuan * itemArea)} = ${formatCurrency(jumlah)}\n`;
        });
        
        let message = `*Nala Media*\nJl. Prof. Moh. Yamin,Cerbonan,Karanganyar\n(Timur Stadion 45)\nTelp: 0813-9872-7722\n--------------------------------\n`;
        message += `No Nota  : ${selectedOrder.no_nota}\n`;
        message += `Tanggal  : ${new Date(selectedOrder.tanggal).toLocaleString('id-ID', {day: '2-digit', month: '2-digit', year: 'numeric'})}\n`;
        message += `Kasir    : ${kasir}\n`;
        message += `Pelanggan: ${customer?.name || 'N/A'}\n`;
        message += `--------------------------------\n`;
        message += itemsList;
        message += `--------------------------------\n`;
        message += `Total    : *${formatCurrency(totalTagihan)}*\n`;
        message += `--------------------------------\n`;
        message += `Terima kasih!`;

        const phone = customer?.phone.replace(/[^0-9]/g, '');
        if(phone){
            addToast('Membuka WhatsApp...', 'info');
            const whatsappUrl = `https://wa.me/62${phone.startsWith('0') ? phone.substring(1) : phone}?text=${encodeURIComponent(message)}`;
            window.open(whatsappUrl, '_blank');
        } else {
            addToast('Nomor telepon pelanggan tidak ditemukan.', 'error');
        }
    };

    return (
        <>
            <div className="hidden print:block printable-area">
                <TransactionReport
                    orders={transactions}
                    customers={customers}
                    bahanList={bahanList}
                    calculateTotal={calculateTotal}
                    getPriceForCustomer={getPriceForCustomer}
                    formatCurrency={formatCurrency}
                />
            </div>
            <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col no-print">
                 {/* This is for rendering the note for export */}
                <div className="hidden">
                     {selectedOrder && (
                        <>
                            <Nota ref={notaRef} order={selectedOrder} customers={customers} bahanList={bahanList} employees={employees} loggedInUser={loggedInUser} calculateTotal={calculateTotal} banks={banks} finishings={finishings} />
                            <Struk ref={strukRef} order={selectedOrder} customers={customers} bahanList={bahanList} employees={employees} loggedInUser={loggedInUser} calculateTotal={calculateTotal} finishings={finishings} />
                        </>
                     )}
                </div>
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Manajemen Transaksi</h2>
                     <button
                        onClick={() => window.print()}
                        className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex items-center gap-2"
                        title="Cetak Laporan Transaksi"
                    >
                        <PrintIcon className="w-5 h-5" />
                        <span className="hidden sm:inline">Cetak Laporan</span>
                    </button>
                </div>

                {/* Daily Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <StatCard title="Pendapatan Hari Ini" value={formatCurrency(todayStats.revenueToday)} icon={<TrendingUpIcon />} />
                    <StatCard title="Pesanan Belum Lunas Hari Ini" value={formatCurrency(todayStats.unpaidToday)} icon={<ReceiptIcon />} />
                    <StatCard title="Total Pesanan Hari Ini" value={todayStats.totalOrdersToday.toString()} icon={<ClipboardListIcon />} />
                </div>

                <FilterBar
                    customers={customers}
                    statusOptions={paymentStatusOptions}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    onReset={handleResetFilters}
                />

                {transactions.length > 0 ? (
                    <>
                    <div className="flex-1 overflow-y-auto -mx-4 sm:-mx-6 px-4 sm:px-6">
                        <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                            <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                                <tr>
                                    <th scope="col" className="px-6 py-3">No. Nota</th>
                                    <th scope="col" className="px-6 py-3">Pelanggan</th>
                                    <th scope="col" className="px-6 py-3">Kasir</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Tagihan</th>
                                    <th scope="col" className="px-6 py-3 text-center">Status Pembayaran</th>
                                    <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                                {currentTransactions.map((order) => {
                                    const total = calculateTotal(order);
                                    return (
                                        <tr 
                                            key={order.id} 
                                            className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200"
                                        >
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{order.no_nota}</th>
                                            <td data-label="Pelanggan" className="px-6 py-4">{customers.find(c => c.id === order.pelanggan_id)?.name || 'N/A'}</td>
                                            <td data-label="Kasir" className="px-6 py-4 capitalize">{getKasirName(order)}</td>
                                            <td data-label="Total Tagihan" className="px-6 py-4 text-right font-semibold">{formatCurrency(total)}</td>
                                            <td data-label="Status Pembayaran" className="px-6 py-4 text-center">
                                                <button 
                                                    onClick={() => order.status_pembayaran !== 'Lunas' && handleOpenModal(order)}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-transform duration-200 ${getPaymentStatusColor(order.status_pembayaran)} ${order.status_pembayaran !== 'Lunas' ? 'cursor-pointer hover:scale-105' : 'cursor-default'}`}
                                                >
                                                    {order.status_pembayaran}
                                                </button>
                                            </td>
                                            <td data-label="Aksi" className="px-6 py-4 text-center">
                                                <div className="relative inline-block" ref={isActionMenuOpen === order.id ? actionMenuRef : null}>
                                                    <button 
                                                        onClick={() => { 
                                                            setSelectedOrder(order); 
                                                            setIsActionMenuOpen(isActionMenuOpen === order.id ? null : order.id); 
                                                        }} 
                                                        className="bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 text-slate-700 dark:text-slate-200 font-bold py-1 px-3 rounded-lg text-xs transition-colors"
                                                    >
                                                        Nota
                                                    </button>
                                                    {isActionMenuOpen === order.id && (
                                                        <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg z-10">
                                                            <a href="#" onClick={(e)=>{e.preventDefault(); handlePrintStruk(); setIsActionMenuOpen(null);}} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"><ReceiptIcon className="w-4 h-4 mr-2"/>Cetak Struk</a>
                                                            <a href="#" onClick={(e)=>{e.preventDefault(); handlePrint(); setIsActionMenuOpen(null);}} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"><PrintIcon className="w-4 h-4 mr-2"/>Cetak Nota</a>
                                                            <a href="#" onClick={(e)=>{e.preventDefault(); handleSendWhatsApp(); setIsActionMenuOpen(null);}} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"><WhatsAppIcon className="w-4 h-4 mr-2"/>Kirim WhatsApp</a>
                                                            <a href="#" onClick={(e)=>{e.preventDefault(); handleSaveImage(); setIsActionMenuOpen(null);}} className="flex items-center px-4 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600"><ImageIcon className="w-4 h-4 mr-2"/>Simpan Gambar</a>
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </>
                ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Tidak Ada Transaksi Ditemukan</h2>
                        <p className="text-slate-500 dark:text-slate-400 mt-2">
                            Tidak ada data yang cocok dengan filter yang Anda pilih.
                            <br />
                            Coba sesuaikan atau atur ulang filter Anda.
                        </p>
                    </div>
                )}


                {isModalOpen && selectedOrder && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={handleCloseModal}>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex-shrink-0">Proses Pembayaran</h3>
                            <p className="text-slate-500 dark:text-slate-400 mb-6 flex-shrink-0">No. Nota: <span className="font-semibold text-slate-700 dark:text-slate-200">{selectedOrder.no_nota}</span></p>

                            <div className="flex-1 overflow-y-auto -mr-4 pr-4 space-y-6">
                                {/* Summary */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Total Tagihan</p>
                                        <p className="text-lg font-bold text-slate-800 dark:text-slate-100">{formatCurrency(calculateTotal(selectedOrder))}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Telah Dibayar</p>
                                        <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(calculateTotalPaid(selectedOrder))}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Sisa Tagihan</p>
                                        <p className="text-lg font-bold text-red-500 dark:text-red-400">{formatCurrency(calculateTotal(selectedOrder) - calculateTotalPaid(selectedOrder))}</p>
                                    </div>
                                </div>

                                {/* Payment History */}
                                {selectedOrder.payments.length > 0 && (
                                    <div>
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-2">Riwayat Pembayaran</h4>
                                        <div className="max-h-40 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-lg p-2 space-y-2">
                                            {selectedOrder.payments.map(payment => (
                                                <div key={payment.id} className="flex justify-between items-center text-sm p-2 bg-slate-50 dark:bg-slate-700/50 rounded-md">
                                                    <div>
                                                        <p className="font-medium text-slate-800 dark:text-slate-200">{new Date(payment.payment_date).toLocaleDateString('id-ID', {day: 'numeric', month: 'long', year: 'numeric'})}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">Kasir: {employees.find(e => e.user_id === payment.kasir_id)?.name || 'N/A'}</p>
                                                        <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">Sumber: {banks.find(b => b.id === payment.bank_id)?.name || 'Cash'}</p>
                                                    </div>
                                                    <p className="font-semibold text-green-600 dark:text-green-500">{formatCurrency(payment.amount)}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* New Payment Form */}
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200 mb-3">Tambah Pembayaran Baru</h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label htmlFor="paymentAmount" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Jumlah Pembayaran</label>
                                            <input
                                                id="paymentAmount"
                                                type="number"
                                                value={newPaymentAmount}
                                                onChange={(e) => setNewPaymentAmount(Number(e.target.value))}
                                                className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100"
                                                placeholder="Masukkan jumlah"
                                            />
                                        </div>
                                         <div>
                                            <label htmlFor="paymentDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Pembayaran</label>
                                            <input
                                                id="paymentDate"
                                                type="date"
                                                value={newPaymentDate}
                                                onChange={(e) => setNewPaymentDate(e.target.value)}
                                                className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100"
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="paymentSource" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Sumber Dana</label>
                                            <select
                                                id="paymentSource"
                                                value={newPaymentBankId}
                                                onChange={(e) => setNewPaymentBankId(e.target.value)}
                                                className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                                            >
                                                <option value="cash">Cash</option>
                                                {banks.map(bank => (
                                                    <option key={bank.id} value={bank.id}>{bank.name} - {bank.account_holder}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                                <button
                                    onClick={handlePaymentSubmit}
                                    disabled={isSubmitting}
                                    className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300"
                                >
                                    {isSubmitting ? 'Menyimpan...' : 'Simpan Pembayaran'}
                                </button>
                                <button
                                    onClick={handleCloseModal}
                                    className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                                >
                                    Batal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
};

export default TransactionManagement;