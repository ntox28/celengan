import React, { useState, useEffect } from 'react';
import { useToast } from '../../hooks/useToast';
import { DisplaySettings, YouTubePlaylistItem } from '../../lib/supabaseClient';
import TrashIcon from '../icons/TrashIcon';
import ArrowUpIcon from '../icons/ArrowUpIcon';
import ArrowDownIcon from '../icons/ArrowDownIcon';
import ArrowUpToLineIcon from '../icons/ArrowUpToLineIcon';

interface YouTubePlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    settings: DisplaySettings | null;
    onSave: (playlist: YouTubePlaylistItem[]) => Promise<void>;
}

const YouTubePlaylistModal: React.FC<YouTubePlaylistModalProps> = ({ isOpen, onClose, settings, onSave }) => {
    const [playlist, setPlaylist] = useState<YouTubePlaylistItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (isOpen && settings) {
            setPlaylist(settings.youtube_url || []);
        }
    }, [isOpen, settings]);

    if (!isOpen) return null;
    
    const handleMove = (index: number, direction: 'up' | 'down' | 'top') => {
        if ((direction === 'up' || direction === 'top') && index === 0) return;
        if (direction === 'down' && index === playlist.length - 1) return;
        
        const newPlaylist = [...playlist];
        const item = newPlaylist.splice(index, 1)[0];

        if (direction === 'up') {
            newPlaylist.splice(index - 1, 0, item);
        } else if (direction === 'down') {
            newPlaylist.splice(index + 1, 0, item);
        } else if (direction === 'top') {
            newPlaylist.unshift(item);
        }
        
        setPlaylist(newPlaylist);
    };

    const handleDelete = (index: number) => {
        const newPlaylist = [...playlist];
        newPlaylist.splice(index, 1);
        setPlaylist(newPlaylist);
        addToast('URL dihapus dari daftar.', 'info');
    };

    const handleSave = async () => {
        setIsLoading(true);
        try {
            await onSave(playlist);
            onClose();
        } catch (error) {
            // Toast is handled in onSave
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={onClose}>
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-3xl p-6 sm:p-8 m-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-2 flex-shrink-0">Atur Playlist YouTube</h3>
                <p className="text-slate-500 dark:text-slate-400 mb-6 flex-shrink-0">Ubah urutan atau hapus video dari playlist publik.</p>

                <div className="flex-1 overflow-y-auto -mr-4 pr-4 space-y-3">
                    {playlist.length > 0 ? (
                        playlist.map((item, index) => (
                            <div key={index} className="flex items-start gap-3 bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200 dark:border-slate-600">
                                <span className="font-mono text-sm text-slate-500 dark:text-slate-400 pt-1">{index + 1}.</span>
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-slate-800 dark:text-slate-200 truncate" title={item.title}>{item.title}</p>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate" title={item.url}>{item.url}</p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => handleMove(index, 'top')} disabled={index === 0} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors" title="Pindah ke Atas">
                                        <ArrowUpToLineIcon className="w-5 h-5" />
                                    </button>
                                     <button onClick={() => handleMove(index, 'up')} disabled={index === 0} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors" title="Naik">
                                        <ArrowUpIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleMove(index, 'down')} disabled={index === playlist.length - 1} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 transition-colors" title="Turun">
                                        <ArrowDownIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(index)} className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Hapus">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-10 text-slate-500 dark:text-slate-400">
                            Playlist kosong. Tambahkan link YouTube dari header.
                        </div>
                    )}
                </div>

                <div className="pt-6 border-t border-slate-200 dark:border-slate-700 flex-shrink-0 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="w-full sm:w-auto flex-1 px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300"
                    >
                        {isLoading ? 'Menyimpan...' : 'Simpan Urutan Playlist'}
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