
import React, { forwardRef } from 'react';
import { Customer, Bahan, Order, Employee, CustomerLevel, User as AuthUser, Finishing } from '../../lib/supabaseClient';

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

const Struk = forwardRef<HTMLDivElement, StrukProps>(({ order, customers, bahanList, employees, loggedInUser, calculateTotal, finishings }, ref) => {
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
    <div ref={ref} className="bg-white text-black font-sans text-xs w-[300px] p-1">
      <div className="text-center">
          <h1 className="font-bold text-lg leading-tight">CELENGAN</h1>
      </div>
      <hr className="border-dashed border-black my-0.5" />
      <div className="text-center text-[9px] leading-tight mt-2">
        <div className="m-0">Jl. Prof. Moh. Yamin</div>
        <div className="m-0">Cerbonan, Karanganyar</div>
        <div className="m-0">(Timur Stadion 45)</div>
        <div className="m-0">Telp: 0813-9872-7722</div>
      </div>
      <hr className="border-dashed border-black my-0.5"/>
      <div className="leading-tight">
          <div className="flex justify-between">
            <span>No Nota  :</span>
            <span>{order.no_nota}</span>
          </div>
          <div className="flex justify-between">
            <span>Tanggal  :</span>
            <span>{new Date(order.tanggal).toLocaleString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
          </div>
          <div className="flex justify-between">
            <span>Kasir    :</span>
            <span>{kasirName}</span>
          </div>
          <div className="flex justify-between">
            <span>Pelanggan:</span>
            <span>{customer?.name || 'N/A'}</span>
          </div>
      </div>
      <hr className="border-dashed border-black my-0.5"/>
      <div className="flex font-bold">
        <div className="w-[10%] pr-1">No.</div>
        <div className="w-[60%] pr-1">Detail Pesanan</div>
        <div className="w-[30%] text-right">Total</div>
      </div>
      <hr className="border-dashed border-black my-1" />

      {order.order_items.map((item, index) => {
        const bahan = bahanList.find(b => b.id === item.bahan_id);
        const finishing = finishings.find(f => f.id === item.finishing_id);
        if (!bahan || !customer) return null;

        const hargaSatuan = getPriceForCustomer(bahan, customer.level);
        const area = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
        const jumlah = hargaSatuan * area * item.qty;

        return (
          <div key={item.id} className="py-0.5">
              <div className="flex items-start">
                  <div className="w-[10%] pr-1 align-top">{index + 1}.</div>
                  <div className="w-[90%] break-words leading-tight">
                      <p>{item.deskripsi_pesanan || bahan.name}</p>
                      {finishing && <p className="text-[9px]">Finishing: {finishing.name}</p>}
                      <div className="flex justify-between text-[9px]">
                          <span>{item.qty} x {formatCurrency(hargaSatuan * area)}</span>
                          <span className="font-bold">{formatCurrency(jumlah)}</span>
                      </div>
                  </div>
              </div>
          </div>
        );
      })}
      <hr className="border-dashed border-black my-0.5" />
      <div className="space-y-1 mt-1">
        <div className="flex justify-between">
          <span>Subtotal:</span>
          <span className="font-bold">{formatCurrency(totalTagihan)}</span>
        </div>
        <div className="flex justify-between">
          <span>Bayar:</span>
          <span>{formatCurrency(totalPaid)}</span>
        </div>
        <div className="flex justify-between font-bold text-sm">
          <span>SISA:</span>
          <span>{formatCurrency(totalTagihan - totalPaid)}</span>
        </div>
      </div>
      <hr className="border-dashed border-black my-2" />
      <div className="text-center text-[9px] mt-1 space-y-1">
        <p>Mohon barang dicek kembali.</p>
        <p>Komplain 1x24 Jam.</p>
        <p className="font-bold">Terima Kasih!</p>
      </div>
    </div>
  );
});

export default Struk;
