

import { useState, useEffect, useMemo } from 'react';
import { supabase, Customer, Employee, Bahan, Expense, Order, OrderItem, Payment, User, Bank, Asset, Debt, NotaSetting, Supplier, StockMovement, Finishing, OrderStatus, ProductionStatus, OrderRow, Database, CustomerLevel, PaymentStatus } from '../lib/supabaseClient';
import { useToast } from './useToast';

// Type definitions for complex parameters
type AddOrderPayload = Omit<OrderRow, 'id' | 'created_at' | 'no_nota'> & { order_items: Omit<OrderItem, 'id'|'created_at'|'order_id'>[] };
type UpdateOrderPayload = Partial<Omit<OrderRow, 'id' | 'created_at'>> & { order_items?: Omit<OrderItem, 'id'|'created_at'|'order_id'>[] };


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

    useEffect(() => {
        if (user && !isDataLoaded) { // Only fetch if user exists and data isn't loaded
            fetchInitialData();
        } else if (!user) {
            // If user logs out, clear data and reset loaded state
            setEmployees([]);
            setCustomers([]);
            setBahanList([]);
            setOrders([]);
            setExpenses([]);
            setBanks([]);
            setAssets([]);
            setDebts([]);
            setSuppliers([]);
            setStockMovements([]);
            setFinishings([]);
            setIsDataLoaded(false);
        }
    }, [user, isDataLoaded]);

    const fetchInitialData = async () => {
        // No longer setting isDataLoaded to false here to prevent re-renders
        try {
            const [
                employeesRes, customersRes, bahanRes, ordersRes, expensesRes,
                banksRes, assetsRes, debtsRes, suppliersRes,
                stockMovementsRes, finishingsRes, notaSettingsRes
            ] = await Promise.all([
                supabase.from('employees').select('*'),
                supabase.from('customers').select('*'),
                supabase.from('bahan').select('*'),
                supabase.from('orders').select('*, order_items(*), payments(*)'),
                supabase.from('expenses').select('*'),
                supabase.from('banks').select('*'),
                supabase.from('assets').select('*'),
                supabase.from('debts').select('*'),
                supabase.from('suppliers').select('*'),
                supabase.from('stock_movements').select('*'),
                supabase.from('finishings').select('*'),
                supabase.from('settings').select('*').in('key', ['nota_prefix', 'nota_last_number'])
            ]);

            // Check for errors in parallel fetches
            const responses = [employeesRes, customersRes, bahanRes, ordersRes, expensesRes, banksRes, assetsRes, debtsRes, suppliersRes, stockMovementsRes, finishingsRes, notaSettingsRes];
            for (const res of responses) {
                if (res.error) throw res.error;
            }

            // Set data
            setEmployees(employeesRes.data || []);
            setCustomers(customersRes.data || []);
            setBahanList(bahanRes.data || []);
            setOrders(ordersRes.data as Order[] || []); // Cast to Order[]
            setExpenses(expensesRes.data || []);
            setBanks(banksRes.data || []);
            setAssets(assetsRes.data || []);
            setDebts(debtsRes.data || []);
            setSuppliers(suppliersRes.data || []);
            setStockMovements(stockMovementsRes.data || []);
            setFinishings(finishingsRes.data || []);

            const prefix = notaSettingsRes.data?.find(s => s.key === 'nota_prefix')?.value || 'INV';
            const lastNumber = notaSettingsRes.data?.find(s => s.key === 'nota_last_number')?.value || '0';
            setNotaSetting({ prefix, start_number_str: lastNumber });

            addToast('Data berhasil dimuat dari server.', 'info');
        } catch (error: any) {
            console.error("Error fetching initial data:", error);
            addToast(`Gagal memuat data: ${error.message}`, 'error');
        } finally {
            setIsDataLoaded(true);
        }
    };
    
    type Tables = Database['public']['Tables'];
    type TableWithIdKey = { [K in keyof Tables]: Tables[K]['Row'] extends { id: number } ? K : never }[keyof Tables];

    // --- Generic CRUD functions ---
    const createRecord = async <TableName extends keyof Tables>(
        table: TableName,
        data: Tables[TableName]['Insert'],
        setData: React.Dispatch<React.SetStateAction<Tables[TableName]['Row'][]>>,
        successMessage: string
    ): Promise<Tables[TableName]['Row']> => {
        const { data: newRecord, error } = await supabase.from(table).insert(data).select().single();
        if (error) {
            addToast(`Gagal: ${error.message}`, 'error');
            throw error;
        }
        if (newRecord) {
            setData(prev => [...prev, newRecord as Tables[TableName]['Row']]);
            addToast(successMessage, 'success');
            return newRecord as Tables[TableName]['Row'];
        }
        const silentError = new Error('Gagal membuat data, tidak ada error dari server.');
        addToast(silentError.message, 'error');
        throw silentError;
    };

    const updateRecord = async <TableName extends TableWithIdKey>(
        table: TableName,
        id: number,
        data: Tables[TableName]['Update'],
        setData: React.Dispatch<React.SetStateAction<Tables[TableName]['Row'][]>>,
        successMessage: string
    ) => {
        const { data: updatedRecord, error } = await supabase.from(table).update(data).eq('id', id as any).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        if (updatedRecord) {
            setData(prev => prev.map(item => ((item as any).id === id ? { ...item, ...updatedRecord } : item)));
        }
        addToast(successMessage, 'success');
    };

    const deleteRecord = async <TableName extends TableWithIdKey>(
        table: TableName,
        id: number,
        setData: React.Dispatch<React.SetStateAction<Tables[TableName]['Row'][]>>,
        successMessage: string
    ) => {
        const { error } = await supabase.from(table).delete().eq('id', id as any);
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        setData(prev => prev.filter(item => (item as {id: number}).id !== id));
        addToast(successMessage, 'success');
    };
    
    // --- Customers ---
    const addCustomer = async (data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => createRecord('customers', data, setCustomers, 'Pelanggan berhasil ditambahkan.');
    const updateCustomer = async (id: number, data: Partial<Omit<Customer, 'id' | 'created_at'>>) => updateRecord('customers', id, data, setCustomers, 'Pelanggan berhasil diperbarui.');
    const deleteCustomer = async (id: number) => deleteRecord('customers', id, setCustomers, 'Pelanggan berhasil dihapus.');

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
            // Sign up the new user. This will change the current session.
            const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                email: data.email,
                password: password,
                options: {
                    data: { userrole: data.position }
                }
            });
    
            if (signUpError) {
                // If sign up fails (e.g., invalid email, user exists), throw the error.
                // The finally block will still restore the admin session.
                throw signUpError;
            }
    
            // This handles the case where email confirmation is required.
            // A user is created, but no session is returned. We must have a user object to proceed.
            if (!signUpData.user) {
                throw new Error('Gagal membuat user: tidak ada data user yang dikembalikan oleh Supabase.');
            }
    
            // Create the corresponding profile in the 'employees' table.
            const employeeProfileData = { ...data, user_id: signUpData.user.id };
            const { data: newEmployee, error: profileError } = await supabase
                .from('employees')
                .insert(employeeProfileData)
                .select()
                .single();
    
            if (profileError) {
                // Attempt to clean up the created auth user if profile creation fails.
                // This requires admin privileges, which we don't have, so we notify the user.
                addToast(`Akun login dibuat, tapi GAGAL membuat profil: ${profileError.message}. Harap hapus user login manual.`, 'error');
                throw profileError;
            }
    
            if (newEmployee) {
                setEmployees(prev => [...prev, newEmployee]);
            }
            addToast('User dan profil berhasil dibuat. User mungkin perlu verifikasi email.', 'success');
        } catch (error: any) {
            addToast(`Gagal menyimpan user: ${error.message}`, 'error');
            throw error; // Re-throw to be caught by the calling component
        } finally {
            // IMPORTANT: Always restore the original admin session.
            await supabase.auth.setSession({
                access_token: adminSession.access_token,
                refresh_token: adminSession.refresh_token,
            });
        }
    };

    const updateEmployee = async (id: number, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => updateRecord('employees', id, data, setEmployees, 'User berhasil diperbarui.');
    const deleteEmployee = async (id: number) => deleteRecord('employees', id, setEmployees, 'User berhasil dihapus.');

    // --- Bahan ---
    const addBahan = async (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => createRecord('bahan', data, setBahanList, 'Bahan berhasil ditambahkan.');
    const updateBahan = async (id: number, data: Partial<Omit<Bahan, 'id' | 'created_at'>>) => updateRecord('bahan', id, data, setBahanList, 'Bahan berhasil diperbarui.');
    const deleteBahan = async (id: number) => deleteRecord('bahan', id, setBahanList, 'Bahan berhasil dihapus.');

    // --- Banks ---
    const addBank = async (data: Omit<Bank, 'id' | 'created_at'>) => createRecord('banks', data, setBanks, 'Sumber dana berhasil ditambahkan.');
    const updateBank = async (id: number, data: Partial<Omit<Bank, 'id' | 'created_at'>>) => updateRecord('banks', id, data, setBanks, 'Sumber dana berhasil diperbarui.');
    const deleteBank = async (id: number) => deleteRecord('banks', id, setBanks, 'Sumber dana berhasil dihapus.');

    // --- Assets ---
    const addAsset = async (data: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>) => createRecord('assets', data, setAssets, 'Aset berhasil ditambahkan.');
    const updateAsset = async (id: number, data: Partial<Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>>) => updateRecord('assets', id, data, setAssets, 'Aset berhasil diperbarui.');
    const deleteAsset = async (id: number) => deleteRecord('assets', id, setAssets, 'Aset berhasil dihapus.');

    // --- Debts ---
    const addDebt = async (data: Omit<Debt, 'id' | 'created_at'>) => createRecord('debts', data, setDebts, 'Data hutang berhasil ditambahkan.');
    const updateDebt = async (id: number, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => updateRecord('debts', id, data, setDebts, 'Data hutang berhasil diperbarui.');
    const deleteDebt = async (id: number) => deleteRecord('debts', id, setDebts, 'Data hutang berhasil dihapus.');

    // --- Suppliers ---
    const addSupplier = async (data: Omit<Supplier, 'id' | 'created_at'>) => createRecord('suppliers', data, setSuppliers, 'Suplier berhasil ditambahkan.');
    const updateSupplier = async (id: number, data: Partial<Omit<Supplier, 'id' | 'created_at'>>) => updateRecord('suppliers', id, data, setSuppliers, 'Suplier berhasil diperbarui.');
    const deleteSupplier = async (id: number) => deleteRecord('suppliers', id, setSuppliers, 'Suplier berhasil dihapus.');

    // --- Finishings ---
    const addFinishing = async (data: Omit<Finishing, 'id' | 'created_at'>) => createRecord('finishings', data, setFinishings, 'Finishing berhasil ditambahkan.');
    const updateFinishing = async (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => updateRecord('finishings', id, data, setFinishings, 'Finishing berhasil diperbarui.');
    const deleteFinishing = async (id: number) => deleteRecord('finishings', id, setFinishings, 'Finishing berhasil dihapus.');

    // --- Complex Logic: Stock Movements, Expenses, Orders, Payments ---

    const addStockMovement = async (data: Omit<StockMovement, 'id' | 'created_at'>, fromExpense: boolean = false) => {
        const { error: moveError } = await supabase.from('stock_movements').insert(data);
        if (moveError) { addToast(`Gagal mencatat pergerakan stok: ${moveError.message}`, 'error'); throw moveError; }
        
        // Update stock_qty on bahan table
        const bahan = bahanList.find(b => b.id === data.bahan_id);
        const currentStock = bahan?.stock_qty || 0;
        const newStock = data.type === 'in' ? currentStock + data.quantity : currentStock - data.quantity;
        
        const { error: updateError } = await supabase.from('bahan').update({ stock_qty: newStock }).eq('id', data.bahan_id as any);
        if (updateError) { addToast(`Gagal update stok: ${updateError.message}`, 'error'); throw updateError; }
        
        // Manually update local state to reflect changes immediately
        setBahanList(prev => prev.map(b => b.id === data.bahan_id ? { ...b, stock_qty: newStock } : b));
        
        // Refetch movements to keep history in sync
        const { data: newMovements, error: fetchError } = await supabase.from('stock_movements').select('*');
        if (fetchError) console.error("Could not refetch stock movements");
        else setStockMovements(newMovements || []);
    };

    const updateBahanStock = async (bahanId: number, newStockQty: number, notes: string) => {
        // 1. Get current stock from state to calculate difference
        const bahan = bahanList.find(b => b.id === bahanId);
        if (!bahan) {
            addToast(`Bahan tidak ditemukan.`, 'error');
            throw new Error('Bahan not found');
        }
        const currentStock = bahan.stock_qty || 0;
        const difference = newStockQty - currentStock;
    
        if (Math.abs(difference) < 0.001) {
            return;
        }
    
        // 2. Create stock movement record
        const movementData: Omit<StockMovement, 'id' | 'created_at'> = {
            bahan_id: bahanId,
            type: difference > 0 ? 'in' : 'out',
            quantity: Math.abs(difference),
            supplier_id: null,
            notes: notes,
        };
        const { error: moveError } = await supabase.from('stock_movements').insert(movementData);
        if (moveError) {
            addToast(`Gagal mencatat penyesuaian stok: ${moveError.message}`, 'error');
            throw moveError;
        }
    
        // 3. Update stock_qty on bahan table
        const { data: updatedBahan, error: updateError } = await supabase.from('bahan').update({ stock_qty: newStockQty }).eq('id', bahanId as any).select().single();
        if (updateError) {
            addToast(`Gagal update stok: ${updateError.message}`, 'error');
            // TODO: Ideally, roll back the stock_movement insert here.
            throw updateError;
        }
        
        // 4. Update local state
        if (updatedBahan) {
            setBahanList(prev => prev.map(b => b.id === bahanId ? updatedBahan : b));
        }
        
        // Refetch all movements to ensure consistency
        const { data: newMovements } = await supabase.from('stock_movements').select('*');
        if (newMovements) setStockMovements(newMovements);
    };

    const addExpense = async (data: Omit<Expense, 'id' | 'created_at'>) => {
        await createRecord('expenses', data, setExpenses, 'Pengeluaran berhasil ditambahkan.');
        if (data.jenis_pengeluaran === 'Bahan' && data.bahan_id && data.qty > 0) {
            await addStockMovement({
                bahan_id: data.bahan_id,
                type: 'in',
                quantity: data.qty,
                supplier_id: data.supplier_id,
                notes: `Pembelian: ${data.keterangan || 'N/A'}`
            }, true);
            addToast('Stok bahan berhasil ditambahkan.', 'success');
        }
    };
    const updateExpense = async (id: number, data: Partial<Omit<Expense, 'id' | 'created_at'>>) => updateRecord('expenses', id, data, setExpenses, 'Pengeluaran berhasil diperbarui.');
    const deleteExpense = async (id: number) => deleteRecord('expenses', id, setExpenses, 'Pengeluaran berhasil dihapus.');

    const updateNotaSetting = async (settings: NotaSetting) => {
        const updates = [
            supabase.from('settings').update({ value: settings.prefix }).eq('key', 'nota_prefix'),
            supabase.from('settings').update({ value: settings.start_number_str }).eq('key', 'nota_last_number')
        ];

        const [prefixResult, numberResult] = await Promise.all(updates);

        if (prefixResult.error || numberResult.error) {
            const errorMessage = prefixResult.error?.message || numberResult.error?.message;
            addToast(`Gagal update pengaturan nota: ${errorMessage}`, 'error');
            return;
        }

        setNotaSetting(settings);
        addToast('Pengaturan nota berhasil diperbarui.', 'success');
    };
    
    // --- Dynamic Assets Calculation ---
    const dynamicAssets = useMemo(() => {
        const totalRevenue = orders.flatMap(o => o.payments).reduce((sum, p) => sum + p.amount, 0);
        const totalExpenses = expenses.reduce((sum, exp) => sum + (exp.harga * exp.qty), 0);
        const netProfit = totalRevenue - totalExpenses;

        const labaBersihAsset: Asset = {
            id: -1, // Use a special ID for dynamic assets
            created_at: new Date().toISOString(),
            name: 'Laba Bersih (Kas)',
            category: 'Aset Lancar',
            purchase_price: netProfit,
            purchase_date: new Date().toISOString().split('T')[0],
            status: 'Baik',
            is_dynamic: true,
        };
        return [labaBersihAsset];
    }, [orders, expenses]);
    const allAssets = useMemo(() => [...dynamicAssets, ...assets].sort((a,b) => (b.id) - (a.id)), [dynamicAssets, assets]);

    const addOrder = async (orderData: AddOrderPayload) => {
        // 1. Get last order number from settings
        const { data: settingData, error: settingError } = await supabase.from('settings').select('value').eq('key', 'nota_last_number').single();
        if (settingError || !settingData) { addToast('Gagal mendapatkan nomor nota.', 'error'); throw settingError; }
        
        const lastNumber = parseInt(settingData.value, 10);
        const nextNumber = lastNumber + 1;
        
        const padding = notaSetting.start_number_str.length > 0 ? notaSetting.start_number_str.length : 1;
        const newPaddedNumberStr = String(nextNumber).padStart(padding, '0');
        const newNotaNumber = `${notaSetting.prefix}-${newPaddedNumberStr}`;
        
        // 2. Insert order
        const { order_items, ...orderPayload } = orderData;
        const newOrderPayload = { ...orderPayload, no_nota: newNotaNumber };
        const { data: newOrder, error: orderError } = await supabase.from('orders').insert(newOrderPayload).select().single();
        if (orderError) { addToast(`Gagal membuat order: ${orderError.message}`, 'error'); throw orderError; }
        
        // 3. Insert order_items
        const itemsPayload = order_items.map((item) => ({...item, order_id: newOrder.id}));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) { addToast(`Gagal menyimpan item order: ${itemsError.message}`, 'error'); throw itemsError; }
        
        // 4. Update last number in settings WITH PADDING
        await supabase.from('settings').update({ value: newPaddedNumberStr }).eq('key', 'nota_last_number');
        
        // 5. Refetch order to display it with items
        const { data: fullOrder, error: fetchError } = await supabase.from('orders').select('*, order_items(*), payments(*)').eq('id', newOrder.id).single();
        if (fetchError) { addToast('Gagal memuat ulang order baru.', 'error'); return; }
        
        setOrders(prev => [...prev, fullOrder as Order]);
        setNotaSetting(prev => ({ ...prev, start_number_str: newPaddedNumberStr }));
        addToast(`Order ${newNotaNumber} berhasil ditambahkan.`, 'success');
    };

    const updateOrder = async (id: number, orderData: UpdateOrderPayload) => {
        const { order_items, ...orderPayload } = orderData;
        
        // 1. Update order details
        const { error: orderError } = await supabase.from('orders').update(orderPayload).eq('id', id as any);
        if (orderError) { addToast(`Gagal update order: ${orderError.message}`, 'error'); return; }
        
        // 2. Delete old items if new ones are provided
        if(order_items){
            const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', id as any);
            if (deleteError) { addToast(`Gagal menghapus item lama: ${deleteError.message}`, 'error'); return; }
            
            // 3. Insert new items
            const itemsPayload = order_items.map((item) => ({ ...item, order_id: id, id: undefined, created_at: undefined, local_id: undefined }));
            const { error: insertError } = await supabase.from('order_items').insert(itemsPayload);
            if (insertError) { addToast(`Gagal menyimpan item baru: ${insertError.message}`, 'error'); return; }
        }

        // 4. Refetch and update local state
        const { data: fullOrder } = await supabase.from('orders').select('*, order_items(*), payments(*)').eq('id', id).single();
        if (fullOrder) setOrders(prev => prev.map(o => o.id === id ? fullOrder as Order : o));
        
        addToast('Order berhasil diperbarui.', 'success');
    };

    const deleteOrder = async (id: number) => deleteRecord('orders', id, setOrders, 'Order berhasil dihapus.');

    const addPaymentToOrder = async (orderId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'>) => {
        const { data: newPayment, error } = await supabase
            .from('payments')
            .insert({ ...paymentData, order_id: orderId })
            .select()
            .single();

        if (error) {
            addToast(`Gagal menambah pembayaran: ${error.message}`, 'error');
            throw error;
        }

        if (newPayment) {
            addToast('Pembayaran berhasil ditambahkan.', 'success');

            // Check if the order is now fully paid
            const order = orders.find(o => o.id === orderId);
            if (order) {
                // Round values to avoid floating point issues.
                const totalPaidInCents = Math.round((order.payments.reduce((sum, p) => sum + p.amount, 0) + newPayment.amount) * 100);
                const totalBillInCents = Math.round(calculateOrderTotal(order, customers, bahanList) * 100);
                
                if (totalPaidInCents >= totalBillInCents) {
                    const { error: updateError } = await supabase
                        .from('orders')
                        .update({ status_pembayaran: 'Lunas' })
                        .eq('id', orderId as any);
                    if (updateError) {
                        addToast(`Pembayaran terekam, tapi gagal update status order: ${updateError.message}`, 'error');
                    }
                }
            }

            // Refetch the full order to get all updates, including payment status change
            const { data: fullOrder, error: fetchError } = await supabase
                .from('orders')
                .select('*, order_items(*), payments(*)')
                .eq('id', orderId)
                .single();
            
            if (fetchError) {
                addToast('Gagal memuat ulang data order, tampilan mungkin tidak sinkron.', 'error');
                // Fallback to manual client-side update if refetch fails
                setOrders(prevOrders => prevOrders.map(o => {
                    if (o.id === orderId) {
                        return { ...o, payments: [...o.payments, newPayment] };
                    }
                    return o;
                }));
            } else if (fullOrder) {
                setOrders(prevOrders => prevOrders.map(o => (o.id === orderId ? fullOrder as Order : o)));
            }
        }
    };

    const addBulkPaymentToOrders = async (
        paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id' | 'amount'>,
        totalPaymentAmount: number,
        ordersToPay: Order[]
    ) => {
        let remainingPayment = totalPaymentAmount;
        const sortedOrders = [...ordersToPay].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
        const paymentInserts: Omit<Payment, 'id' | 'created_at'>[] = [];
        const orderUpdatePayloads: { id: number; status_pembayaran: PaymentStatus }[] = [];
    
        for (const order of sortedOrders) {
            if (remainingPayment <= 0) break;
    
            const totalBill = calculateOrderTotal(order, customers, bahanList);
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalBill - totalPaid);
    
            if (balanceDue <= 0.01) continue; // Skip if paid or very close to paid
    
            const amountToPay = Math.min(remainingPayment, balanceDue);
    
            paymentInserts.push({ ...paymentData, order_id: order.id, amount: amountToPay });
            remainingPayment -= amountToPay;
    
            // Check if this payment makes the order fully paid
            if (amountToPay >= balanceDue - 0.01) {
                orderUpdatePayloads.push({ id: order.id, status_pembayaran: 'Lunas' });
            }
        }
    
        if (paymentInserts.length === 0) {
            addToast('Tidak ada pembayaran yang dapat diproses.', 'info');
            return;
        }
    
        try {
            const { error: insertError } = await supabase.from('payments').insert(paymentInserts);
            if (insertError) throw insertError;
    
            if (orderUpdatePayloads.length > 0) {
                // Supabase JS v2 doesn't support bulk updates easily. We loop.
                const updatePromises = orderUpdatePayloads.map(update =>
                    supabase.from('orders').update({ status_pembayaran: update.status_pembayaran }).eq('id', update.id as any)
                );
                const results = await Promise.all(updatePromises);
                const updateError = results.find(res => res.error);
                if (updateError) {
                    addToast(`Beberapa status order gagal diperbarui: ${updateError.error?.message}`, 'error');
                }
            }
        } catch (error: any) {
            addToast(`Gagal memproses pembayaran: ${error.message}`, 'error');
            throw error;
        } finally {
            // Always refetch to ensure client state is consistent with the database
            const { data: allOrders, error: fetchError } = await supabase.from('orders').select('*, order_items(*), payments(*)');
            if (fetchError) {
                addToast('Gagal menyinkronkan data terbaru, silakan muat ulang halaman.', 'error');
            } else {
                setOrders(allOrders as Order[] || []);
                addToast(`${paymentInserts.length} pembayaran berhasil diproses.`, 'success');
            }
        }
    };

    const updateOrderStatus = async (orderId: number, status: OrderStatus, pelaksana_id: string | null = null) => {
        const { data: updatedOrder, error } = await supabase.from('orders').update({ status_pesanan: status, pelaksana_id }).eq('id', orderId as any).select().single();
        if (error) { addToast(`Gagal update status order: ${error.message}`, 'error'); return; }

        const fullOrder = orders.find(o => o.id === orderId);
        if (status === 'Proses' && fullOrder) {
            for (const item of fullOrder.order_items) {
                const finishing = finishings.find(f => f.id === item.finishing_id);
                const panjang_tambahan = finishing?.panjang_tambahan || 0;
                const lebar_tambahan = finishing?.lebar_tambahan || 0;
                const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                const totalLebar = (item.lebar || 0) + lebar_tambahan;
                const quantityToDeduct = (totalPanjang * totalLebar) * item.qty;

                if (quantityToDeduct > 0) {
                    await addStockMovement({
                        bahan_id: item.bahan_id,
                        type: 'out',
                        quantity: quantityToDeduct,
                        supplier_id: null,
                        notes: `Pemakaian untuk order ${fullOrder.no_nota}`,
                    }, true);
                }
            }
            addToast(`Stok bahan untuk nota ${fullOrder.no_nota} telah dikurangi.`, 'info');
        }

        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...updatedOrder } : o));
    };

    const updateOrderItemStatus = async (orderId: number, itemId: number, status: ProductionStatus) => {
        const { error } = await supabase.from('order_items').update({ status_produksi: status }).eq('id', itemId as any);
        if (error) { addToast('Gagal update status item.', 'error'); return; }
        
        setOrders(prev => prev.map(order => {
            if (order.id !== orderId) return order;
            return {
                ...order,
                order_items: order.order_items.map(item => item.id === itemId ? { ...item, status_produksi: status } : item)
            };
        }));
    };
    
    return {
        isDataLoaded,
        employees, addEmployee, updateEmployee, deleteEmployee,
        customers, addCustomer, updateCustomer, deleteCustomer,
        bahanList, addBahan, updateBahan, deleteBahan,
        orders, addOrder, updateOrder, deleteOrder, addPaymentToOrder, addBulkPaymentToOrders, updateOrderStatus, updateOrderItemStatus,
        expenses, addExpense, updateExpense, deleteExpense,
        banks, addBank, updateBank, deleteBank,
        assets: allAssets, addAsset, updateAsset, deleteAsset,
        debts, addDebt, updateDebt, deleteDebt,
        notaSetting, updateNotaSetting,
        suppliers, addSupplier, updateSupplier, deleteSupplier,
        stockMovements, addStockMovement,
        finishings, addFinishing, updateFinishing, deleteFinishing,
        updateBahanStock,
    };
};