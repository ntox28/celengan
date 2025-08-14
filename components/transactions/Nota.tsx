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
  const sisaTagihan = Math.max(0, totalTagihan - totalPaid);

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
      
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingBottom: '8px', borderBottom: '1px dashed black' }}>
         <div style={{ width: "60%" }}>
            <h1 style={{ fontSize: "18pt", fontWeight: "bold", margin: 0, padding: 0, lineHeight: 1 }}>
                <span>NALA</span>
                <span>MEDIA</span>
                <span style={{ fontSize: "10pt", fontWeight: "normal"}}> Digital Printing</span>
            </h1>
            <p style={{ fontSize: "8pt", marginTop: "4px", lineHeight: 1.2, margin: 0 }}>
                Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar<br/>
                Email: nalamedia.kra@gmail.com | Telp/WA: 0813-9872-7722
            </p>
        </div>

        <div style={{ width: "40%", textAlign: "right", fontSize: "10pt", lineHeight: 1.4 }}>
            <p style={{ margin: 0 }}>Tanggal: {formatDate(order.tanggal)}</p>
            <p style={{ margin: "4px 0 0 0" }}>Kepada Yth,</p>
            <p style={{ fontWeight: "bold", margin: 0, color: '#1e293b' }}>{customer?.name || 'N/A'}</p>
        </div>
      </div>


        {/* Info Invoice */}
      <div className="nota-info" style={{ marginTop: '8px' }}>
        <span>Kasir: {kasirName}</span>
        <span>No Nota: <b>{order.no_nota}</b></span>
      </div>

      <hr className="separator" />

      {/* Tabel Item Nota */}
      <div className="nota-items">
        <div className="flex font-bold">
          <div className="w-[5%] text-center pr-1">No.</div>
          <div className="w-[30%] text-center pr-1">Deskripsi</div>
          <div className="w-[15%] text-center pr-1">Bahan</div>
          <div className="w-[15%] text-center pr-1">Ukuran</div>
          <div className="w-[10%] text-center pr-1">Qty</div>
          <div className="w-[25%] text-right">Total Harga</div>
        </div>
        <hr className="separator" />

        {order.order_items?.map((item, index) => {
          const bahan = bahanList.find(b => b.id === item.bahan_id);
          const finishing = finishings.find(f => f.id === item.finishing_id);
          if (!bahan || !customer) return null;

          const hargaSatuan = getPriceForCustomer(bahan, customer.level);
          const area = (item.panjang || 0) > 0 && (item.lebar || 0) > 0 ? (item.panjang || 1) * (item.lebar || 1) : 1;
          const jumlah = hargaSatuan * area * item.qty;

          return (
            <div key={item.id} className="flex items-start py-0.5">
              <div className="w-[5%] text-center pr-1">{index + 1}.</div>
              <div className="w-[30%] text-center pr-1 break-words">{item.deskripsi_pesanan || '-'}</div>
              <div className="w-[15%] text-center pr-1 break-words">{bahan.name}</div>
              <div className="w-[15%] text-center pr-1">
                {(item.panjang || 0) > 0 ? `${item.panjang}m x ${item.lebar}m` : '-'}
              </div>
              <div className="w-[10%] text-center pr-1">{item.qty}</div>
              <div className="w-[25%] text-right">{formatCurrencyDotMatrix(jumlah)}</div>
            </div>
          );
        })}
      </div>     

      <hr className="separator" />

      {/* Sub Total */}
      <div className="nota-info">
        <span className="font-bold"><u>PERHATIAN :</u> </span>
        <span className="font-bold">Sub Total : {formatCurrencyDotMatrix(totalTagihan)}</span>    
      </div>

      {/* Bayar */}
      <div className="nota-info">
        <span>Pembayaran Resmi hanya melalui Bank <b>A/n Ariska Prima Diastari</b></span>
        <span>Bayar : {formatCurrencyDotMatrix(totalPaid)}</span>    
      </div>

      {/* Hormat Kami */}
      <div className="nota-info">
        <span><b>BRI : 670-70-10-28864537 | BCA : 0154361801 | BPD JATENG : 3142069325</b></span>
        <span>----------------------------------</span>
      </div>

      {/* Sisa */}
      <div className="nota-info">
        <span>Pembayaran selain Nomor Rekening di atas bukan tanggung jawab kami.</span>
        <span className="font-bold">Sisa : {formatCurrencyDotMatrix(sisaTagihan)}</span>    
      </div>

      {/* Hormat Kami */}
      <div className="nota-info">
        <span> </span>
        <span>Hormat Kami,</span>
        <span> </span>
        <span>Penerima,</span>
        <span></span>
      </div>

    </div>
  );
});

export default Nota;