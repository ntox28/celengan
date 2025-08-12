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

const fetchFullOrder = async (orderId: number): Promise<Order | null> => {
    try {
        const { data: orderData, error: orderError } = await supabase.from('orders').select('*, order_items(*)').eq('id', orderId).single();
        if (orderError) throw orderError;
        if (!orderData) return null;

        const { data: payments, error: paymentsError } = await supabase.from('payments').select('*').eq('order_id', orderId);
        if (paymentsError) throw paymentsError;

        const fullOrder: Order = {
            ...orderData,
            order_items: orderData.order_items || [],
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

            addToast('Data awal berhasil dimuat.', 'info');
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

    useEffect(() => {
        if (!user) return;

        const handleDbChanges = async (payload: any) => {
            const { table, eventType, new: newRecord, old: oldRecord } = payload;
            
            const handleRecord = (setter: React.Dispatch<React.SetStateAction<any[]>>, record: any, idKey: string = 'id') => {
                 setter(prev => {
                    const exists = prev.some(item => item[idKey] === record[idKey]);
                    if (exists) { // Update
                        return prev.map(item => item[idKey] === record[idKey] ? record : item);
                    } else { // Insert
                        return [record, ...prev];
                    }
                });
            };

            const handleDelete = (setter: React.Dispatch<React.SetStateAction<any[]>>, id: any, idKey: string = 'id') => {
                setter(prev => prev.filter(item => item[idKey] !== id));
            };

            switch (table) {
                case 'orders':
                case 'order_items':
                case 'payments':
                    const orderId = eventType === 'DELETE' 
                        ? (oldRecord.order_id || oldRecord.id) 
                        : (newRecord.order_id || newRecord.id);
                    if (!orderId) return;

                    if (eventType === 'DELETE' && table === 'orders') {
                        setOrders(prev => prev.filter(o => o.id !== orderId));
                        addToast(`Order ${oldRecord.no_nota} telah dihapus.`, 'info');
                    } else {
                        const fullOrder = await fetchFullOrder(orderId);
                        if (fullOrder) {
                            handleRecord(setOrders, fullOrder);
                            if(eventType === 'INSERT' && table === 'orders') {
                                const customerName = customers.find(c => c.id === fullOrder.pelanggan_id)?.name || 'Pelanggan';
                                addToast(`Nota baru ${fullOrder.no_nota} dari ${customerName} telah masuk!`, 'success', );
                            }
                        }
                    }
                    break;
                case 'customers':
                    if (eventType === 'DELETE') handleDelete(setCustomers, oldRecord.id); else handleRecord(setCustomers, newRecord);
                    break;
                case 'employees':
                    if (eventType === 'DELETE') handleDelete(setEmployees, oldRecord.id); else handleRecord(setEmployees, newRecord);
                    break;
                case 'bahan':
                    if (eventType === 'DELETE') handleDelete(setBahanList, oldRecord.id); else handleRecord(setBahanList, newRecord);
                    break;
                case 'expenses':
                    if (eventType === 'DELETE') handleDelete(setExpenses, oldRecord.id); else handleRecord(setExpenses, newRecord);
                    break;
                case 'banks':
                    if (eventType === 'DELETE') handleDelete(setBanks, oldRecord.id); else handleRecord(setBanks, newRecord);
                    break;
                case 'assets':
                    if (eventType === 'DELETE') handleDelete(setAssets, oldRecord.id); else handleRecord(setAssets, newRecord);
                    break;
                case 'debts':
                     if (eventType === 'DELETE') handleDelete(setDebts, oldRecord.id); else handleRecord(setDebts, newRecord);
                    break;
                case 'suppliers':
                    if (eventType === 'DELETE') handleDelete(setSuppliers, oldRecord.id); else handleRecord(setSuppliers, newRecord);
                    break;
                case 'finishings':
                    if (eventType === 'DELETE') handleDelete(setFinishings, oldRecord.id); else handleRecord(setFinishings, newRecord);
                    break;
                 case 'display_settings':
                    if (eventType !== 'DELETE') setDisplaySettings(newRecord);
                    break;
            }
        };

        const subscription = supabase.channel('realtime-channel')
            .on('postgres_changes', { event: '*', schema: 'public' }, handleDbChanges)
            .subscribe();

        console.log('Realtime subscription started.');

        return () => {
            console.log('Unsubscribing from realtime channel.');
            supabase.removeChannel(subscription);
        };
    }, [user, customers, addToast]);
    
    type Tables = Database['public']['Tables'];
    type TableName = keyof Tables;
    type TableRow = Tables[TableName]['Row'];
    type TableInsert = Tables[TableName]['Insert'];
    type TableUpdate = Tables[TableName]['Update'];
    
    type TableWithIdKey = { [K in keyof Tables]: Tables[K]['Row'] extends { id: number } ? K : never }[keyof Tables];

    // --- Generic CRUD functions ---
    const createRecord = async <T extends TableName>(
        table: T,
        data: Tables[T]['Insert'],
        // setData: React.Dispatch<React.SetStateAction<Tables[T]['Row'][]>>, // Realtime handles this
        successMessage: string
    ): Promise<Tables[T]['Row']> => {
        const { data: newRecord, error } = await supabase.from(table).insert(data).select().single();
        if (error) {
            addToast(`Gagal: ${error.message}`, 'error');
            throw error;
        }
        if (newRecord) {
            // setData(prev => [...prev, newRecord as Tables[T]['Row']]); // Let realtime handle UI update
            addToast(successMessage, 'success');
            return newRecord as Tables[T]['Row'];
        }
        const silentError = new Error('Gagal membuat data, tidak ada error dari server.');
        addToast(silentError.message, 'error');
        throw silentError;
    };

    const updateRecord = async <T extends TableWithIdKey>(
        table: T,
        id: number,
        data: Tables[T]['Update'],
        // setData: React.Dispatch<React.SetStateAction<Tables[T]['Row'][]>>,
        successMessage: string
    ) => {
        const { error } = await supabase.from(table).update(data).eq('id', id);
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        // Let realtime handle UI update
        addToast(successMessage, 'success');
    };

    const deleteRecord = async <T extends TableWithIdKey>(
        table: T,
        id: number,
        // setData: React.Dispatch<React.SetStateAction<Tables[T]['Row'][]>>,
        successMessage: string
    ) => {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        // Let realtime handle UI update
        addToast(successMessage, 'success');
    };
    
    // --- Customers ---
    const addCustomer = async (data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => createRecord('customers', data, 'Pelanggan berhasil ditambahkan.');
    const updateCustomer = async (id: number, data: Partial<Omit<Customer, 'id' | 'created_at'>>) => updateRecord('customers', id, data, 'Pelanggan berhasil diperbarui.');
    const deleteCustomer = async (id: number) => deleteRecord('customers', id, 'Pelanggan berhasil dihapus.');

    // --- Employees ---
    const addEmployee = async (data: Omit<Employee, 'id' | 'created_at'>, password: string) => {
        if (!data.email) {
            addToast('Email diperlukan untuk membuat user baru.', 'error');
            throw new Error('Email is required');
        }
    
        const { data: { session: adminSession } } = await supabase.auth.getSession();
        if (!adminSession) {
            addToast('Sesi admin tidak ditemukan. Silakan login kembali.', 'error');
            throw new Error('Admin session not found');
        }
    
        try {
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: data.email, password: password, options: { data: { userrole: data.position } }
            });
    
            if (signUpError) throw signUpError;
            if (!signUpData.user) throw new Error('Gagal membuat user: tidak ada data user yang dikembalikan oleh Supabase.');
    
            const employeeProfileData: Tables['employees']['Insert'] = { ...data, user_id: signUpData.user.id };
            const { error: profileError } = await supabase.from('employees').insert(employeeProfileData);
            if (profileError) {
                addToast(`Akun login dibuat, tapi GAGAL membuat profil: ${profileError.message}. Harap hapus user login manual.`, 'error');
                throw profileError;
            }
            addToast('User dan profil berhasil dibuat. User mungkin perlu verifikasi email.', 'success');
        } catch (error: any) {
            addToast(`Gagal menyimpan user: ${error.message}`, 'error');
            throw error;
        } finally {
            if (adminSession) {
                const { error: sessionError } = await supabase.auth.setSession({
                    access_token: adminSession.access_token, refresh_token: adminSession.refresh_token,
                });
                if (sessionError) {
                    addToast(`Gagal memulihkan sesi admin: ${sessionError.message}. Anda akan dilogout.`, 'error');
                    await supabase.auth.signOut();
                }
            }
        }
    };

    const updateEmployee = async (id: number, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => updateRecord('employees', id, data, 'User berhasil diperbarui.');
    const deleteEmployee = async (id: number) => deleteRecord('employees', id, 'User berhasil dihapus.');

    // --- Bahan ---
    const addBahan = async (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => createRecord('bahan', data, 'Bahan berhasil ditambahkan.');
    const updateBahan = async (id: number, data: Partial<Omit<Bahan, 'id' | 'created_at'>>) => updateRecord('bahan', id, data, 'Bahan berhasil diperbarui.');
    const deleteBahan = async (id: number) => deleteRecord('bahan', id, 'Bahan berhasil dihapus.');

    // --- Banks ---
    const addBank = async (data: Omit<Bank, 'id' | 'created_at'>) => createRecord('banks', data, 'Sumber dana berhasil ditambahkan.');
    const updateBank = async (id: number, data: Partial<Omit<Bank, 'id' | 'created_at'>>) => updateRecord('banks', id, data, 'Sumber dana berhasil diperbarui.');
    const deleteBank = async (id: number) => deleteRecord('banks', id, 'Sumber dana berhasil dihapus.');

    // --- Assets ---
    const addAsset = async (data: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>) => createRecord('assets', data, 'Aset berhasil ditambahkan.');
    const updateAsset = async (id: number, data: Partial<Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>>) => updateRecord('assets', id, data, 'Aset berhasil diperbarui.');
    const deleteAsset = async (id: number) => deleteRecord('assets', id, 'Aset berhasil dihapus.');

    // --- Debts ---
    const addDebt = async (data: Omit<Debt, 'id' | 'created_at'>) => createRecord('debts', data, 'Data hutang berhasil ditambahkan.');
    const updateDebt = async (id: number, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => updateRecord('debts', id, data, 'Data hutang berhasil diperbarui.');
    const deleteDebt = async (id: number) => deleteRecord('debts', id, 'Data hutang berhasil dihapus.');

    // --- Suppliers ---
    const addSupplier = async (data: Omit<Supplier, 'id' | 'created_at'>) => createRecord('suppliers', data, 'Suplier berhasil ditambahkan.');
    const updateSupplier = async (id: number, data: Partial<Omit<Supplier, 'id' | 'created_at'>>) => updateRecord('suppliers', id, data, 'Suplier berhasil diperbarui.');
    const deleteSupplier = async (id: number) => deleteRecord('suppliers', id, 'Suplier berhasil dihapus.');

    // --- Finishings ---
    const addFinishing = async (data: Omit<Finishing, 'id' | 'created_at'>) => createRecord('finishings', data, 'Finishing berhasil ditambahkan.');
    const updateFinishing = async (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => updateRecord('finishings', id, data, 'Finishing berhasil diperbarui.');
    const deleteFinishing = async (id: number) => deleteRecord('finishings', id, 'Finishing berhasil dihapus.');

    // --- Complex Logic: Stock Movements, Expenses, Orders, Payments ---

    const addStockMovement = async (data: Omit<StockMovement, 'id' | 'created_at'>, fromExpense: boolean = false) => {
        const { error: moveError } = await supabase.from('stock_movements').insert(data);
        if (moveError) { addToast(`Gagal mencatat pergerakan stok: ${moveError.message}`, 'error'); throw moveError; }
        
        const bahan = bahanList.find(b => b.id === data.bahan_id);
        const currentStock = bahan?.stock_qty || 0;
        const newStock = data.type === 'in' ? currentStock + data.quantity : currentStock - data.quantity;
        
        const { error: updateError } = await supabase.from('bahan').update({ stock_qty: newStock }).eq('id', data.bahan_id);
        if (updateError) { addToast(`Gagal update stok: ${updateError.message}`, 'error'); throw updateError; }
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
        const { error: moveError } = await supabase.from('stock_movements').insert(movementData);
        if (moveError) throw moveError;
    
        const { error: updateError } = await supabase.from('bahan').update({ stock_qty: newStockQty }).eq('id', bahanId);
        if (updateError) throw updateError;
    };

    const addExpense = async (data: Omit<Expense, 'id' | 'created_at'>) => {
        await createRecord('expenses', data, 'Pengeluaran berhasil ditambahkan.');
        if (data.jenis_pengeluaran === 'Bahan' && data.bahan_id && data.qty > 0) {
            await addStockMovement({
                bahan_id: data.bahan_id, type: 'in', quantity: data.qty, supplier_id: data.supplier_id, notes: `Pembelian: ${data.keterangan || 'N/A'}`
            }, true);
            addToast('Stok bahan berhasil ditambahkan.', 'success');
        }
    };
    const updateExpense = async (id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>) => updateRecord('expenses', id, data, 'Pengeluaran berhasil diperbarui.');
    const deleteExpense = async (id: number) => deleteRecord('expenses', id, 'Pengeluaran berhasil dihapus.');

    const updateNotaSetting = async (settings: NotaSetting) => {
        const updates = [
            supabase.from('settings').update({ value: settings.prefix }).eq('key', 'nota_prefix'),
            supabase.from('settings').update({ value: settings.start_number_str }).eq('key', 'nota_last_number')
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
        const { data: newOrder, error: orderError } = await supabase.from('orders').insert(newOrderPayload).select().single();
        if (orderError) { addToast(`Gagal membuat order: ${orderError.message}`, 'error'); throw orderError; }
        
        const itemsPayload: Tables['order_items']['Insert'][] = order_items.map((item) => ({...item, order_id: newOrder.id}));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) { addToast(`Gagal menyimpan item order: ${itemsError.message}`, 'error'); throw itemsError; }
        
        await supabase.from('settings').update({ value: newPaddedNumberStr }).eq('key', 'nota_last_number');
        setNotaSetting(prev => ({ ...prev, start_number_str: newPaddedNumberStr }));
        // Let realtime handle the UI update for the new order
    };

    const updateOrder = async (id: number, orderData: UpdateOrderPayload) => {
        // This function is complex with realtime. The logic to delete and recreate could cause race conditions.
        // A simpler update approach is better with realtime.
        const { order_items, ...orderPayload } = orderData;
        
        // Update the main order table
        if (Object.keys(orderPayload).length > 0) {
            const { error } = await supabase.from('orders').update(orderPayload).eq('id', id);
            if (error) { addToast(`Gagal update data order: ${error.message}`, 'error'); throw error; }
        }

        // Update, add, delete order items
        if (order_items) {
            const oldOrder = orders.find(o => o.id === id);
            const oldItemIds = oldOrder?.order_items.map(i => i.id) || [];
            
            const toUpdate = order_items.filter(item => item.id && oldItemIds.includes(item.id));
            const toInsert = order_items.filter(item => !item.id);
            const toDeleteIds = oldItemIds.filter(oldId => !order_items.some(item => item.id === oldId));

            if (toUpdate.length > 0) await supabase.from('order_items').upsert(toUpdate);
            if (toInsert.length > 0) await supabase.from('order_items').insert(toInsert.map(({id: itemId, ...rest}) => ({...rest, order_id: id})));
            if (toDeleteIds.length > 0) await supabase.from('order_items').delete().in('id', toDeleteIds);
        }
        // Realtime will catch these changes and trigger a full order refetch
    };

    const deleteOrder = async (id: number) => deleteRecord('orders', id, 'Order berhasil dihapus.');

    const addPaymentToOrder = async (orderId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'>) => {
        const { error } = await supabase.from('payments').insert({ ...paymentData, order_id: orderId });
        if (error) { addToast(`Gagal menambah pembayaran: ${error.message}`, 'error'); throw error; }
    };

    const addBulkPaymentToOrders = async (
        paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id' | 'amount'>,
        totalPaymentAmount: number,
        ordersToPay: Order[]
    ) => {
        let remainingPayment = totalPaymentAmount;
        const sortedOrders = [...ordersToPay].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
        const paymentInserts: Tables['payments']['Insert'][] = [];
    
        for (const order of sortedOrders) {
            if (remainingPayment <= 0) break;
            const totalBill = calculateOrderTotal(order, customers, bahanList);
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalBill - totalPaid);
            if (balanceDue <= 0.01) continue;
            const amountToPay = Math.min(remainingPayment, balanceDue);
            paymentInserts.push({ ...paymentData, order_id: order.id, amount: amountToPay });
            remainingPayment -= amountToPay;
        }
    
        if (paymentInserts.length === 0) { addToast('Tidak ada pembayaran yang dapat diproses.', 'info'); return; }
    
        try {
            const { error: insertError } = await supabase.from('payments').insert(paymentInserts);
            if (insertError) throw insertError;
            addToast(`${paymentInserts.length} pembayaran berhasil diproses.`, 'success');
        } catch (error: any) {
            addToast(`Gagal memproses pembayaran: ${error.message}`, 'error'); throw error;
        }
    };

    const updateOrderStatus = async (orderId: number, status: OrderStatus, pelaksana_id: string | null = null) => {
        const fullOrder = orders.find(o => o.id === orderId);
        if (!fullOrder) return;
    
        const payload: Tables['orders']['Update'] = { status_pesanan: status };
        if (pelaksana_id !== null) payload.pelaksana_id = pelaksana_id === '' ? null : pelaksana_id;
    
        const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
        if (error) { addToast(`Gagal update status order: ${error.message}`, 'error'); return; }
    
        if (fullOrder.status_pesanan === 'Pending' && status === 'Waiting') {
            for (const item of fullOrder.order_items) {
                const finishing = finishings.find(f => f.id === item.finishing_id);
                const panjang_tambahan = finishing?.panjang_tambahan || 0;
                const lebar_tambahan = finishing?.lebar_tambahan || 0;
                const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                const totalLebar = (item.lebar || 0) + lebar_tambahan;
                const quantityToDeduct = (totalPanjang * totalLebar) * item.qty;
                if (quantityToDeduct > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'out', quantity: quantityToDeduct, supplier_id: null, notes: `Pemakaian untuk order ${fullOrder.no_nota}` }, true);
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
                if (quantityToRestore > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'in', quantity: quantityToRestore, supplier_id: null, notes: `Pembatalan proses untuk order ${fullOrder.no_nota}` }, true);
            }
            addToast(`Stok bahan untuk nota ${fullOrder.no_nota} telah dikembalikan.`, 'info');
        }
    };

    const updateOrderItemStatus = async (orderId: number, itemId: number, status: ProductionStatus) => {
        const { error } = await supabase.from('order_items').update({ status_produksi: status }).eq('id', itemId);
        if (error) { addToast('Gagal update status item.', 'error'); return; }
    };
    
    const updateYouTubePlaylist = async (playlist: YouTubePlaylistItem[]) => {
      const { data: existing, error: checkError } = await supabase.from('display_settings').select('id').eq('id', 1).maybeSingle();
      if (checkError) throw checkError;
      const payload: Tables['display_settings']['Update'] = { youtube_url: playlist };
      const { error } = existing 
          ? await supabase.from('display_settings').update(payload).eq('id', 1) 
          : await supabase.from('display_settings').insert(payload);
      if (error) { addToast(`Gagal menyimpan playlist: ${error.message}`, 'error'); throw error; }
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
        stockMovements, addStockMovement,
        finishings, addFinishing, updateFinishing, deleteFinishing,
        updateBahanStock,
        displaySettings,
        updateYouTubePlaylist,
    };
};