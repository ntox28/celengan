import React, { useState, useMemo, useEffect } from 'react';
import MainContent from './MainContent';
import DashboardIcon from './icons/DashboardIcon';
import DocumentReportIcon from './icons/DocumentReportIcon';
import OrderIcon from './icons/OrderIcon';
import ProductionIcon from './icons/ProductionIcon';
import TransactionIcon from './icons/TransactionIcon';
import ExpenseIcon from './icons/ExpenseIcon';
import IngredientsIcon from './icons/IngredientsIcon';
import CustomersIcon from './icons/CustomersIcon';
import UserIcon from './icons/UserIcon';
import SettingsIcon from './icons/SettingsIcon';
import LogoutIcon from './icons/LogoutIcon';
import { EmployeePosition, User as AuthUser } from '../lib/supabaseClient';
import ThemeToggle from './ThemeToggle';
import ToastContainer from './toasts/ToastContainer';
import { useAppData } from '../hooks/useAppData';
import SupplierIcon from './icons/SupplierIcon';
import StockIcon from './icons/StockIcon';
import WarehouseIcon from './icons/WarehouseIcon';
import CalendarCheckIcon from './icons/CalendarCheckIcon';

type DashboardProps = {
  user: AuthUser;
  onLogout: () => void;
} & ReturnType<typeof useAppData>;

const allMenuItems = [
  { name: 'Dashboard', icon: DashboardIcon, roles: ['Admin', 'Kasir', 'Produksi', 'Office'] },
  { name: 'Keuangan', icon: DocumentReportIcon, roles: ['Admin'] },
  { name: 'Order', icon: OrderIcon, roles: ['Admin', 'Kasir', 'Office'] },
  { name: 'Produksi', icon: ProductionIcon, roles: ['Admin', 'Kasir', 'Produksi', 'Office'] },
  { name: 'Gudang Produksi', icon: WarehouseIcon, roles: ['Admin', 'Kasir', 'Produksi', 'Office'] },
  { name: 'Transaksi', icon: TransactionIcon, roles: ['Admin', 'Kasir'] },
  { name: 'Pengeluaran', icon: ExpenseIcon, roles: ['Admin', 'Kasir'] },
  { name: 'Stock Bahan', icon: StockIcon, roles: ['Admin', 'Kasir'] },
  { name: 'Daftar Suplier', icon: SupplierIcon, roles: ['Admin', 'Kasir'] },
  { name: 'Daftar Pelanggan', icon: CustomersIcon, roles: ['Admin', 'Kasir'] },
  { name: 'User', icon: UserIcon, roles: ['Admin'] },
  { name: 'Absensi Dan Gaji', icon: CalendarCheckIcon, roles: ['Admin', 'Kasir'] },
  { name: 'Manage Absensi dan Gaji', icon: SettingsIcon, roles: ['Admin'] },
  { name: 'Pengaturan', icon: SettingsIcon, roles: ['Admin'] },
];

const DashboardComponent: React.FC<DashboardProps> = (props) => {
  const { user, onLogout, employees } = props;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const employeeProfile = useMemo(() => employees.find(e => e.user_id === user.id), [employees, user.id]);
  
  const userRole = employeeProfile?.position || (user.user_metadata as { userrole?: EmployeePosition })?.userrole || 'Kasir';
  const localStorageKey = `celengan-app:activeView:${user.id}`;
  
  const settingsMenuItem = allMenuItems.find(item => item.name === 'Pengaturan');

  const visibleMenuItems = useMemo(() => {
    // Filter out 'Pengaturan' as it will be rendered separately at the bottom.
    return allMenuItems.filter(item => item.name !== 'Pengaturan' && item.roles.includes(userRole));
  }, [userRole]);
  
  const allAccessibleViews = useMemo(() => {
     return allMenuItems.filter(item => item.roles.includes(userRole)).map(item => item.name);
  }, [userRole]);

  const [activeView, setActiveView] = useState(() => {
    try {
        const savedView = localStorage.getItem(localStorageKey);
        if (savedView && allAccessibleViews.includes(savedView)) {
            return savedView;
        }
    } catch (error) {
        console.error("Could not read from localStorage", error);
    }
    // Return the first accessible item (which might not be 'Dashboard' for some roles)
    return allAccessibleViews[0] || 'Dashboard';
  });

  useEffect(() => {
    try {
        localStorage.setItem(localStorageKey, activeView);
    } catch (error) {
        console.error("Could not write to localStorage", error);
    }
  }, [activeView, localStorageKey]);

  useEffect(() => {
      if (!allAccessibleViews.includes(activeView)) {
          setActiveView(allAccessibleViews[0] || 'Dashboard');
      }
  }, [allAccessibleViews, activeView]);


  const handleMenuClick = (viewName: string) => {
    setActiveView(viewName);
    if (window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  };
  
  return (
    <div className="flex h-screen bg-gray-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
      <ToastContainer />
      {isSidebarOpen && (
          <div 
              className="fixed inset-0 bg-black/50 z-20 lg:hidden"
              onClick={() => setIsSidebarOpen(false)}
          ></div>
      )}
      <aside className={`fixed lg:relative inset-y-0 left-0 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col z-30 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:flex`}>
        <div className="h-20 flex items-center justify-center border-b border-slate-200 dark:border-slate-700 flex-shrink-0">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-pink-600">CELENGAN</h1>
            <p className="text-xs italic text-slate-500 dark:text-slate-400 -mt-1">Bukan Sekedar Celeng Biasa</p>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto no-scrollbar">
          {visibleMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.name;
            return (
              <a
                key={item.name}
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  handleMenuClick(item.name);
                }}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-pink-600 text-white shadow-lg'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-500'
                }`}
              >
                <Icon className="h-6 w-6 mr-4" />
                <span className="font-medium">{item.name}</span>
              </a>
            );
          })}
        </nav>
        <div className="px-4 py-6 border-t border-slate-200 dark:border-slate-700">
            {userRole === 'Admin' && settingsMenuItem && (() => {
                const Icon = settingsMenuItem.icon;
                const isActive = activeView === settingsMenuItem.name;
                return (
                    <a
                        href="#"
                        onClick={(e) => {
                            e.preventDefault();
                            handleMenuClick(settingsMenuItem.name);
                        }}
                        className={`flex items-center w-full px-4 py-3 mb-2 rounded-lg transition-colors duration-200 ${
                            isActive
                                ? 'bg-pink-600 text-white shadow-lg'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-pink-50 dark:hover:bg-slate-700 hover:text-pink-600 dark:hover:text-pink-500'
                        }`}
                    >
                        <Icon className="h-6 w-6 mr-4" />
                        <span className="font-medium">{settingsMenuItem.name}</span>
                    </a>
                );
            })()}
            <ThemeToggle />
            <button
                onClick={onLogout}
                className="flex items-center w-full px-4 py-3 mt-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-red-50/80 dark:hover:bg-red-900/40 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
            >
                <LogoutIcon className="h-6 w-6 mr-4" />
                <span className="font-medium">Logout</span>
            </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <MainContent 
            {...props}
            activeView={activeView}
            setActiveView={setActiveView}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        />
      </main>
    </div>
  );
};

export default DashboardComponent;