

import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase, Customer, Employee, Bahan, Expense, Order, OrderItem, Payment, User, Bank, Asset, Debt, NotaSetting, Supplier, StockMovement, Finishing, OrderStatus, ProductionStatus, OrderRow, Database, CustomerLevel, PaymentStatus, DisplaySettings, YouTubePlaylistItem } from '../lib/supabaseClient';
import { useToast } from './useToast';

// Type definitions for complex parameters
type UpdateOrderItemPayload = Omit<OrderItem, 'created_at' | 'order_id'> & { id?: number };
type AddOrderPayload = Omit<OrderRow, 'id' | 'created_at' | 'no_nota'> & { order_items: Omit<OrderItem, 'id'|'created_at'|'order_id'>[] };
type UpdateOrderPayload = Partial<Omit<OrderRow, 'id' | 'created_at'>> & { order_items?: UpdateOrderItemPayload[] };


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

    return order.order_items.reduce((total, item) => {
        const bahan = bahanList.find(b => b.id === item.bahan_id);
        if (!bahan) return total;

        const price = getPriceForCustomer(bahan, customer.level);
        const itemArea = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
        const itemTotal = price * itemArea * item.qty;
        return total + itemTotal;
    }, 0);
};

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const ORDERS_PAGE_SIZE = 25;

