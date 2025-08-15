import React, { useState, useMemo, useEffect } from 'react';
import ClockIcon from '../icons/ClockIcon';
import ClipboardDocumentListIcon from '../icons/ClipboardDocumentListIcon';
import DocumentCheckIcon from '../icons/DocumentCheckIcon';
import { Employee, PayrollConfig, Attendance, Payroll, PayrollStatus } from '../../lib/supabaseClient';
import { useToast } from '../../hooks/useToast';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import GajiSlip from './GajiSlip';
import PlusIcon from '../icons/PlusIcon';
import PrintIcon from '../icons/PrintIcon';

interface PayrollManagementProps {
    employees: Employee[];
    payrollConfigs: PayrollConfig[];
    attendances: Attendance[];
    addAttendance: (data: Omit<Attendance, 'id' | 'created_at'>) => Promise<void>;
    updateAttendance: (id: number, data: Partial<Omit<Attendance, 'id' | 'created_at'>>) => Promise<void>;
    deleteAttendance: (id: number) => Promise<void>;
    payrolls: Payroll[];
    addPayroll: (data: Omit<Payroll, 'id'|'created_at'>) => Promise<void>;
    updatePayroll: (id: number, data: Partial<Omit<Payroll, 'id' | 'created_at'>>) => Promise<void>;
    deletePayroll: (id: number) => Promise<void>;
}

const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};


interface AttendanceFormState {
    employee_id: number;
    tanggal_absen: string;
    shift: 'Pagi' | 'Sore';
    jam_masuk: string;
    jam_keluar: string;
    lembur_jam: number;
    lembur_menit: number;
    catatan_lembur: string;
}

const initialAttendanceForm: AttendanceFormState = {
    employee_id: 0,
    tanggal_absen: new Date().toISOString().split('T')[0],
    shift: 'Pagi',
    jam_masuk: '09:00',
    jam_keluar: '17:00',
    lembur_jam: 0,
    lembur_menit: 0,
    catatan_lembur: '',
};

const minutesToHM = (m: number) => {
    const hours = Math.floor(m / 60);
    const minutes = m % 60;
    return { hours, minutes };
};

