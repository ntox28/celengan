
import React, { useState, useEffect } from 'react';
import CustomerManagement from './customers/CustomerManagement';
import { EmployeePosition, User as AuthUser, YouTubePlaylistItem } from '../lib/supabaseClient';
import EmployeeManagement from './employees/EmployeeManagement';
import SettingsManagement from './settings/SettingsManagement';
import ExpenseManagement from './expenses/ExpenseManagement';
import OrderManagement from './orders/OrderManagement';
import ProductionManagement from './production/ProductionManagement';
import TransactionManagement from './transactions/TransactionManagement';
import DashboardView from './dashboard/DashboardView';
import FinanceView from './finance/FinanceView';
import MenuIcon from './icons/MenuIcon';
import { useAppData } from '../hooks/useAppData';
import SupplierManagement from './suppliers/SupplierManagement';
import StockManagement from './stock/StockManagement';
import YouTubeIcon from './icons/YouTubeIcon';
import YouTubePlaylistModal from './settings/YouTubePlaylistModal';
import PlusIcon from './icons/PlusIcon';
import { useToast } from '../hooks/useToast';
import WarehouseManagement from './warehouse/WarehouseManagement';

type MainContentProps = {
  user: AuthUser;
  activeView: string;
  setActiveView: (view: string) => void;
  onToggleSidebar: () => void;
} & ReturnType<typeof useAppData>;

const WelcomeContent: React.FC<{ user: AuthUser; activeView: string }> = ({ user, activeView }) => (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-lg border border-slate-200 dark:border-slate-700">
        <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
            Selamat Datang di {activeView}
        </h2>
        <p className="text-slate-600 dark:text-slate-300">
            Ini adalah area konten untuk {activeView}. Fungsionalitas spesifik untuk modul ini akan ditampilkan di sini.
            Saat ini, Anda masuk sebagai <span className="font-bold text-pink-600 capitalize">{user.email}</span>.
        </p>
    </div>
);


