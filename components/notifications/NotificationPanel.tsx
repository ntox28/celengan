
import React, { useRef, useEffect } from 'react';
import OrderIcon from '../icons/OrderIcon';
import XCircleIcon from '../icons/XCircleIcon';
import ClockIcon from '../icons/ClockIcon';
import ProductionIcon from '../icons/ProductionIcon';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import DeliveredIcon from '../icons/DeliveredIcon';


// A simple time ago function
const timeAgo = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  
    if (seconds < 60) return `Baru saja`;
    
    const intervals: { [key: string]: number } = {
        tahun: 31536000,
        bulan: 2592000,
        hari: 86400,
        jam: 3600,
        menit: 60,
    };

    for (const key in intervals) {
        const interval = Math.floor(seconds / intervals[key]);
        if (interval >= 1) {
            return `${interval} ${key} yang lalu`;
        }
    }
    return `Baru saja`;
};


interface Notification {
    id: number;
    title: string;
    description: string;
    timestamp: string;
    status: string;
}

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
    notifications: Notification[];
    onNotificationClick: (orderId: number) => void;
    onViewAll: () => void;
}

const NotificationIcon = ({ status }: { status: string }) => {
    switch (status) {
        case 'Delivered': return <DeliveredIcon className="w-5 h-5 text-green-500" />;
        case 'Ready': return <CheckCircleIcon className="w-5 h-5 text-cyan-500" />;
        case 'Proses':
        case 'Waiting': return <ProductionIcon className="w-5 h-5 text-yellow-500" />;
        case 'Pending': return <ClockIcon className="w-5 h-5 text-red-500" />;
        default: return <OrderIcon className="w-5 h-5 text-slate-500 dark:text-slate-400" />;
    }
};

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose, notifications, onNotificationClick, onViewAll }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="w-full max-w-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl z-40 flex flex-col max-h-[calc(100vh-5rem)] animate-toast-enter"
        >
            {/* Header */}
            <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100">Notifikasi</h3>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto no-scrollbar">
                {notifications.length > 0 ? (
                    <ul className="divide-y divide-slate-200 dark:divide-slate-700">
                        {notifications.map(notif => (
                            <li key={notif.id}>
                                <button 
                                    onClick={() => onNotificationClick(notif.id)}
                                    className="w-full text-left p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={`mt-1 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-700`}>
                                            <NotificationIcon status={notif.status} />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold text-sm text-slate-800 dark:text-slate-200">{notif.title}</p>
                                            <p className="text-sm text-slate-600 dark:text-slate-400">{notif.description}</p>
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{timeAgo(notif.timestamp)}</p>
                                        </div>
                                    </div>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-center p-10">
                        <p className="text-slate-500 dark:text-slate-400">Tidak ada notifikasi baru.</p>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 text-center">
                 <button 
                    onClick={onViewAll}
                    className="text-sm font-semibold text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300"
                 >
                    Lihat Semua Order
                </button>
            </div>
        </div>
    );
};

export default NotificationPanel;