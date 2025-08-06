
import React from 'react';
import DocumentReportIcon from '../icons/DocumentReportIcon';

interface PlaceholderSettingsProps {
    title: string;
    description: string;
}

const PlaceholderSettings: React.FC<PlaceholderSettingsProps> = ({ title, description }) => {
    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-lg border border-slate-200 dark:border-slate-700 h-full flex flex-col items-center justify-center text-center">
            <div className="bg-slate-100 dark:bg-slate-700 p-4 rounded-full mb-4">
                 <DocumentReportIcon className="w-10 h-10 text-slate-400 dark:text-slate-500" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="mt-2 text-slate-600 dark:text-slate-400 max-w-sm">
                {description} Fitur ini sedang dalam tahap pengembangan dan akan segera tersedia.
            </p>
        </div>
    );
};

export default PlaceholderSettings;
