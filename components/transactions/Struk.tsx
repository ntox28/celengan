import React, { forwardRef } from 'react';
import { Customer, Bahan, Order, Employee, User as AuthUser, Finishing } from '../../lib/supabaseClient';

interface StrukProps {
  order: Order;
  customers: Customer[];
  bahanList: Bahan[];
  employees: Employee[];
  loggedInUser: AuthUser;
  calculateTotal: (order: Order) => number;
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

const getPriceForCustomer = (bahan: Bahan, level: Customer['level']): number => {
  switch (level) {
    case 'End Customer': return bahan.harga_end_customer;
    case 'Retail': return bahan.harga_retail;
    case 'Grosir': return bahan.harga_grosir;
    case 'Reseller': return bahan.harga_reseller;
    case 'Corporate': return bahan.harga_corporate;
    default: return 0;
  }
};

const Struk = forwardRef<HTMLDivElement, StrukProps>(
({ order, customers, bahanList, employees, loggedInUser, calculateTotal, finishings }, ref) => {
  const customer = customers.find(c => c.id === order.pelanggan_id);
  const totalTagihan = calculateTotal(order);
  const totalPaid = order.payments.reduce((sum, p) => sum + p.amount, 0);

  const getEmployeeNameByUserId = (userId: string | null | undefined): string => {
    if (!userId) return 'N/A';
    const employee = employees.find(e => e.user_id === userId);
    return employee ? employee.name : 'Akun Tidak Dikenal';
  };

  const lastPayment = order.payments.length > 0 ? order.payments[order.payments.length - 1] : null;
  const kasirName = lastPayment ? getEmployeeNameByUserId(lastPayment.kasir_id) : getEmployeeNameByUserId(loggedInUser.id);

  return (
    <div ref={ref} className="bg-white text-black font-sans text-[10px] leading-tight uppercase">
      {/* Header */}
      <div className="text-left">
        <h1 className="font-bold text-lg leading-tight">NALAMEDIA</h1>
      </div>
      <hr className="border-dashed border-t border-black my-1" />
      <div className="text-left text-[9px] leading-tight mt-2">
        <div>Jl. Prof. Moh. Yamin</div>
        <div>Cerbonan, Karanganyar</div>
        <div>(Timur Stadion 45)</div>
        <div>Telp: 0813-9872-7722</div>
      </div>
      <hr className="border-dashed border-black my-0.5" />

      {/* Info */}
      <div className="leading-tight space-y-0.5">
        <div>No Nota   : {order.no_nota}</div>
        <div>Tanggal   : {new Date(order.tanggal).toLocaleDateString('id-ID')}</div>
        <div>Kasir     : {kasirName}</div>
        <div>Pelanggan : {customer?.name || 'N/A'}</div>
      </div>

      <hr className="border-dashed border-black my-0.5" />
      <div className="font-bold">Detail Pesanan</div>
      <hr className="border-dashed border-black my-1" />

      {/* Items */}
      {order.order_items.map((item, index) => {
        const bahan = bahanList.find(b => b.id === item.bahan_id);
        if (!bahan || !customer) return null;

        const hargaSatuan = getPriceForCustomer(bahan, customer.level);
        const area = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 
          ? (item.panjang || 1) * (item.lebar || 1) 
          : 1;
        const jumlah = hargaSatuan * area * item.qty;

        return (
          <div key={item.id} className="flex mb-1">
            {/* Kolom Nomor */}
            <div className="w-[10%]">{index + 1}.</div>

            {/* Kolom Detail */}
            <div className="w-[90%]">
              <div>{item.deskripsi_pesanan || bahan.name}</div>
              {(item.panjang || 0) > 0 && (item.lebar || 0) > 0 && (
                <div className="text-[9px]">Ukuran: {item.panjang} x {item.lebar} m</div>
              )}
              <div className="text-[9px]">{item.qty} x {formatCurrency(hargaSatuan * area)}</div>
              <div className="font-bold">{formatCurrency(jumlah)}</div>
            </div>
          </div>
        );
      })}

      <hr className="border-dashed border-black my-0.5" />
      {/* Total Section */}
      <div>Subtotal: {formatCurrency(totalTagihan)}</div>
      <div>Bayar: {formatCurrency(totalPaid)}</div>
      <div className="font-bold text-sm">Sisa: {formatCurrency(totalTagihan - totalPaid)}</div>

      <hr className="border-dashed border-black my-2" />
      <div className="text-left text-[9px] mt-1 space-y-1">
        <p>Mohon barang dicek kembali.</p>
        <p>Komplain 1x24 Jam.</p>
        <p className="font-bold">Terima Kasih!</p>
      </div>
    </div>
  );
});

export default Struk;
