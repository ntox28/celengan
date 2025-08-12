import React, { useState, useEffect } from 'react';
import LoginComponent from './components/Login';
import DashboardComponent from './components/Dashboard';
import { Session, supabase } from './lib/supabaseClient';
import { ToastProvider, useToast } from './hooks/useToast';
import { ThemeProvider } from './hooks/useTheme';
import { useAppData } from './hooks/useAppData';
import { NotificationSettingsProvider } from './hooks/useNotificationSettings';

const AppContent: React.FC = () => {
    const [session, setSession] = useState<Session | null>(null);
    const [isLoading, setIsLoading] = useState(true);
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
                <div className="flex items-center justify-center min-h-screen p-4">
                    <LoginComponent onLogin={handleLogin} />
                </div>
            )}
        </div>
    );
};


const App: React.FC = () => {
  return (
    <ThemeProvider>
      <NotificationSettingsProvider>
        <ToastProvider>
            <AppContent />
        </ToastProvider>
      </NotificationSettingsProvider>
    </ThemeProvider>
  );
};

export default App;