

import React from 'react';
import { Customer } from '../lib/supabaseClient';
import FilterIcon from './icons/FilterIcon';
import SearchIcon from './icons/SearchIcon';

interface FilterBarProps {
    customers: Customer[];
    statusOptions: { value: string; label: string }[];
    filters: Record<string, string>;
    onFilterChange: (name: string, value: string) => void;
    onReset: () => void;
    statusFilterName?: string;
    showSearch?: boolean;
    searchPlaceholder?: string;
}

const FilterBar: React.FC<FilterBarProps> = ({ customers, statusOptions, filters, onFilterChange, onReset, statusFilterName = 'status', showSearch = false, searchPlaceholder = "Cari..." }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-lg border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap items-center gap-4 text-sm no-print">
            <FilterIcon className="w-5 h-5 text-slate-500 dark:text-slate-400 hidden sm:block flex-shrink-0" />
            
            {showSearch && (
                 <div className="relative flex-grow min-w-[150px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <SearchIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder={searchPlaceholder}
                        value={filters.searchQuery || ''}
                        onChange={(e) => onFilterChange('searchQuery', e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500"
                    />
                </div>
            )}

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
            
            {statusOptions.length > 0 && (
                <div className="flex-grow min-w-[150px]">
                    <label htmlFor="statusFilter" className="sr-only">Status</label>
                    <select
                        id="statusFilter"
                        name={statusFilterName}
                        value={filters[statusFilterName]}
                        onChange={(e) => onFilterChange(statusFilterName, e.target.value)}
                        className="w-full bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300 appearance-none"
                        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2394a3b8' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em' }}
                    >
                        <option value="all">Semua Status</option>
                        {statusOptions.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                </div>
            )}


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
