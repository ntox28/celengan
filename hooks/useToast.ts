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
    // Toasts are now disabled as per user request to centralize notifications in the bell icon.
    const [toasts, setToasts] = useState<ToastMessage[]>([]);
    
    // The addToast function is now a no-op (does nothing).
    const addToast = (message: string, type: ToastType) => {};

    // The removeToast function is now a no-op.
    const removeToast = (id: number) => {};

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
