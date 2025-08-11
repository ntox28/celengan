import React, { useState, useEffect, useMemo, useRef } from 'react';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import PrintIcon from '../icons/PrintIcon';
import { Customer, CustomerLevel, Bahan, Order, OrderItem, User as AuthUser, ProductionStatus, OrderStatus, Finishing, OrderRow, NotaSetting } from '../../lib/supabaseClient';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import Pagination from '../Pagination';
import FilterBar from '../FilterBar';
import { useToast } from '../../hooks/useToast';
import SPK from './SPK';
import PlayCircleIcon from '../icons/PlayCircleIcon';
import SettingsIcon from '../icons/SettingsIcon';
import NotaManagement from '../settings/NotaManagement';
import FinishingManagement from '../settings/FinishingManagement';
import UserPlusIcon from '../icons/UserPlusIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';

type LocalOrderItem = {
    local_id: number;
    id?: number;
    created_at?: string;
    bahan_id: number;
    deskripsi_pesanan: string | null;
    panjang: string;
    lebar: string;
    qty: number;
    status_produksi: ProductionStatus;
    finishing_id: number | null;
};

type LocalOrder = Omit<OrderRow, 'id' | 'created_at'> & { order_items: LocalOrderItem[] };

const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const emptyItem: Omit<LocalOrderItem, 'local_id'> = { bahan_id: 0, deskripsi_pesanan: '', panjang: '0', lebar: '0', qty: 1, status_produksi: 'Belum Dikerjakan', finishing_id: null };
const emptyOrder: LocalOrder = {
    no_nota: '',
    tanggal: new Date().toISOString().split('T')[0],
    pelanggan_id: 0,
    order_items: [{ ...emptyItem, local_id: Date.now() }],
    pelaksana_id: null,
    status_pembayaran: 'Belum Lunas',
    status_pesanan: 'Pending',
};

const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 0 0-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h9.75a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
  </svg>
);

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

const calculateTotal = (order: { pelanggan_id: number; order_items: Array<{ bahan_id: number; panjang: number | string | null; lebar: number | string | null; qty: number; }> }, customers: Customer[], bahanList: Bahan[]): number => {
    const customer = customers.find(c => c.id === order.pelanggan_id);
    if (!customer) return 0;

    return order.order_items.reduce((total, item) => {
        const bahan = bahanList.find(b => b.id === item.bahan_id);
        if (!bahan || !item.bahan_id) return total;

        const price = getPriceForCustomer(bahan, customer.level);
        const p = parseFloat(String(item.panjang || '0').replace(',', '.')) || 0;
        const l = parseFloat(String(item.lebar || '0').replace(',', '.')) || 0;
        const itemArea = p > 0 && l > 0 ? p * l : 1;
        const itemTotal = price * itemArea * item.qty;
        return total + itemTotal;
    }, 0);
};

