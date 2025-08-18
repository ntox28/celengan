import React, { createContext, useContext, ReactNode } from 'react';
import useLocalStorage from './useLocalStorage';

export interface NotificationSettings {
    order: {
        enabled: boolean;
        sound: boolean;
    };
    chat: {
        enabled: boolean;
        sound: boolean;
    };
}

interface NotificationSettingsContextType {
    settings: NotificationSettings;
    setSettings: React.Dispatch<React.SetStateAction<NotificationSettings>>;
}

const defaultSettings: NotificationSettings = {
    order: {
        enabled: true,
        sound: false,
    },
    chat: {
        enabled: true,
        sound: true,
    },
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
