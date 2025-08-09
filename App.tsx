import React, { useState, useEffect } from 'react';
import LoginComponent from './components/Login';
import DashboardComponent from './components/Dashboard';
import { Session, supabase } from './lib/supabaseClient';
import { ToastProvider, useToast } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import PublicView from './components/public/PublicView';
import XCircleIcon from './components/icons/XCircleIcon';

const AppContent: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const { addToast } = useToast();
    
    useEffect(() => {
        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };
        getSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
        });

        return () => subscription.unsubscribe();
    }, []);
    
    const appData = useAppData(session?.user);

    const handleLogin = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            console.error('Login error:', error.message);
            throw new Error(error.message);
        }
        addToast(`Selamat datang kembali!`, 'success');
        setIsLoginModalOpen(false); // Close modal on success
    };

    const handleLogout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) {
            addToast('Gagal logout, coba lagi.', 'error');
        } else {
            addToast('Berhasil logout.', 'info');
        }
    };
    
    if (isLoading) {
      return (
        <div className="fixed inset-0 bg-gray-100 dark:bg-slate-900 flex items-center justify-center z-[200]">
            <div className="text-center">
                <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-pink-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="mt-4 text-slate-600 dark:text-slate-400">Menunggu sesi...</p>
            </div>
        </div>
      );
    }
    
    return (
        <div className="min-h-screen bg-gray-100 dark:bg-slate-900 selection:bg-pink-500 selection:text-white">
            {session && session.user ? (
                 appData.isDataLoaded ? (
                    <DashboardComponent 
                        user={session.user}
                        onLogout={handleLogout} 
                        {...appData}
                    />
                 ) : (
                    <div className="fixed inset-0 bg-gray-100 dark:bg-slate-900 flex items-center justify-center z-[200]">
                        <div className="text-center">
                            <svg className="animate-spin -ml-1 mr-3 h-10 w-10 text-pink-600 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            <p className="mt-4 text-slate-600 dark:text-slate-400">Memuat data...</p>
                        </div>
                    </div>
                 )
            ) : (
                <>
                    <PublicView onLoginRequest={() => setIsLoginModalOpen(true)} />
                    {isLoginModalOpen && (
                         <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4"
                             onClick={() => setIsLoginModalOpen(false)}>
                            <div className="relative" onClick={(e) => e.stopPropagation()}>
                                <LoginComponent onLogin={handleLogin} />
                                <button
                                    onClick={() => setIsLoginModalOpen(false)}
                                    className="absolute -top-3 -right-3 text-white bg-slate-800 rounded-full p-1 shadow-lg hover:bg-slate-700 transition-colors"
                                    aria-label="Tutup"
                                >
                                    <XCircleIcon className="w-8 h-8"/>
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    </ThemeProvider>
  );
};

export default App;