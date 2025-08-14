import React, { forwardRef } from 'react';
import { Order, Customer, Bahan } from '../../lib/supabaseClient';

interface TransactionReportProps {
  orders: Order[];
  customers: Customer[];
  bahanList: Bahan[];
  calculateTotal: (order: Order) => number;
  getPriceForCustomer: (bahan: Bahan, level: Customer['level']) => number;
  formatCurrency: (value: number) => string;
}

const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
    });
};

const TransactionReport = forwardRef<HTMLDivElement, TransactionReportProps>(
  ({ orders, customers, calculateTotal, formatCurrency }, ref) => {
    if (!orders || orders.length === 0) {
      return (
        <div ref={ref} className="p-4">
            <h1 className="text-xl font-bold text-center">Laporan Transaksi</h1>
            <p className="text-center mt-4">Tidak ada data untuk dilaporkan berdasarkan filter yang dipilih.</p>
        </div>
      );
    }
    
    const reportDate = new Date().toLocaleDateString('id-ID', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    const totalRevenue = orders.reduce((sum, order) => sum + calculateTotal(order), 0);
    const totalPaid = orders.flatMap(o => o.payments).reduce((sum, p) => sum + p.amount, 0);
    const totalReceivables = Math.max(0, totalRevenue - totalPaid);

    return (
      <div ref={ref} className="bg-white text-black p-4 font-sans text-xs">
        <div className="text-center mb-4">
          <h1 className="text-xl font-bold">Laporan Transaksi</h1>
          <p className="text-sm">Dicetak pada: {reportDate}</p>
        </div>
        
        <table className="w-full text-xs border-collapse border border-black">
          <thead>
            <tr className="border-b border-black bg-gray-200">
              <th className="p-1 text-left border border-black">No Nota</th>
              <th className="p-1 text-left border border-black">Tanggal</th>
              <th className="p-1 text-left border border-black">Pelanggan</th>
              <th className="p-1 text-right border border-black">Total</th>
              <th className="p-1 text-center border border-black">Status Pembayaran</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => {
              const customer = customers.find(c => c.id === order.pelanggan_id);
              const orderTotal = calculateTotal(order);

              return (
                <tr key={order.id} className="border-b border-black">
                  <td className="p-1 border border-black">{order.no_nota}</td>
                  <td className="p-1 border border-black">{formatDate(order.tanggal)}</td>
                  <td className="p-1 border border-black">{customer?.name || 'N/A'}</td>
                  <td className="p-1 text-right border border-black">{formatCurrency(orderTotal)}</td>
                  <td className="p-1 text-center border border-black">{order.status_pembayaran}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        <div className="mt-4 flex justify-end text-xs">
            <div className="w-1/3 min-w-[250px]">
                <h3 className="font-bold text-sm mb-2">Rincian Pembayaran</h3>
                <div className="flex justify-between">
                    <span>Jumlah Nota :</span>
                    <span className="font-bold">{orders.length}</span>
                </div>
                <div className="flex justify-between">
                    <span>Total Tagihan :</span>
                    <span className="font-bold">{formatCurrency(totalRevenue)}</span>
                </div>
                <div className="flex justify-between">
                    <span>DP/Dibayar :</span>
                    <span className="font-bold">{formatCurrency(totalPaid)}</span>
                </div>
                 <div className="flex justify-between">
                    <span><b>Sisa :</b></span>
                    <span className="font-bold">{formatCurrency(totalReceivables)}</span>
                </div>
            </div>
        </div>
      </div>
    );
  }
);

export default TransactionReport;