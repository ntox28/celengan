

import React, { useState, useEffect, useRef } from 'react';
import { Order, Customer } from '../lib/supabaseClient';
import SearchIcon from './icons/SearchIcon';

type SearchResult = {
  type: 'order' | 'customer';
  id: number;
  title: string;
  subtitle: string;
  view: string;
};

interface GlobalSearchProps {
  orders: Order[];
  customers: Customer[];
  onResultSelect: (view: string, id: number | string) => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ orders, customers, onResultSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const lowerCaseQuery = query.toLowerCase();
    const foundOrders: SearchResult[] = orders
      .filter(o =>
        o.no_nota.toLowerCase().includes(lowerCaseQuery) ||
        o.order_items.some(item => item.deskripsi_pesanan?.toLowerCase().includes(lowerCaseQuery))
      )
      .map(o => ({
        type: 'order',
        id: o.id,
        title: `Nota: ${o.no_nota}`,
        subtitle: `Pelanggan: ${customers.find(c => c.id === o.pelanggan_id)?.name || 'N/A'}`,
        view: 'Transaksi',
      }));

    const foundCustomers: SearchResult[] = customers
      .filter(c =>
        c.name.toLowerCase().includes(lowerCaseQuery) ||
        c.phone.includes(lowerCaseQuery)
      )
      .map(c => ({
        type: 'customer',
        id: c.id,
        title: c.name,
        subtitle: `Level: ${c.level}`,
        view: 'Daftar Pelanggan',
      }));
    
    setResults([...foundOrders, ...foundCustomers].slice(0, 10));

  }, [query, orders, customers]);

  const handleSelect = (result: SearchResult) => {
    let targetView = result.view;
    // Simple logic to redirect based on result type
    if(result.type === 'order') {
        // We can choose the best default view. Transaksi is a good hub.
        targetView = 'Transaksi';
    } else if (result.type === 'customer') {
        targetView = 'Daftar Pelanggan';
    }

    onResultSelect(targetView, result.id);
    setQuery('');
    setResults([]);
    setIsFocused(false);
  };

  const groupedResults = results.reduce((acc, result) => {
    const key = result.type === 'order' ? 'Pesanan & Transaksi' : 'Pelanggan';
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <div className="relative w-full max-w-xs" ref={searchRef}>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <SearchIcon className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Cari No. Nota, Pelanggan..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className="w-full pl-10 pr-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-pink-500 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500 transition duration-300"
        />
      </div>

      {isFocused && query.length > 1 && (
        <div className="absolute mt-2 w-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg z-20 max-h-96 overflow-y-auto">
            {results.length > 0 ? (
                 <div className="p-2 space-y-2">
                    {Object.entries(groupedResults).map(([groupName, groupResults]) => (
                        <div key={groupName}>
                            <h4 className="px-3 pt-2 pb-1 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{groupName}</h4>
                            <ul>
                                {groupResults.map(result => (
                                    <li
                                        key={`${result.type}-${result.id}`}
                                        onClick={() => handleSelect(result)}
                                        className="px-3 py-2 rounded-md hover:bg-pink-50 dark:hover:bg-slate-700 cursor-pointer"
                                    >
                                        <p className="font-semibold text-slate-800 dark:text-slate-100">{result.title}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{result.subtitle}</p>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-4 text-sm text-slate-500 dark:text-slate-400">Tidak ada hasil ditemukan.</div>
            )}
        </div>
      )}
    </div>
  );
};

export default GlobalSearch;