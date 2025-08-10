import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { DisplaySettings } from '../../lib/supabaseClient';

interface YouTubePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: DisplaySettings | null;
    onSave: (urls: string[]) => Promise<void>;
}

const YouTubePlaylistModal: React.FC<YouTubePlaylistModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [urlsText, setUrlsText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen && settings) {
            setUrlsText(settings.youtube_url?.join('\n') || '');
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;

    const handleSave = async () => {
        setIsLoading(true);
        const urls = urlsText.split('\n').map(url => url.trim()).filter(url => url);
        try {
            await onSave(urls);
            onClose();
        } catch (error) {
            // Toast is handled in onSave
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-2xl p-6 sm:p-8 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex-shrink-0">Atur Playlist YouTube</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-shrink-0">Masukkan satu link video YouTube per baris. Link ini akan diputar di tampilan publik.</p>

                <div className="flex-1 overflow-y-auto -mr-4 pr-4">
                    <textarea
                        value={urlsText}
                        onChange={(e) => setUrlsText(e.target.value)}
                        placeholder="Contoh:&#10;https://www.youtube.com/watch?v=...&#10;https://www.youtube.com/watch?v=..."
                        rows={10}
                        className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 font-mono text-sm"
                    />
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300"
                    >
                        {isLoading ? 'Menyimpan...' : 'Simpan Playlist'}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                    >
                        Batal
                    </button>
                </div>
            </div>
        </div>
    );
};

export default YouTubePlaylistModal;