const MainContent: React.FC<MainContentProps> = (props) => {
  const { 
    user, activeView, setActiveView,
    customers, addCustomer, updateCustomer, deleteCustomer,
    bahanList, addBahan, updateBahan, deleteBahan,
    employees, addEmployee, updateEmployee, deleteEmployee,
    orders, addOrder, updateOrder, deleteOrder, addPaymentToOrder, updateOrderStatus, updateOrderItemStatus,
    loadMoreOrders, hasMoreOrders, isOrderLoading,
    expenses, addExpense, updateExpense, deleteExpense,
    banks, addBank, updateBank, deleteBank,
    assets, addAsset, updateAsset, deleteAsset,
    debts, addDebt, updateDebt, deleteDebt,
    notaSetting, updateNotaSetting,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    stockMovements,
    finishings, addFinishing, updateFinishing, deleteFinishing,
    addBulkPaymentToOrders,
    updateBahanStock,
    displaySettings,
    updateYouTubePlaylist,
    onToggleSidebar
  } = props;
  
  const { addToast } = useToast();
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [newYoutubeUrl, setNewYoutubeUrl] = useState('');
  const [isAddingUrl, setIsAddingUrl] = useState(false);
  const [stagedPlaylist, setStagedPlaylist] = useState<YouTubePlaylistItem[]>([]);

  useEffect(() => {
    setStagedPlaylist(displaySettings?.youtube_url || []);
  }, [displaySettings]);
  
  const employee = employees.find(e => e.user_id === user.id);
  const userRole = employee?.position || (user.user_metadata as { userrole?: EmployeePosition })?.userrole || 'Kasir';
  const displayName = employee ? employee.name : (user.email || 'Pengguna');
  const avatarSeed = displayName;

  const handleClosePlaylistModal = () => {
    setIsPlaylistModalOpen(false);
    // Discard any staged changes by re-syncing from the source of truth
    setStagedPlaylist(displaySettings?.youtube_url || []);
  };

  const handleAddYoutubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newYoutubeUrl.trim()) {
        addToast('URL YouTube tidak boleh kosong.', 'error');
        return;
    }

    try {
        new URL(newYoutubeUrl);
    } catch (_) {
        addToast('URL YouTube tidak valid.', 'error');
        return;
    }

    setIsAddingUrl(true);
    try {
        if (stagedPlaylist.some(item => item.url === newYoutubeUrl.trim())) {
            addToast('URL ini sudah ada di dalam daftar.', 'info');
            setNewYoutubeUrl('');
            return;
        }

        const response = await fetch(`https://noembed.com/embed?url=${encodeURIComponent(newYoutubeUrl.trim())}`);
        if (!response.ok) {
            throw new Error('Gagal mengambil judul video. Pastikan URL valid.');
        }
        const data = await response.json();
        const title = data.title || 'Judul tidak ditemukan';

        const newItem: YouTubePlaylistItem = { url: newYoutubeUrl.trim(), title };
        
        setStagedPlaylist(prev => [...prev, newItem]);
        setNewYoutubeUrl('');
        addToast(`"${title}" ditambahkan. Buka 'Atur Playlist' untuk menyimpan.`, 'success');
    } catch (error: any) {
        addToast(error.message || 'Terjadi kesalahan.', 'error');
        console.error(error);
    } finally {
        setIsAddingUrl(false);
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <DashboardView orders={orders} customers={customers} expenses={expenses} finishings={finishings} />;
      case 'Keuangan':
        return <FinanceView 
                    orders={orders} 
                    expenses={expenses} 
                    customers={customers} 
                    bahanList={bahanList} 
                    employees={employees} 
                    banks={banks}
                    assets={assets}
                    debts={debts}
                />;
      case 'Order':
        return <OrderManagement 
                    customers={customers} 
                    addCustomer={addCustomer}
                    bahanList={bahanList} 
                    orders={orders} 
                    loggedInUser={user} 
                    addOrder={addOrder} 
                    updateOrder={updateOrder} 
                    deleteOrder={deleteOrder} 
                    updateOrderStatus={updateOrderStatus}
                    finishings={finishings}
                    addFinishing={addFinishing}
                    updateFinishing={updateFinishing}
                    deleteFinishing={deleteFinishing}
                    notaSetting={notaSetting}
                    updateNotaSetting={updateNotaSetting}
                    loadMoreOrders={loadMoreOrders}
                    hasMoreOrders={hasMoreOrders}
                    isOrderLoading={isOrderLoading}
                />;
      case 'Produksi':
        return <ProductionManagement 
                    orders={orders} 
                    customers={customers} 
                    bahanList={bahanList}
                    employees={employees}
                    loggedInUser={user}
                    updateOrderStatus={updateOrderStatus}
                    updateOrderItemStatus={updateOrderItemStatus}
                    finishings={finishings}
                />;
      case 'Gudang Produksi':
        return <WarehouseManagement
            orders={orders}
            customers={customers}
            bahanList={bahanList}
            finishings={finishings}
            employees={employees}
            updateOrderStatus={updateOrderStatus}
        />;
      case 'Transaksi':
        return <TransactionManagement 
                    orders={orders} 
                    customers={customers} 
                    bahanList={bahanList} 
                    loggedInUser={user} 
                    employees={employees} 
                    addPaymentToOrder={addPaymentToOrder}
                    banks={banks}
                    finishings={finishings}
                    addBulkPaymentToOrders={addBulkPaymentToOrders}
                />;
      case 'Daftar Pelanggan':
        return <CustomerManagement 
                    customers={customers} 
                    addCustomer={addCustomer} 
                    updateCustomer={updateCustomer}
                    deleteCustomer={deleteCustomer} 
                />;
      case 'User':
        return <EmployeeManagement 
                    employees={employees} 
                    addEmployee={addEmployee}
                    updateEmployee={updateEmployee}
                    deleteEmployee={deleteEmployee}
                />;
      case 'Daftar Suplier':
        return <SupplierManagement
                    suppliers={suppliers}
                    addSupplier={addSupplier}
                    updateSupplier={updateSupplier}
                    deleteSupplier={deleteSupplier}
                />;
      case 'Stock Bahan':
        return <StockManagement
                    bahanList={bahanList}
                    suppliers={suppliers}
                    stockMovements={stockMovements}
                />;
       case 'Pengeluaran':
        return <ExpenseManagement 
                    expenses={expenses}
                    addExpense={addExpense}
                    updateExpense={updateExpense}
                    deleteExpense={deleteExpense}
                    suppliers={suppliers}
                    bahanList={bahanList}
                />;
      case 'Pengaturan':
        return <SettingsManagement 
                    banks={banks}
                    addBank={addBank}
                    updateBank={updateBank}
                    deleteBank={deleteBank}
                    assets={assets}
                    addAsset={addAsset}
                    updateAsset={updateAsset}
                    deleteAsset={deleteAsset}
                    debts={debts}
                    addDebt={addDebt}
                    updateDebt={updateDebt}
                    deleteDebt={deleteDebt}
                    bahanList={bahanList}
                    addBahan={addBahan}
                    updateBahan={updateBahan}
                    deleteBahan={deleteBahan}
                    finishings={finishings}
                    addFinishing={addFinishing}
                    updateFinishing={updateFinishing}
                    deleteFinishing={deleteFinishing}
                    updateBahanStock={updateBahanStock}
                />;
      default:
        return <WelcomeContent user={user} activeView={activeView} />;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col bg-gray-100 dark:bg-slate-900 h-screen">
      {isPlaylistModalOpen && (
          <YouTubePlaylistModal
              isOpen={isPlaylistModalOpen}
              onClose={handleClosePlaylistModal}
              playlistItems={stagedPlaylist}
              onSave={async (newPlaylist) => {
                  await updateYouTubePlaylist(newPlaylist);
                  setIsPlaylistModalOpen(false); // Close modal on successful save
              }}
          />
      )}
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 gap-4 relative">
        <div className="flex items-center gap-4">
             <button onClick={onToggleSidebar} className="lg:hidden text-slate-600 dark:text-slate-300">
                <MenuIcon className="h-6 w-6" />
             </button>
             <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{activeView}</h1>
        </div>
        <div className="flex items-center justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
          <form onSubmit={handleAddYoutubeUrl} className="flex items-center gap-2">
            <input
              type="url"
              value={newYoutubeUrl}
              onChange={(e) => setNewYoutubeUrl(e.target.value)}
              placeholder="Tambah link YouTube..."
              className="w-full sm:w-64 pl-4 pr-4 py-2 bg-slate-100 dark:bg-slate-700/50 border border-transparent focus:border-pink-500 rounded-md text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-pink-500 transition duration-300 text-sm"
            />
            <button
              type="submit"
              disabled={isAddingUrl}
              className="p-2 flex-shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Tambah ke Playlist"
            >
              {isAddingUrl ? (
                <svg className="animate-spin h-6 w-6 text-slate-500 dark:text-slate-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <PlusIcon className="h-6 w-6" />
              )}
            </button>
          </form>
          <button
              onClick={() => setIsPlaylistModalOpen(true)}
              className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title="Atur Playlist YouTube"
          >
              <YouTubeIcon className="h-6 w-6" />
          </button>
          <div className="text-right flex-shrink-0">
            <p className="text-slate-800 dark:text-slate-200 font-semibold capitalize truncate">{displayName}</p>
            <p className="text-sm text-slate-500 dark:text-slate-400 capitalize">{userRole}</p>
          </div>
          <img
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-pink-500 object-cover"
            src={`https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(avatarSeed)}`}
            alt="User Avatar"
          />
        </div>
      </header>

      {/* Content Area */}
      <div className="flex-1 mt-6 lg:mt-8 overflow-y-auto no-scrollbar">
        {renderContent()}
      </div>
    </div>
  );
};

export default MainContent;
