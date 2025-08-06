

import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center space-x-4 transition-all duration-300 hover:border-pink-300 dark:hover:border-pink-500/50 hover:shadow-lg hover:shadow-pink-500/5">
            <div className="bg-pink-100 dark:bg-pink-900/40 p-3 rounded-full">
                <div className="text-pink-600 dark:text-pink-400 w-6 h-6">
                   {icon}
                </div>
            </div>
            <div>
                <p className="text-sm text-slate-600 dark:text-slate-400">{title}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
            </div>
        </div>
    );
};

export default StatCard;