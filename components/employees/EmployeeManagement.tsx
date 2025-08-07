
import React, { useState, useEffect, useRef } from 'react';
import EditIcon from '../icons/EditIcon';
import TrashIcon from '../icons/TrashIcon';
import Pagination from '../Pagination';
import { useToast } from '../../hooks/useToast';
import { Employee, EmployeePosition } from '../../lib/supabaseClient';
import LockIcon from '../icons/LockIcon';

interface EmployeeManagementProps {
    employees: Employee[];
    addEmployee: (data: Omit<Employee, 'id' | 'created_at'>, password: string) => Promise<void>;
    updateEmployee: (id: number, data: Partial<Omit<Employee, 'id' | 'created_at'>>) => Promise<void>;
    deleteEmployee: (id: number) => Promise<void>;
}

const getPositionColor = (position: EmployeePosition) => {
    const colors: Record<EmployeePosition, string> = {
        'Admin': 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300',
        'Kasir': 'bg-teal-100 text-teal-800 dark:bg-teal-900/50 dark:text-teal-300',
        'Office': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300',
        'Produksi': 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
    };
    return colors[position] || 'bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-300';
};

const initialFormData: Omit<Employee, 'id' | 'created_at'> & { password?: string } = { name: '', position: 'Kasir', email: '', phone: '', user_id: null, password: '' };

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ employees, addEmployee, updateEmployee, deleteEmployee }) => {
    const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState<Omit<Employee, 'id' | 'created_at'> & { password?: string }>(initialFormData);
    const [currentPage, setCurrentPage] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();
    const ITEMS_PER_PAGE = 10;
    const formRef = useRef<HTMLDivElement>(null);

    const totalPages = Math.ceil(employees.length / ITEMS_PER_PAGE);
    const currentEmployees = employees.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleEdit = (employee: Employee) => {
        setEditingEmployee(employee);
        setFormData({
            name: employee.name,
            position: employee.position,
            email: employee.email || '',
            phone: employee.phone || '',
            user_id: employee.user_id,
            password: '',
        });
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleAddNew = () => {
        setEditingEmployee(null);
        setFormData(initialFormData);
        formRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (editingEmployee) {
                const { password, ...employeeData } = formData;
                await updateEmployee(editingEmployee.id, employeeData);
            } else {
                const { password, ...employeeData } = formData;
                if (!password || password.length < 6) {
                    addToast('Password diperlukan dan minimal 6 karakter.', 'error');
                    setIsLoading(false);
                    return;
                }
                await addEmployee(employeeData, password);
                handleAddNew();
            }
        } catch (error) {
            console.error("Failed to save employee:", error);
            // Toast for error is handled within addEmployee/updateEmployee
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (employeeId: number) => {
        if (window.confirm('Apakah Anda yakin ingin menghapus user ini? Ini tidak akan menghapus akun login yang terhubung.')) {
            await deleteEmployee(employeeId);
            if (editingEmployee?.id === employeeId) {
                handleAddNew();
            }
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full">
            {/* Form Column */}
            <div ref={formRef} className="lg:col-span-1 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                        {editingEmployee ? 'Edit User' : 'Tambah User'}
                    </h3>
                    {editingEmployee && (
                        <button onClick={handleAddNew} className="text-sm text-pink-600 hover:text-pink-700 dark:text-pink-400 dark:hover:text-pink-300 font-semibold">
                            Buat Baru
                        </button>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto -mr-3 pr-3">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nama</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleInputChange} required className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div>
                            <label htmlFor="position" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Devisi</label>
                            <select
                                name="position"
                                id="position"
                                value={formData.position}
                                onChange={handleInputChange}
                                required
                                className="w-full pl-3 pr-10 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                                style={{
                                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                                    backgroundPosition: 'right 0.5rem center',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundSize: '1.5em 1.5em'
                                }}
                            >
                                <option value="Admin">Admin</option>
                                <option value="Kasir">Kasir</option>
                                <option value="Office">Office</option>
                                <option value="Produksi">Produksi</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Email</label>
                            <input type="email" name="email" id="email" value={formData.email || ''} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        {!editingEmployee && (
                            <div>
                                <label htmlFor="password" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Password</label>
                                <input type="password" name="password" id="password" value={formData.password} onChange={handleInputChange} required minLength={6} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                            </div>
                        )}
                        <div>
                            <label htmlFor="phone" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-1">Nomor Telepon</label>
                            <input type="tel" name="phone" id="phone" value={formData.phone || ''} onChange={handleInputChange} className="w-full pl-4 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300" />
                        </div>
                        <div className="flex justify-end pt-4 flex-shrink-0">
                             <button type="submit" disabled={isLoading} className="w-full px-6 py-3 rounded-lg text-white bg-pink-600 hover:bg-pink-700 transition-colors disabled:bg-pink-300">{isLoading ? 'Menyimpan...' : (editingEmployee ? 'Simpan Perubahan' : 'Simpan')}</button>
                        </div>
                    </form>
                </div>
            </div>

            {/* Table Column */}
            <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex flex-col h-full">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">Daftar User</h2>
                <div className="flex-1 overflow-y-auto -mx-6 px-6">
                    <table className="w-full text-sm text-left text-slate-700 dark:text-slate-300 responsive-table">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-700/50 sticky top-0 backdrop-blur-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nama</th>
                                <th scope="col" className="px-6 py-3">Posisi</th>
                                <th scope="col" className="px-6 py-3">Email</th>
                                <th scope="col" className="px-6 py-3 text-center">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-700 md:divide-y-0">
                            {currentEmployees.map((employee) => (
                                <tr key={employee.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors duration-200 ${editingEmployee?.id === employee.id ? 'bg-pink-50 dark:bg-pink-900/20' : ''}`}>
                                    <th scope="row" className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">{employee.name}</th>
                                    <td data-label="Posisi" className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPositionColor(employee.position)}`}>
                                            {employee.position}
                                        </span>
                                    </td>
                                    <td data-label="Email" className="px-6 py-4">{employee.email}</td>
                                    <td data-label="Aksi" className="px-6 py-4 text-center space-x-3">
                                        <button onClick={() => handleEdit(employee)} className="text-cyan-600 hover:text-cyan-500 dark:text-cyan-400 dark:hover:text-cyan-300 transition-colors p-1">
                                            <EditIcon className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => handleDelete(employee.id)} className="text-red-600 hover:text-red-500 dark:text-red-500 dark:hover:text-red-400 transition-colors p-1">
                                            <TrashIcon className="w-5 h-5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
        </div>
    );
};

export default EmployeeManagement;
