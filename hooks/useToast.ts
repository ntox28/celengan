import React, { createContext, useState, useContext, ReactNode } from 'react';
import { useNotificationSettings } from './useNotificationSettings';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    toasts: ToastMessage[];
    addToast: (message: string, type: ToastType) => void;
    removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    const { settings } = useNotificationSettings();

    const addToast = (message: string, type: ToastType) => {
        if (!settings.enabledTypes.includes(type)) {
            return;
        }
        const id = Date.now() + Math.random();
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: number) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    return React.createElement(
        ToastContext.Provider,
        { value: { toasts, addToast, removeToast } },
        children
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (context === undefined) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};