import React, { useState } from 'react';
import UserIcon from './icons/UserIcon';
import LockIcon from './icons/LockIcon';
import NalaKuLogo from './icons/NalaKuLogo';
import { useToast } from '../hooks/useToast';
import EmailIcon from './icons/EmailIcon';

interface LoginComponentProps {
    onLogin: (email: string, password: string) => Promise<void>;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('admin@celengan.com');
    const [password, setPassword] = useState('password');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { addToast } = useToast();

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await onLogin(email, password);
            // Success toast is handled in the parent component
        } catch (err: any) {
            const errorMessage = 'Email atau password yang Anda masukkan salah.';
            setError(errorMessage);
            addToast('Login gagal. Periksa kembali kredensial Anda.', 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6">
            <div className="text-center">
                <NalaKuLogo className="w-20 h-20 mx-auto mb-4" />
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">CELENGAN</h1>
                <p className="text-slate-600 dark:text-slate-400 mt-2">Bukan Sekedar Celeng Biasa</p>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <EmailIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="email"
                        name="email"
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"
                        placeholder="Masukkan Email"
                    />
                </div>
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <LockIcon className="h-5 w-5 text-slate-400" />
                    </div>
                    <input
                        id="password"
                        name="password"
                        type="password"
                        autoComplete="current-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition duration-300"
                        placeholder="Masukkan Password"
                    />
                </div>

                 {error && <p className="text-sm text-red-500 text-center">{error}</p>}

                <div>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-white focus:ring-pink-500 disabled:bg-pink-300 disabled:cursor-not-allowed transition-all duration-300 mt-4"
                    >
                        {isLoading ? (
                           <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                             <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                             <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                           </svg>
                        ) : 'Masuk'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default LoginComponent;