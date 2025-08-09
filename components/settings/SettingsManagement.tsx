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
import FinishingManagement from './FinishingManagement';
import StockOpnameManagement from '../stock/StockOpnameManagement';
import ClipboardListIcon from '../icons/ClipboardListIcon';

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
    finishings: Finishing[];
    addFinishing: (data: Omit<Finishing, 'id' | 'created_at'>) => Promise<Finishing>;
    updateFinishing: (id: number, data: Partial<Omit<Finishing, 'id' | 'created_at'>>) => Promise<void>;
    deleteFinishing: (id: number) => Promise<void>;
    updateBahanStock: (bahanId: number, newStockQty: number, notes: string) => Promise<void>;
}

const settingsTabs = [
    { name: 'Aset', icon: AssetIcon, component: AssetManagement, props: ['assets', 'addAsset', 'updateAsset', 'deleteAsset'] },
    { name: 'Hutang', icon: TrendingDownIcon, component: DebtManagement, props: ['debts', 'addDebt', 'updateDebt', 'deleteDebt'] },
    { name: 'Bahan', icon: IngredientsIcon, component: BahanManagement, props: ['bahanList', 'addBahan', 'updateBahan', 'deleteBahan'] },
    { name: 'Stock Opname', icon: ClipboardListIcon, component: StockOpnameManagement, props: ['bahanList', 'updateBahanStock'] },
    { name: 'Bank', icon: BankIcon, component: BankManagement, props: ['banks', 'addBank', 'updateBank', 'deleteBank'] },
    { name: 'Finishing', icon: FinishingIcon, component: FinishingManagement, props: ['finishings', 'addFinishing', 'updateFinishing', 'deleteFinishing'] }
];

const SettingsManagement: React.FC<SettingsProps> = (props) => {
    const [activeTab, setActiveTab] = useState(settingsTabs[0].name);

    const renderContent = () => {
        const tab = settingsTabs.find(t => t.name === activeTab);
        if (!tab) return null;
        const TabComponent = tab.component as React.ElementType;
        const componentProps = tab.props.reduce((acc, propName) => {
            acc[propName as keyof SettingsProps] = props[propName as keyof SettingsProps];
            return acc;
        }, {} as any);
        return <TabComponent {...componentProps} />;
    };

    return (
        <div className="flex flex-col h-full">
            <div className="border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
                <nav className="-mb-px flex space-x-6 overflow-x-auto no-scrollbar" aria-label="Tabs">
                    {settingsTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.name;
                        return (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`flex items-center whitespace-nowrap py-4 px-3 border-b-2 font-medium text-sm transition-colors ${
                                    isActive
                                        ? 'border-pink-600 text-pink-600'
                                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:border-slate-400 dark:hover:border-slate-500'
                                }`}
                            >
                                <Icon className="h-5 w-5 mr-2" />
                                <span>{tab.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
            
            <div className="mt-6 flex-1">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsManagement;
