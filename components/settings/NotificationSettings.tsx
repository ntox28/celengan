import React, { useState, useEffect } from 'react';
import { useNotificationSettings, NotificationSettings as SettingsType } from '../../hooks/useNotificationSettings';
import { useToast } from '../../hooks/useToast';

interface ToggleSwitchProps {
    id: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: string;
    description: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ id, checked, onChange, label, description }) => (
    <div className="flex items-center justify-between">
        <span className="flex-grow flex flex-col">
            <label htmlFor={id} className="text-sm font-medium text-slate-900 dark:text-slate-100 cursor-pointer">
                {label}
            </label>
            <span id={`${id}-description`} className="text-xs text-slate-500 dark:text-slate-400">
                {description}
            </span>
        </span>
        <button
            type="button"
            className={`${
                checked ? 'bg-pink-600' : 'bg-slate-200 dark:bg-slate-600'
            } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-slate-800`}
            role="switch"
            aria-checked={checked}
            aria-labelledby={id}
            aria-describedby={`${id}-description`}
            onClick={() => onChange({ target: { checked: !checked } } as any)}
        >
            <span
                aria-hidden="true"
                className={`${
                    checked ? 'translate-x-5' : 'translate-x-0'
                } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
            />
        </button>
        <input
            type="checkbox"
            id={id}
            name={id}
            checked={checked}
            onChange={onChange}
            className="sr-only"
        />
    </div>
);


const NotificationSettings: React.FC = () => {
    const { settings, setSettings } = useNotificationSettings();
    const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleToggleChange = (category: 'order' | 'chat', key: 'enabled' | 'sound', checked: boolean) => {
        setLocalSettings(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [key]: checked
            }
        }));
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setSettings(localSettings);
        setTimeout(() => {
            setIsLoading(false);
            addToast('Pengaturan notifikasi berhasil disimpan.', 'success');
        }, 300);
    };

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Pengaturan Notifikasi & Pesan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Atur bagaimana Anda menerima pemberitahuan untuk aktivitas penting.</p>
                <form onSubmit={handleSubmit} className="space-y-8">
                    
                    {/* Order Notifications */}
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Notifikasi Pesanan</h3>
                        <div className="space-y-4">
                            <ToggleSwitch
                                id="order-enabled"
                                label="Aktifkan Notifikasi Pesanan"
                                description="Tampilkan tanda titik merah pada ikon lonceng saat ada pesanan baru."
                                checked={localSettings.order.enabled}
                                onChange={(e) => handleToggleChange('order', 'enabled', e.target.checked)}
                            />
                             <ToggleSwitch
                                id="order-sound"
                                label="Suara Notifikasi Pesanan"
                                description="Mainkan suara saat ada pesanan baru masuk."
                                checked={localSettings.order.sound}
                                onChange={(e) => handleToggleChange('order', 'sound', e.target.checked)}
                            />
                        </div>
                    </div>
                    
                     {/* Chat Notifications */}
                    <div>
                        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-4 border-b border-slate-200 dark:border-slate-700 pb-2">Pesan Tim</h3>
                        <div className="space-y-4">
                             <ToggleSwitch
                                id="chat-enabled"
                                label="Aktifkan Notifikasi Pesan Tim"
                                description="Tampilkan jumlah pesan belum dibaca pada ikon chat."
                                checked={localSettings.chat.enabled}
                                onChange={(e) => handleToggleChange('chat', 'enabled', e.target.checked)}
                            />
                             <ToggleSwitch
                                id="chat-sound"
                                label="Suara Notifikasi Pesan Tim"
                                description="Mainkan suara saat ada pesan baru dari anggota tim lain."
                                checked={localSettings.chat.sound}
                                onChange={(e) => handleToggleChange('chat', 'sound', e.target.checked)}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="submit" disabled={isLoading} className="px-8 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-400">
                            {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default NotificationSettings;
