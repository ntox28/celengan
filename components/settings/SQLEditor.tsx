import React from 'react';
import { useToast } from '../../hooks/useToast';
import ExclamationCircleIcon from '../icons/ExclamationCircleIcon';

const recommendedIndexes = [
    {
        table: 'orders',
        column: 'pelanggan_id',
        reason: 'Mempercepat filter order berdasarkan pelanggan.',
        sql: 'CREATE INDEX idx_orders_pelanggan_id ON orders (pelanggan_id);'
    },
    {
        table: 'orders',
        column: 'tanggal',
        reason: 'Mempercepat filter order berdasarkan rentang tanggal.',
        sql: 'CREATE INDEX idx_orders_tanggal ON orders (tanggal);'
    },
    {
        table: 'orders',
        column: 'status_pesanan',
        reason: 'Mempercepat pencarian order berdasarkan status (misal: "Proses", "Ready").',
        sql: 'CREATE INDEX idx_orders_status_pesanan ON orders (status_pesanan);'
    },
    {
        table: 'order_items',
        column: 'order_id',
        reason: 'Penting untuk mengambil semua item milik sebuah order dengan cepat.',
        sql: 'CREATE INDEX idx_order_items_order_id ON order_items (order_id);'
    },
    {
        table: 'payments',
        column: 'order_id',
        reason: 'Penting untuk mengambil riwayat pembayaran sebuah order dengan cepat.',
        sql: 'CREATE INDEX idx_payments_order_id ON payments (order_id);'
    },
    {
        table: 'expenses',
        column: 'tanggal',
        reason: 'Mempercepat filter pengeluaran berdasarkan rentang tanggal.',
        sql: 'CREATE INDEX idx_expenses_tanggal ON expenses (tanggal);'
    }
];

const CopyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.03 1.125 0 1.131.094 1.976 1.057 1.976 2.192V7.5M8.25 7.5h7.5M8.25 7.5h-1.5a1.5 1.5 0 0 0-1.5 1.5v11.25c0 .828.672 1.5 1.5 1.5h9.75a1.5 1.5 0 0 0 1.5-1.5V9a1.5 1.5 0 0 0-1.5-1.5h-1.5" />
  </svg>
);


const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
    <pre className="bg-slate-100 dark:bg-slate-900 rounded-lg p-4 text-sm font-mono text-slate-800 dark:text-slate-200 overflow-x-auto">
        <code>{code.trim()}</code>
    </pre>
);


const SQLEditor: React.FC = () => {
    const { addToast } = useToast();

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            addToast('SQL disalin ke clipboard!', 'success');
        }, (err) => {
            addToast('Gagal menyalin SQL.', 'error');
            console.error('Could not copy text: ', err);
        });
    };

    return (
        <div className="space-y-8 h-full overflow-y-auto -mr-3 pr-3">
             <div className="bg-yellow-50 dark:bg-yellow-900/40 border-l-4 border-yellow-500 text-yellow-800 dark:text-yellow-200 p-4" role="alert">
                <div className="flex">
                    <div className="py-1"><ExclamationCircleIcon className="w-6 h-6 text-yellow-500 mr-4"/></div>
                    <div>
                        <p className="font-bold">PERHATIAN PENTING</p>
                        <p className="text-sm">Halaman ini BUKAN editor SQL. Anda tidak bisa menjalankan query di sini. Halaman ini adalah panduan untuk membantu Anda mengoptimalkan database. Salin perintah SQL yang disediakan dan jalankan di <strong className="uppercase">SQL Editor</strong> pada dashboard Supabase Anda.</p>
                    </div>
                </div>
            </div>

            {/* Indexing Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Tahap 1: Indexing (Pengindeksan)</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Indeks membuat pencarian data di database Anda super cepat, seperti daftar isi pada buku. Tambahkan indeks pada kolom yang sering Anda gunakan untuk filter atau pencarian.</p>

                <div className="space-y-4">
                    {recommendedIndexes.map((index, i) => (
                        <div key={i} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-100">{index.table} <span className="text-slate-500 dark:text-slate-400">({index.column})</span></h4>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{index.reason}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mt-3 bg-slate-100 dark:bg-slate-900 rounded-md p-2">
                                <code className="flex-1 font-mono text-xs text-pink-600 dark:text-pink-400 overflow-x-auto no-scrollbar">{index.sql}</code>
                                <button onClick={() => copyToClipboard(index.sql)} className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex-shrink-0" title="Salin SQL">
                                    <CopyIcon className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Query Efficiency Section */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Tahap 2: Query yang Efisien</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Jangan minta semua data sekaligus. Minta hanya data yang Anda butuhkan, dan biarkan database yang bekerja keras, bukan browser pengguna.</p>
                
                <div className="space-y-6">
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">1. Pilih Hanya Kolom yang Diperlukan</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Mengambil semua kolom (`*`) membuang-buang sumber daya jika Anda hanya butuh beberapa saja.</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">❌ Buruk</p>
                                <CodeBlock code={`supabase.from('orders').select('*')`} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">✅ Baik</p>
                                <CodeBlock code={`supabase.from('orders').select('id, no_nota, tanggal, status_pesanan')`} />
                            </div>
                        </div>
                    </div>
                    <div>
                        <h4 className="font-semibold text-slate-800 dark:text-slate-100 mb-2">2. Gunakan Filter di Sisi Database</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Jangan ambil 10.000 data hanya untuk menampilkannya 10. Gunakan filter Supabase seperti `.eq()`, `.gte()`, `.lt()` untuk memfilter data di server.</p>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2">❌ Buruk (Filtering di Frontend)</p>
                                <CodeBlock code={`const { data } = await supabase.from('orders').select('*');
const lunasOrders = data.filter(o => o.status_pembayaran === 'Lunas');`} />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2">✅ Baik (Filtering di Backend)</p>
                                <CodeBlock code={`const { data } = await supabase.from('orders').select('*').eq('status_pembayaran', 'Lunas');`} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SQLEditor;
