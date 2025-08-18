

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase, Customer, Employee, Bahan, Expense, Order, OrderItem, Payment, User, Bank, Asset, Debt, NotaSetting, Supplier, StockMovement, Finishing, OrderStatus, ProductionStatus, OrderRow, Database, CustomerLevel, PaymentStatus, DisplaySettings, PayrollConfig, Attendance, Payroll, PayrollStatus, TeamChatMessage } from '../lib/supabaseClient';
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

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(value);
};

const ORDERS_PAGE_SIZE = 25;

const ORDER_SELECT_QUERY = `
    id, created_at, no_nota, tanggal, pelanggan_id, status_pembayaran, status_pesanan, 
    pelaksana_order_id, pelaksana_produksi_id, pelaksana_delivery_id,
    order_items(id, order_id, bahan_id, deskripsi_pesanan, panjang, lebar, qty, status_produksi, finishing_id, created_at),
    payments(id, order_id, amount, payment_date, kasir_id, bank_id, created_at)
`;

export const useAppData = (user: User | undefined) => {
    const { addToast } = useToast();
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const initialLoadDone = useRef(false);
    
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
    const [payrollConfigs, setPayrollConfigs] = useState<PayrollConfig[]>([]);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [payrolls, setPayrolls] = useState<Payroll[]>([]);
    const [teamChatMessages, setTeamChatMessages] = useState<TeamChatMessage[]>([]);
    const [unreadChatCount, setUnreadChatCount] = useState(0);

    const lastChatCheckKey = `celengan-app:lastChatCheck:${user?.id}`;

    const [filters, setFilters] = useState({
        customerId: 'all',
        startDate: '',
        endDate: '',
        paymentStatus: 'all',
        orderStatus: 'all',
        searchQuery: '',
    });

    // State for order pagination
    const [orderPage, setOrderPage] = useState(0);
    const [hasMoreOrders, setHasMoreOrders] = useState(true);
    const [isOrderLoading, setIsOrderLoading] = useState(false);
    
    const fetchFullOrder = useCallback(async (orderId: number): Promise<Order | null> => {
        const { data, error } = await supabase.from('orders').select(ORDER_SELECT_QUERY).eq('id', orderId).maybeSingle();
        if (error) {
            console.error(`Error fetching full order for ID ${orderId}:`, error);
            addToast(`Gagal memuat detail order: ${error.message}`, 'error');
            return null;
        }
        return data as unknown as Order | null;
    }, [addToast]);

    const loadOrders = useCallback(async (currentFilters: typeof filters, page: number, append: boolean) => {
        setIsOrderLoading(true);
        try {
            let query = supabase.from('orders').select(ORDER_SELECT_QUERY);
            
            if (currentFilters.customerId !== 'all') {
                query = query.eq('pelanggan_id', Number(currentFilters.customerId));
            }
            if (currentFilters.startDate) {
                query = query.gte('tanggal', currentFilters.startDate);
            }
            if (currentFilters.endDate) {
                query = query.lte('tanggal', currentFilters.endDate);
            }
            if (currentFilters.paymentStatus !== 'all') {
                query = query.eq('status_pembayaran', currentFilters.paymentStatus as PaymentStatus);
            }
             if (currentFilters.orderStatus !== 'all') {
                query = query.eq('status_pesanan', currentFilters.orderStatus as OrderStatus);
            }
            if (currentFilters.searchQuery) {
                query = query.ilike('no_nota', `%${currentFilters.searchQuery}%`);
            }
            
            const from = page * ORDERS_PAGE_SIZE;
            const to = from + ORDERS_PAGE_SIZE - 1;
            query = query.order('created_at', { ascending: false }).range(from, to);
            
            const { data, error } = await query;
            if (error) throw error;
            
            const newOrders = data as unknown as Order[];
            
            if (append) {
                setOrders(prev => [...prev, ...newOrders]);
            } else {
                setOrders(newOrders);
            }
            setOrderPage(page);
            setHasMoreOrders(newOrders.length === ORDERS_PAGE_SIZE);
        } catch (error: any) {
            addToast(`Gagal memuat order: ${error.message}`, 'error');
        } finally {
            setIsOrderLoading(false);
        }
    }, [addToast]);
    
    useEffect(() => {
        if (!initialLoadDone.current || !user) return;
        loadOrders(filters, 0, false);
    }, [filters, user, loadOrders]);

    const fetchInitialData = useCallback(async () => {
        setIsDataLoaded(false);
        try {
            
            const [
                employeesRes, customersRes, bahanRes, initialOrdersRes,
                expensesRes, banksRes, assetsRes, debtsRes, suppliersRes,
                stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes,
                payrollConfigsRes, attendancesRes, payrollsRes, chatRes
            ] = await Promise.all([
                supabase.from('employees').select('id, name, position, email, phone, user_id').order('name'),
                supabase.from('customers').select('id, name, email, phone, address, level').order('name'),
                supabase.from('bahan').select('id, name, harga_end_customer, harga_retail, harga_grosir, harga_reseller, harga_corporate, stock_qty').order('name'),
                supabase.from('orders').select(ORDER_SELECT_QUERY).order('created_at', { ascending: false }).range(0, ORDERS_PAGE_SIZE - 1),
                supabase.from('expenses').select('id, tanggal, jenis_pengeluaran, keterangan, qty, harga, bahan_id, supplier_id').order('tanggal', { ascending: false }),
                supabase.from('banks').select('id, name, account_holder, account_number, category'),
                supabase.from('assets').select('id, name, category, purchase_price, purchase_date, status, is_dynamic'),
                supabase.from('debts').select('id, creditor_name, category, description, total_amount, due_date, status'),
                supabase.from('suppliers').select('id, name, contact_person, phone, specialty').order('name'),
                supabase.from('stock_movements').select('id, created_at, bahan_id, type, quantity, supplier_id, notes'),
                supabase.from('finishings').select('id, name, panjang_tambahan, lebar_tambahan').order('name'),
                supabase.from('settings').select('key, value').in('key', ['nota_prefix', 'nota_last_number']),
                supabase.from('display_settings').select('id, created_at, running_text, slideshow_images, youtube_video_url').eq('id', 1).maybeSingle(),
                supabase.from('payroll_configs').select('id, employee_id, regular_rate_per_hour, overtime_rate_per_hour'),
                supabase.from('attendances').select('id, employee_id, check_in, check_out, overtime_minutes, notes, shift, catatan_lembur, potongan, catatan_potongan, payroll_id').order('check_in', { ascending: false }),
                supabase.from('payrolls').select('id, created_at, employee_id, period_start, period_end, total_regular_hours, total_overtime_hours, base_salary, overtime_pay, bonus, potongan, notes, catatan_potongan, total_salary, status, approved_by, approved_at').order('created_at', { ascending: false }),
                supabase.from('team_chat').select('*').order('created_at', { ascending: true })
            ]);

            const responses = [employeesRes, customersRes, bahanRes, initialOrdersRes, expensesRes, banksRes, assetsRes, debtsRes, suppliersRes, stockMovementsRes, finishingsRes, notaSettingsRes, displaySettingsRes, payrollConfigsRes, attendancesRes, payrollsRes, chatRes];
            for (const res of responses) {
                if (res.error) throw res.error;
            }

            setEmployees(employeesRes.data as unknown as Employee[] || []);
            setCustomers(customersRes.data as unknown as Customer[] || []);
            setBahanList(bahanRes.data as unknown as Bahan[] || []);
            setExpenses(expensesRes.data as unknown as Expense[] || []);
            setBanks(banksRes.data as unknown as Bank[] || []);
            setAssets(assetsRes.data as unknown as Asset[] || []);
            setDebts(debtsRes.data as unknown as Debt[] || []);
            setSuppliers(suppliersRes.data as unknown as Supplier[] || []);
            setStockMovements(stockMovementsRes.data as unknown as StockMovement[] || []);
            setFinishings(finishingsRes.data as unknown as Finishing[] || []);
            
            setPayrollConfigs(payrollConfigsRes.data as unknown as PayrollConfig[] || []);
            setAttendances(attendancesRes.data as unknown as Attendance[] || []);
            setPayrolls(payrollsRes.data as unknown as Payroll[] || []);
            
            const chatMessages = chatRes.data as unknown as TeamChatMessage[] || [];
            setTeamChatMessages(chatMessages);

            if (user) {
                const lastCheck = localStorage.getItem(lastChatCheckKey) || new Date(0).toISOString();
                const newUnreadCount = chatMessages.filter(
                    msg => msg.user_id !== user.id && msg.created_at > lastCheck
                ).length;
                setUnreadChatCount(newUnreadCount);
            }

            const initialOrdersData = initialOrdersRes.data || [];
            setOrders(initialOrdersData as unknown as Order[]);
            setOrderPage(0);
            setHasMoreOrders(initialOrdersData.length === ORDERS_PAGE_SIZE);

            const prefix = (notaSettingsRes.data as any[])?.find(s => s.key === 'nota_prefix')?.value || 'INV';
            const lastNumber = (notaSettingsRes.data as any[])?.find(s => s.key === 'nota_last_number')?.value || '0';
            setNotaSetting({ prefix, start_number_str: lastNumber });
            setDisplaySettings(displaySettingsRes.data as unknown as DisplaySettings | null);

            initialLoadDone.current = true;
        } catch (error: any) {
            const errorMessage = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
            console.error("Error fetching initial data:", error);
            addToast(`Gagal memuat data: ${errorMessage}`, 'error');
        } finally {
            setIsDataLoaded(true);
        }
    }, [addToast, user, lastChatCheckKey]);

    const loadMoreOrders = useCallback(async () => {
        if (isOrderLoading || !hasMoreOrders) return;
        loadOrders(filters, orderPage + 1, true);
    }, [isOrderLoading, hasMoreOrders, orderPage, filters, loadOrders]);

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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'customers' }, () => supabase.from('customers').select('id, name, email, phone, address, level').order('name').then(({data}) => setCustomers(data as unknown as Customer[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, () => supabase.from('employees').select('id, name, position, email, phone, user_id').order('name').then(({data}) => setEmployees(data as unknown as Employee[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'bahan' }, () => supabase.from('bahan').select('id, name, harga_end_customer, harga_retail, harga_grosir, harga_reseller, harga_corporate, stock_qty').order('name').then(({data}) => setBahanList(data as unknown as Bahan[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => supabase.from('expenses').select('id, tanggal, jenis_pengeluaran, keterangan, qty, harga, bahan_id, supplier_id').order('tanggal', {ascending: false}).then(({data}) => setExpenses(data as unknown as Expense[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'banks' }, () => supabase.from('banks').select('id, name, account_holder, account_number, category').then(({data}) => setBanks(data as unknown as Bank[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'assets' }, () => supabase.from('assets').select('id, name, category, purchase_price, purchase_date, status, is_dynamic').then(({data}) => setAssets(data as unknown as Asset[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'debts' }, () => supabase.from('debts').select('id, creditor_name, category, description, total_amount, due_date, status').then(({data}) => setDebts(data as unknown as Debt[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'suppliers' }, () => supabase.from('suppliers').select('id, name, contact_person, phone, specialty').order('name').then(({data}) => setSuppliers(data as unknown as Supplier[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_movements' }, () => supabase.from('stock_movements').select('id, created_at, bahan_id, type, quantity, supplier_id, notes').then(({data}) => setStockMovements(data as unknown as StockMovement[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'finishings' }, () => supabase.from('finishings').select('id, name, panjang_tambahan, lebar_tambahan').order('name').then(({data}) => setFinishings(data as unknown as Finishing[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payroll_configs' }, () => supabase.from('payroll_configs').select('id, employee_id, regular_rate_per_hour, overtime_rate_per_hour').then(({data}) => setPayrollConfigs(data as unknown as PayrollConfig[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'attendances' }, () => supabase.from('attendances').select('id, employee_id, check_in, check_out, overtime_minutes, notes, shift, catatan_lembur, potongan, catatan_potongan, payroll_id').order('check_in', { ascending: false }).then(({data}) => setAttendances(data as unknown as Attendance[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'payrolls' }, () => supabase.from('payrolls').select('id, created_at, employee_id, period_start, period_end, total_regular_hours, total_overtime_hours, base_salary, overtime_pay, bonus, potongan, notes, catatan_potongan, total_salary, status, approved_by, approved_at').order('created_at', { ascending: false }).then(({data}) => setPayrolls(data as unknown as Payroll[] || [])))
            .on('postgres_changes', { event: '*', schema: 'public', table: 'display_settings' }, () => supabase.from('display_settings').select('id, created_at, running_text, slideshow_images, youtube_video_url').eq('id', 1).maybeSingle().then(({data}) => setDisplaySettings(data as unknown as DisplaySettings | null)))
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, fetchFullOrder]);

    // Dedicated real-time subscription for team chat for improved stability and error handling
    useEffect(() => {
        if (!user) return;

        const chatChannel = supabase
            .channel('team-chat-realtime')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'team_chat' },
                (payload) => {
                    const newMessage = payload.new as TeamChatMessage;
                    
                    setTeamChatMessages(prev => {
                        // Prevent duplicates from race conditions
                        if (prev.find(msg => msg.id === newMessage.id)) {
                            return prev;
                        }
                        const updatedMessages = [...prev, newMessage];
                        return updatedMessages.slice(-50); // Keep only last 50 messages
                    });

                    if (newMessage.user_id !== user.id) {
                        setUnreadChatCount(prev => prev + 1);
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log('Successfully subscribed to team chat channel!');
                }
                if (status === 'CHANNEL_ERROR') {
                    console.error('Team chat channel error:', err);
                    addToast(`Koneksi real-time chat gagal: ${err?.message}`, 'error');
                }
                if (status === 'TIMED_OUT') {
                    console.warn('Team chat subscription timed out.');
                    addToast('Koneksi real-time chat timeout.', 'info');
                }
            });

        return () => {
            supabase.removeChannel(chatChannel);
        };
    }, [user, addToast]);
    
    const markChatAsRead = useCallback(() => {
        if (!user) return;
        localStorage.setItem(lastChatCheckKey, new Date().toISOString());
        setUnreadChatCount(0);
    }, [user, lastChatCheckKey]);
    
    const performDbOperation = async (operation: PromiseLike<{ error: any | null }>, successMessage: string) => {
        const { error } = await operation;
        if (error) {
            addToast(`Gagal: ${error.message}`, 'error');
            throw error;
        }
        if (successMessage) {
            addToast(successMessage, 'success');
        }
    };

    // --- CRUD functions ---
    const addCustomer = async (data: Omit<Customer, 'id' | 'created_at'>): Promise<Customer> => {
       const { data: newRecord, error } = await supabase.from('customers').insert(data).select().single();
       if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
       addToast('Pelanggan berhasil ditambahkan.', 'success');
       return newRecord as unknown as Customer;
    };
    const updateCustomer = (id: number, data: Partial<Omit<Customer, 'id'|'created_at'>>) => performDbOperation(supabase.from('customers').update(data).eq('id', id), 'Pelanggan berhasil diperbarui.');
    const deleteCustomer = async (id: number) => {
        const originalData = [...customers];
        setCustomers(prev => prev.filter(item => item.id !== id));
        addToast('Pelanggan berhasil dihapus.', 'success');
        const { error } = await supabase.from('customers').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus pelanggan: ${error.message}`, 'error');
            setCustomers(originalData);
        }
    };


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
    const deleteEmployee = async (id: number) => {
        const originalData = [...employees];
        setEmployees(prev => prev.filter(item => item.id !== id));
        addToast('User berhasil dihapus.', 'success');
        const { error } = await supabase.from('employees').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus user: ${error.message}`, 'error');
            setEmployees(originalData);
        }
    };


    const addBahan = async (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => {
        const { data: newRecord, error } = await supabase.from('bahan').insert({...data, stock_qty: 0}).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Bahan berhasil ditambahkan.', 'success');
        return newRecord as unknown as Bahan;
    };
    const updateBahan = (id: number, data: Partial<Omit<Bahan, 'id'|'created_at'>>) => performDbOperation(supabase.from('bahan').update(data).eq('id', id), 'Bahan berhasil diperbarui.');
    const deleteBahan = async (id: number) => {
        const originalData = [...bahanList];
        setBahanList(prev => prev.filter(item => item.id !== id));
        addToast('Bahan berhasil dihapus.', 'success');
        const { error } = await supabase.from('bahan').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus bahan: ${error.message}`, 'error');
            setBahanList(originalData);
        }
    };

    const addBank = async (data: Omit<Bank, 'id' | 'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('banks').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Sumber dana berhasil ditambahkan.', 'success');
        return newRecord as unknown as Bank;
    };
    const updateBank = (id: number, data: Partial<Omit<Bank, 'id'|'created_at'>>) => performDbOperation(supabase.from('banks').update(data).eq('id', id), 'Sumber dana berhasil diperbarui.');
    const deleteBank = async (id: number) => {
        const originalData = [...banks];
        setBanks(prev => prev.filter(item => item.id !== id));
        addToast('Sumber dana berhasil dihapus.', 'success');
        const { error } = await supabase.from('banks').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus sumber dana: ${error.message}`, 'error');
            setBanks(originalData);
        }
    };

    
    const addAsset = async (data: Omit<Asset, 'id'|'created_at'|'is_dynamic'>) => {
        const { data: newRecord, error } = await supabase.from('assets').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Aset berhasil ditambahkan.', 'success');
        return newRecord as unknown as Asset;
    };
    const updateAsset = (id: number, data: Partial<Omit<Asset, 'id'|'created_at'|'is_dynamic'>>) => performDbOperation(supabase.from('assets').update(data).eq('id', id), 'Aset berhasil diperbarui.');
    const deleteAsset = async (id: number) => {
        const originalData = [...assets];
        setAssets(prev => prev.filter(item => item.id !== id));
        addToast('Aset berhasil dihapus.', 'success');
        const { error } = await supabase.from('assets').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus aset: ${error.message}`, 'error');
            setAssets(originalData);
        }
    };

    const addDebt = async (data: Omit<Debt, 'id'|'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('debts').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Data hutang berhasil ditambahkan.', 'success');
        return newRecord as unknown as Debt;
    };
    const updateDebt = (id: number, data: Partial<Omit<Debt, 'id'|'created_at'>>) => performDbOperation(supabase.from('debts').update(data).eq('id', id), 'Data hutang berhasil diperbarui.');
    const deleteDebt = async (id: number) => {
        const originalData = [...debts];
        setDebts(prev => prev.filter(item => item.id !== id));
        addToast('Data hutang berhasil dihapus.', 'success');
        const { error } = await supabase.from('debts').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus data hutang: ${error.message}`, 'error');
            setDebts(originalData);
        }
    };


    const addSupplier = async (data: Omit<Supplier, 'id'|'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('suppliers').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Suplier berhasil ditambahkan.', 'success');
        return newRecord as unknown as Supplier;
    };
    const updateSupplier = (id: number, data: Partial<Omit<Supplier, 'id'|'created_at'>>) => performDbOperation(supabase.from('suppliers').update(data).eq('id', id), 'Suplier berhasil diperbarui.');
    const deleteSupplier = async (id: number) => {
        const originalData = [...suppliers];
        setSuppliers(prev => prev.filter(item => item.id !== id));
        addToast('Suplier berhasil dihapus.', 'success');
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus suplier: ${error.message}`, 'error');
            setSuppliers(originalData);
        }
    };
    
    
    const addFinishing = async (data: Omit<Finishing, 'id' | 'created_at'>) => {
        const { data: newRecord, error } = await supabase.from('finishings').insert(data).select().single();
        if (error) { addToast(`Gagal: ${error.message}`, 'error'); throw error; }
        addToast('Finishing berhasil ditambahkan.', 'success');
        return newRecord as unknown as Finishing;
    };
    const updateFinishing = (id: number, data: Partial<Omit<Finishing, 'id'|'created_at'>>) => performDbOperation(supabase.from('finishings').update(data).eq('id', id), 'Finishing berhasil diperbarui.');
    const deleteFinishing = async (id: number) => {
        const originalData = [...finishings];
        setFinishings(prev => prev.filter(item => item.id !== id));
        addToast('Finishing berhasil dihapus.', 'success');
        const { error } = await supabase.from('finishings').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus finishing: ${error.message}`, 'error');
            setFinishings(originalData);
        }
    };


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
        if (Math.abs(difference) < 0.001) return Promise.resolve();
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
    const deleteExpense = async (id: number) => {
        const originalData = [...expenses];
        setExpenses(prev => prev.filter(item => item.id !== id));
        addToast('Pengeluaran berhasil dihapus.', 'success');
        const { error } = await supabase.from('expenses').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus pengeluaran: ${error.message}`, 'error');
            setExpenses(originalData);
        }
    };
    
    const updateNotaSetting = async (settings: NotaSetting) => {
        await Promise.all([
            performDbOperation(supabase.from('settings').update({ value: settings.prefix }).eq('key', 'nota_prefix'), ''),
            performDbOperation(supabase.from('settings').update({ value: settings.start_number_str }).eq('key', 'nota_last_number'), '')
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
        
        const { order_items, ...mainOrderData } = orderData;
        const { data: newOrder, error: orderError } = await supabase
            .from('orders')
            .insert({ ...mainOrderData, no_nota: newNotaNumber })
            .select()
            .single();

        if (orderError) {
            addToast(`Gagal menyimpan order: ${orderError.message}`, 'error');
            throw orderError;
        }

        if (!newOrder?.id) {
            const err = new Error('Gagal membuat record order utama.');
            addToast(`Gagal menyimpan order: ${err.message}`, 'error');
            throw err;
        }

        const itemsToInsert = order_items.map(item => ({ ...item, order_id: newOrder.id }));

        const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);

        if (itemsError) {
            addToast(`Gagal menyimpan item order: ${itemsError.message}. Mencoba menghapus order...`, 'error');
            await supabase.from('orders').delete().eq('id', newOrder.id);
            throw itemsError;
        }

        await supabase.from('settings').update({ value: newPaddedNumberStr }).eq('key', 'nota_last_number');
        setNotaSetting(prev => ({ ...prev, start_number_str: newPaddedNumberStr }));
        addToast(`Order ${newNotaNumber} berhasil ditambahkan.`, 'success');
    };

    const updateOrder = async (id: number, orderData: UpdateOrderPayload) => {
        const { order_items, ...mainOrderData } = orderData;

        if (Object.keys(mainOrderData).length > 0) {
            const { error: orderUpdateError } = await supabase.from('orders').update(mainOrderData).eq('id', id);
            if (orderUpdateError) {
                addToast(`Gagal update detail order: ${orderUpdateError.message}`, 'error');
                throw orderUpdateError;
            }
        }
        
        if (order_items) {
            const { error: deleteError } = await supabase.from('order_items').delete().eq('order_id', id);
            if (deleteError) {
                addToast(`Gagal menghapus item lama: ${deleteError.message}`, 'error');
                throw deleteError;
            }

            const itemsToInsert = order_items.map(({ id: itemId, ...item }) => ({ ...item, order_id: id }));
            
            if (itemsToInsert.length > 0) {
                const { error: insertError } = await supabase.from('order_items').insert(itemsToInsert);
                if (insertError) {
                    addToast(`Gagal menyimpan item baru: ${insertError.message}`, 'error');
                    throw insertError;
                }
            }
        }
        addToast(`Order berhasil diperbarui.`, 'success');
    };

    const deleteOrder = async (id: number) => {
        const originalOrders = [...orders];
        const orderToDelete = originalOrders.find(o => o.id === id);
    
        if (!orderToDelete) {
            addToast(`Order dengan ID ${id} tidak ditemukan.`, 'error');
            return;
        }
        
        // Optimistic UI update
        setOrders(prev => prev.filter(o => o.id !== id));
        addToast(`Order ${orderToDelete.no_nota} berhasil dihapus.`, 'success');
    
        try {
            // Handle stock restoration
            if (['Waiting', 'Proses', 'Ready', 'Delivered'].includes(orderToDelete.status_pesanan)) {
                addToast(`Mengembalikan stok untuk nota ${orderToDelete.no_nota}...`, 'info');
                for (const item of orderToDelete.order_items) {
                    const finishing = finishings.find(f => f.id === item.finishing_id);
                    const panjang_tambahan = finishing?.panjang_tambahan || 0;
                    const lebar_tambahan = finishing?.lebar_tambahan || 0;
                    const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                    const totalLebar = (item.lebar || 0) + lebar_tambahan;
                    const quantityToRestore = (totalPanjang * totalLebar) * item.qty;
                    if (quantityToRestore > 0) {
                        await addStockMovement({
                            bahan_id: item.bahan_id,
                            type: 'in',
                            quantity: quantityToRestore,
                            supplier_id: null,
                            notes: `Stok dikembalikan dari order ${orderToDelete.no_nota} yang dihapus`
                        });
                    }
                }
                addToast(`Stok untuk nota ${orderToDelete.no_nota} berhasil dikembalikan.`, 'info');
            }
            
            // Perform the deletion from the database
            const { error } = await supabase.from('orders').delete().eq('id', id);
            if (error) throw error;
    
        } catch (error: any) {
            addToast(`Gagal menghapus order: ${error.message}`, 'error');
            // Rollback UI on failure
            setOrders(originalOrders);
        }
    };
    
    const addPaymentToOrder = async (orderId: number, paymentData: Omit<Payment, 'id' | 'created_at' | 'order_id'>) => {
        const originalOrders = [...orders];
        const orderIndex = originalOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) {
            addToast('Order tidak ditemukan.', 'error');
            return;
        }
    
        const originalOrder = originalOrders[orderIndex];
        const totalBill = calculateOrderTotal(originalOrder, customers, bahanList);
        const totalPaid = originalOrder.payments.reduce((sum, p) => sum + p.amount, 0);
        const balanceDue = Math.max(0, totalBill - totalPaid);
    
        if (balanceDue <= 0) {
            addToast('Tagihan ini sudah lunas.', 'info');
            return;
        }
        
        const userPayment = Math.round(paymentData.amount);
        const amountToRecord = Math.min(userPayment, balanceDue);
        const change = userPayment - amountToRecord;
        
        // Optimistic Update
        const newPayment: Payment = {
            ...paymentData,
            id: Date.now(), // Temporary ID for React key
            created_at: new Date().toISOString(),
            order_id: orderId,
            amount: amountToRecord
        };
        
        const updatedOrder = JSON.parse(JSON.stringify(originalOrder));
        updatedOrder.payments.push(newPayment);
        const newTotalPaid = updatedOrder.payments.reduce((sum: number, p: Payment) => sum + p.amount, 0);
        const newStatus: PaymentStatus = newTotalPaid >= totalBill ? 'Lunas' : 'Belum Lunas';
        const statusChanged = updatedOrder.status_pembayaran !== newStatus;
        updatedOrder.status_pembayaran = newStatus;
        
        const newOrders = [...originalOrders];
        newOrders[orderIndex] = updatedOrder;
        setOrders(newOrders);
    
        try {
            const { error: paymentError } = await supabase.from('payments').insert({ 
                order_id: orderId,
                amount: amountToRecord,
                payment_date: paymentData.payment_date,
                kasir_id: paymentData.kasir_id,
                bank_id: paymentData.bank_id,
            });
    
            if (paymentError) throw paymentError;
    
            addToast(`Pembayaran ${formatCurrency(amountToRecord)} berhasil.` + (change > 0 ? ` Kembalian: ${formatCurrency(change)}` : ''), 'success');
            
            if (statusChanged) {
                 const { error: orderError } = await supabase.from('orders').update({ status_pembayaran: newStatus }).eq('id', orderId);
                 if (orderError) throw orderError;
                 addToast(`Status pembayaran Nota ${originalOrder.no_nota} diubah menjadi ${newStatus}.`, 'success');
            }
    
            const finalOrderState = await fetchFullOrder(orderId);
            if (finalOrderState) {
                setOrders(prev => prev.map(o => o.id === orderId ? finalOrderState : o));
            }
    
        } catch (error: any) {
            addToast(`Gagal menambah pembayaran: ${error.message}`, 'error');
            setOrders(originalOrders); // Rollback
        }
    };
    
    const addBulkPaymentToOrders = async (
        paymentData: Omit<Payment, 'id'|'created_at'|'order_id'|'amount'>,
        totalPaymentAmount: number,
        ordersToPay: Order[]
    ) => {
        let remainingPayment = Math.round(totalPaymentAmount);
        const sortedOrders = [...ordersToPay].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    
        const paymentInserts: Database['public']['Tables']['payments']['Insert'][] = [];
        for (const order of sortedOrders) {
            if (remainingPayment <= 0) break;
            const totalBill = calculateOrderTotal(order, customers, bahanList);
            const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);
            const balanceDue = Math.max(0, totalBill - totalPaid);
            if (balanceDue <= 0) continue;
            
            const amountToPay = Math.min(remainingPayment, balanceDue);
            if (amountToPay <= 0) continue;
            paymentInserts.push({ ...paymentData, order_id: order.id, amount: amountToPay });
            remainingPayment -= amountToPay;
        }
    
        if (paymentInserts.length === 0) { 
            addToast('Tidak ada pembayaran yang dapat diproses.', 'info'); 
            return; 
        }
        
        await performDbOperation(supabase.from('payments').insert(paymentInserts), `${paymentInserts.length} pembayaran berhasil diproses.`);

        const affectedOrderIds = [...new Set(paymentInserts.map(p => p.order_id))];

        for (const orderId of affectedOrderIds) {
            if (!orderId) continue;
            const fullOrder = await fetchFullOrder(orderId);
            if (fullOrder) {
                const totalBill = calculateOrderTotal(fullOrder, customers, bahanList);
                const totalPaid = fullOrder.payments.reduce((sum, p) => sum + p.amount, 0);
                const newStatus: PaymentStatus = totalPaid >= totalBill ? 'Lunas' : 'Belum Lunas';

                if (newStatus !== fullOrder.status_pembayaran) {
                    await performDbOperation(
                        supabase.from('orders').update({ status_pembayaran: newStatus }).eq('id', orderId),
                        `Status Nota ${fullOrder.no_nota} menjadi ${newStatus}.`
                    );
                }
            }
        }
    };

    const updateOrderStatus = async (orderId: number, status: OrderStatus, userId: string | null = null) => {
        const originalOrders = [...orders];
        const orderIndex = originalOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return;
    
        const originalOrder = originalOrders[orderIndex];
    
        // Optimistic update
        const updatedOrder = { ...originalOrder, status_pesanan: status };
        if (userId !== null) {
            if (status === 'Proses') updatedOrder.pelaksana_produksi_id = userId;
            if (status === 'Delivered') updatedOrder.pelaksana_delivery_id = userId;
            if (status === 'Waiting' && userId === '') updatedOrder.pelaksana_produksi_id = null;
        }
        
        const newOrders = [...originalOrders];
        newOrders[orderIndex] = updatedOrder;
        setOrders(newOrders);
    
        try {
            const payload: Partial<OrderRow> = { status_pesanan: status };
             if (userId !== null) {
                if (status === 'Proses') payload.pelaksana_produksi_id = userId;
                if (status === 'Delivered') payload.pelaksana_delivery_id = userId;
                if (status === 'Waiting' && userId === '') payload.pelaksana_produksi_id = null;
                // For cancellation back to Pending
                if (status === 'Pending' && ['Proses', 'Waiting'].includes(originalOrder.status_pesanan)) payload.pelaksana_produksi_id = null;
            }
    
            const { error } = await supabase.from('orders').update(payload).eq('id', orderId);
            if (error) throw error;
            addToast(`Status pesanan ${originalOrder.no_nota} diubah menjadi ${status}.`, 'success');
    
            // Handle stock adjustments AFTER successful update
            if (originalOrder.status_pesanan === 'Pending' && status === 'Waiting') {
                for (const item of originalOrder.order_items) {
                    const finishing = finishings.find(f => f.id === item.finishing_id);
                    const panjang_tambahan = finishing?.panjang_tambahan || 0;
                    const lebar_tambahan = finishing?.lebar_tambahan || 0;
                    const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                    const totalLebar = (item.lebar || 0) + lebar_tambahan;
                    const quantityToDeduct = (totalPanjang * totalLebar) * item.qty;
                    if (quantityToDeduct > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'out', quantity: quantityToDeduct, supplier_id: null, notes: `Pemakaian untuk order ${originalOrder.no_nota}` });
                }
                addToast(`Stok bahan untuk nota ${originalOrder.no_nota} telah dikurangi.`, 'info');
            } else if ((originalOrder.status_pesanan === 'Proses' || originalOrder.status_pesanan === 'Waiting') && status === 'Pending') {
                 for (const item of originalOrder.order_items) {
                    const finishing = finishings.find(f => f.id === item.finishing_id);
                    const panjang_tambahan = finishing?.panjang_tambahan || 0;
                    const lebar_tambahan = finishing?.lebar_tambahan || 0;
                    const totalPanjang = (item.panjang || 0) + panjang_tambahan;
                    const totalLebar = (item.lebar || 0) + lebar_tambahan;
                    const quantityToRestore = (totalPanjang * totalLebar) * item.qty;
                    if (quantityToRestore > 0) await addStockMovement({ bahan_id: item.bahan_id, type: 'in', quantity: quantityToRestore, supplier_id: null, notes: `Pembatalan proses untuk order ${originalOrder.no_nota}` });
                }
                addToast(`Stok bahan untuk nota ${originalOrder.no_nota} telah dikembalikan.`, 'info');
            }
    
        } catch (error: any) {
            addToast(`Gagal mengubah status pesanan: ${error.message}`, 'error');
            // Rollback
            setOrders(originalOrders);
        }
    };

    const updateOrderItemStatus = async (orderId: number, itemId: number, status: ProductionStatus) => {
        const originalOrders = [...orders];
        const orderIndex = originalOrders.findIndex(o => o.id === orderId);
        if (orderIndex === -1) return;
    
        const originalOrder = originalOrders[orderIndex];
        const itemIndex = originalOrder.order_items.findIndex(i => i.id === itemId);
        if (itemIndex === -1) return;
    
        // Create deep copies for optimistic update
        const updatedOrder = JSON.parse(JSON.stringify(originalOrder));
        updatedOrder.order_items[itemIndex].status_produksi = status;
    
        // Determine new parent order status
        const allItemsReady = updatedOrder.order_items.every((item: OrderItem) => item.status_produksi === 'Ready');
        const newOrderStatus: OrderStatus = allItemsReady ? 'Ready' : 'Proses';
        const statusChanged = updatedOrder.status_pesanan !== newOrderStatus;
        updatedOrder.status_pesanan = newOrderStatus;
    
        const newOrders = [...originalOrders];
        newOrders[orderIndex] = updatedOrder;
        setOrders(newOrders);
    
        try {
            const { error: itemError } = await supabase.from('order_items').update({ status_produksi: status }).eq('id', itemId);
            if (itemError) throw itemError;
            addToast(`Status item berhasil diubah menjadi "${status}".`, 'success');
            
            if (statusChanged) {
                const { error: orderError } = await supabase.from('orders').update({ status_pesanan: newOrderStatus }).eq('id', orderId);
                if (orderError) throw orderError;
                addToast(`Status order diubah menjadi "${newOrderStatus}".`, 'success');
            }
    
        } catch (error: any) {
            addToast(`Gagal update status produksi: ${error.message}`, 'error');
            setOrders(originalOrders); // Rollback
        }
    };
    
    const updateDisplaySettings = async (settings: Partial<Omit<DisplaySettings, 'id'|'created_at'>>) => {
        const { data: existing } = await supabase.from('display_settings').select('id').eq('id', 1).maybeSingle();
        const payload = { id: 1, ...settings };
        
        const operation = existing
            ? supabase.from('display_settings').update(payload).eq('id', 1)
            : supabase.from('display_settings').insert(payload);
        
        await performDbOperation(operation, 'Pengaturan display berhasil disimpan.');
    };
    
    // Payroll & Attendance CRUD
    const addPayrollConfig = (data: Omit<PayrollConfig, 'id'|'created_at'>) => performDbOperation(supabase.from('payroll_configs').insert(data), 'Konfigurasi gaji disimpan.');
    const updatePayrollConfig = (id: number, data: Partial<Omit<PayrollConfig, 'id'|'created_at'>>) => performDbOperation(supabase.from('payroll_configs').update(data).eq('id', id), 'Konfigurasi gaji diperbarui.');
    const deletePayrollConfig = async (id: number) => {
        const originalData = [...payrollConfigs];
        setPayrollConfigs(prev => prev.filter(item => item.id !== id));
        addToast('Konfigurasi gaji dihapus.', 'success');
        const { error } = await supabase.from('payroll_configs').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus konfigurasi gaji: ${error.message}`, 'error');
            setPayrollConfigs(originalData);
        }
    };
    
    const addAttendance = (data: Omit<Attendance, 'id'|'created_at'>) => performDbOperation(supabase.from('attendances').insert(data), 'Data absensi disimpan.');
    const updateAttendance = (id: number, data: Partial<Omit<Attendance, 'id'|'created_at'>>) => performDbOperation(supabase.from('attendances').update(data).eq('id', id), 'Data absensi diperbarui.');
    const deleteAttendance = async (id: number) => {
        const originalData = [...attendances];
        setAttendances(prev => prev.filter(item => item.id !== id));
        addToast('Data absensi dihapus.', 'success');
        const { error } = await supabase.from('attendances').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus data absensi: ${error.message}`, 'error');
            setAttendances(originalData);
        }
    };

    const addPayroll = (data: Omit<Payroll, 'id'|'created_at'>) => performDbOperation(supabase.from('payrolls').insert(data), 'Laporan gaji berhasil dikirim untuk persetujuan.');
    
    const updatePayroll = async (id: number, data: Partial<Omit<Payroll, 'id' | 'created_at'>>) => {
        const { data: originalPayroll, error: fetchError }: { data: { status: PayrollStatus } | null; error: any } = await supabase
            .from('payrolls')
            .select('status')
            .eq('id', id)
            .single();
    
        if (fetchError || !originalPayroll) {
            addToast(`Gagal memuat status payroll asli: ${fetchError?.message || 'Payroll not found.'}`, 'error');
            throw fetchError || new Error('Payroll not found');
        }
    
        await performDbOperation(supabase.from('payrolls').update(data).eq('id', id), 'Status laporan gaji diperbarui.');
    
        // IF moving TO 'approved'
        if (data.status === 'approved' && originalPayroll.status !== 'approved') {
            const { data: payrollData, error: fetchPayrollError }: { data: Payroll | null, error: any } = await supabase.from('payrolls').select('*').eq('id', id).single();
            if (fetchPayrollError || !payrollData) {
                addToast(`Gagal mengambil data payroll untuk arsip absensi: ${fetchPayrollError?.message}`, 'error');
                return;
            }
    
            const endDate = new Date(payrollData.period_end);
            endDate.setHours(23, 59, 59, 999);
    
            const { data: attendanceIds, error: attError } = await supabase
                .from('attendances')
                .select('id')
                .eq('employee_id', payrollData.employee_id)
                .is('payroll_id', null)
                .gte('check_in', new Date(payrollData.period_start).toISOString())
                .lte('check_in', endDate.toISOString());
    
            if (attError) {
                addToast(`Gagal mengambil data absensi untuk diarsipkan: ${attError.message}`, 'error');
                return;
            }
            
            const ids = attendanceIds?.map(a => a.id);
            if (ids && ids.length > 0) {
                const { error: updateAttError } = await supabase
                    .from('attendances')
                    .update({ payroll_id: payrollData.id })
                    .in('id', ids);
                
                if (updateAttError) {
                    addToast(`Gagal mengarsipkan data absensi: ${updateAttError.message}`, 'error');
                } else {
                    addToast(`${ids.length} data absensi telah diarsipkan.`, 'info');
                }
            }
        } 
        // IF moving FROM 'approved'
        else if (originalPayroll.status === 'approved' && data.status !== 'approved') {
            const { error: updateAttError } = await supabase
                .from('attendances')
                .update({ payroll_id: null })
                .eq('payroll_id', id);
            
            if (updateAttError) {
                addToast(`Gagal membuka arsip absensi: ${updateAttError.message}`, 'error');
            } else {
                addToast(`Arsip absensi telah dibuka kembali.`, 'info');
            }
        }
    };

    const deletePayroll = async (id: number) => {
        const originalData = [...payrolls];
        setPayrolls(prev => prev.filter(item => item.id !== id));
        addToast('Laporan gaji berhasil dihapus.', 'success');
        const { error } = await supabase.from('payrolls').delete().eq('id', id);
        if (error) {
            addToast(`Gagal menghapus laporan gaji: ${error.message}`, 'error');
            setPayrolls(originalData);
        }
    };

    const addChatMessage = async (message: string) => {
        if (!user) {
            addToast('Anda harus login untuk mengirim pesan.', 'error');
            return;
        }
        const employee = employees.find(e => e.user_id === user.id);
        const senderName = employee ? employee.name : (user.email || 'User');
    
        const payload: Omit<TeamChatMessage, 'id' | 'created_at'> = {
            user_id: user.id,
            user_name: senderName,
            message: message.trim(),
        };
    
        const { data: insertedMessages, error } = await supabase.from('team_chat').insert(payload).select();
    
        if (error) {
            addToast(`Gagal mengirim pesan: ${error.message}`, 'error');
            console.error('Chat error:', error);
        } else if (insertedMessages && insertedMessages.length > 0) {
            const newMessage = insertedMessages[0] as TeamChatMessage;
            setTeamChatMessages(prev => {
                if (prev.some(msg => msg.id === newMessage.id)) {
                    return prev;
                }
                const updatedMessages = [...prev, newMessage];
                return updatedMessages.slice(-50);
            });
        }
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
        filters, setFilters,
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
        updateDisplaySettings,
        payrollConfigs, addPayrollConfig, updatePayrollConfig, deletePayrollConfig,
        attendances, addAttendance, updateAttendance, deleteAttendance,
        payrolls, addPayroll, updatePayroll, deletePayroll,
        teamChatMessages, addChatMessage,
        unreadChatCount, markChatAsRead,
    };
};