import React, { useState, useEffect } from 'react';
import { DisplaySettings as DisplaySettingsType, SlideshowImage } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import TrashIcon from '../icons/TrashIcon';
import PlusIcon from '../icons/PlusIcon';

interface DisplaySettingsProps {
    displaySettings: DisplaySettingsType | null;
    updateDisplaySettings: (settings: Partial<Omit<DisplaySettingsType, 'id' | 'created_at'>>) => Promise<void>;
}

const DisplaySettings: React.FC<DisplaySettingsProps> = ({ displaySettings, updateDisplaySettings }) => {
    const [runningText, setRunningText] = useState('');
    const [slides, setSlides] = useState<SlideshowImage[]>([]);
    const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    useEffect(() => {
        if (displaySettings) {
            setRunningText(displaySettings.running_text || '');
            setSlides(displaySettings.slideshow_images || []);
            setYoutubeVideoUrl(displaySettings.youtube_video_url || '');
        }
    }, [displaySettings]);

    const handleSlideChange = (index: number, field: keyof SlideshowImage, value: string) => {
        const newSlides = [...slides];
        newSlides[index] = { ...newSlides[index], [field]: value };
        setSlides(newSlides);
    };

    const addSlide = () => {
        setSlides([...slides, { url: '', caption: '' }]);
    };

    const removeSlide = (index: number) => {
        setSlides(slides.filter((_, i) => i !== index));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const nonEmptySlides = slides.filter(slide => slide.url.trim() !== '' || slide.caption.trim() !== '');
            await updateDisplaySettings({
                running_text: runningText,
                slideshow_images: nonEmptySlides,
                youtube_video_url: youtubeVideoUrl
            });
        } catch (error) {
            // Toast is handled in the update function from useAppData
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">Pengaturan Tampilan Publik</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Kontrol konten yang ditampilkan di layar publik atau display pelanggan.</p>
                <form onSubmit={handleSave} className="space-y-6">
                    <div>
                        <label htmlFor="running_text" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Running Text
                        </label>
                        <textarea
                            id="running_text"
                            rows={3}
                            value={runningText}
                            onChange={(e) => setRunningText(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="Tulis teks berjalan di sini..."
                        />
                    </div>
                    <div>
                        <label htmlFor="youtube_video_url" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                            URL Video YouTube
                        </label>
                        <input
                            type="url"
                            id="youtube_video_url"
                            value={youtubeVideoUrl}
                            onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                            className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                            placeholder="https://www.youtube.com/watch?v=..."
                        />
                        <p className="text-xs text-slate-400 mt-1">Satu URL video YouTube yang akan diputar.</p>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">
                            Gambar Slideshow
                        </label>
                        <div className="space-y-4">
                            {slides.map((slide, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-lg border border-slate-200 dark:border-slate-600">
                                    <span className="font-mono text-slate-500 dark:text-slate-400 pt-2">{index + 1}.</span>
                                    <div className="flex-grow space-y-2">
                                        <input
                                            type="url"
                                            value={slide.url}
                                            onChange={(e) => handleSlideChange(index, 'url', e.target.value)}
                                            className="w-full pl-3 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                            placeholder="URL Gambar (https://...)"
                                        />
                                        <input
                                            type="text"
                                            value={slide.caption}
                                            onChange={(e) => handleSlideChange(index, 'caption', e.target.value)}
                                            className="w-full pl-3 pr-3 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-sm"
                                            placeholder="Keterangan / Caption"
                                        />
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeSlide(index)}
                                        className="p-2 rounded-full text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 mt-1"
                                        title="Hapus slide"
                                    >
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={addSlide}
                                className="w-full text-sm flex justify-center items-center gap-2 px-4 py-2 rounded-lg text-pink-700 dark:text-pink-300 bg-pink-100 dark:bg-pink-900/50 hover:bg-pink-200 dark:hover:bg-pink-900 transition-colors"
                            >
                                <PlusIcon className="w-4 h-4" /> Tambah Gambar
                            </button>
                        </div>
                        <div className="mt-4 p-4 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm text-slate-600 dark:text-slate-400">
                            <h4 className="font-semibold mb-2">Contoh JSON yang disimpan:</h4>
                            <pre className="text-xs font-mono whitespace-pre-wrap break-all">
{`[
  {
    "url": "https://example.com/image1.jpg",
    "caption": "Gambar pemandangan indah"
  },
  {
    "url": "https://example.com/image2.png",
    "caption": "Produk terbaru kami"
  }
]`}
                            </pre>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-700">
                        <button type="submit" disabled={isLoading} className="px-8 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-400">
                            {isLoading ? 'Menyimpan...' : 'Simpan Pengaturan Display'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default DisplaySettings;