const formatMinutesToHMString = (minutes: number): string => {
    if (minutes <= 0) return '-';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h} jam ${m} mnt`;
};

const calculateRegularMinutes = (check_in: string, check_out: string | null): number => {
    if (!check_out) return 0;
    const start = new Date(check_in).getTime();
    const end = new Date(check_out).getTime();
    const durationMinutes = (end - start) / (1000 * 60);
    // Kurangi 1 jam (60 menit) untuk istirahat
    return Math.max(0, durationMinutes - 60);
};

const statusMap: Record<PayrollStatus, { text: string; color: string }> = {
    pending_approval: { text: 'Menunggu Persetujuan', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    approved: { text: 'Disetujui', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    rejected: { text: 'Ditolak', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
    paid: { text: 'Dibayar', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
};


const PayrollManagement: React.FC<PayrollManagementProps> = (props) => {
    const { employees, payrollConfigs, attendances, addAttendance, updateAttendance, deleteAttendance, payrolls, addPayroll, updatePayroll, deletePayroll } = props;
    const { addToast } = useToast();
    const [activeTab, setActiveTab] = useState('summary');

    // State for Absen Kerja
    const [attendanceForm, setAttendanceForm] = useState<AttendanceFormState>(initialAttendanceForm);
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // State for creating report
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [summaryFilters, setSummaryFilters] = useState({ employee_id: '', start_date: '', end_date: '' });
    const [generatedReport, setGeneratedReport] = useState<Omit<Payroll, 'id'|'created_at'> | null>(null);

    // State for Modals
    const [isReportSummaryModalOpen, setIsReportSummaryModalOpen] = useState(false);
    const [isPotonganModalOpen, setIsPotonganModalOpen] = useState(false);
    const [potonganData, setPotonganData] = useState({ amount: 0, notes: '' });
    const [viewingPayroll, setViewingPayroll] = useState<Payroll | null>(null);
    const [printablePayroll, setPrintablePayroll] = useState<Payroll | null>(null);
    const [isEditPotonganModalOpen, setIsEditPotonganModalOpen] = useState(false);
    const [editablePotongan, setEditablePotongan] = useState({ id: 0, amount: 0, notes: '' });
    
    const unprocessedAttendances = useMemo(() => attendances.filter(a => !a.payroll_id), [attendances]);

    const employeesWithConfig = useMemo(() => {
        return employees.filter(emp => payrollConfigs.some(pc => pc.employee_id === emp.id));
    }, [employees, payrollConfigs]);
    
    const selectedEmployee = useMemo(() => employees.find(e => e.id === Number(attendanceForm.employee_id)), [employees, attendanceForm.employee_id]);

    useEffect(() => {
        if (!editingAttendance) {
            if (attendanceForm.shift === 'Pagi') {
                setAttendanceForm(prev => ({ ...prev, jam_masuk: '09:00', jam_keluar: '17:00' }));
            } else {
                setAttendanceForm(prev => ({ ...prev, jam_masuk: '17:00', jam_keluar: '01:00' }));
            }
        }
    }, [attendanceForm.shift, editingAttendance]);
    
    useEffect(() => {
        if (editingAttendance) {
            const checkIn = new Date(editingAttendance.check_in);
            const checkOut = editingAttendance.check_out ? new Date(editingAttendance.check_out) : null;
            
            const lembur = minutesToHM(editingAttendance.overtime_minutes || 0);

            setAttendanceForm({
                employee_id: editingAttendance.employee_id,
                tanggal_absen: checkIn.toISOString().split('T')[0],
                shift: editingAttendance.shift || 'Pagi',
                jam_masuk: checkIn.toTimeString().slice(0, 5),
                jam_keluar: checkOut ? checkOut.toTimeString().slice(0, 5) : '',
                lembur_jam: lembur.hours,
                lembur_menit: lembur.minutes,
                catatan_lembur: editingAttendance.catatan_lembur || '',
            });
        } else {
            setAttendanceForm(initialAttendanceForm);
        }
    }, [editingAttendance]);

    const handleAttendanceFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isNumber = type === 'number' || name === 'lembur_jam' || name === 'lembur_menit';
        setAttendanceForm(prev => ({ ...prev, [name]: isNumber ? Number(value) : value }));
    };

    const handleAttendanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!attendanceForm.employee_id) {
            addToast('Pilih karyawan terlebih dahulu.', 'error');
            return;
        }
        setIsSubmitting(true);
        try {
            const { lembur_jam, lembur_menit, tanggal_absen, jam_masuk, jam_keluar, catatan_lembur, shift, employee_id } = attendanceForm;
            const overtime_minutes = (lembur_jam * 60) + lembur_menit;

            const checkInDate = new Date(`${tanggal_absen}T${jam_masuk}`);
            let checkOutDate = new Date(`${tanggal_absen}T${jam_keluar}`);

            if (jam_keluar < jam_masuk) {
                checkOutDate.setDate(checkOutDate.getDate() + 1);
            }

            const payload: Omit<Attendance, 'id'|'created_at'|'payroll_id'> = {
                employee_id: Number(employee_id),
                check_in: checkInDate.toISOString(),
                check_out: jam_keluar ? checkOutDate.toISOString() : null,
                overtime_minutes,
                shift,
                catatan_lembur,
                notes: null,
                potongan: null,
                catatan_potongan: null,
            };

            if (editingAttendance) {
                await updateAttendance(editingAttendance.id, payload);
            } else {
                await addAttendance(payload as Omit<Attendance, 'id'|'created_at'>);
            }
            setAttendanceForm(initialAttendanceForm);
            setEditingAttendance(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleGenerateReport = () => {
        const { employee_id, start_date, end_date } = summaryFilters;
        if (!employee_id || !start_date || !end_date) {
            addToast('Harap pilih karyawan dan periode tanggal.', 'error');
            return;
        }

        const config = payrollConfigs.find(pc => pc.employee_id === Number(employee_id));
        if (!config) {
            addToast('Karyawan ini belum memiliki pengaturan gaji.', 'error');
            return;
        }

        const endDateObj = new Date(end_date);
        endDateObj.setHours(23, 59, 59, 999);

        const relevantAttendances = unprocessedAttendances.filter(a =>
            a.employee_id === Number(employee_id) &&
            new Date(a.check_in) >= new Date(start_date) &&
            a.check_out && new Date(a.check_out) <= endDateObj
        );
        
        if (relevantAttendances.length === 0) {
            addToast('Tidak ada data absensi yang belum diproses untuk periode ini.', 'info');
            setGeneratedReport(null);
            return;
        }

        const total_regular_minutes = relevantAttendances.reduce((sum, a) => sum + calculateRegularMinutes(a.check_in, a.check_out), 0);
        const total_overtime_minutes = relevantAttendances.reduce((sum, a) => sum + a.overtime_minutes, 0);

        const base_salary = (total_regular_minutes / 60) * config.regular_rate_per_hour;
        const overtime_pay = (total_overtime_minutes / 60) * config.overtime_rate_per_hour;
        const total_salary = base_salary + overtime_pay;

        setGeneratedReport({
            employee_id: Number(employee_id),
            period_start: start_date,
            period_end: end_date,
            total_regular_hours: total_regular_minutes / 60,
            total_overtime_hours: total_overtime_minutes / 60,
            base_salary,
            overtime_pay,
            bonus: 0,
            potongan: 0,
            notes: null,
            catatan_potongan: null,
            total_salary,
            status: 'pending_approval',
            approved_at: null,
            approved_by: null,
        });
        setIsCreateModalOpen(false);
        setIsReportSummaryModalOpen(true);
    };

    const handleSavePotongan = () => {
        if (!generatedReport) return;
        setGeneratedReport(prev => {
            if (!prev) return null;
            const newTotal = prev.base_salary + prev.overtime_pay + prev.bonus - potonganData.amount;
            return {
                ...prev,
                potongan: potonganData.amount,
                catatan_potongan: potonganData.notes,
                total_salary: newTotal
            };
        });
        setIsPotonganModalOpen(false);
    };
    
    const handleRequestApproval = async () => {
        if (!generatedReport) return;
        if (window.confirm("Cek semua data. Jika benar klik OK untuk meminta persetujuan.")) {
            setIsSubmitting(true);
            try {
                await addPayroll(generatedReport);
                closeAllModals();
                setSummaryFilters({ employee_id: '', start_date: '', end_date: '' });
            } catch(error) {
                console.error(error);
            } finally {
                setIsSubmitting(false);
            }
        }
    };
    
    const handleViewReport = (payroll: Payroll) => {
        setViewingPayroll(payroll);
        setIsReportSummaryModalOpen(true);
    };

    const handleDeletePayroll = async (id: number) => {
        if (window.confirm('Yakin ingin menghapus laporan gaji ini? Semua data absensi terkait akan dapat digunakan kembali.')) {
            await deletePayroll(id);
        }
    };

    const handlePrint = (payroll: Payroll) => {
        setPrintablePayroll(payroll);
    };
    
    const handleUpdatePotongan = async () => {
        if (!viewingPayroll) return;
        setIsSubmitting(true);
        try {
            const newTotalSalary = viewingPayroll.base_salary + viewingPayroll.overtime_pay + viewingPayroll.bonus - editablePotongan.amount;
            await updatePayroll(viewingPayroll.id, {
                potongan: editablePotongan.amount,
                catatan_potongan: editablePotongan.notes,
                total_salary: newTotalSalary
            });
            addToast('Potongan berhasil diperbarui.', 'success');
            closeAllModals();
        } catch (error) {
            console.error(error);
            // Error toast is handled by updatePayroll
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const closeAllModals = () => {
        setIsCreateModalOpen(false);
        setIsReportSummaryModalOpen(false);
        setIsPotonganModalOpen(false);
        setIsEditPotonganModalOpen(false);
        setGeneratedReport(null);
        setViewingPayroll(null);
        setPotonganData({ amount: 0, notes: '' });
    };

    useEffect(() => {
        if (printablePayroll) {
            const timer = setTimeout(() => {
                window.print();
                setPrintablePayroll(null);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [printablePayroll]);

    const tabs = [
        { key: 'attendance', label: 'Absen Kerja', icon: ClockIcon },
        { key: 'summary', label: 'Ringkasan Karyawan', icon: ClipboardDocumentListIcon },
        { key: 'report', label: 'Laporan Gaji', icon: DocumentCheckIcon }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'attendance': return (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 p-6">
                    <div className="lg:col-span-1">
                        <form onSubmit={handleAttendanceSubmit} className="space-y-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                            <h3 className="font-bold text-lg">{editingAttendance ? 'Edit Absensi' : 'Tambah Absensi'}</h3>
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Karyawan</label>
                                <select name="employee_id" value={attendanceForm.employee_id} onChange={handleAttendanceFormChange} required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3">
                                    <option value={0} disabled>Pilih Karyawan</option>
                                    {employeesWithConfig.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Devisi</label>
                                <input type="text" readOnly value={selectedEmployee?.position || ''} className="w-full bg-slate-200 dark:bg-slate-700 rounded-md py-2 px-3 text-slate-500 dark:text-slate-400"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Absen</label>
                                <input type="date" name="tanggal_absen" value={attendanceForm.tanggal_absen} onChange={handleAttendanceFormChange} required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Shift</label>
                                <select name="shift" value={attendanceForm.shift} onChange={handleAttendanceFormChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3">
                                    <option value="Pagi">Pagi</option>
                                    <option value="Sore">Sore</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Jam Masuk</label>
                                    <input type="time" name="jam_masuk" value={attendanceForm.jam_masuk} onChange={handleAttendanceFormChange} required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                                </div>
                                 <div>
                                    <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Jam Keluar</label>
                                    <input type="time" name="jam_keluar" value={attendanceForm.jam_keluar} onChange={handleAttendanceFormChange} required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Lembur</label>
                                <div className="flex items-center gap-2">
                                    <input type="number" name="lembur_jam" value={attendanceForm.lembur_jam} onChange={handleAttendanceFormChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3" placeholder="Jam"/>
                                    <span>:</span>
                                    <input type="number" name="lembur_menit" value={attendanceForm.lembur_menit} onChange={handleAttendanceFormChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3" placeholder="Menit"/>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Catatan Lembur</label>
                                <textarea name="catatan_lembur" value={attendanceForm.catatan_lembur} onChange={handleAttendanceFormChange} rows={2} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"></textarea>
                            </div>
                             <div className="flex gap-2 pt-2">
                                <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                                {editingAttendance && <button type="button" onClick={() => setEditingAttendance(null)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Batal Edit</button>}
                            </div>
                        </form>
                    </div>
                    <div className="lg:col-span-2 overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700/50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Karyawan</th>
                                    <th className="px-4 py-2 text-left">Tanggal Absen</th>
                                    <th className="px-4 py-2 text-right">Jam Reguler</th>
                                    <th className="px-4 py-2 text-right">Lembur</th>
                                    <th className="px-4 py-2 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {unprocessedAttendances.map(att => (
                                    <tr key={att.id}>
                                        <td className="px-4 py-3 font-medium">{employees.find(e => e.id === att.employee_id)?.name}</td>
                                        <td className="px-4 py-3">{new Date(att.check_in).toLocaleDateString('id-ID', {day:'2-digit', month:'long', year:'numeric'})}</td>
                                        <td className="px-4 py-3 text-right">{formatMinutesToHMString(calculateRegularMinutes(att.check_in, att.check_out))}</td>
                                        <td className="px-4 py-3 text-right">{formatMinutesToHMString(att.overtime_minutes)}</td>
                                        <td className="px-4 py-3 text-center space-x-2">
                                            <button onClick={() => setEditingAttendance(att)} className="p-1 text-cyan-600 hover:text-cyan-500"><EditIcon className="w-5 h-5"/></button>
                                            <button onClick={() => deleteAttendance(att.id)} className="p-1 text-red-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'summary': return (
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold">Daftar Laporan Gaji Terkirim</h3>
                        <button onClick={() => setIsCreateModalOpen(true)} className="flex items-center gap-2 bg-pink-600 text-white px-4 py-2 rounded-lg hover:bg-pink-700 transition-colors">
                            <PlusIcon className="w-5 h-5" />
                            Buat Laporan Gaji Baru
                        </button>
                    </div>
                     <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                           <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700">
                               <tr>
                                   <th className="px-4 py-2 text-left">Karyawan</th>
                                   <th className="px-4 py-2 text-left">Devisi</th>
                                   <th className="px-4 py-2 text-left">Periode</th>
                                   <th className="px-4 py-2 text-right">Total Gaji</th>
                                   <th className="px-4 py-2 text-center">Status</th>
                                   <th className="px-4 py-2 text-center">Aksi</th>
                               </tr>
                           </thead>
                           <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                {payrolls.map(payroll => {
                                    const employee = employees.find(e => e.id === payroll.employee_id);
                                    const statusInfo = statusMap[payroll.status] || { text: payroll.status, color: 'bg-slate-100 text-slate-800' };
                                    const canDelete = ['pending_approval', 'rejected'].includes(payroll.status);
                                    return (
                                        <tr key={payroll.id}>
                                            <td className="px-4 py-3 font-medium">{employee?.name}</td>
                                            <td className="px-4 py-3">{employee?.position}</td>
                                            <td className="px-4 py-3">{new Date(payroll.period_start).toLocaleDateString('id-ID')} - {new Date(payroll.period_end).toLocaleDateString('id-ID')}</td>
                                            <td className="px-4 py-3 text-right font-semibold">{formatCurrency(payroll.total_salary)}</td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                                    {statusInfo.text}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-center space-x-2">
                                                <button onClick={() => handleViewReport(payroll)} className="p-1 text-slate-500 hover:text-slate-700" title="Lihat Rincian">Lihat</button>
                                                <button onClick={() => handleDeletePayroll(payroll.id)} disabled={!canDelete} className="p-1 text-red-500 hover:text-red-400 disabled:text-slate-400 disabled:cursor-not-allowed" title="Hapus"><TrashIcon className="w-5 h-5"/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                           </tbody>
                        </table>
                    </div>
                </div>
            );
            case 'report': 
                const approvedPayrolls = payrolls.filter(p => p.status === 'approved');
                return (
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-6">Laporan Gaji Disetujui (Siap Cetak)</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-4 py-2 text-left">Karyawan</th>
                                        <th className="px-4 py-2 text-left">Periode</th>
                                        <th className="px-4 py-2 text-right">Total Gaji</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {approvedPayrolls.map(payroll => {
                                        const employee = employees.find(e => e.id === payroll.employee_id);
                                        return (
                                            <tr key={payroll.id}>
                                                <td className="px-4 py-3 font-medium">{employee?.name}</td>
                                                <td className="px-4 py-3">{new Date(payroll.period_start).toLocaleDateString('id-ID')} - {new Date(payroll.period_end).toLocaleDateString('id-ID')}</td>
                                                <td className="px-4 py-3 text-right font-semibold">{formatCurrency(payroll.total_salary)}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <button onClick={() => handlePrint(payroll)} className="flex items-center justify-center gap-2 mx-auto bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2 rounded-lg transition-colors">
                                                        <PrintIcon className="w-4 h-4" /> Cetak Slip Gaji
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {approvedPayrolls.length === 0 && (
                                <p className="text-center py-8 text-slate-500">Belum ada laporan gaji yang disetujui.</p>
                            )}
                        </div>
                    </div>
                );
            default: return null;
        }
    };
    
    const reportData = viewingPayroll || generatedReport;

    return (
        <>
            {isCreateModalOpen && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setIsCreateModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Buat Laporan Gaji Baru</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                             <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Karyawan</label>
                                <select value={summaryFilters.employee_id} onChange={e => setSummaryFilters(p => ({...p, employee_id: e.target.value}))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3">
                                    <option value="">Pilih Karyawan</option>
                                    {employeesWithConfig.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                </select>
                            </div>
                            <div/>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Awal</label>
                                <input type="date" value={summaryFilters.start_date} onChange={e => setSummaryFilters(p => ({...p, start_date: e.target.value}))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Tanggal Akhir</label>
                                <input type="date" value={summaryFilters.end_date} onChange={e => setSummaryFilters(p => ({...p, end_date: e.target.value}))} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                            <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Batal</button>
                            <button onClick={handleGenerateReport} className="px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700">Hasilkan Laporan</button>
                        </div>
                    </div>
                </div>
            )}

            {isReportSummaryModalOpen && reportData && (
                 <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={closeAllModals}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4 flex-shrink-0">Ringkasan Gaji</h3>
                        <div className="flex-1 overflow-y-auto -mr-3 pr-3 space-y-4">
                            <div className="text-sm space-y-2">
                                <p><strong>Karyawan:</strong> {employees.find(e => e.id === reportData.employee_id)?.name}</p>
                                <p><strong>Periode:</strong> {new Date(reportData.period_start).toLocaleDateString('id-ID')} - {new Date(reportData.period_end).toLocaleDateString('id-ID')}</p>
                            </div>
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr className="border-b dark:border-slate-700"><td className="py-2">Gaji Pokok ({reportData.total_regular_hours.toFixed(2)} jam)</td><td className="py-2 text-right">{formatCurrency(reportData.base_salary)}</td></tr>
                                    <tr className="border-b dark:border-slate-700"><td className="py-2">Gaji Lembur ({reportData.total_overtime_hours.toFixed(2)} jam)</td><td className="py-2 text-right">{formatCurrency(reportData.overtime_pay)}</td></tr>
                                    <tr className="border-b dark:border-slate-700"><td className="py-2">Bonus</td><td className="py-2 text-right">{formatCurrency(reportData.bonus)}</td></tr>
                                    <tr className="border-b dark:border-slate-700"><td className="py-2">Potongan</td><td className="py-2 text-right text-red-500">-{formatCurrency(reportData.potongan)}</td></tr>
                                </tbody>
                                <tfoot>
                                    <tr className="font-bold text-lg"><td className="py-3">Total Gaji</td><td className="py-3 text-right">{formatCurrency(reportData.total_salary)}</td></tr>
                                </tfoot>
                            </table>
                             {reportData.catatan_potongan && <p className="text-xs italic text-slate-500"><strong>Catatan Potongan:</strong> {reportData.catatan_potongan}</p>}
                        </div>
                         <div className="pt-4 mt-4 border-t dark:border-slate-700 flex-shrink-0 flex justify-between items-center">
                             <div>
                                {!viewingPayroll && (
                                    <div className="flex gap-2">
                                        <button onClick={() => setIsPotonganModalOpen(true)} className="px-4 py-2 rounded-lg bg-yellow-500 text-white hover:bg-yellow-600">Potongan</button>
                                        <button onClick={handleRequestApproval} disabled={isSubmitting} className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300">
                                            {isSubmitting ? 'Mengirim...' : 'Kirim untuk Persetujuan'}
                                        </button>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2">
                                {viewingPayroll && ['pending_approval', 'rejected'].includes(viewingPayroll.status) && (
                                    <button 
                                        onClick={() => {
                                            if(viewingPayroll) {
                                                setEditablePotongan({ id: viewingPayroll.id, amount: viewingPayroll.potongan, notes: viewingPayroll.catatan_potongan || '' });
                                                setIsEditPotonganModalOpen(true);
                                            }
                                        }} 
                                        className="px-4 py-2 rounded-lg bg-cyan-600 text-white hover:bg-cyan-700">
                                        Edit Potongan
                                    </button>
                                )}
                                <button onClick={closeAllModals} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Tutup</button>
                            </div>
                        </div>
                    </div>
                 </div>
            )}

            {isPotonganModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[51]" onClick={() => setIsPotonganModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Tambah Potongan</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Jumlah Potongan (Rp)</label>
                                <input type="number" value={potonganData.amount} onChange={e => setPotonganData(p => ({...p, amount: Number(e.target.value)}))} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Catatan Potongan</label>
                                <textarea value={potonganData.notes} onChange={e => setPotonganData(p => ({...p, notes: e.target.value}))} rows={3} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                            <button onClick={() => setIsPotonganModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Batal</button>
                            <button onClick={handleSavePotongan} className="px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700">Simpan Potongan</button>
                        </div>
                    </div>
                </div>
            )}

            {isEditPotonganModalOpen && viewingPayroll && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[52]" onClick={() => setIsEditPotonganModalOpen(false)}>
                    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-md" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-bold mb-4">Edit Potongan Gaji</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium">Jumlah Potongan (Rp)</label>
                                <input type="number" value={editablePotongan.amount} onChange={e => setEditablePotongan(p => ({...p, amount: Number(e.target.value)}))} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium">Catatan Potongan</label>
                                <textarea value={editablePotongan.notes} onChange={e => setEditablePotongan(p => ({...p, notes: e.target.value}))} rows={3} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"></textarea>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-4 mt-4 border-t dark:border-slate-700">
                            <button onClick={() => setIsEditPotonganModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Batal</button>
                            <button onClick={handleUpdatePotongan} disabled={isSubmitting} className="px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300">
                                {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            <div className="printable-area">
                {printablePayroll && <GajiSlip payroll={printablePayroll} employees={employees} employee={employees.find(e => e.id === printablePayroll.employee_id)} payrollConfig={payrollConfigs.find(pc => pc.employee_id === printablePayroll.employee_id)} />}
            </div>
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col no-print">
                <div className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                    <nav className="-mb-px flex space-x-6 px-6" aria-label="Tabs">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.key;
                            return (
                                <button
                                    key={tab.key}
                                    onClick={() => setActiveTab(tab.key)}
                                    className={`flex items-center whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                                        isActive
                                            ? 'border-pink-600 text-pink-600'
                                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                                    }`}
                                >
                                    <Icon className="h-5 w-5 mr-2" />
                                    <span>{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
                
                <div className="flex-1 overflow-y-auto">
                    {renderContent()}
                </div>
            </div>
        </>
    );
};

export default PayrollManagement;