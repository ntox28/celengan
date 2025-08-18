import React, { forwardRef } from 'react';
import { Employee, Payroll } from '../../lib/supabaseClient';

interface GajiSlipProps {
    payroll: Payroll;
    employee?: Employee;
    employees: Employee[];
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'long' });

const GajiSlip = forwardRef<HTMLDivElement, GajiSlipProps>(({ payroll, employee, employees }, ref) => {
    
    const totalPendapatan = payroll.base_salary + payroll.overtime_pay + payroll.bonus;
    const approver = employees.find(e => e.user_id === payroll.approved_by);
    const approverName = approver ? approver.name : 'Manager';

    return (
        <div ref={ref} className="nota-dot-matrix bg-white text-black p-4 font-sans text-xs">

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
        <div className="w-1/2 text-right">
          <h2 className="text-3xl font-bold text-gray-800 uppercase">SLIP GAJI</h2>
          <p className="text-sm text-gray-500 mt-1"></p>
        </div>
      </div>
            {/* Employee & Period Info */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px",paddingBottom: '4px' }}>
        <div>Nama: <b>{employee?.name || 'N/A'}</b></div>
        <div>Periode: <b>{formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}</b></div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px",paddingBottom: '8px', borderBottom: '1px dashed black' }}>
        <div>Devisi: <b>{employee?.position || 'N/A'}</b></div>
        <div>Tanggal Cetak: {formatDate(new Date().toISOString())}</div>
      </div>      

            <section className="space-y-4">
                {/* PENDAPATAN */}
                <div>
                    <div className="font-bold mt-2 mb-1">PENDAPATAN</div>
                    <div className="flex justify-between py-0.5">
                        <span>Gaji Pokok (Total Jam Kerja: {payroll.total_regular_hours.toFixed(2)} jam)</span>
                        <span>{formatCurrency(payroll.base_salary)}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                        <span>Lembur (Total Jam Lembur: {payroll.total_overtime_hours.toFixed(2)} jam)</span>
                        <span>{formatCurrency(payroll.overtime_pay)}</span>
                    </div>
                    {payroll.bonus > 0 && (
                        <>
                            <div className="flex justify-between py-0.5">
                                <span>Bonus</span>
                                <span>{formatCurrency(payroll.bonus)}</span>
                            </div>
                            {payroll.notes && (
                                <div className="text-slate-600 text-[9px] italic pl-4 py-0.5">
                                    Catatan: {payroll.notes}
                                </div>
                            )}
                        </>
                    )}
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px",paddingBottom: '8px', borderBottom: '1px dashed black' }}>
        <div><b>TOTAL PENDAPATAN (A)</b></div>
        <div><b>{formatCurrency(totalPendapatan)}</b></div>        
      </div>                    
                </div>                

                {/* POTONGAN */}
                <div>
                    <div className="font-bold mt-1 mb-1">POTONGAN</div>
                    <div className="flex justify-between py-0.5">
                        <span>Potongan Gaji</span>
                        <span>{formatCurrency(payroll.potongan)}</span>
                    </div>
                     {payroll.catatan_potongan && (
                        <div className="text-slate-600 text-[9px] italic pl-4 py-0.5">
                            Catatan: {payroll.catatan_potongan}
                        </div>  )}
                    
                    
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "4px",paddingBottom: '8px', borderBottom: '1px dashed black' }}>
        <div><b>TOTAL POTONGAN (B)</b></div>
        <div><b>{formatCurrency(payroll.potongan)}</b></div>        
      </div>
            </section>
{/* Final Salary */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginTop: "8px",paddingBottom: '8px' }}>
        <div><b>TOTAL GAJI (A - B)</b></div>
        <div><b>{formatCurrency(payroll.total_salary)}</b></div>        
      </div>            

            {/* Signature */}
            <footer className="mt-1 flex justify-between text-center">
                <div className="w-1/3">
                    <div>Disetujui Oleh,</div>

                    <div className="border-t border-black pt-1">( {approverName} )</div>
                </div>
                 <div className="w-1/3">
                    <div>Diterima Oleh,</div>

                    <div className="border-t border-black pt-1">( {employee?.name} )</div>
                </div>
            </footer>
        </div>
        
    );
});

export default GajiSlip;