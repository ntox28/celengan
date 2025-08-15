import React, { forwardRef } from 'react';
import { Employee, Payroll, PayrollConfig } from '../../lib/supabaseClient';

interface GajiSlipProps {
    payroll: Payroll;
    employee?: Employee;
    employees: Employee[];
    payrollConfig?: PayrollConfig;
}

const formatCurrency = (value: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
const formatDate = (iso: string) => new Date(iso).toLocaleDateString('id-ID', { dateStyle: 'long' });

const GajiSlip = forwardRef<HTMLDivElement, GajiSlipProps>(({ payroll, employee, employees }, ref) => {
    
    const totalPendapatan = payroll.base_salary + payroll.overtime_pay + payroll.bonus;
    const approver = employees.find(e => e.user_id === payroll.approved_by);
    const approverName = approver ? approver.name : 'Manager';

    return (
        <div ref={ref} className="bg-white text-black p-8 font-sans text-sm" style={{ width: '210mm', minHeight: '297mm', boxSizing: 'border-box' }}>
            {/* Header */}
            <header className="flex justify-between items-start pb-2 mb-2 border-b">
                <div>
                    <h1 className="text-2xl font-bold">NALA MEDIA</h1>
                    <p className="text-xs">Jl. Prof. Moh. Yamin, Cerbonan, Karanganyar</p>
                </div>
                <h2 className="text-2xl font-semibold mt-1">SLIP GAJI</h2>
            </header>

            {/* Employee & Period Info */}
            <section className="flex justify-between mb-2">
                <div>
                    <table>
                        <tbody>
                            <tr>
                                <td className="pr-4 py-0.5">Nama</td>
                                <td className="py-0.5">: {employee?.name || 'N/A'}</td>
                            </tr>
                            <tr>
                                <td className="pr-4 py-0.5">Devisi</td>
                                <td className="py-0.5">: {employee?.position || 'N/A'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div>
                    <table>
                        <tbody>
                            <tr>
                                <td className="pr-4 py-0.5">Periode Gaji</td>
                                <td className="py-0.5">: {formatDate(payroll.period_start)} - {formatDate(payroll.period_end)}</td>
                            </tr>
                            <tr>
                                <td className="pr-4 py-0.5">Tanggal Cetak</td>
                                <td className="py-0.5">: {formatDate(new Date().toISOString())}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            {/* Salary Details */}
            <section>
                <table className="w-full border-collapse">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border p-1.5 text-left font-semibold" colSpan={2}>PENDAPATAN</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td className="border p-1.5 w-3/4">Gaji Pokok (Total Jam Kerja: {payroll.total_regular_hours.toFixed(2)} jam)</td>
                            <td className="border p-1.5 text-right">{formatCurrency(payroll.base_salary)}</td>
                        </tr>
                        <tr>
                            <td className="border p-1.5">Lembur (Total Jam Lembur: {payroll.total_overtime_hours.toFixed(2)} jam)</td>
                            <td className="border p-1.5 text-right">{formatCurrency(payroll.overtime_pay)}</td>
                        </tr>
                        {payroll.bonus > 0 && (
                             <>
                                <tr>
                                    <td className="border p-1.5 w-3/4">Bonus</td>
                                    <td className="border p-1.5 text-right">{formatCurrency(payroll.bonus)}</td>
                                </tr>
                                {payroll.notes && (
                                    <tr>
                                        <td className="border p-1.5 text-xs italic text-slate-500" colSpan={2}>
                                            Catatan: {payroll.notes}
                                        </td>
                                    </tr>
                                )}
                            </>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50 font-bold">
                            <td className="border p-1.5 text-right">TOTAL PENDAPATAN (A)</td>
                            <td className="border p-1.5 text-right">{formatCurrency(totalPendapatan)}</td>
                        </tr>
                    </tfoot>
                </table>

                 <table className="w-full border-collapse mt-2">
                    <thead>
                        <tr className="bg-slate-100">
                            <th className="border p-1.5 text-left font-semibold" colSpan={2}>POTONGAN</th>
                        </tr>
                    </thead>
                    <tbody>
                         <tr>
                            <td className="border p-1.5 w-3/4">Potongan Gaji</td>
                            <td className="border p-1.5 text-right">{formatCurrency(payroll.potongan)}</td>
                        </tr>
                        {payroll.catatan_potongan && (
                            <tr>
                                <td className="border p-1.5 text-xs italic text-slate-500" colSpan={2}>
                                    Catatan: {payroll.catatan_potongan}
                                </td>
                            </tr>
                        )}
                    </tbody>
                    <tfoot>
                        <tr className="bg-slate-50 font-bold">
                            <td className="border p-1.5 text-right">TOTAL POTONGAN (B)</td>
                            <td className="border p-1.5 text-right">{formatCurrency(payroll.potongan)}</td>
                        </tr>
                    </tfoot>
                </table>
            </section>
            
            {/* Final Salary */}
            <section className="mt-2">
                 <div className="flex justify-end">
                     <div className="w-1/2 bg-slate-200 p-2 font-bold flex justify-between">
                         <span>GAJI BERSIH (A - B)</span>
                         <span>{formatCurrency(payroll.total_salary)}</span>
                     </div>
                 </div>
            </section>

            {/* Signature */}
            <footer className="mt-2 flex justify-between text-center">
                <div>
                    <p>Disetujui Oleh,</p>
                    <div className="h-12"></div>
                    <p className="border-t pt-1">( {approverName} )</p>
                </div>
                 <div>
                    <p>Diterima Oleh,</p>
                    <div className="h-12"></div>
                    <p className="border-t pt-1">( {employee?.name} )</p>
                </div>
            </footer>
        </div>
    );
});

export default GajiSlip;