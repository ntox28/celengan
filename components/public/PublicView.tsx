

import React, { useState, useEffect, useMemo } from 'react';
import { supabase, ProductionStatus, Order, Customer, Bahan } from '../../lib/supabaseClient';
import CompressIcon from '../icons/CompressIcon';
import ExpandIcon from '../icons/ExpandIcon';

interface ProductionItem {
    id: number;
    no_nota: string;
    customer_name: string;
    deskripsi: string;
    bahan_name: string;
    panjang: number | null;
    lebar: number | null;
    qty: number;
    status: ProductionStatus;
    created_at: string;
}

const Clock: React.FC = () => {
    const [time, setTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => setTime(new Date()), 1000);
        return () => clearInterval(timerId);
    }, []);

    return (
        <div className="text-xl md:text-2xl font-bold">
            {time.toLocaleTimeString('en-GB')}
        </div>
    );
};

const getStatusClass = (status: ProductionStatus) => {
    const classes: Record<ProductionStatus, string> = {
        'Belum Dikerjakan': 'status-belum',
        'Proses': 'status-proses',
        'Selesai': 'status-selesai',
    };
    return classes[status] || 'status-belum';
};


const PublicView: React.FC<{ onLoginRequest: () => void }> = ({ onLoginRequest }) => {
    const [items, setItems] = useState<ProductionItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [updatedItemIds, setUpdatedItemIds] = useState(new Set<number>());

    const stats = useMemo(() => {
        const todayStr = new Date().toISOString().split('T')[0];
        const todaysItems = items.filter(item => new Date(item.created_at).toISOString().split('T')[0] === todayStr);

        const totalOrdersToday = new Set(todaysItems.map(item => item.no_nota)).size;
        const itemsToProcessToday = todaysItems.filter(item => item.status === 'Proses').length;
        const itemsCompletedToday = todaysItems.filter(item => item.status === 'Selesai').length;

        return {
            totalOrders: totalOrdersToday,
            processing: itemsToProcessToday,
            completed: itemsCompletedToday,
        };
    }, [items]);

    // Explicit type for complex query result to help TypeScript compiler
    type FetchedOrder = {
        no_nota: string;
        created_at: string;
        tanggal: string;
        customers: { name: string } | null;
        order_items: {
            id: number;
            deskripsi_pesanan: string | null;
            qty: number;
            status_produksi: ProductionStatus;
            created_at: string;
            panjang: number | null;
            lebar: number | null;
            bahan: { name: string } | null;
        }[];
    };

    const fetchProductionData = async () => {
        const { data, error } = await supabase
            .from('orders')
            .select(`
                no_nota,
                created_at,
                tanggal,
                customers ( name ),
                order_items ( id, deskripsi_pesanan, qty, status_produksi, created_at, panjang, lebar, bahan ( name ) )
            `)
            .eq('status_pesanan', 'Proses')
            .order('created_at', { ascending: false });

        const ordersData = data as FetchedOrder[] | null;

        if (error) {
            console.error("Error fetching production data:", error);
            if (loading) setLoading(false);
            return;
        }

        if (ordersData) {
            const newItems: ProductionItem[] = (ordersData || [])
                .flatMap(order =>
                    (order.order_items || []).map(item => ({
                        id: item.id,
                        no_nota: order.no_nota,
                        customer_name: (order.customers as { name: string } | null)?.name || 'N/A',
                        deskripsi: item.deskripsi_pesanan || 'Tanpa deskripsi',
                        bahan_name: (item.bahan as { name: string } | null)?.name || 'N/A',
                        panjang: item.panjang,
                        lebar: item.lebar,
                        qty: item.qty,
                        status: item.status_produksi,
                        created_at: item.created_at,
                    }))
                )
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            setItems(currentItems => {
                if (!loading && currentItems.length > 0) {
                    const updatedIds = new Set<number>();
                    newItems.forEach(newItem => {
                        const oldItem = currentItems.find(p => p.id === newItem.id);
                        if (!oldItem || oldItem.status !== newItem.status) {
                            updatedIds.add(newItem.id);
                        }
                    });

                    if (updatedIds.size > 0) {
                        setUpdatedItemIds(updatedIds);
                        setTimeout(() => setUpdatedItemIds(new Set()), 1600); // Animation is 1.5s
                    }
                }
                return newItems;
            });
        }
        
        if (loading) {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProductionData();

        const channel = supabase.channel('public-production-status')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, fetchProductionData)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchProductionData)
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    useEffect(() => {
        const handleFullScreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullScreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullScreenChange);
    }, []);

    const toggleFullScreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                alert(`Gagal mengaktifkan mode layar penuh: ${err.message} (${err.name})`);
            });
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen();
            }
        }
    };

    const latestItems = items.slice(0, 50); // Show more items if screen allows

    return (
        <div className="flight-board h-screen flex flex-col">
            <header className="p-4 sm:p-6 flex justify-between items-center border-b-2 border-amber-500/30 flex-shrink-0">
                <div className="text-left">
                    <h1 className="text-2xl md:text-3xl font-bold text-amber-400 tracking-wider">NALAMEDIA DIGITAL PRINTING</h1>
                    <p className="text-xs text-amber-400/80 -mt-1 tracking-widest">|Jl. Prof. Moh. Yamin,Cerbonan,Karanganyar (Timur Stadion 45)|</p>
                    <p className="text-xs text-amber-400/80 -mt-1 tracking-widest">|---Email : nalamedia.kra@gmail.com | Telp: 0813-9872-7722---|</p>
                </div>
                <div className="text-center">
                     <Clock />
                     <p className="text-xs tracking-widest">{new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <div className="flex items-center gap-4">
                     <button
                        onClick={toggleFullScreen}
                        className="text-amber-400 border-2 border-amber-400 hover:bg-amber-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-amber-500 rounded-md p-2 transition-colors"
                        aria-label="Toggle Fullscreen"
                    >
                        {isFullscreen ? <CompressIcon className="h-5 w-5" /> : <ExpandIcon className="h-5 w-5" />}
                    </button>
                    {!isFullscreen && (
                        <button
                            onClick={onLoginRequest}
                            className="text-sm font-bold text-amber-400 border-2 border-amber-400 hover:bg-amber-400 hover:text-black focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black focus:ring-amber-500 rounded-md px-4 py-2 transition-colors"
                        >
                            LOGIN
                        </button>
                    )}
                </div>
            </header>

            <div className="p-4 text-sm tracking-widest border-b-2 border-amber-500/30 grid grid-cols-3 gap-4 text-center flex-shrink-0">
                <div>PESANAN MASUK: <span className="font-bold">{stats.totalOrders}</span></div>
                <div>PESANAN DI PROSES : <span className="font-bold">{stats.processing}</span></div>
                <div>PESANAN SELESAI : <span className="font-bold">{stats.completed}</span></div>
            </div>

            <main className="p-2 sm:p-4 flex-1 overflow-y-auto">
                {loading ? (
                    <div className="text-center py-20">
                         <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-amber-400 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <p className="mt-4 text-amber-400/80 tracking-widest">LOADING PRODUCTION DATA...</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-base md:text-lg">
                            <thead>
                                <tr className="border-b-2 border-amber-500/30 text-amber-400/80 text-sm">
                                    <th className="p-2 sm:p-3 w-1/12">TIME</th>
                                    <th className="p-2 sm:p-3 w-2/12">NOTA</th>
                                    <th className="p-2 sm:p-3 w-3/12">CUSTOMER</th>
                                    <th className="p-2 sm:p-3 w-4/12">DESCRIPTION</th>
                                    <th className="p-2 sm:p-3 w-2/12 text-center">STATUS</th>
                                </tr>
                            </thead>
                            <tbody>
                                {latestItems.map(item => {
                                    const description = [
                                        item.deskripsi,
                                        item.bahan_name,
                                        (item.panjang || 0) > 0 && (item.lebar || 0) ? `${item.panjang}x${item.lebar}m` : null,
                                        `${item.qty}pcs`
                                    ].filter(Boolean).join(' | ');

                                    return (
                                        <tr key={item.id} className={`border-b border-amber-500/10 ${updatedItemIds.has(item.id) ? 'item-updated' : ''}`}>
                                            <td className="p-2 sm:p-3 font-semibold status-cell text-amber-500">{new Date(item.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</td>
                                            <td className="p-2 sm:p-3 status-cell text-amber-500">{item.no_nota}</td>
                                            <td className="p-2 sm:p-3 status-cell text-amber-500">{item.customer_name}</td>
                                            <td className="p-2 sm:p-3 text-sm status-cell text-amber-500">{description}</td>
                                            <td className={`p-2 sm:p-3 text-center font-bold status-cell ${getStatusClass(item.status)}`}>
                                                {item.status.toUpperCase().replace('_', ' ')}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </main>
        </div>
    );
};

export default PublicView;