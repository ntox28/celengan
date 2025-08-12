
import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../../hooks/useToast';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';
import XCircleIcon from '../icons/XCircleIcon';
import { useNotificationSettings } from '../../hooks/useNotificationSettings';

interface ToastProps {
    toast: ToastMessage;
    onRemove: (id: number) => void;
}

const toastConfig = {
    success: {
        icon: <CheckCircleIcon className="h-6 w-6 text-green-400" />,
    },
    error: {
        icon: <ExclamationCircleIcon className="h-6 w-6 text-red-400" />,
    },
    info: {
        icon: <ExclamationCircleIcon className="h-6 w-6 text-cyan-400" />,
    },
};

const Toast: React.FC<ToastProps> = ({ toast, onRemove }) => {
    const [isExiting, setIsExiting] = useState(false);
    const { settings } = useNotificationSettings();

    useEffect(() => {
        const timer = setTimeout(() => {
            handleRemove();
        }, settings.duration * 1000); // Auto-dismiss after configured duration

        return () => clearTimeout(timer);
    }, [settings.duration]);

    const handleRemove = () => {
        setIsExiting(true);
        setTimeout(() => onRemove(toast.id), 400); // Wait for fade-out animation
    };

    const config = toastConfig[toast.type];
    const animationClass = isExiting ? 'animate-toast-leave' : 'animate-toast-enter';

    return (
         <div
            className={`max-w-sm w-full bg-white dark:bg-slate-800 shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden ${animationClass}`}
            role="alert"
        >
            <div className="p-4">
                <div className="flex items-start">
                    <div className="flex-shrink-0">
                        {config.icon}
                    </div>
                    <div className="ml-3 w-0 flex-1 pt-0.5">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                            {toast.message}
                        </p>
                    </div>
                    <div className="ml-4 flex-shrink-0 flex">
                        <button
                            onClick={handleRemove}
                            className="bg-white dark:bg-slate-800 rounded-md inline-flex text-slate-400 dark:text-slate-500 hover:text-slate-500 dark:hover:text-slate-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500"
                        >
                            <span className="sr-only">Close</span>
                            <XCircleIcon className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Toast;