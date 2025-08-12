import React, { useState, useEffect } from 'react';
import { useNotificationSettings, NotificationSettings as SettingsType } from '../../hooks/useNotificationSettings';
import { useToast, ToastType } from '../../hooks/useToast';

const NotificationSettings: React.FC = () => {
    const { settings, setSettings } = useNotificationSettings();
    const [localSettings, setLocalSettings] = useState<SettingsType>(settings);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    const handleTypeChange = (type: ToastType, checked: boolean) => {
        setLocalSettings(prev => {
            const enabledTypes = checked
                ? [...prev.enabledTypes, type]
                : prev.enabledTypes.filter(t => t !== type);
            return { ...prev, enabledTypes };
        });
    };

    const handleDurationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setLocalSettings(prev => ({ ...prev, duration: Number(e.target.value) }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        // The useLocalStorage hook is synchronous for the state update,
        // but the actual localStorage write happens in the background.
        // A short timeout gives a better UX feel of a save operation.
        setSettings(localSettings);
        setTimeout(() => {
            setIsLoading(false);
            addToast('Pengaturan notifikasi berhasil disimpan.', 'success');
        }, 300);
    };

    const toastTypes: { key: ToastType; label: string }[] = [
        { key: 'success', label: 'Sukses' },
        { key: 'error', label: 'Gagal (Error)' },
        { key: 'info', label: 'Info' },
    ];

    return (
        <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Pengaturan Notifikasi</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Atur notifikasi mana yang ingin Anda lihat dan berapa lama notifikasi tersebut tampil.</p>
                <form onSubmit={handleSubmit} className="space-y-8">
                    <div>
                        <label className="block text-base font-medium text-slate-700 dark:text-slate-200 mb-3">Tampilkan Notifikasi</label>
                        <div className="space-y-3">
                            {toastTypes.map(({ key, label }) => (
                                <div key={key} className="flex items-center">
                                    <input
                                        id={`type-${key}`}
                                        name={key}
                                        type="checkbox"
                                        checked={localSettings.enabledTypes.includes(key)}
                                        onChange={(e) => handleTypeChange(key, e.target.checked)}
                                        className="h-4 w-4 rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                    />
                                    <label htmlFor={`type-${key}`} className="ml-3 block text-sm text-slate-600 dark:text-slate-300">
                                        Tampilkan notifikasi <span className="font-semibold">{label}</span>
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="duration" className="block text-base font-medium text-slate-700 dark:text-slate-200 mb-3">
                            Durasi Tampil ({localSettings.duration} detik)
                        </label>
                        <input
                            type="range"
                            id="duration"
                            name="duration"
                            min="2"
                            max="30"
                            value={localSettings.duration}
                            onChange={handleDurationChange}
                            className="w-full h-2 bg-slate-200 dark:bg-slate-600 rounded-lg appearance-none cursor-pointer accent-pink-600"
                        />
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
