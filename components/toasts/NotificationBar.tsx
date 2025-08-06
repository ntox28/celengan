import React, { useEffect, useState } from 'react';
import { useToast } from '../../hooks/useToast';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';
import XCircleIcon from '../icons/XCircleIcon';

const notificationConfig = {
    success: {
        icon: <CheckCircleIcon className="w-5 h-5 text-green-500" />,
        bg: 'bg-green-100 dark:bg-green-900/40 border-green-500/30',
        text: 'text-green-800 dark:text-green-200',
    },
    error: {
        icon: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />,
        bg: 'bg-red-100 dark:bg-red-900/40 border-red-500/30',
        text: 'text-red-800 dark:text-red-200',
    },
    info: {
        icon: <ExclamationCircleIcon className="w-5 h-5 text-cyan-500" />,
        bg: 'bg-cyan-100 dark:bg-cyan-900/40 border-cyan-500/30',
        text: 'text-cyan-800 dark:text-cyan-200',
    },
};

const NotificationBar: React.FC = () => {
    const { toasts, removeToast } = useToast();
    const [visibleToastId, setVisibleToastId] = useState<number | null>(null);
    const [isExiting, setIsExiting] = useState(false);

    const currentToast = toasts.length > 0 ? toasts[0] : null;

    useEffect(() => {
        if (currentToast && !visibleToastId) {
            // New toast arrives, start entry animation
            setIsExiting(false);
            setVisibleToastId(currentToast.id);

            // Set timer to start exit animation
            const exitTimer = setTimeout(() => {
                handleClose(currentToast.id);
            }, 5000); // 5 seconds visible

            return () => clearTimeout(exitTimer);
        }
    }, [toasts, visibleToastId]);


    const handleClose = (id: number) => {
        // Prevent closing if already exiting
        if (isExiting) return;
        
        setIsExiting(true);
        // Wait for exit animation to complete before removing from state
        setTimeout(() => {
            removeToast(id);
            setVisibleToastId(null);
            setIsExiting(false);
        }, 300); // Corresponds to animation duration
    };

    if (!currentToast || !visibleToastId) {
        return null;
    }
    
    // Ensure we are rendering the toast that is meant to be visible
    if(currentToast.id !== visibleToastId) return null;

    const config = notificationConfig[currentToast.type];
    const animationClass = isExiting ? 'slide-up' : 'slide-down';

    return (
        <div
            className={`notification-bar ${animationClass} relative -mx-4 sm:-mx-6 lg:-mx-8 z-10`}
            role="alert"
        >
            <div className={`flex items-center p-4 border-y border-slate-200 dark:border-slate-700/50 ${config.bg}`}>
                <span className="flex-shrink-0">{config.icon}</span>
                <p className={`flex-1 mx-3 text-sm font-medium ${config.text}`}>
                    {currentToast.message}
                </p>
                <button
                    onClick={() => handleClose(currentToast.id)}
                    className={`p-1.5 rounded-md -mr-1 -my-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2 ${config.bg} ${config.text} hover:opacity-80 transition-opacity`}
                    aria-label="Dismiss"
                >
                    <XCircleIcon className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default NotificationBar;