interface OrderManagementProps {
    customers: Customer[];
    addCustomer: (data: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
    bahanList: Bahan[];
    orders: Order[];
    finishings: Finishing[];
    addFinishing: (data: Omit<Finishing, 'id' | 'created_at'>) => Promise<Finishing>;
    updateFinishing: (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => Promise<void>;
    deleteFinishing: (id: number) => Promise<void>;
    loggedInUser: AuthUser;
    addOrder: (orderData: Omit<OrderRow, 'id' | 'created_at' | 'no_nota'> & { order_items: Omit<OrderItem, 'id'|'created_at'|'order_id'>[] }) => Promise<void>;
    updateOrder: (id: number, orderData: Partial<Omit<OrderRow, 'id' | 'created_at'>> & { order_items?: (Omit<OrderItem, 'created_at'|'order_id'> & {id?: number})[] }) => Promise<void>;
    deleteOrder: (id: number) => Promise<void>;
    updateOrderStatus: (orderId: number, status: OrderStatus, pelaksana_id?: string | null) => Promise<void>;
    notaSetting: NotaSetting;
    updateNotaSetting: (settings: NotaSetting) => Promise<void>;
}

const initialCustomerData: Omit<Customer, 'id' | 'created_at'> = { name: '', email: '', phone: '', address: '', level: 'End Customer' };

const AddCustomerModal: React.FC<{
    onClose: () => void;
    addCustomer: (data: Omit<Customer, 'id' | 'created_at'>) => Promise<Customer>;
    onCustomerAdded: (customer: Customer) => void;
}> = ({ onClose, addCustomer, onCustomerAdded }) => {
    const [formData, setFormData] = useState(initialCustomerData);
    const [isLoading, setIsLoading] = useState(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const newCustomer = await addCustomer(formData);
            if (newCustomer) {
                onCustomerAdded(newCustomer);
            }
        } catch (error) {
            console.error("Failed to add customer from modal:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg p-6 sm:p-8 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 flex-shrink-0">Tambah Pelanggan Baru</h3>
                <form onSubmit={handleSubmit} className="space-y-4 flex-1 overflow-y-auto -mr-4 pr-4">
                    <div>
                        <label htmlFor="modal_name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama</label>
                        <input type="text" name="name" id="modal_name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                    </div>
                    <div>
                        <label htmlFor="modal_level" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Level Pelanggan</label>
                        <select
                            name="level" id="modal_level" value={formData.level} onChange={handleInputChange} required
                            className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                            style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                        >
                            <option value="End Customer">End Customer</option>
                            <option value="Retail">Retail</option>
                            <option value="Grosir">Grosir</option>
                            <option value="Reseller">Reseller</option>
                            <option value="Corporate">Corporate</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="modal_email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                        <input type="email" name="email" id="modal_email" value={formData.email} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                    </div>
                    <div>
                        <label htmlFor="modal_phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nomor Telepon</label>
                        <input type="tel" name="phone" id="modal_phone" value={formData.phone} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                    </div>
                    <div>
                        <label htmlFor="modal_address" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Alamat</label>
                        <textarea name="address" id="modal_address" value={formData.address} onChange={handleInputChange} required rows={3} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"></textarea>
                    </div>
                </form>
                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                    <button onClick={handleSubmit} disabled={isLoading} className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">
                        {isLoading ? 'Menyimpan...' : 'Simpan Pelanggan'}
                    </button>
                    <button onClick={onClose} className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};


const OrderManagement: React.FC<OrderManagementProps> = ({ customers, addCustomer, bahanList, orders, finishings, addFinishing, updateFinishing, deleteFinishing, loggedInUser, addOrder, updateOrder, deleteOrder, updateOrderStatus, notaSetting, updateNotaSetting }) => {
    const [editingOrder, setEditingOrder] = useState<Order | null>(null);
    const [formData, setFormData] = useState<LocalOrder>(emptyOrder);
    const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [isFinishingModalOpen, setIsFinishingModalOpen] = useState(false);
    const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 5;
    
    const [printableContent, setPrintableContent] = useState<React.ReactNode | null>(null);
    const formRef = useRef<HTMLDivElement>(null);
    
    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        status: 'all',
    });

    const modalOrderTotal = useMemo(() => {
        if (!formData.pelanggan_id) return 0;
        return calculateTotal(formData, customers, bahanList);
    }, [formData, customers, bahanList]);

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => {
                const customerMatch = filters.customerId === 'all' || order.pelanggan_id === Number(filters.customerId);
                const startDateMatch = !filters.startDate || order.tanggal >= filters.startDate;
                const endDateMatch = !filters.endDate || order.tanggal <= filters.endDate;
                const statusMatch = filters.status === 'all' || order.status_pembayaran === filters.status;
                return customerMatch && startDateMatch && endDateMatch && statusMatch;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [orders, filters]);

    const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
    const currentOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    useEffect(() => {
        if (printableContent) {
            const timer = setTimeout(() => {
                window.print();
                setPrintableContent(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printableContent]);

    const handleEdit = (order: Order) => {
        setEditingOrder(order);
        setFormData({
            ...order,
            order_items: order.order_items.map(item => ({
                ...item, 
                local_id: item.id,
                panjang: String(item.panjang || '0').replace('.', ','),
                lebar: String(item.lebar || '0').replace('.', ','),
            }))
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingOrder(null);
        setFormData({ ...emptyOrder, order_items: [{ ...emptyItem, local_id: Date.now() }] });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

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

    const paymentStatusOptions = [
        { value: 'Belum Lunas', label: 'Belum Lunas' },
        { value: 'Lunas', label: 'Lunas' },
    ];

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ 
            ...prev, 
            [name]: name === 'pelanggan_id' ? Number(value) : value 
        }));
    };

    const handleItemChange = (index: number, e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        const newItems = [...formData.order_items];
        const itemToUpdate = { ...newItems[index] };
        
        if (name === 'panjang' || name === 'lebar') {
            (itemToUpdate as any)[name] = value;
        } else if (name === 'bahan_id' || name === 'qty' || name === 'finishing_id') {
             (itemToUpdate as any)[name] = value === '' ? null : Number(value);
        } else {
             (itemToUpdate as any)[name] = value;
        }

        newItems[index] = itemToUpdate;
        setFormData(prev => ({ ...prev, order_items: newItems }));
    };

    const addItem = () => {
        setFormData(prev => ({ ...prev, order_items: [...prev.order_items, { ...emptyItem, local_id: Date.now() }] }));
    };

    const removeItem = (index: number) => {
        if (formData.order_items.length <= 1) {
             addToast('Pesanan harus memiliki minimal satu item.', 'error');
            return;
        };
        const newItems = formData.order_items.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, order_items: newItems }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.pelanggan_id) {
            addToast('Pelanggan harus dipilih.', 'error');
            return;
        }
        if (formData.order_items.some(item => !item.bahan_id || item.bahan_id === 0)) {
            addToast('Setiap item pesanan harus memiliki bahan yang dipilih.', 'error');
            return;
        }
        setIsLoading(true);

        const preparedOrderItems = formData.order_items.map(item => ({
            id: item.id,
            bahan_id: item.bahan_id,
            deskripsi_pesanan: item.deskripsi_pesanan,
            finishing_id: item.finishing_id,
            status_produksi: item.status_produksi,
            panjang: parseFloat(String(item.panjang).replace(',', '.')) || 0,
            lebar: parseFloat(String(item.lebar).replace(',', '.')) || 0,
            qty: item.qty
        }));
        
        try {
            if (editingOrder) {
                if (editingOrder.status_pesanan !== 'Pending') {
                    addToast('Hanya order dengan status "Pending" yang bisa diedit.', 'error');
                    setIsLoading(false);
                    return;
                }
                const { no_nota, ...updatePayload } = formData;
                const finalUpdatePayload = {
                    ...updatePayload,
                    order_items: preparedOrderItems,
                };
                await updateOrder(editingOrder.id, finalUpdatePayload);
            } else {
                const { no_nota, ...addPayload } = formData;
                const finalAddPayload = {
                    ...addPayload,
                    order_items: preparedOrderItems.map(({id, ...rest}) => rest),
                };
                await addOrder(finalAddPayload);
                handleAddNew();
            }
        } catch (error: any) {
            console.error("Failed to save order:", error);
            const errorMessage = error.message || 'Terjadi kesalahan yang tidak diketahui.';
            addToast(`Gagal menyimpan order: ${errorMessage}`, 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleProcessOrder = async (orderId: number) => {
        const orderToProcess = orders.find(o => o.id === orderId);
        if (!orderToProcess) return;

        if (window.confirm(`Proses pesanan untuk Nota ${orderToProcess.no_nota}? Anda akan ditetapkan sebagai pelaksana.`)) {
            await updateOrderStatus(orderId, 'Proses', loggedInUser.id);
            addToast(`Pesanan ${orderToProcess.no_nota} telah diproses.`, 'success');
        }
    };

    const handleDelete = async (orderId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus pesanan ini? Semua item dan pembayaran terkait akan dihapus.')) {
            await deleteOrder(orderId);
            if (editingOrder?.id === orderId) {
                handleAddNew();
            }
        }
    };
    
    const getCustomerName = (id: number | '' | undefined) => {
        return customers.find(c => c.id === id)?.name || 'N/A';
    }

    const toggleExpand = (orderId: number) => {
        setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
    };

    const handleCopyItemDetails = (order: Order, item: OrderItem) => {
        const customerName = getCustomerName(order.pelanggan_id);
        const nota = order.no_nota;
        const bahan = bahanList.find(b => b.id === item.bahan_id)?.name || 'N/A';
        const deskripsi = item.deskripsi_pesanan || '-';
        const ukuran = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}X${item.lebar}` : '-';
        const qty = `${item.qty}Pcs`;
        const finishingName = finishings.find(f => f.id === item.finishing_id)?.name || '-';

        const textToCopy = [customerName, nota, bahan, deskripsi, ukuran, qty, finishingName].join('//').toUpperCase();

        navigator.clipboard.writeText(textToCopy).then(() => {
            addToast('Detail item berhasil disalin!', 'success');
        }).catch(err => {
            console.error('Could not copy text: ', err);
            addToast('Gagal menyalin teks.', 'error');
        });
    };
    
    const handlePrintSpk = (order: Order) => {
        const spkComponent = <SPK order={order} customer={customers.find(c => c.id === order.pelanggan_id)} bahanList={bahanList} finishings={finishings} />;
        const styles = `
            @page { 
                size: 58mm auto;
                margin: 0; 
            }
            body { 
                -webkit-print-color-adjust: exact; 
                margin: 0;
                padding: 0;
            }
            .printable-area {
                padding: 0 !important;
                margin: 0 !important;
                left: 0;
                top: 0;
                position: absolute;
                width: 100%;
            }
        `;
        
        setPrintableContent(
            <>
                <style type="text/css" media="print">{styles}</style>
                {spkComponent}
            </>
        );
    };

    return (
        <>
            <div className="printable-area">
                {printableContent}
            </div>
            <div className="no-print">
                 {isSettingsModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setIsSettingsModalOpen(false)}>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-4 sm:p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex-1 overflow-y-auto">
                                <NotaManagement settings={notaSetting} onUpdate={updateNotaSetting} />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-right">
                                <button onClick={() => setIsSettingsModalOpen(false)} className="px-6 py-2 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                 {isFinishingModalOpen && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setIsFinishingModalOpen(false)}>
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-5xl p-4 sm:p-6 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                            <div className="flex-1 overflow-y-auto">
                                <FinishingManagement
                                    finishings={finishings}
                                    addFinishing={addFinishing}
                                    updateFinishing={updateFinishing}
                                    deleteFinishing={deleteFinishing}
                                />
                            </div>
                            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 text-right">
                                <button onClick={() => setIsFinishingModalOpen(false)} className="px-6 py-2 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors">
                                    Tutup
                                </button>
                            </div>
                        </div>
                    </div>
                )}
                 {isAddCustomerModalOpen && (
                    <AddCustomerModal 
                        onClose={() => setIsAddCustomerModalOpen(false)} 
                        addCustomer={addCustomer}
                        onCustomerAdded={(newCustomer) => {
                            setFormData(prev => ({...prev, pelanggan_id: newCustomer.id}));
                            setIsAddCustomerModalOpen(false);
                        }}
                    />
                )}

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 h-full">
                     {/* Form Column */}
                    <div ref={formRef} className="xl:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                        <div className="flex justify-between items-center mb-6 flex-shrink-0">
                            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {editingOrder ? 'Edit Order' : 'Tambah Order Baru'}
                            </h3>
                            <div className="flex items-center gap-2">
                                <button onClick={() => setIsSettingsModalOpen(true)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors" title="Pengaturan Nota">
                                    <SettingsIcon className="h-5 w-5" />
                                </button>
                                <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                                    Buat Baru
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto -mr-3 pr-3 no-scrollbar">
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label htmlFor="no_nota" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">No. Nota</label>
                                        <div className="w-full pl-4 pr-4 py-3 bg-slate-100 dark:bg-slate-700/50 border border-slate-300 dark:border-slate-600 rounded-md text-slate-500 dark:text-slate-400">
                                            {editingOrder ? formData.no_nota : "Nota Otomatis"}
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="tanggal" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal</label>
                                        <input type="date" name="tanggal" id="tanggal" value={formData.tanggal} onChange={handleFormChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                                    </div>
                                </div>

                                 <div>
                                    <label htmlFor="pelanggan_id" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Pelanggan</label>
                                    <div className="flex items-center gap-2">
                                        <select name="pelanggan_id" id="pelanggan_id" value={formData.pelanggan_id} onChange={handleFormChange} required className="flex-grow w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                            <option value={0} disabled>Pilih Pelanggan</option>
                                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </select>
                                        <button
                                            type="button"
                                            onClick={() => setIsAddCustomerModalOpen(true)}
                                            className="p-2 flex-shrink-0 rounded-lg text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/60 transition-colors"
                                            title="Tambah Pelanggan Baru"
                                        >
                                            <UserPlusIcon className="h-6 w-6" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {formData.order_items.map((item, index) => (
                                        <div key={item.local_id} className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 space-y-4 relative">
                                            <h4 className="font-semibold text-pink-600">Detail Pesanan #{index + 1}</h4>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label htmlFor={`bahan_id-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Bahan</label>
                                                    <select name="bahan_id" id={`bahan_id-${index}`} value={item.bahan_id} onChange={(e) => handleItemChange(index, e)} required className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                                        <option value={0} disabled>Pilih Bahan</option>
                                                        {bahanList.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label htmlFor={`deskripsi_pesanan-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Deskripsi Pesanan</label>
                                                    <input type="text" name="deskripsi_pesanan" id={`deskripsi_pesanan-${index}`} value={item.deskripsi_pesanan || ''} onChange={(e) => handleItemChange(index, e)} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                                                </div>
                                                <div>
                                                    <div className="flex justify-between items-center mb-1">
                                                        <label htmlFor={`finishing_id-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300">Finishing</label>
                                                        <button
                                                            type="button"
                                                            onClick={() => setIsFinishingModalOpen(true)}
                                                            className="p-1 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                                            title="Atur Opsi Finishing"
                                                        >
                                                            <SettingsIcon className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                    <select name="finishing_id" id={`finishing_id-${index}`} value={item.finishing_id || ''} onChange={(e) => handleItemChange(index, e)} className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 appearance-none" style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}>
                                                        <option value="">Tanpa Finishing</option>
                                                        {finishings.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-3 gap-4">
                                                <div>
                                                    <label htmlFor={`panjang-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Panjang (m)</label>
                                                    <input type="text" name="panjang" id={`panjang-${index}`} value={item.panjang} onChange={(e) => handleItemChange(index, e)} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                                                </div>
                                                <div>
                                                    <label htmlFor={`lebar-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Lebar (m)</label>
                                                    <input type="text" name="lebar" id={`lebar-${index}`} value={item.lebar} onChange={(e) => handleItemChange(index, e)} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                                                </div>
                                                <div>
                                                    <label htmlFor={`qty-${index}`} className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Qty</label>
                                                    <input type="number" name="qty" id={`qty-${index}`} value={item.qty} onChange={(e) => handleItemChange(index, e)} required min="1" className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100" />
                                                </div>
                                            </div>
                                            {formData.order_items.length > 1 && (
                                                <button type="button" onClick={() => removeItem(index)} className="absolute top-3 right-3 text-red-600 hover:text-red-500 p-1 rounded-full bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={addItem} className="w-full py-2 rounded-lg text-pink-600 bg-pink-100 dark:bg-pink-900/40 dark:text-pink-400 hover:bg-pink-200 dark:hover:bg-pink-900/60 border border-pink-200 dark:border-pink-900/50 transition-colors">Tambah Item</button>

                                <div className="flex flex-col pt-6 border-t border-slate-200 dark:border-slate-700 mt-6 flex-shrink-0 gap-4">
                                    <div>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Estimasi Total Harga</p>
                                        <p className="text-2xl font-bold text-pink-600 dark:text-pink-500">{formatCurrency(modalOrderTotal)}</p>
                                    </div>
                                    <div className="flex">
                                        <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingOrder ? 'Simpan Perubahan' : 'Simpan Order')}</button>
                                    </div>
                                </div>
                            </form>
                         </div>
                    </div>

                    {/* Table Column */}
                    <div className="xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                        <FilterBar
                            customers={customers}
                            statusOptions={paymentStatusOptions}
                            filters={filters}
                            onFilterChange={handleFilterChange}
                            onReset={handleResetFilters}
                        />
                        
                        <div className="flex-1 overflow-y-auto -mx-6 px-6">
                             <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                                    <tr>
                                        <th scope="col" className="px-6 py-3">No. Nota</th>
                                        <th scope="col" className="px-6 py-3">Pelanggan</th>
                                        <th scope="col" className="px-6 py-3 text-center">Status</th>
                                        <th scope="col" className="px-6 py-3 text-center">Detail</th>
                                        <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                                    {currentOrders.map((order) => (
                                       <React.Fragment key={order.id}>
                                        <tr 
                                            className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingOrder?.id === order.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}
                                        >
                                            <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{order.no_nota}</th>
                                            <td data-label="Pelanggan" className="px-6 py-4">{getCustomerName(order.pelanggan_id)}</td>
                                            <td data-label="Status Pesanan" className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    order.status_pesanan === 'Selesai'
                                                        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
                                                        : order.status_pesanan === 'Proses'
                                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                                                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300'
                                                }`}>
                                                    {order.status_pesanan}
                                                </span>
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
                                            <td data-label="Aksi" className="px-6 py-4 text-center space-x-2">
                                                {order.status_pesanan === 'Proses' && (
                                                     <button
                                                        onClick={() => { if(window.confirm(`Yakin ingin menyelesaikan pesanan Nota ${order.no_nota}?`)) { updateOrderStatus(order.id, 'Selesai')}}}
                                                        className="text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
                                                        title="Tandai Selesai"
                                                    >
                                                        <CheckCircleIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                {order.status_pesanan === 'Pending' && (
                                                    <button
                                                        onClick={() => handleProcessOrder(order.id)}
                                                        className="text-green-600 hover:text-green-500 dark:text-green-400 dark:hover:text-green-300 transition-colors p-1"
                                                        title="Proses Pesanan"
                                                    >
                                                        <PlayCircleIcon className="w-5 h-5" />
                                                    </button>
                                                )}
                                                <button 
                                                    onClick={() => handleEdit(order)} 
                                                    disabled={order.status_pesanan !== 'Pending'}
                                                    className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1 disabled:text-slate-400 dark:disabled:text-slate-600 disabled:cursor-not-allowed" 
                                                    title={order.status_pesanan !== 'Pending' ? 'Hanya order dengan status Pending yang bisa diedit' : 'Edit Pesanan'}
                                                >
                                                    <EditIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handlePrintSpk(order)} className="text-slate-600 hover:text-slate-500 dark:text-slate-400 dark:hover:text-slate-300 transition-colors p-1" title="Cetak SPK">
                                                    <PrintIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleDelete(order.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1" title="Hapus Pesanan">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            </td>
                                        </tr>
                                        {expandedOrderId === order.id && (
                                            <tr className="bg-slate-50 dark:bg-slate-800/50 md:table-row">
                                                <td colSpan={5} className="p-0">
                                                    <div className="px-4 sm:px-6 py-4">
                                                        <h4 className="text-md font-semibold text-slate-700 dark:text-slate-200 mb-3">Rincian Item Pesanan:</h4>
                                                        <div className="border border-slate-200 dark:border-slate-600 rounded-lg overflow-hidden">
                                                            <table className="w-full text-sm text-left text-slate-600 dark:text-slate-300">
                                                                <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-100 dark:bg-slate-700">
                                                                    <tr>
                                                                        <th scope="col" className="px-4 py-2">Deskripsi</th>
                                                                        <th scope="col" className="px-4 py-2">Bahan</th>
                                                                        <th scope="col" className="px-4 py-2 text-center">Ukuran</th>
                                                                        <th scope="col" className="px-4 py-2 text-center">Qty</th>
                                                                        <th scope="col" className="px-4 py-2 text-center">Aksi</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-slate-200 dark:divide-slate-600">
                                                                    {order.order_items.map(item => {
                                                                        const bahan = bahanList.find(b => b.id === item.bahan_id);
                                                                        return (
                                                                            <tr key={item.id}>
                                                                                <td className="px-4 py-3">{item.deskripsi_pesanan || '-'}</td>
                                                                                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{bahan?.name || 'N/A'}</td>
                                                                                <td className="px-4 py-3 text-center">{(item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : '-'}</td>
                                                                                <td className="px-4 py-3 text-center">{item.qty}</td>
                                                                                <td className="px-4 py-3 text-center">
                                                                                    <button 
                                                                                        onClick={() => handleCopyItemDetails(order, item)} 
                                                                                        className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 transition-colors p-1"
                                                                                        title="Salin detail item"
                                                                                    >
                                                                                        <CopyIcon className="w-5 h-5" />
                                                                                    </button>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        <div className="flex justify-end items-center mt-4 text-right">
                                                            <span className="text-sm font-medium text-slate-600 dark:text-slate-300 mr-4">Estimasi Total Harga:</span>
                                                            <span className="text-xl font-bold text-pink-600 dark:text-pink-500">
                                                                {formatCurrency(calculateTotal(order, customers, bahanList))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                       </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                    </div>
                </div>
            </div>
        </>
    );
};

export default OrderManagement;