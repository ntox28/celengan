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

const fetchFullOrder = async (orderId: number): Promise<Order | null> => {
    try {
        const { data: orderData, error: orderError } = await supabase.from('orders').select('*').eq('id', orderId).single();
        if (orderError) throw orderError;
        if (!orderData) return null;

        const { data: orderItems, error: itemsError } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        if (itemsError) throw itemsError;

        const { data: payments, error: paymentsError } = await supabase.from('payments').select('*').eq('order_id', orderId);
        if (paymentsError) throw paymentsError;

        const fullOrder: Order = {
            ...(orderData as OrderRow),
            order_items: orderItems || [],
            payments: payments || [],
        };
        return fullOrder;
    } catch (error: any) {
        console.error(`Error fetching full order for ID ${orderId}:`, error);
        throw error;
    }
}

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

    const fetchInitialData = useCallback(async () => {
        setIsDataLoaded(false); // Reset loading state for refetch
        try {
            const from = 0;
            const to = ORDERS_PAGE_SIZE - 1;

            const [
                employeesRes, customersRes, bahanRes, initialOrdersRes, // Fetches first page only
                expensesRes, banksRes, assetsRes, debtsRes, suppliersRes,
                stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes
            ] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('customers').select('*'),
                supabase.from('bahan').select('*'),
                supabase.from('orders').select('*, order_items(*), payments(*)').order('created_at', { ascending: false }).range(from, to),
                supabase.from('expenses').select('*'),
                supabase.from('banks').select('*'),
                supabase.from('assets').select('*'),
                supabase.from('debts').select('*'),
                supabase.from('suppliers').select('*'),
                supabase.from('stock_movements').select('*'),
                supabase.from('finishings').select('*'),
                supabase.from('settings').select('*').in('key', ['nota_prefix', 'nota_last_number']),
                supabase.from('display_settings').select('*').eq('id', 1).single()
            ]);

            const responses = [employeesRes, customersRes, bahanRes, initialOrdersRes, expensesRes, banksRes, assetsRes, debtsRes, suppliersRes, stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes];
            for (const res of responses) {
                if (res.error && (res.error as any).code !== 'PGRST116') throw res.error;
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

            // Handle orders pagination
            const initialOrdersData = initialOrdersRes.data || [];
            setOrders(initialOrdersData as Order[]);
            setOrderPage(0); // Reset page count
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
            setEmployees([]); setCustomers([]); setBahanList([]); setOrders([]); setExpenses([]); setBanks([]); setAssets([]); setDebts([]); setSuppliers([]); setStockMovements([]); setFinishings([]); setDisplaySettings(null);
            setIsDataLoaded(false);
        }
    }, [user, isDataLoaded, fetchInitialData]);
    
    type Tables = Database['public']['Tables'];
    type TableName = keyof Tables;
    
    type TableWithIdKey = { [K in keyof Tables]: Tables[K]['Row'] extends { id: number } ? K : never }[keyof Tables];

    // --- Generic CRUD functions ---
    const createRecord = async <T extends TableName>(
        table: T,
        data: Tables[T]['Insert']
    ): Promise<Tables[T]['Row']> => {
        const { data: newRecord, error } = await supabase.from(table).insert(data as any).select().single();
        if (error) {
            addToast(`Gagal: ${error.message}`, 'error');
            throw error;
        }
        return newRecord as Tables[T]['Row'];
    };

    const updateRecord = async <T extends TableWithIdKey>(
        table: T,
        id: number,
        data: Tables[T]['Update']
    ) => {
        const { error } = await supabase.from(table).update(data as any).eq('id', id as any);
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
    };

    const deleteRecord = async <T extends TableWithIdKey>(
        table: T,
        id: number
    ) => {
        const { error } = await supabase.from(table).delete().eq('id', id as any);
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
    };
    
    // --- Customers ---
    const addCustomer = async (data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
        const newRecord = await createRecord('customers', data);
        setCustomers(prev => [newRecord, ...prev].sort((a, b) => a.name.localeCompare(b.name)));
        addToast('Pelanggan berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateCustomer = async (id: number, data: Partial<Omit<Customer, 'id' | 'created_at'>>) => {
        await updateRecord('customers', id, data);
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, ...data } as Customer : c));
        addToast('Pelanggan berhasil diperbarui.', 'success');
    };
    const deleteCustomer = async (id: number) => {
        await deleteRecord('customers', id);
        setCustomers(prev => prev.filter(c => c.id !== id));
        addToast('Pelanggan berhasil dihapus.', 'success');
    };

    // --- Employees ---
    const addEmployee = async (data: Omit<Employee, 'id' | 'created_at'>, password: string) => {
        if (!data.email) {
            addToast('Email diperlukan untuk membuat user baru.', 'error');
            throw new Error('Email is required');
        }
        try {
            const { data: { user }, error: signUpError } = await supabase.auth.signUp({
                email: data.email, password: password, options: { data: { userrole: data.position } }
            });
            if (signUpError) throw signUpError;
            if (!user) throw new Error('Gagal membuat user.');
    
            const employeeProfileData: Tables['employees']['Insert'] = { ...data, user_id: user.id };
            const { data: newEmployee, error: profileError } = await supabase.from('employees').insert(employeeProfileData as any).select().single();
            if (profileError) throw profileError;
            
            setEmployees(prev => [newEmployee, ...prev].sort((a,b) => a.name.localeCompare(b.name)));
            addToast('User dan profil berhasil dibuat.', 'success');
        } catch (error: any) {
            addToast(`Gagal menyimpan user: ${error.message}`, 'error');
            throw error;
        }
    };
    const updateEmployee = async (id: number, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => {
        await updateRecord('employees', id, data);
        setEmployees(prev => prev.map(e => e.id === id ? { ...e, ...data } as Employee : e));
        addToast('User berhasil diperbarui.', 'success');
    };
    const deleteEmployee = async (id: number) => {
        await deleteRecord('employees', id);
        setEmployees(prev => prev.filter(e => e.id !== id));
        addToast('User berhasil dihapus.', 'success');
    };

    // --- Bahan ---
    const addBahan = async (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => {
        const newRecord = await createRecord('bahan', {...data, stock_qty: 0});
        setBahanList(prev => [newRecord, ...prev]);
        addToast('Bahan berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateBahan = async (id: number, data: Partial<Omit<Bahan, 'id' | 'created_at'>>) => {
        await updateRecord('bahan', id, data);
        setBahanList(prev => prev.map(b => b.id === id ? { ...b, ...data } as Bahan : b));
        addToast('Bahan berhasil diperbarui.', 'success');
    };
    const deleteBahan = async (id: number) => {
        await deleteRecord('bahan', id);
        setBahanList(prev => prev.filter(b => b.id !== id));
        addToast('Bahan berhasil dihapus.', 'success');
    };

    // --- Banks ---
    const addBank = async (data: Omit<Bank, 'id' | 'created_at'>) => {
        const newRecord = await createRecord('banks', data);
        setBanks(prev => [newRecord, ...prev]);
        addToast('Sumber dana berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateBank = async (id: number, data: Partial<Omit<Bank, 'id' | 'created_at'>>) => {
        await updateRecord('banks', id, data);
        setBanks(prev => prev.map(b => b.id === id ? { ...b, ...data } as Bank : b));
        addToast('Sumber dana berhasil diperbarui.', 'success');
    };
    const deleteBank = async (id: number) => {
        await deleteRecord('banks', id);
        setBanks(prev => prev.filter(b => b.id !== id));
        addToast('Sumber dana berhasil dihapus.', 'success');
    };

    // --- Assets ---
    const addAsset = async (data: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>) => {
        const newRecord = await createRecord('assets', data);
        setAssets(prev => [newRecord, ...prev]);
        addToast('Aset berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateAsset = async (id: number, data: Partial<Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>>) => {
        await updateRecord('assets', id, data);
        setAssets(prev => prev.map(a => a.id === id ? { ...a, ...data } as Asset : a));
        addToast('Aset berhasil diperbarui.', 'success');
    };
    const deleteAsset = async (id: number) => {
        await deleteRecord('assets', id);
        setAssets(prev => prev.filter(a => a.id !== id));
        addToast('Aset berhasil dihapus.', 'success');
    };

    // --- Debts ---
    const addDebt = async (data: Omit<Debt, 'id' | 'created_at'>) => {
        const newRecord = await createRecord('debts', data);
        setDebts(prev => [newRecord, ...prev]);
        addToast('Data hutang berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateDebt = async (id: number, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => {
        await updateRecord('debts', id, data);
        setDebts(prev => prev.map(d => d.id === id ? { ...d, ...data } as Debt : d));
        addToast('Data hutang berhasil diperbarui.', 'success');
    };
    const deleteDebt = async (id: number) => {
        await deleteRecord('debts', id);
        setDebts(prev => prev.filter(d => d.id !== id));
        addToast('Data hutang berhasil dihapus.', 'success');
    };

    // --- Suppliers ---
    const addSupplier = async (data: Omit<Supplier, 'id' | 'created_at'>) => {
        const newRecord = await createRecord('suppliers', data);
        setSuppliers(prev => [newRecord, ...prev]);
        addToast('Suplier berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateSupplier = async (id: number, data: Partial<Omit<Supplier, 'id' | 'created_at'>>) => {
        await updateRecord('suppliers', id, data);
        setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...data } as Supplier : s));
        addToast('Suplier berhasil diperbarui.', 'success');
    };
    const deleteSupplier = async (id: number) => {
        await deleteRecord('suppliers', id);
        setSuppliers(prev => prev.filter(s => s.id !== id));
        addToast('Suplier berhasil dihapus.', 'success');
    };

    // --- Finishings ---
    const addFinishing = async (data: Omit<Finishing, 'id' | 'created_at'>) => {
        const newRecord = await createRecord('finishings', data);
        setFinishings(prev => [newRecord, ...prev]);
        addToast('Finishing berhasil ditambahkan.', 'success');
        return newRecord;
    };
    const updateFinishing = async (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => {
        await updateRecord('finishings', id, data);
        setFinishings(prev => prev.map(f => f.id === id ? { ...f, ...data } as Finishing : f));
        addToast('Finishing berhasil diperbarui.', 'success');
    };
    const deleteFinishing = async (id: number) => {
        await deleteRecord('finishings', id);
        setFinishings(prev => prev.filter(f => f.id !== id));
        addToast('Finishing berhasil dihapus.', 'success');
    };

    const addStockMovement = async (data: Omit<StockMovement, 'id' | 'created_at'>) => {
        const newMove = await createRecord('stock_movements', data);
        setStockMovements(prev => [newMove, ...prev]);
        
        const bahan = bahanList.find(b => b.id === data.bahan_id);
        const currentStock = bahan?.stock_qty || 0;
        const newStock = data.type === 'in' ? currentStock + data.quantity : currentStock - data.quantity;
        
        await updateRecord('bahan', data.bahan_id, { stock_qty: newStock });
        setBahanList(prev => prev.map(b => b.id === data.bahan_id ? { ...b, stock_qty: newStock } : b));
    };

    const updateBahanStock = async (bahanId: number, newStockQty: number, notes: string) => {
        const bahan = bahanList.find(b => b.id === bahanId);
        if (!bahan) throw new Error('Bahan not found');
        const currentStock = bahan.stock_qty || 0;
        const difference = newStockQty - currentStock;
    
        if (Math.abs(difference) < 0.001) return;
    
        const movementData: Omit<StockMovement, 'id' | 'created_at'> = {
            bahan_id: bahanId, type: difference > 0 ? 'in' : 'out', quantity: Math.abs(difference), supplier_id: null, notes: notes,
        };
        await addStockMovement(movementData);
    };

    const addExpense = async (data: Omit<Expense, 'id' | 'created_at'>) => {
        const newRecord = await createRecord('expenses', data);
        setExpenses(prev => [newRecord, ...prev]);
        addToast('Pengeluaran berhasil ditambahkan.', 'success');

        if (data.jenis_pengeluaran === 'Bahan' && data.bahan_id && data.qty > 0) {
            await addStockMovement({
                bahan_id: data.bahan_id, type: 'in', quantity: data.qty, supplier_id: data.supplier_id, notes: `Pembelian: ${data.keterangan || 'N/A'}`
            });
            addToast('Stok bahan berhasil ditambahkan.', 'success');
        }
    };
    const updateExpense = async (id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>) => {
        await updateRecord('expenses', id, data);
        setExpenses(prev => prev.map(e => e.id === id ? { ...e, ...data } as Expense : e));
        addToast('Pengeluaran berhasil diperbarui.', 'success');
    };
    const deleteExpense = async (id: number) => {
        await deleteRecord('expenses', id);
        setExpenses(prev => prev.filter(e => e.id !== id));
        addToast('Pengeluaran berhasil dihapus.', 'success');
    };

    const updateNotaSetting = async (settings: NotaSetting) => {
        const updates = [
            supabase.from('settings').update({ value: settings.prefix } as any).eq('key', 'nota_prefix'),
            supabase.from('settings').update({ value: settings.start_number_str } as any).eq('key', 'nota_last_number')
        ];
        const [prefixResult, numberResult] = await Promise.all(updates);
        if (prefixResult.error || numberResult.error) {
            const errorMessage = prefixResult.error?.message || numberResult.error?.message;
            addToast(`Gagal update pengaturan nota: ${errorMessage}`, 'error'); return;
        }
        setNotaSetting(settings); addToast('Pengaturan nota berhasil diperbarui.', 'success');
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

    const addOrder = async (orderData: AddOrderPayload) => {
        const { data: settingData, error: settingError } = await supabase.from('settings').select('value').eq('key', 'nota_last_number').single();
        if (settingError || !settingData) { addToast('Gagal mendapatkan nomor nota.', 'error'); throw settingError; }
        
        const lastNumber = parseInt(settingData.value, 10);
        const nextNumber = lastNumber + 1;
        
        const padding = notaSetting.start_number_str.length > 0 ? notaSetting.start_number_str.length : 1;
        const newPaddedNumberStr = String(nextNumber).padStart(padding, '0');
        const newNotaNumber = `${notaSetting.prefix}-${newPaddedNumberStr}`;
        
        const { order_items, ...orderPayload } = orderData;
        const newOrderPayload: Tables['orders']['Insert'] = { ...orderPayload, no_nota: newNotaNumber };
        
        const newOrder = await createRecord('orders', newOrderPayload);
        
        const itemsPayload: Tables['order_items']['Insert'][] = order_items.map((item) => ({...item, order_id: newOrder.id}));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload as any);
        if (itemsError) { addToast(`Gagal menyimpan item order: ${itemsError.message}`, 'error'); throw itemsError; }
        
        await supabase.from('settings').update({ value: newPaddedNumberStr }).eq('key', 'nota_last_number');
        setNotaSetting(prev => ({ ...prev, start_number_str: newPaddedNumberStr }));

        const fullOrder = await fetchFullOrder(newOrder.id);
        if (fullOrder) {
            setOrders(prev => [fullOrder, ...prev]);
            addToast(`Order ${fullOrder.no_nota} berhasil ditambahkan.`, 'success');
        }
    };

    const updateOrder = async (id: number, orderData: UpdateOrderPayload) => {
        const { order_items, ...orderPayload } = orderData;
        
        if (Object.keys(orderPayload).length > 0) {
            await updateRecord('orders', id, orderPayload);
        }

        if (order_items) {
            const oldOrder = orders.find(o => o.id === id);
            const oldItemIds = oldOrder?.order_items.map(i => i.id) || [];
            
            const toUpdate = order_items.filter(item => item.id && oldItemIds.includes(item.id)).map(item => ({...item, order_id: id}));
            const toInsert = order_items.filter(item => !item.id);
            const toDeleteIds = oldItemIds.filter(oldId => !order_items.some(item => item.id === oldId));

            if (toUpdate.length > 0) await supabase.from('order_items').upsert(toUpdate as any);
            if (toInsert.length > 0) await supabase.from('order_items').insert(toInsert.map(({id: itemId, ...rest}) => ({...rest, order_id: id})) as any);
            if (toDeleteIds.length > 0) await supabase.from('order_items').delete().in('id', toDeleteIds);
        }
        
        const fullOrder = await fetchFullOrder(id);
        if (fullOrder) {
            setOrders(prev => prev.map(o => o.id === id ? fullOrder : o));
            addToast(`Order ${fullOrder.no_nota} berhasil diperbarui.`, 'success');
        }
    };

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
    
    const addBulkPaymentToOrders = async (
        paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id' | 'amount'>,
        totalPaymentAmount: number,
        ordersToPay: Order[]
    ) => {
        let remainingPayment = totalPaymentAmount;
        const sortedOrders = [...ordersToPay].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
        const paymentInserts: Tables['payments']['Insert'][] = [];
        const affectedOrderIds = new Set<number>();
        const newPaymentsByOrderId: Record<number, number> = {};
    
        for (const order of sortedOrders) {
            if (remainingPayment <= 0) break;
            const totalBill = calculateOrderTotal(order, customers, bahanList);
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalBill - totalPaid);
            if (balanceDue <= 0.01) continue;
            const amountToPay = Math.min(remainingPayment, balanceDue);
            
            paymentInserts.push({ ...paymentData, order_id: order.id, amount: amountToPay });
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
    };

    const updateOrderStatus = async (orderId: number, status: OrderStatus, pelaksana_id: string | null = null) => {
        const fullOrder = orders.find(o => o.id === orderId);
        if (!fullOrder) return;
    
        const payload: Tables['orders']['Update'] = { status_pesanan: status };
        if (pelaksana_id !== null) payload.pelaksana_id = pelaksana_id === '' ? null : pelaksana_id;
    
        await updateRecord('orders', orderId, payload);

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...payload } : o));
        addToast(`Status pesanan ${fullOrder.no_nota} diubah menjadi ${status}.`, 'info');
    
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

    const updateOrderItemStatus = async (orderId: number, itemId: number, status: ProductionStatus) => {
        await updateRecord('order_items', itemId, { status_produksi: status });

        const orderToUpdate = orders.find(o => o.id === orderId);
        if (!orderToUpdate) return;
    
        const updatedItems = orderToUpdate.order_items.map(item => item.id === itemId ? { ...item, status_produksi: status } : item );
        let updatedOrder = { ...orderToUpdate, order_items: updatedItems };
        
        let newOrderStatus: OrderStatus | null = null;
        if (status === 'Proses' && updatedOrder.status_pesanan === 'Waiting') {
            newOrderStatus = 'Proses';
        } else if (status === 'Ready') {
            const allItemsReady = updatedItems.every(item => item.status_produksi === 'Ready');
            if (allItemsReady) {
                newOrderStatus = 'Ready';
            }
        }

        if (newOrderStatus && updatedOrder.status_pesanan !== newOrderStatus) {
            updatedOrder.status_pesanan = newOrderStatus;
            try {
                await updateRecord('orders', orderId, { status_pesanan: newOrderStatus });
                if (newOrderStatus === 'Ready') {
                     addToast(`Order ${updatedOrder.no_nota} telah siap dan dipindahkan ke Gudang Produksi.`, 'success');
                }
            } catch (error) {
                // Error toast is handled in updateRecord
            }
        }
    
        setOrders(prev => prev.map(o => o.id === orderId ? updatedOrder : o));
        addToast(`Status item berhasil diubah menjadi "${status}".`, 'info');
    };
    
    const updateYouTubePlaylist = async (playlist: YouTubePlaylistItem[]) => {
      const { data: existing, error: checkError } = await supabase.from('display_settings').select('id').eq('id', 1).maybeSingle();
      if (checkError) throw checkError;
      const payload: Tables['display_settings']['Update'] = { youtube_url: playlist };
      const { data: updatedSettings, error } = existing 
          ? await supabase.from('display_settings').update(payload as any).eq('id', 1).select().single()
          : await supabase.from('display_settings').insert(payload as any).select().single();
      if (error) { addToast(`Gagal menyimpan playlist: ${error.message}`, 'error'); throw error; }
      setDisplaySettings(updatedSettings);
      addToast('Playlist YouTube berhasil diperbarui.', 'success');
    };

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