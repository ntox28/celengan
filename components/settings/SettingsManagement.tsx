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
}

const settingsTabs = [
    { name: 'Aset', icon: AssetIcon, component: AssetManagement, props: ['assets', 'addAsset', 'updateAsset', 'deleteAsset'] },
    { name: 'Hutang', icon: TrendingDownIcon, component: DebtManagement, props: ['debts', 'addDebt', 'updateDebt', 'deleteDebt'] },
    { name: 'Bahan', icon: IngredientsIcon, component: BahanManagement, props: ['bahanList', 'addBahan', 'updateBahan', 'deleteBahan'] },
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
            acc[propName] = props[propName as keyof SettingsProps];
            return acc;
        }, {} as any);
        return <TabComponent {...componentProps} />;
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8 h-full">
            <div className="lg:w-1/4 xl:w-1/5 flex-shrink-0">
                <nav className="flex lg:flex-col gap-2">
                    {settingsTabs.map(tab => {
                        const Icon = tab.icon;
                        const isActive = activeTab === tab.name;
                        return (
                            <button
                                key={tab.name}
                                onClick={() => setActiveTab(tab.name)}
                                className={`flex items-center w-full px-4 py-3 rounded-lg text-left transition-colors duration-200 ${
                                    isActive
                                        ? 'bg-pink-600 text-white shadow-lg'
                                        : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-500'
                                }`}
                            >
                                <Icon className="h-5 w-5 mr-3" />
                                <span className="font-medium">{tab.name}</span>
                            </button>
                        );
                    })}
                </nav>
            </div>
            <div className="flex-1 w-full lg:w-3/4 xl:w-4/5">
                {renderContent()}
            </div>
        </div>
    );
};

export default SettingsManagement;