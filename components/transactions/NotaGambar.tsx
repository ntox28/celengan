import React, { forwardRef } from 'react';
import { Customer, Bahan, Order, Employee, CustomerLevel, User as AuthUser, Bank, Finishing } from '../../lib/supabaseClient';

interface NotaGambarProps {
  order: Order;
  customers: Customer[];
  bahanList: Bahan[];
  employees: Employee[];
  loggedInUser: AuthUser;
  calculateTotal: (order: Order) => number;
  banks: Bank[];
  finishings: Finishing[];
}

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatDate = (isoDate: string) => {
  return new Date(isoDate).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

const getPriceForCustomer = (bahan: Bahan, level: CustomerLevel): number => {
  switch (level) {
    case 'End Customer': return bahan.harga_end_customer;
    case 'Retail': return bahan.harga_retail;
    case 'Grosir': return bahan.harga_grosir;
    case 'Reseller': return bahan.harga_reseller;
    case 'Corporate': return bahan.harga_corporate;
    default: return 0;
  }
};

const NotaGambar = forwardRef<HTMLDivElement, NotaGambarProps>(({
  order, customers, bahanList, employees, loggedInUser, calculateTotal, banks
}, ref) => {
  const customer = customers.find(c => c.id === order.pelanggan_id);
  const totalTagihan = calculateTotal(order);
  const totalPaid = order.payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  const getEmployeeNameByUserId = (userId: string | null | undefined): string => {
    if (!userId) return 'N/A';
    const employee = employees.find(e => e.user_id === userId);
    return employee ? employee.name : 'Akun Tidak Dikenal';
  };

  const lastPayment = order.payments?.length > 0 ? order.payments[order.payments.length - 1] : null;
  const kasirName = lastPayment ? getEmployeeNameByUserId(lastPayment.kasir_id) : getEmployeeNameByUserId(loggedInUser.id);
  
  return (
    <div ref={ref} className="bg-white text-gray-800 p-8 font-sans" style={{ width: '800px' }}>
      <header className="flex justify-between items-start pb-4 border-b-2 border-gray-200">
        <div className="w-1/2">
          <h1 className="text-3xl font-bold">
  <span className="text-orange-500">NALA</span>{' '}
  <span className="text-black">MEDIA</span>{' '}
  <span className="text-black text-sm font-normal">Digital Printing</span>
</h1>

          <p className="text-xs mt-2 text-gray-500">
            Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar<br/>
            Email: nalamedia.kra@gmail.com | Telp/WA: 0813-9872-7722
          </p>
        </div>
        <div className="w-1/2 text-right">
          <h2 className="text-3xl font-bold text-gray-800 uppercase">INVOICE</h2>
          <p className="text-sm text-gray-500 mt-1">{order.no_nota}</p>
        </div>
      </header>
      
      <section className="flex justify-between mt-2 text-sm">
        <div>
          <p className="font-bold text-gray-600">Ditagihkan kepada:</p>
          <p className="font-semibold text-gray-800">{customer?.name || 'N/A'}</p>
          <p className="text-gray-600">{customer?.address || ''}</p>
          <p className="text-gray-600">{customer?.phone || ''}</p>
        </div>
        <div className="text-right">
          <p><span className="font-bold text-gray-600">Tanggal,</span> {formatDate(order.tanggal)}</p>
          <p><span className="font-bold text-gray-600">Admin:</span> {kasirName}</p>
        </div>
      </section>

      <section className="mt-2">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-3 font-semibold text-gray-600 w-1/12 text-center">No.</th>
              <th className="p-3 font-semibold text-gray-600 w-4/12">Deskripsi</th>
              <th className="p-3 font-semibold text-gray-600 w-2/12 text-center">Ukuran</th>
              <th className="p-3 font-semibold text-gray-600 w-1/12 text-center">Qty</th>
              <th className="p-3 font-semibold text-gray-600 w-2/12 text-right">Harga Satuan</th>
              <th className="p-3 font-semibold text-gray-600 w-2/12 text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {order.order_items.map((item, index) => {
              const bahan = bahanList.find(b => b.id === item.bahan_id);
              if (!bahan || !customer) return null;
              
              const hargaSatuan = getPriceForCustomer(bahan, customer.level);
              const area = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
              const hargaItem = hargaSatuan * area;
              const jumlah = hargaItem * item.qty;

              return (
                <tr key={item.id}>
                  <td className="p-3 text-center text-gray-600">{index + 1}</td>
                  <td className="p-3">
                    <p className="font-medium text-gray-800">{item.deskripsi_pesanan || bahan.name}</p>
                    <p className="text-xs text-gray-500">{bahan.name}</p>
                  </td>
                  <td className="p-3 text-center text-gray-600">{(item.panjang || 0) > 0 ? `${item.panjang}x${item.lebar} m` : '-'}</td>
                  <td className="p-3 text-center text-gray-600">{item.qty}</td>
                  <td className="p-3 text-right text-gray-600">{formatCurrency(hargaItem)}</td>
                  <td className="p-3 text-right font-medium text-gray-800">{formatCurrency(jumlah)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="flex justify-end mt-2">
        <div className="w-full max-w-sm text-sm">
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Subtotal</span>
            <span className="font-medium text-gray-800">{formatCurrency(totalTagihan)}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-200">
            <span className="text-gray-600">Sudah Dibayar</span>
            <span className="font-medium text-gray-800">{formatCurrency(totalPaid)}</span>
          </div>
          <div className="flex justify-between py-3 bg-gray-50 px-3 rounded-md mt-2">
            <span className="font-bold text-lg text-gray-800">Sisa Tagihan</span>
            <span className="font-bold text-lg text-orange-500">{formatCurrency(totalTagihan - totalPaid)}</span>
          </div>
        </div>
      </section>

      <footer className="mt-4 pt-2 border-t border-gray-200 text-xs text-gray-500">
        <p className="font-bold">Informasi Pembayaran:</p>
        <p>Pembayaran resmi hanya melalui rekening a/n <span className="font-semibold">Ariska Prima Diastari</span>.</p>
        <div className="flex gap-4 mt-1">
          {banks.filter(b=>b.category === 'Bank').map(b => (
             <p key={b.id}><span className="font-semibold">{b.name}:</span> {b.account_number}</p>
          ))}
        </div>
        <p className="text-center mt-2">Terima kasih atas kepercayaan Anda!</p>
      </footer>
    </div>
  );
});

export default NotaGambar;
