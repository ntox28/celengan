

import React from 'react';
import { Customer } from '../lib/supabaseClient';
import FilterIcon from './icons/FilterIcon';

interface FilterBarProps {
    customers: Customer[];
    statusOptions: { value: string; label: string }[];
    filters: {
        customerId: string;
        startDate: string;
        endDate: string;
        status: string;
    };
    onFilterChange: (name: 'customerId' | 'startDate' | 'endDate' | 'status', value: string) => void;
    onReset: () => void;
}

const FilterBar: React.FC<FilterBarProps> = ({ customers, statusOptions, filters, onFilterChange, onReset }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap items-center gap-4 text-sm no-print">
            <FilterIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 hidden sm:block flex-shrink-0" />
            
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="customerFilter" className="sr-only">Pelanggan</label>
                <select
                    id="customerFilter"
                    name="customerId"
                    value={filters.customerId}
                    onChange={(e) => onFilterChange('customerId', e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                    <option value="all">Semua Pelanggan</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
            </div>
            
            <div className="flex-grow min-w-[150px]">
                <label htmlFor="statusFilter" className="sr-only">Status</label>
                <select
                    id="statusFilter"
                    name="status"
                    value={filters.status}
                    onChange={(e) => onFilterChange('status', e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                >
                    <option value="all">Semua Status</option>
                    {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
            </div>

            <div className="flex-grow min-w-[120px]">
                 <label htmlFor="startDateFilter" className="sr-only">Tanggal Mulai</label>
                <input
                    type="date"
                    id="startDateFilter"
                    name="startDate"
                    value={filters.startDate}
                    onChange={(e) => onFilterChange('startDate', e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"
                    placeholder="Tgl. Mulai"
                />
            </div>
            <div className="flex-grow min-w-[120px]">
                <label htmlFor="endDateFilter" className="sr-only">Tanggal Akhir</label>
                <input
                    type="date"
                    id="endDateFilter"
                    name="endDate"
                    value={filters.endDate}
                    onChange={(e) => onFilterChange('endDate', e.target.value)}
                    className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"
                    placeholder="Tgl. Akhir"
                />
            </div>
            
            <div className="flex-shrink-0">
                <button
                    onClick={onReset}
                    className="text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors px-4 py-2 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700"
                >
                    Reset
                </button>
            </div>
        </div>
    );
};

export default FilterBar;