

import React, { useState } from 'react';
import { Bank, Asset, Debt, Bahan, Finishing } from '../../lib/supabaseClient';
import BankManagement from './BankManagement';
import BankIcon from '../icons/BankIcon';
import AssetIcon from '../icons/AssetIcon';
import AssetManagement from './AssetManagement';
import DebtManagement from './DebtManagement';
import TrendingDownIcon from '../icons/TrendingDownIcon';
import IngredientsIcon from '../icons/IngredientsIcon';
import BahanManagement from '../bahan/BahanManagement';
import FinishingIcon from '../icons/FinishingIcon';

interface SettingsProps {
    banks: Bank[];
    addBank: (data: Omit<Bank, 'id' | 'created_at'>) => Promise<Bank>;
    updateBank: (id: number, data: Partial<Omit<Bank, 'id' | 'created_at'>>) => Promise<void>;
    deleteBank: (id: number) => Promise<void>;
    assets: Asset[];
    addAsset: (data: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>) => Promise<Asset>;
    updateAsset: (id: number, data: Partial<Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>>) => Promise<void>;
    deleteAsset: (id: number) => Promise<void>;
    debts: Debt[];
    addDebt: (data: Omit<Debt, 'id' | 'created_at'>) => Promise<Debt>;
    updateDebt: (id: number, data: Partial<Omit<Debt, 'id' | 'created_at'>>) => Promise<void>;
    deleteDebt: (id: number) => Promise<void>;
    bahanList: Bahan[];
    addBahan: (data: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>) => Promise<Bahan>;
    updateBahan: (id: number, data: Partial<Omit<Bahan, 'id' | 'created_at'>>) => Promise<void>;
    deleteBahan: (id: number) => Promise<void>;
}

const subMenus = [
    { key: 'cash-bank', label: 'Sumber Dana', icon: BankIcon },
    { key: 'assets', label: 'Aset', icon: AssetIcon },
    { key: 'bahan', label: 'Bahan', icon: IngredientsIcon },
    { key: 'debt', label: 'Hutang Perusahaan', icon: TrendingDownIcon },
];

const SettingsManagement: React.FC<SettingsProps> = (props) => {
    const [activeSubMenu, setActiveSubMenu] = useState('cash-bank');
    const { 
        banks, addBank, updateBank, deleteBank, 
        assets, addAsset, updateAsset, deleteAsset,
        debts, addDebt, updateDebt, deleteDebt,
        bahanList, addBahan, updateBahan, deleteBahan,
    } = props;

    const renderContent = () => {
        switch (activeSubMenu) {
            case 'cash-bank':
                return <BankManagement banks={banks} addBank={addBank} updateBank={updateBank} deleteBank={deleteBank} />;
            case 'assets':
                return <AssetManagement assets={assets} addAsset={addAsset} updateAsset={updateAsset} deleteAsset={deleteAsset} />;
            case 'bahan':
                return <BahanManagement bahanList={bahanList} addBahan={addBahan} updateBahan={updateBahan} deleteBahan={deleteBahan} />;
            case 'debt':
                return <DebtManagement debts={debts} addDebt={addDebt} updateDebt={updateDebt} deleteDebt={deleteDebt} />;
            default:
                return null;
        }
    };
    
    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 dark:border-slate-700">
                <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
                    {subMenus.map(menu => {
                        const Icon = menu.icon;
                        const isActive = activeSubMenu === menu.key;
                        return (
                             <button
                                key={menu.key}
                                onClick={() => setActiveSubMenu(menu.key)}
                                className={`flex items-center whitespace-nowrap py-4 px-2 border-b-2 font-medium text-sm transition-colors ${
                                    isActive
                                        ? 'border-pink-600 text-pink-600'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-600'
                                }`}
                            >
                                <Icon className="h-5 w-5 mr-2 flex-shrink-0" />
                                <span className="text-sm">{menu.label}</span>
                            </button>
                        )
                    })}
                </nav>
            </div>
            <div className="flex-1 mt-8">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsManagement;