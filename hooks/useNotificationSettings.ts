import React, { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from './useLocalStorage';
import { ToastType } from './useToast';

export interface NotificationSettings {
    enabledTypes: ToastType[];
    duration: number; // in seconds
}

interface NotificationSettingsContextType {
    settings: NotificationSettings;
    setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
}

const defaultSettings: NotificationSettings = {
    enabledTypes: ['success', 'error', 'info'],
    duration: 5,
};

const NotificationSettingsContext = createContext<NotificationSettingsContextType | undefined>(undefined);

export const NotificationSettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [settings, setSettings] = useLocalStorage<NotificationSettings>('celengan-app:notification-settings', defaultSettings);

    return React.createElement(
        NotificationSettingsContext.Provider,
        { value: { settings, setSettings } },
        children
    );
};

export const useNotificationSettings = () => {
    const context = useContext(NotificationSettingsContext);
    if (!context) {
        throw new Error('useNotificationSettings must be used within a NotificationSettingsProvider');
    }
    return context;
};