export const useAppData = (user: User | undefined) => {
    const { addToast } = useToast();
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    
    // States for all data
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [bahanList, setBahanList] = useState<Bahan[]>([]);
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [banks, setBanks] = useState<Bank[]>([]);
    const [assets, setAssets] = useState<Asset[]>([]);
    const [debts, setDebts] = useState<Debt[]>([]);
    const [notaSetting, setNotaSetting] = useState<NotaSetting>({ prefix: 'INV', start_number_str: '1' });
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
    const [finishings, setFinishings] = useState<Finishing[]>([]);
    const [displaySettings, setDisplaySettings] = useState<DisplaySettings | null>(null);

    // State for order pagination
    const [orderPage, setOrderPage] = useState(0);
    const [hasMoreOrders, setHasMoreOrders] = useState(true);
    const [isOrderLoading, setIsOrderLoading] = useState(false);
    
    const fetchFullOrder = useCallback(async (orderId: number): Promise<Order | null> => {
        const { data, error } = await supabase.from('orders').select('*, order_items(*), payments(*)').eq('id', orderId).maybeSingle();
        if (error) {
            console.error(`Error fetching full order for ID ${orderId}:`, error);
            addToast(`Gagal memuat detail order: ${error.message}`, 'error');
            return null;
        }
        return data as Order | null;
    }, [addToast]);


    const fetchInitialData = useCallback(async () => {
        setIsDataLoaded(false);
        try {
            const from = 0;
            const to = ORDERS_PAGE_SIZE - 1;

            const [
                employeesRes, customersRes, bahanRes, initialOrdersRes,
                expensesRes, banksRes, assetsRes, debtsRes, suppliersRes,
                stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes
            ] = await Promise.all([
                supabase.from('employees').select('*').order('name'),
                supabase.from('customers').select('*').order('name'),
                supabase.from('bahan').select('*').order('name'),
                supabase.from('orders').select('*, order_items(*), payments(*)').order('created_at', { ascending: false }).range(from, to),
                supabase.from('expenses').select('*').order('tanggal', { ascending: false }),
                supabase.from('banks').select('*'),
                supabase.from('assets').select('*'),
                supabase.from('debts').select('*'),
                supabase.from('suppliers').select('*').order('name'),
                supabase.from('stock_movements').select('*'),
                supabase.from('finishings').select('*').order('name'),
                supabase.from('settings').select('*').in('key', ['nota_prefix', 'nota_last_number']),
                supabase.from('display_settings').select('*').eq('id', 1).maybeSingle()
            ]);

            const responses = [employeesRes, customersRes, bahanRes, initialOrdersRes, expensesRes, banksRes, assetsRes, debtsRes, suppliersRes, stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes];
            for (const res of responses) {
                if (res.error) throw res.error;
            }

            setEmployees(employeesRes.data || []);
            setCustomers(customersRes.data || []);
            setBahanList(bahanRes.data || []);
            setExpenses(expensesRes.data || []);
            setBanks(banksRes.data || []);
            setAssets(assetsRes.data || []);
            setDebts(debtsRes.data || []);
            setSuppliers(suppliersRes.data || []);
            setStockMovements(stockMovementsRes.data || []);
            setFinishings(finishingsRes.data || []);
            
            const initialOrdersData = initialOrdersRes.data || [];
            setOrders(initialOrdersData as Order[]);
            setOrderPage(0);
            setHasMoreOrders(initialOrdersData.length === ORDERS_PAGE_SIZE);

            const prefix = notaSettingsRes.data?.find(s => s.key === 'nota_prefix')?.value || 'INV';
            const lastNumber = notaSettingsRes.data?.find(s => s.key === 'nota_last_number')?.value || '0';
            setNotaSetting({ prefix, start_number_str: lastNumber });
            setDisplaySettings(displaySettingsRes.data as DisplaySettings | null);

        } catch (error: any) {
            console.error("Error fetching initial data:", error);
            addToast(`Gagal memuat data: ${error.message}`, 'error');
        } finally {
            setIsDataLoaded(true);
        }
    }, [addToast]);

    const loadMoreOrders = useCallback(async () => {
        if (isOrderLoading || !hasMoreOrders) return;

        setIsOrderLoading(true);
        const nextPage = orderPage + 1;
        const from = nextPage * ORDERS_PAGE_SIZE;
        const to = from + ORDERS_PAGE_SIZE - 1;

        try {
            const { data, error } = await supabase.from('orders')
                .select('*, order_items(*), payments(*)')
                .order('created_at', { ascending: false })
                .range(from, to);

            if (error) throw error;
            
            setOrders(prev => [...prev, ...data as Order[]]);
            setOrderPage(nextPage);
            setHasMoreOrders(data.length === ORDERS_PAGE_SIZE);

        } catch (error: any) {
            addToast(`Gagal memuat order selanjutnya: ${error.message}`, 'error');
        } finally {
            setIsOrderLoading(false);
        }
    }, [isOrderLoading, hasMoreOrders, orderPage, addToast]);

    useEffect(() => {
        if (user && !isDataLoaded) {
            fetchInitialData();
        } else if (!user) {
            setOrders([]);
            // Clear other states if necessary
            setIsDataLoaded(false);
        }
    }, [user, isDataLoaded, fetchInitialData]);
    
    useEffect(() => {
        if (!user) return;

        const handleOrderRelatedChange = async (payload: any) => {
            const orderId = payload.new.order_id || payload.new.id || payload.old.order_id || payload.old.id;
            if (orderId) {
                const fullOrder = await fetchFullOrder(orderId);
                if (fullOrder) {
                    setOrders(prev => {
                        const index = prev.findIndex(o => o.id === orderId);
                        if (index !== -1) {
                            const newOrders = [...prev];
                            newOrders[index] = fullOrder;
                            return newOrders;
                        }
                        return [fullOrder, ...prev]; // Add new order to the top
                    });
                } else { // Order might have been deleted
                    setOrders(prev => prev.filter(o => o.id !== orderId));
                }
            }
        };

        const channel = supabase.channel('db-changes');
        channel
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, handleOrderRelatedChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, handleOrderRelatedChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payments' }, handleOrderRelatedChange)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => supabase.from('customers').select('*').order('name').then(({data}) => setCustomers(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => supabase.from('employees').select('*').order('name').then(({data}) => setEmployees(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bahan' }, () => supabase.from('bahan').select('*').order('name').then(({data}) => setBahanList(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => supabase.from('expenses').select('*').order('tanggal', {ascending: false}).then(({data}) => setExpenses(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banks' }, () => supabase.from('banks').select('*').then(({data}) => setBanks(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => supabase.from('assets').select('*').then(({data}) => setAssets(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => supabase.from('debts').select('*').then(({data}) => setDebts(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => supabase.from('suppliers').select('*').order('name').then(({data}) => setSuppliers(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => supabase.from('stock_movements').select('*').then(({data}) => setStockMovements(data || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'finishings' }, () => supabase.from('finishings').select('*').order('name').then(({data}) => setFinishings(data || [])))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchFullOrder]);
    
    const performDbOperation = async (operation: Promise<{ error: any }>, successMessage: string) => {
        const { error } = await operation;
        if (error) {
            addToast(`Gagal: ${error.message}`, 'error');
            throw error;
        }
        addToast(successMessage, 'success');
    };

    // --- CRUD functions ---
    const addCustomer = async (data: Omit<Customer, 'id' | 'created_at'>) => {
       const { data: newRecord, error } = await supabase.from('customers').insert(data).select().single();
       if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
       addToast('Pelanggan berhasil ditambahkan.', 'success');
       return newRecord;
    };
    const updateCustomer = (id: number, data: Partial<Omit<Customer, 'id'|'created_at'>>) => performDbOperation(supabase.from('customers').update(data).eq('id', id), 'Pelanggan berhasil diperbarui.');
    const deleteCustomer = (id: number) => performDbOperation(supabase.from('customers').delete().eq('id', id), 'Pelanggan berhasil dihapus.');

    const addEmployee = async (data: Omit<Employee, 'id'|'created_at'>, password: string) => {
        if (!data.email) { addToast('Email diperlukan.', 'error'); throw new Error('Email is required'); }
        try {
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({ email: data.email, password: password, options: { data: { userrole: data.position } } });
            if (signUpError) throw signUpError;
            if (!user) throw new Error('Gagal membuat user.');
            await performDbOperation(supabase.from('employees').insert({ ...data, user_id: user.id }), 'User dan profil berhasil dibuat.');
        } catch (error: any) {
            addToast(`Gagal menyimpan user: ${error.message}`, 'error'); throw error;
        }
    };
    const updateEmployee = (id: number, data: Partial<Omit<Employee, 'id'|'created_at'>>) => performDbOperation(supabase.from('employees').update(data).eq('id', id), 'User berhasil diperbarui.');
    const deleteEmployee = (id: number) => performDbOperation(supabase.from('employees').delete().eq('id', id), 'User berhasil dihapus.');

    const addBahan = async (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => {
        const { data: newRecord, error } = await supabase.from('bahan').insert({...data, stock_qty: 0}).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Bahan berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateBahan = (id: number, data: Partial<Omit<Bahan, 'id'|'created_at'>>) => performDbOperation(supabase.from('bahan').update(data).eq('id', id), 'Bahan berhasil diperbarui.');
    const deleteBahan = (id: number) => performDbOperation(supabase.from('bahan').delete().eq('id', id), 'Bahan berhasil dihapus.');

    const addBank = async (data: Omit<Bank, 'id' | 'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('banks').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Sumber dana berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateBank = (id: number, data: Partial<Omit<Bank, 'id'|'created_at'>>) => performDbOperation(supabase.from('banks').update(data).eq('id', id), 'Sumber dana berhasil diperbarui.');
    const deleteBank = (id: number) => performDbOperation(supabase.from('banks').delete().eq('id', id), 'Sumber dana berhasil dihapus.');
    
    const addAsset = async (data: Omit<Asset, 'id'|'created_at'|'is_dynamic'>) => {
        const { data: newRecord, error } = await supabase.from('assets').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Aset berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateAsset = (id: number, data: Partial<Omit<Asset, 'id'|'created_at'|'is_dynamic'>>) => performDbOperation(supabase.from('assets').update(data).eq('id', id), 'Aset berhasil diperbarui.');
    const deleteAsset = (id: number) => performDbOperation(supabase.from('assets').delete().eq('id', id), 'Aset berhasil dihapus.');

    const addDebt = async (data: Omit<Debt, 'id'|'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('debts').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Data hutang berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateDebt = (id: number, data: Partial<Omit<Debt, 'id'|'created_at'>>) => performDbOperation(supabase.from('debts').update(data).eq('id', id), 'Data hutang berhasil diperbarui.');
    const deleteDebt = (id: number) => performDbOperation(supabase.from('debts').delete().eq('id', id), 'Data hutang berhasil dihapus.');

    const addSupplier = async (data: Omit<Supplier, 'id'|'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('suppliers').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Suplier berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateSupplier = (id: number, data: Partial<Omit<Supplier, 'id'|'created_at'>>) => performDbOperation(supabase.from('suppliers').update(data).eq('id', id), 'Suplier berhasil diperbarui.');
    const deleteSupplier = (id: number) => performDbOperation(supabase.from('suppliers').delete().eq('id', id), 'Suplier berhasil dihapus.');
    
    const addFinishing = async (data: Omit<Finishing, 'id' | 'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('finishings').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Finishing berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateFinishing = (id: number, data: Partial<Omit<Finishing, 'id'|'created_at'>>) => performDbOperation(supabase.from('finishings').update(data).eq('id', id), 'Finishing berhasil diperbarui.');
    const deleteFinishing = (id: number) => performDbOperation(supabase.from('finishings').delete().eq('id', id), 'Finishing berhasil dihapus.');

    const addStockMovement = async (data: Omit<StockMovement, 'id' | 'created_at'>) => {
        const { error: moveError } = await supabase.from('stock_movements').insert(data);
        if (moveError) { addToast(`Gagal mencatat pergerakan stok: ${moveError.message}`, 'error'); throw moveError; }
        
        const { data: bahan, error: bahanError } = await supabase.from('bahan').select('stock_qty').eq('id', data.bahan_id).single();
        if (bahanError) { addToast(`Gagal mengambil stok bahan: ${bahanError.message}`, 'error'); throw bahanError; }
        
        const currentStock = bahan?.stock_qty || 0;
        const newStock = data.type === 'in' ? currentStock + data.quantity : currentStock - data.quantity;
        
        await performDbOperation(supabase.from('bahan').update({ stock_qty: newStock }).eq('id', data.bahan_id), ''); // No toast for this part
    };
    const updateBahanStock = (bahanId: number, newStockQty: number, notes: string) => {
        const bahan = bahanList.find(b => b.id === bahanId);
        if (!bahan) throw new Error('Bahan not found');
        const currentStock = bahan.stock_qty || 0;
        const difference = newStockQty - currentStock;
        if (Math.abs(difference) < 0.001) return;
        return addStockMovement({ bahan_id: bahanId, type: difference > 0 ? 'in' : 'out', quantity: Math.abs(difference), supplier_id: null, notes });
    };

    const addExpense = async (data: Omit<Expense, 'id' | 'created_at'>) => {
        await performDbOperation(supabase.from('expenses').insert(data), 'Pengeluaran berhasil ditambahkan.');
        if (data.jenis_pengeluaran === 'Bahan' && data.bahan_id && data.qty > 0) {
            await addStockMovement({
                bahan_id: data.bahan_id, type: 'in', quantity: data.qty, supplier_id: data.supplier_id, notes: `Pembelian: ${data.keterangan || 'N/A'}`
            });
            addToast('Stok bahan berhasil ditambahkan.', 'info');
        }
    };
    const updateExpense = (id: number, data: Partial<Omit<Expense, 'id'|'created_at'>>) => performDbOperation(supabase.from('expenses').update(data).eq('id', id), 'Pengeluaran berhasil diperbarui.');
    const deleteExpense = (id: number) => performDbOperation(supabase.from('expenses').delete().eq('id', id), 'Pengeluaran berhasil dihapus.');
    
    const updateNotaSetting = async (settings: NotaSetting) => {
        await Promise.all([
            supabase.from('settings').update({ value: settings.prefix }).eq('key', 'nota_prefix'),
            supabase.from('settings').update({ value: settings.start_number_str }).eq('key', 'nota_last_number')
        ]);
        setNotaSetting(settings);
        addToast('Pengaturan nota berhasil diperbarui.', 'success');
    };

    const addOrder = async (orderData: AddOrderPayload) => {
        const { data: setting, error: settingError } = await supabase.from('settings').select('value').eq('key', 'nota_last_number').maybeSingle();
        if (settingError) { addToast('Gagal mendapatkan nomor nota.', 'error'); throw settingError; }
        
        const lastNumber = parseInt(setting?.value || '0', 10);
        const nextNumber = lastNumber + 1;
        const padding = notaSetting.start_number_str.length;
        const newPaddedNumberStr = String(nextNumber).padStart(padding, '0');
        const newNotaNumber = `${notaSetting.prefix}-${newPaddedNumberStr}`;
        
        const { error } = await supabase.rpc('create_order_with_items', {
            order_data: { ...orderData, no_nota: newNotaNumber },
            order_items_data: orderData.order_items
        });

        if (error) { addToast(`Gagal menyimpan order: ${error.message}`, 'error'); throw error; }
        
        await supabase.from('settings').update({ value: newPaddedNumberStr }).eq('key', 'nota_last_number');
        setNotaSetting(prev => ({ ...prev, start_number_str: newPaddedNumberStr }));
        addToast(`Order ${newNotaNumber} berhasil ditambahkan.`, 'success');
    };

    const updateOrder = async (id: number, orderData: UpdateOrderPayload) => {
        const { error } = await supabase.rpc('update_order_with_items', {
            p_order_id: id,
            order_data: orderData,
            order_items_data: orderData.order_items
        });

        if (error) { addToast(`Gagal update order: ${error.message}`, 'error'); throw error; }
        addToast(`Order berhasil diperbarui.`, 'success');
    };
<<<<<<< HEAD
    const deleteOrder = (id: number) => performDbOperation(supabase.from('orders').delete().eq('id', id), 'Order berhasil dihapus.');
    
    const addPaymentToOrder = (orderId: number, paymentData: Omit<Payment, 'id'|'created_at'|'order_id'>) => performDbOperation(
        supabase.from('payments').insert({ ...paymentData, order_id: orderId }),
        `Pembayaran ${formatCurrency(paymentData.amount)} berhasil ditambahkan.`
    );
=======

    const deleteOrder = async (id: number) => {
        await deleteRecord('orders', id);
        setOrders(prev => prev.filter(o => o.id !== id));
        addToast('Order berhasil dihapus.', 'success');
    };

    const addPaymentToOrder = async (orderId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'>) => {
        const order = orders.find(o => o.id === orderId);
        if (!order) {
            addToast('Order tidak ditemukan.', 'error');
            return;
        }
    
        const newPayment = await createRecord('payments', { ...paymentData, order_id: orderId });
    
        const totalBill = calculateOrderTotal(order, customers, bahanList);
        const existingPayments = order.payments || [];
        const newTotalPaid = [...existingPayments, newPayment].reduce((sum, p) => sum + p.amount, 0);
    
        const newStatus: PaymentStatus = newTotalPaid >= totalBill ? 'Lunas' : 'Belum Lunas';
    
        if (order.status_pembayaran !== newStatus) {
            await updateRecord('orders', orderId, { status_pembayaran: newStatus });
        }
    
        const fullOrder = await fetchFullOrder(orderId);
        if (fullOrder) {
             setOrders(prev => prev.map(o => o.id === orderId ? fullOrder : o));
             addToast(`Pembayaran ${formatCurrency(newPayment.amount)} berhasil ditambahkan.`, 'success');
        }
    };
>>>>>>> e8001538ee1a59709d81da85613cab1478483cf9
    
    const addBulkPaymentToOrders = async (
        paymentData: Omit<Payment, 'id'|'created_at'|'order_id'|'amount'>,
        totalPaymentAmount: number,
        ordersToPay: Order[]
    ) => {
        let remainingPayment = totalPaymentAmount;
        const sortedOrders = [...ordersToPay].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
<<<<<<< HEAD
        const paymentInserts: Database['public']['Tables']['payments']['Insert'][] = [];
=======
        const paymentInserts: Tables['payments']['Insert'][] = [];
        const affectedOrderIds = new Set<number>();
        const newPaymentsByOrderId: Record<number, number> = {};
    
>>>>>>> e8001538ee1a59709d81da85613cab1478483cf9
        for (const order of sortedOrders) {
            if (remainingPayment <= 0) break;
            const totalBill = calculateOrderTotal(order, customers, bahanList);
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalBill - totalPaid);
            if (balanceDue <= 0.01) continue;
            
            const amountToPay = Math.min(remainingPayment, balanceDue);
            
            paymentInserts.push({ ...paymentData, order_id: order.id, amount: amountToPay });
<<<<<<< HEAD
            remainingPayment -= amountToPay;
        }
    
        if (paymentInserts.length === 0) { addToast('Tidak ada pembayaran yang dapat diproses.', 'info'); return; }
        await performDbOperation(supabase.from('payments').insert(paymentInserts), `${paymentInserts.length} pembayaran berhasil diproses.`);
=======
            affectedOrderIds.add(order.id);
            newPaymentsByOrderId[order.id] = (newPaymentsByOrderId[order.id] || 0) + amountToPay;
            remainingPayment -= amountToPay;
        }
    
        if (paymentInserts.length === 0) {
            addToast('Tidak ada pembayaran yang dapat diproses.', 'info');
            return;
        }
    
        try {
            const { error: insertError } = await supabase.from('payments').insert(paymentInserts as any);
            if (insertError) throw insertError;
    
            const orderStatusUpdates = [];
            for (const orderId of affectedOrderIds) {
                const order = orders.find(o => o.id === orderId);
                if (!order) continue;
    
                const totalBill = calculateOrderTotal(order, customers, bahanList);
                const originalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
                const newPaymentAmount = newPaymentsByOrderId[orderId] || 0;
                const newTotalPaid = originalPaid + newPaymentAmount;
    
                if (newTotalPaid >= totalBill && order.status_pembayaran !== 'Lunas') {
                    orderStatusUpdates.push(
                        supabase.from('orders').update({ status_pembayaran: 'Lunas' }).eq('id', orderId)
                    );
                }
            }
            
            if (orderStatusUpdates.length > 0) {
                await Promise.all(orderStatusUpdates);
            }
    
            const updatedOrders = await Promise.all(Array.from(affectedOrderIds).map(id => fetchFullOrder(id)));
            setOrders(prev => {
                const newOrders = [...prev];
                updatedOrders.forEach(updatedOrder => {
                    if (updatedOrder) {
                        const index = newOrders.findIndex(o => o.id === updatedOrder.id);
                        if (index !== -1) newOrders[index] = updatedOrder;
                    }
                });
                return newOrders;
            });
    
            addToast(`${paymentInserts.length} pembayaran berhasil diproses.`, 'success');
        } catch (error: any) {
            addToast(`Gagal memproses pembayaran: ${error.message}`, 'error');
            throw error;
        }
>>>>>>> e8001538ee1a59709d81da85613cab1478483cf9
    };

    const updateOrderStatus = async (orderId: number, status: OrderStatus, pelaksana_id: string | null = null) => {
        const fullOrder = orders.find(o => o.id === orderId);
        if (!fullOrder) return;
    
        const payload: Database['public']['Tables']['orders']['Update'] = { status_pesanan: status };
        if (pelaksana_id !== null) payload.pelaksana_id = pelaksana_id === '' ? null : pelaksana_id;
    
        await performDbOperation(supabase.from('orders').update(payload).eq('id', orderId), `Status pesanan ${fullOrder.no_nota} diubah menjadi ${status}.`);
    
        if (fullOrder.status_pesanan === 'Pending' && status === 'Waiting') {
            for (const item of fullOrder.order_items) {
                const finishing = finishings.find(f => f.id === item.finishing_id);
                const panjang_tambahan = finishing?.panjang_tambahan || 0;
                const lebar_tambahan = finishing?.lebar_tambahan || 0;
                const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                const totalLebar = (item.lebar || 0) + lebar_tambahan;
                const quantityToDeduct = (totalPanjang * totalLebar) * item.qty;
                if (quantityToDeduct > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'out', quantity: quantityToDeduct, supplier_id: null, notes: `Pemakaian untuk order ${fullOrder.no_nota}` });
            }
            addToast(`Stok bahan untuk nota ${fullOrder.no_nota} telah dikurangi.`, 'info');
        } else if (['Waiting', 'Proses'].includes(fullOrder.status_pesanan) && status === 'Pending') {
             for (const item of fullOrder.order_items) {
                const finishing = finishings.find(f => f.id === item.finishing_id);
                const panjang_tambahan = finishing?.panjang_tambahan || 0;
                const lebar_tambahan = finishing?.lebar_tambahan || 0;
                const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                const totalLebar = (item.lebar || 0) + lebar_tambahan;
                const quantityToRestore = (totalPanjang * totalLebar) * item.qty;
                if (quantityToRestore > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'in', quantity: quantityToRestore, supplier_id: null, notes: `Pembatalan proses untuk order ${fullOrder.no_nota}` });
            }
            addToast(`Stok bahan untuk nota ${fullOrder.no_nota} telah dikembalikan.`, 'info');
        }
    };

    const updateOrderItemStatus = (orderId: number, itemId: number, status: ProductionStatus) => {
        performDbOperation(supabase.from('order_items').update({ status_produksi: status }).eq('id', itemId), `Status item berhasil diubah menjadi "${status}".`);
    };
    
    const updateYouTubePlaylist = async (playlist: YouTubePlaylistItem[]) => {
      const { data: existing } = await supabase.from('display_settings').select('id').eq('id', 1).maybeSingle();
      const payload = { id: 1, youtube_url: playlist };
      const operation = existing 
          ? supabase.from('display_settings').update(payload).eq('id', 1)
          : supabase.from('display_settings').insert(payload);
      await performDbOperation(operation, 'Playlist YouTube berhasil diperbarui.');
      setDisplaySettings(prev => ({...prev, id: 1, created_at: prev?.created_at || new Date().toISOString(), youtube_url: playlist}));
    };
    
    const dynamicAssets = useMemo(() => {
        const totalRevenue = orders.flatMap(o => o.payments).reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.harga * exp.qty), 0);
        const netProfit = totalRevenue - totalExpenses;
        const labaBersihAsset: Asset = {
            id: -1, created_at: new Date().toISOString(), name: 'Laba Bersih (Kas)', category: 'Aset Lancar',
            purchase_price: netProfit, purchase_date: new Date().toISOString().split('T')[0], status: 'Baik', is_dynamic: true,
        };
        return [labaBersihAsset];
    }, [orders, expenses]);
    const allAssets = useMemo(() => [...dynamicAssets, ...assets].sort((a,b) => (b.id) - (a.id)), [dynamicAssets, assets]);

    return {
        isDataLoaded,
        employees, addEmployee, updateEmployee, deleteEmployee,
        customers, addCustomer, updateCustomer, deleteCustomer,
        bahanList, addBahan, updateBahan, deleteBahan,
        orders, addOrder, updateOrder, deleteOrder, addPaymentToOrder, addBulkPaymentToOrders, updateOrderStatus, updateOrderItemStatus,
        loadMoreOrders, hasMoreOrders, isOrderLoading,
        expenses, addExpense, updateExpense, deleteExpense,
        banks, addBank, updateBank, deleteBank,
        assets: allAssets, addAsset, updateAsset, deleteAsset,
        debts, addDebt, updateDebt, deleteDebt,
        notaSetting, updateNotaSetting,
        suppliers, addSupplier, updateSupplier, deleteSupplier,
        stockMovements,
        finishings, addFinishing, updateFinishing, deleteFinishing,
        updateBahanStock,
        displaySettings,
        updateYouTubePlaylist,
    };
};