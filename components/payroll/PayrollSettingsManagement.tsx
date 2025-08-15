import React, { useState, useMemo } from 'react';
import SettingsIcon from '../icons/SettingsIcon';
import CurrencyDollarIcon from '../icons/CurrencyDollarIcon';
import { Employee, PayrollConfig, Payroll, User as AuthUser, PayrollStatus } from '../../lib/supabaseClient';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';

interface PayrollSettingsManagementProps {
    employees: Employee[];
    payrollConfigs: PayrollConfig[];
    addPayrollConfig: (data: Omit<PayrollConfig, 'id' | 'created_at'>) => Promise<void>;
    updatePayrollConfig: (id: number, data: Partial<Omit<PayrollConfig, 'id' | 'created_at'>>) => Promise<void>;
    deletePayrollConfig: (id: number) => Promise<void>;
    payrolls: Payroll[];
    updatePayroll: (id: number, data: Partial<Omit<Payroll, 'id'|'created_at'>>) => Promise<void>;
    loggedInUser: AuthUser;
}

const initialFormState: Omit<PayrollConfig, 'id'|'created_at'> = {
    employee_id: 0,
    regular_rate_per_hour: 0,
    overtime_rate_per_hour: 0
};

const formatCurrency = (value: number | null | undefined) => {
    if (value == null) return 'Rp 0';
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);
};

