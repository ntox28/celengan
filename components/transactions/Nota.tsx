

import React, { forwardRef } from 'react';
import { Customer, Bahan, Order, Employee, CustomerLevel, User as AuthUser, Bank, Finishing } from '../../lib/supabaseClient';

interface NotaProps {
  order: Order;
  customers: Customer[];
  bahanList: Bahan[];
  employees: Employee[];
  loggedInUser: AuthUser;
  calculateTotal: (order: Order) => number;
  banks: Bank[];
  finishings: Finishing[];
}

const formatCurrencyDotMatrix = (value: number) => {
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
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

const Nota = forwardRef<HTMLDivElement, NotaProps>(({
  order, customers, bahanList, employees, loggedInUser, calculateTotal, banks, finishings
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
  const bankAccounts = banks.filter(b => b.category === 'Bank');

  return (
    <div ref={ref} className="nota-dot-matrix bg-white text-black p-4 font-sans text-xs">
      <div className="nota-header text-center">
        <h1 className="company-name text-base font-bold">CELENGAN</h1>
        <div>Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar (Timur Stadion 45)</div>
        <div>Telepon: 0812-3456-7890</div>
      </div>

      <hr className="separator" />

      {/* Informasi Nota */}
      <div className="nota-info">
        <span>No Nota: {order.no_nota}</span>
        <span>Tanggal: {formatDate(order.tanggal)}</span>
      </div>
      <div className="nota-info">
        <span>Pelanggan: {customer?.name || 'N/A'}</span>
        <span>Kasir: {kasirName}</span>
      </div>

      <hr className="separator" />

      {/* Tabel Item Nota */}
      <div className="nota-items">
        <div className="flex font-bold">
          <div className="w-[10%] pr-1">No.</div>
          <div className="w-[35%] pr-1">Deskripsi</div>
          <div className="w-[20%] pr-1">Bahan</div>
          <div className="w-[15%] text-center pr-1">Ukuran</div>
          <div className="w-[20%] text-right">Total Harga</div>
        </div>
        <hr className="my-1 border-dashed border-black" />

        {order.order_items?.map((item, index) => {
          const bahan = bahanList.find(b => b.id === item.bahan_id);
          const finishing = finishings.find(f => f.id === item.finishing_id);
          if (!bahan || !customer) return null;

          const hargaSatuan = getPriceForCustomer(bahan, customer.level);
          const area = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
          const jumlah = hargaSatuan * area * item.qty;

          return (
            <div key={item.id} className="flex items-start py-0.5">
              <div className="w-[10%] pr-1">{index + 1}.</div>
              <div className="w-[35%] pr-1 break-words">
                {item.deskripsi_pesanan || '-'}
                {finishing && <div className="text-[9px] italic">Finishing: {finishing.name}</div>}
              </div>
              <div className="w-[20%] pr-1 break-words">{bahan.name}</div>
              <div className="w-[15%] text-center pr-1">
                {(item.panjang || 0) > 0 ? `${item.panjang}x${item.lebar}m` : '-'}
              </div>
              <div className="w-[20%] text-right">{formatCurrencyDotMatrix(jumlah)}</div>
            </div>
          );
        })}
      </div>

      {/* Riwayat Pembayaran */}
      {order.payments?.length > 0 && (
        <>
          <hr className="separator" />
          <div className="nota-payment-history mt-2">
            <div className="font-bold">Riwayat Pembayaran:</div>
            <div className="flex font-bold text-[9px]">
              <div className="w-[35%]">Tanggal</div>
              <div className="w-[35%]">Kasir</div>
              <div className="w-[30%] text-right">Jumlah</div>
            </div>
            <hr className="my-1 border-dashed border-black" />
            {order.payments.map((payment, index) => (
              <div key={index} className="flex items-start py-0.5 text-[9px]">
                <div className="w-[35%]">{formatDate(payment.payment_date)}</div>
                <div className="w-[35%] capitalize">{getEmployeeNameByUserId(payment.kasir_id)}</div>
                <div className="w-[30%] text-right">{formatCurrencyDotMatrix(payment.amount)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <hr className="separator" />

      <div className="flex justify-between mt-2">
        <div className="w-2/3 pr-4 text-[9px]">
            {bankAccounts.length > 0 && (
                <div>
                    <p className="font-bold">Pembayaran Transfer:</p>
                    {bankAccounts.map(bank => (
                        <p key={bank.id} className="leading-tight">
                            <span className="font-semibold">{bank.name}:</span> {bank.account_number} (a/n {bank.account_holder})
                        </p>
                    ))}
                </div>
            )}
        </div>
        <div className="w-1/3 text-right text-[10px]">
             <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-semibold">{formatCurrencyDotMatrix(totalTagihan)}</span>
            </div>
            <div className="flex justify-between">
                <span>Bayar:</span>
                <span className="font-semibold">{formatCurrencyDotMatrix(totalPaid)}</span>
            </div>
            <hr className="my-1 border-dashed border-t border-black" />
            <div className="flex justify-between font-bold">
                <span>SISA:</span>
                <span>{formatCurrencyDotMatrix(totalTagihan - totalPaid)}</span>
            </div>
        </div>
      </div>

      <div className="text-[9px] mt-2 font-semibold">
        Mohon barang dicek terlebih dahulu. Komplain lebih dari 1 hari tidak kami layani!
      </div>


      {/* Tanda Tangan */}
      <div className="flex justify-end mt-8">
        <div className="text-center">
          <div>Hormat kami,</div>
        </div>
      </div>
    </div>
  );
});

export default Nota;
