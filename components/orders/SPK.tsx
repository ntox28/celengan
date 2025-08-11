import React, { forwardRef } from 'react';
import { Order, Customer, Bahan, Finishing } from '../../lib/supabaseClient';


interface SPKProps {
    order: Order;
    customer: Customer | undefined;
    bahanList: Bahan[];
    finishings: Finishing[];
}

const formatDateForSPK = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

const SPK = forwardRef<HTMLDivElement, SPKProps>(({ order, customer, bahanList, finishings }, ref) => {
    return (
        <div ref={ref} className="bg-white text-black font-sans text-[10px] leading-tight uppercase">
            <div className="text-center">
                <h1 className="font-bold text-sm">NALAMEDIA</h1>
            </div>
            <hr className="border-dashed border-t border-black my-1" />
            <div className="text-center">
                <p className="font-bold text-sm">{customer?.name || 'N/A'}</p>
                <p className="font-bold">Nota: {order.no_nota}</p>
                <p>{formatDateForSPK(order.tanggal)}</p>
            </div>
            <hr className="border-dashed border-t border-black my-1" />
            
            <div className="flex font-bold">
                <div className="w-[10%]">No.</div>
                <div className="w-[90%]">Detail Pesanan</div>
            </div>
            <hr className="border-dashed border-t border-black my-1" />

            <div className="mt-1">
                {order.order_items.map((item, index) => {
                    const bahan = bahanList.find(b => b.id === item.bahan_id);
                    const ukuran = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? `${item.panjang}x${item.lebar}` : '-';
                    const deskripsi = item.deskripsi_pesanan || '-';
                    const qty = `${item.qty}Pcs`;
                    const finishingName = finishings.find(f => f.id === item.finishing_id)?.name || 'Tanpa Finishing';

                    return (
                        <div key={item.id} className="flex mb-1.5">
                            <div className="w-[10%] align-top">{index + 1}.</div>
                            <div className="w-[90%]">
                                <p className="font-bold break-words">{deskripsi}</p>
                                <p className="break-words">{bahan?.name || 'Bahan Tidak Ditemukan'}</p>
                                <p className="break-words">{ukuran} // {qty}</p>
                                <p className="break-words">{finishingName}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <hr className="border-dashed border-t border-black my-1" />
            <div className="text-center text-[9px] space-y-0.5 pt-1">
                <p>--PERHATIAN--</p>
                <p>Cek data pekerjaan sebelum cetak.</p>
                <p>Pastikan semua data benar.</p>
                <p>Tanyakan ke Office jika ada data</p>
                <p>yang salah atau kurang!!!</p>
                <p>tempel struk ini ke barang</p>
                <p>jika sudah selesai semua</p>
            </div>
        </div>
    );
});

export default SPK;