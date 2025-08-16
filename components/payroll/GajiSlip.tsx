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
        <div ref={ref} className="bg-white text-black p-8 font-sans text-xs" style={{ width: '210mm', boxSizing: 'border-box' }}>
            {/* Header */}
            <header className="flex justify-between items-start pb-2 mb-2">
                <div>
                    <h1 className="text-xl font-bold">NALA MEDIA</h1>
                    <p className="text-[9px] leading-tight">Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar</p>
                </div>
                <h2 className="text-xl font-bold">SLIP GAJI</h2>
            </header>
            <div className="border-t border-dashed border-black"></div>
            
            {/* Employee & Period Info */}
            <section className="flex justify-between my-1 text-[10px]">
                <div className="w-1/2 space-y-1">
                    <div className="flex"><span className="w-24 inline-block">NAMA</span>: {employee?.name || 'N/A'}</div>
                    <div className="flex"><span className="w-24 inline-block">DEVISI</span>: {employee?.position || 'N/A'}</div>
                </div>
                <div className="w-1/2 text-right space-y-1">
                     <div className="flex justify-end"><span className="w-28 text-left inline-block"></span>Periode: {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}</div>
                     <div className="flex justify-end"><span className="w-28 text-left inline-block"></span>Tanggal Cetak: {formatDate(new Date().toISOString())}</div>
                </div>
            </section>
            
            <div className="border-t border-dashed border-black mb-2"></div>

            {/* Salary Details */}
            <section className="space-y-4">
                {/* PENDAPATAN */}
                <div>
                    <div className="font-bold mb-1">PENDAPATAN</div>
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
                    <div className="border-t border-dashed border-black my-1"></div>
                    <div className="flex justify-between font-bold">
                        <span>TOTAL PENDAPATAN (A)</span>
                        <span>{formatCurrency(totalPendapatan)}</span>
                    </div>
                </div>           
                {/* POTONGAN */}
                <div>
                    <div className="font-bold mb-1">POTONGAN</div>
                    <div className="flex justify-between py-0.5">
                        <span>Potongan Gaji</span>
                        <span>{formatCurrency(payroll.potongan)}</span>
                    </div>
                     {payroll.catatan_potongan && (
                        <div className="text-slate-600 text-[9px] italic pl-4 py-0.5">
                            Catatan: {payroll.catatan_potongan}
                        </div>
                    )}
                    <div className="border-t border-dashed border-black my-1"></div>
                    <div className="flex justify-between font-bold">
                        <span>TOTAL POTONGAN (B)</span>
                        <span>{formatCurrency(payroll.potongan)}</span>
                    </div>
                </div>
            </section>
            
            <div className="border-t-2 border-dashed border-black my-2"></div>

            {/* Final Salary */}
            <section className="mt-2">
                 <div className="flex justify-end">
                     <div className="w-1/2 flex justify-between font-bold text-base">
                         <span>GAJI BERSIH (A - B)</span>
                         <span>{formatCurrency(payroll.total_salary)}</span>
                     </div>
                 </div>
            </section>

            {/* Signature */}
            <footer className="mt-2 flex justify-between text-center text-[10px]">
                <div className="w-1/3">
                    <p>Disetujui Oleh,</p>
                    <div className="h-1"></div>
                    <p className="font-bold">( {approverName} )</p>
                </div>
                 <div className="w-1/3">
                    <p>Diterima Oleh,</p>
                    <div className="h-1"></div>
                    <p className="font-bold">( {employee?.name} )</p>
                </div>
            </footer>
        </div>
    );
});

export default GajiSlip;