const statusMap: Record<PayrollStatus, { text: string; color: string }> = {
    pending_approval: { text: 'Menunggu Persetujuan', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/50 dark:text-yellow-300' },
    approved: { text: 'Disetujui', color: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300' },
    rejected: { text: 'Ditolak', color: 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300' },
    paid: { text: 'Dibayar', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
};

const PayrollSettingsManagement: React.FC<PayrollSettingsManagementProps> = (props) => {
    const { employees, payrollConfigs, addPayrollConfig, updatePayrollConfig, deletePayrollConfig, payrolls, updatePayroll, loggedInUser } = props;
    const [activeTab, setActiveTab] = useState('release');
    
    // State for Manage tab
    const [formData, setFormData] = useState(initialFormState);
    const [editingConfig, setEditingConfig] = useState<PayrollConfig | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // State for Keluarkan Gaji tab
    const [isActionModalOpen, setIsActionModalOpen] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<Payroll | null>(null);
    const [actionFormData, setActionFormData] = useState({ bonus: 0, potongan: 0, notes: '', catatan_potongan: '' });

    const employeesWithoutConfig = useMemo(() => {
        return employees.filter(emp => !payrollConfigs.some(pc => pc.employee_id === emp.id));
    }, [employees, payrollConfigs]);
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({...prev, [name]: Number(value) }));
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.employee_id) return;
        setIsSubmitting(true);
        try {
            if (editingConfig) {
                await updatePayrollConfig(editingConfig.id, formData);
            } else {
                await addPayrollConfig(formData);
            }
            setFormData(initialFormState);
            setEditingConfig(null);
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleEditClick = (config: PayrollConfig) => {
        setEditingConfig(config);
        setFormData({
            employee_id: config.employee_id,
            regular_rate_per_hour: config.regular_rate_per_hour,
            overtime_rate_per_hour: config.overtime_rate_per_hour,
        });
    };
    
    const openActionModal = (payroll: Payroll) => {
        setSelectedPayroll(payroll);
        setActionFormData({
            bonus: payroll.bonus || 0,
            potongan: payroll.potongan || 0,
            notes: payroll.notes || '',
            catatan_potongan: payroll.catatan_potongan || ''
        });
        setIsActionModalOpen(true);
    };

    const handleActionSubmit = (status: 'approved' | 'rejected') => {
        if (!selectedPayroll) return;

        const { bonus, potongan, notes, catatan_potongan } = actionFormData;
        const newTotalSalary = selectedPayroll.base_salary + selectedPayroll.overtime_pay + bonus - potongan;
        
        const payload = {
            status,
            bonus,
            potongan,
            notes,
            catatan_potongan,
            total_salary: newTotalSalary,
            approved_by: loggedInUser.id,
            approved_at: new Date().toISOString()
        };
        updatePayroll(selectedPayroll.id, payload);
        setIsActionModalOpen(false);
    };

    const handleCancelApproval = (payrollId: number) => {
        if (window.confirm('Yakin ingin membatalkan persetujuan? Ini akan mengembalikan laporan ke status Menunggu Persetujuan dan membuka kembali arsip absensi terkait.')) {
            updatePayroll(payrollId, { status: 'pending_approval' });
        }
    };

    const tabs = [
        { key: 'manage', label: 'Manage Gaji', icon: SettingsIcon },
        { key: 'release', label: 'Keluarkan Gaji', icon: CurrencyDollarIcon }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'manage':
                return (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 p-6 h-full">
                        <div className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-lg">
                            <h3 className="text-xl font-bold mb-4">{editingConfig ? 'Edit Konfigurasi Gaji' : 'Tambah Konfigurasi Gaji'}</h3>
                            <form onSubmit={handleFormSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Karyawan</label>
                                    {editingConfig ? (
                                        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-md py-2 px-3">{employees.find(e => e.id === editingConfig.employee_id)?.name}</div>
                                    ) : (
                                        <select name="employee_id" value={formData.employee_id} onChange={handleInputChange} required className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3">
                                            <option value={0} disabled>Pilih Karyawan</option>
                                            {employeesWithoutConfig.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                                        </select>
                                    )}
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Devisi</label>
                                    <input type="text" readOnly value={employees.find(e => e.id === formData.employee_id)?.position || ''} className="w-full bg-slate-200 dark:bg-slate-700 rounded-md py-2 px-3"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gaji Reguler / Jam</label>
                                    <input type="number" name="regular_rate_per_hour" value={formData.regular_rate_per_hour} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Gaji Lembur / Jam</label>
                                    <input type="number" name="overtime_rate_per_hour" value={formData.overtime_rate_per_hour} onChange={handleInputChange} className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                                </div>
                                <div className="flex gap-2">
                                    <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-2 rounded-lg text-white bg-pink-600 hover:bg-pink-700 disabled:bg-pink-300">{isSubmitting ? 'Menyimpan...' : 'Simpan'}</button>
                                    {editingConfig && <button type="button" onClick={() => { setEditingConfig(null); setFormData(initialFormState); }} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Batal Edit</button>}
                                </div>
                            </form>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700">
                                    <tr>
                                        <th className="px-4 py-2">Nama</th>
                                        <th className="px-4 py-2 text-right">Reguler/jam</th>
                                        <th className="px-4 py-2 text-right">Lembur/jam</th>
                                        <th className="px-4 py-2 text-center">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                                    {payrollConfigs.map(pc => {
                                        const employee = employees.find(e => e.id === pc.employee_id);
                                        return (
                                            <tr key={pc.id}>
                                                <td className="px-4 py-2 font-medium">{employee?.name}<p className="text-xs text-slate-500 font-normal">{employee?.position}</p></td>
                                                <td className="px-4 py-2 text-right">{new Intl.NumberFormat('id-ID').format(pc.regular_rate_per_hour)}</td>
                                                <td className="px-4 py-2 text-right">{new Intl.NumberFormat('id-ID').format(pc.overtime_rate_per_hour)}</td>
                                                <td className="px-4 py-2 text-center space-x-2">
                                                    <button onClick={() => handleEditClick(pc)} className="text-cyan-500"><EditIcon className="w-5 h-5"/></button>
                                                    <button onClick={() => deletePayrollConfig(pc.id)} className="text-red-500"><TrashIcon className="w-5 h-5"/></button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'release':
                return (
                    <div className="p-6">
                        <h3 className="text-xl font-bold mb-4">Daftar Persetujuan Gaji</h3>
                        <div className="overflow-x-auto">
                           <table className="w-full text-sm responsive-table">
                               <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-700">
                                   <tr>
                                       <th className="px-4 py-2 text-left">Karyawan</th>
                                       <th className="px-4 py-2 text-left">Periode</th>
                                       <th className="px-4 py-2 text-center">Status</th>
                                       <th className="px-4 py-2 text-center">Aksi</th>
                                   </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                                    {payrolls.map(p => {
                                        const employee = employees.find(e => e.id === p.employee_id);
                                        const statusInfo = statusMap[p.status] || { text: p.status, color: 'bg-slate-100 text-slate-800' };
                                        return (
                                            <tr key={p.id}>
                                                <th scope="row" className="px-4 py-3 font-medium">{employee?.name}</th>
                                                <td data-label="Periode" className="px-4 py-3">{new Date(p.period_start).toLocaleDateString()} - {new Date(p.period_end).toLocaleDateString()}</td>
                                                <td data-label="Status" className="px-4 py-3 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                                                        {statusInfo.text}
                                                    </span>
                                                </td>
                                                <td data-label="Aksi" className="px-4 py-3 text-center">
                                                    {p.status === 'approved' ? (
                                                        <button onClick={() => handleCancelApproval(p.id)} className="text-xs px-3 py-1 rounded bg-amber-500 text-white hover:bg-amber-600">
                                                            Batalkan Tindakan
                                                        </button>
                                                    ) : (
                                                        <button onClick={() => openActionModal(p)} className="text-xs px-3 py-1 rounded bg-cyan-500 text-white hover:bg-cyan-600">
                                                            Tindakan
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })}
                               </tbody>
                           </table>
                        </div>
                    </div>
                );
            default: return null;
        }
    };

    const actionReportData = selectedPayroll;

    return (
        <>
        {isActionModalOpen && actionReportData && (
             <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50" onClick={() => setIsActionModalOpen(false)}>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                    <h3 className="text-xl font-bold mb-4 flex-shrink-0">Tindakan Persetujuan Gaji</h3>
                     <div className="flex-1 overflow-y-auto -mr-3 pr-3 space-y-4">
                        <div className="text-sm space-y-2">
                            <p><strong>Karyawan:</strong> {employees.find(e => e.id === actionReportData.employee_id)?.name}</p>
                            <p><strong>Periode:</strong> {new Date(actionReportData.period_start).toLocaleDateString('id-ID')} - {new Date(actionReportData.period_end).toLocaleDateString('id-ID')}</p>
                        </div>
                        
                        <div className="text-sm bg-slate-50 dark:bg-slate-700/50 p-3 rounded-lg">
                            <h4 className="font-semibold mb-2">Ringkasan Awal</h4>
                            <div className="flex justify-between"><p>Gaji Pokok:</p> <p>{formatCurrency(actionReportData.base_salary)}</p></div>
                            <div className="flex justify-between"><p>Gaji Lembur:</p> <p>{formatCurrency(actionReportData.overtime_pay)}</p></div>
                            <div className="flex justify-between font-bold border-t pt-1 mt-1"><p>Total Awal:</p> <p>{formatCurrency(actionReportData.base_salary + actionReportData.overtime_pay)}</p></div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium">Tambahkan Bonus (Rp)</label>
                            <input type="number" value={actionFormData.bonus} onChange={e => setActionFormData(p => ({...p, bonus: Number(e.target.value)}))} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Catatan Bonus</label>
                            <textarea value={actionFormData.notes} onChange={e => setActionFormData(p => ({...p, notes: e.target.value}))} rows={2} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"></textarea>
                        </div>
                         <div>
                            <label className="block text-sm font-medium">Edit Potongan Gaji (Rp)</label>
                            <input type="number" value={actionFormData.potongan} onChange={e => setActionFormData(p => ({...p, potongan: Number(e.target.value)}))} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Catatan Potongan</label>
                            <textarea value={actionFormData.catatan_potongan} onChange={e => setActionFormData(p => ({...p, catatan_potongan: e.target.value}))} rows={2} className="w-full mt-1 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md py-2 px-3"></textarea>
                        </div>
                    </div>

                    <div className="pt-4 mt-4 border-t dark:border-slate-700 flex-shrink-0 flex justify-end gap-2">
                        <button onClick={() => setIsActionModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-600 hover:bg-slate-300">Tutup</button>
                        <button onClick={() => handleActionSubmit('rejected')} className="px-4 py-2 rounded-lg text-white bg-red-600 hover:bg-red-700">Tolak</button>
                        <button onClick={() => handleActionSubmit('approved')} className="px-4 py-2 rounded-lg text-white bg-green-600 hover:bg-green-700">Setujui</button>
                    </div>
                </div>
            </div>
        )}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col">
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

export default PayrollSettingsManagement;