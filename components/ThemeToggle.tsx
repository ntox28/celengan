
import React from 'react';
import { useTheme } from '../hooks/useTheme';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';

const ThemeToggle: React.FC = () => {
    const { theme, toggleTheme } = useTheme();

    return (
        <button
            onClick={toggleTheme}
            className="flex items-center w-full px-4 py-3 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-800 dark:hover:text-slate-200 transition-colors duration-200"
            aria-label="Toggle theme"
        >
            {theme === 'light' ? <SunIcon className="h-6 w-6 mr-4" /> : <MoonIcon className="h-6 w-6 mr-4" />}
            <span className="font-medium capitalize">{theme === 'light' ? 'Light' : 'Dark'} Mode</span>
        </button>
    );
};

export default ThemeToggle;
