

import React, { useState, useEffect, useMemo } from 'react';
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
import { useToast } from '../hooks/useToast';
import WarehouseManagement from './warehouse/WarehouseManagement';
import PayrollManagement from './payroll/PayrollManagement';
import PayrollSettingsManagement from './payroll/PayrollSettingsManagement';
import BellIcon from './icons/BellIcon';
import NotificationPanel from './notifications/NotificationPanel';
import SendIcon from './icons/SendIcon';
import ChatPanel from './chat/ChatPanel';

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

// Helper function to safely parse playlist data which might be an array, a JSON string, or a single URL string.
const parsePlaylistData = (rawData: any): YouTubePlaylistItem[] => {
  if (Array.isArray(rawData)) {
    // Ensure all items are valid objects before returning
    return rawData.filter(item => typeof item === 'object' && item !== null && 'url' in item && 'title' in item);
  }

  if (typeof rawData === 'string' && rawData.trim()) {
    try {
      const parsed = JSON.parse(rawData);
      if (Array.isArray(parsed)) {
        // Ensure all items in parsed array are valid
        return parsed.filter(item => typeof item === 'object' && item !== null && 'url' in item && 'title' in item);
      }
    } catch (e) {
      // Not a valid JSON string, might be a single URL
      if (rawData.startsWith('http')) {
        return [{ url: rawData, title: 'Judul tidak ditemukan' }];
      }
      // console.error is probably too loud for something that might be intentionally empty/malformed
      console.warn('Could not parse youtube_url from settings. It was not a valid JSON array or a URL.', rawData);
    }
  }

  return [];
};


const MainContent: React.FC<MainContentProps> = (props) => {
  const { 
    user, activeView, setActiveView,
    customers, addCustomer, updateCustomer, deleteCustomer,
    bahanList, addBahan, updateBahan, deleteBahan,
    employees, addEmployee, updateEmployee, deleteEmployee,
    orders, addOrder, updateOrder, deleteOrder, addPaymentToOrder, updateOrderStatus, updateOrderItemStatus,
    filters, setFilters,
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
    payrollConfigs, addPayrollConfig, updatePayrollConfig, deletePayrollConfig,
    attendances, addAttendance, updateAttendance, deleteAttendance,
    payrolls, addPayroll, updatePayroll, deletePayroll,
    teamChatMessages, addChatMessage,
    unreadChatCount, markChatAsRead,
    onToggleSidebar
  } = props;
  
  const employee = employees.find(e => e.user_id === user.id);
  const userRole = employee?.position || (user.user_metadata as { userrole?: EmployeePosition })?.userrole || 'Kasir';
  const displayName = employee ? employee.name : (user.email || 'Pengguna');
  const avatarSeed = displayName;
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  
  const [lastNotificationCheck, setLastNotificationCheck] = useState(() => {
    return localStorage.getItem('celengan-app:lastNotificationCheck') || new Date(0).toISOString();
  });
  const [hasUnread, setHasUnread] = useState(false);

  useEffect(() => {
    const latestOrderDate = orders[0]?.created_at;
    if (latestOrderDate && new Date(latestOrderDate) > new Date(lastNotificationCheck)) {
        setHasUnread(true);
    }
  }, [orders, lastNotificationCheck]);

  const notifications = useMemo(() => {
    return orders
        .slice(0, 10) // Get latest 10
        .map(order => {
            const customer = customers.find(c => c.id === order.pelanggan_id);
            return {
                id: order.id,
                title: `Pesanan #${order.no_nota}`,
                description: `Dari: ${customer?.name || 'N/A'}. Status: ${order.status_pesanan}`,
                timestamp: order.created_at,
                status: order.status_pesanan
            };
        });
  }, [orders, customers]);
  
  const handleBellClick = () => {
    if (!isNotificationOpen) {
        const now = new Date().toISOString();
        localStorage.setItem('celengan-app:lastNotificationCheck', now);
        setLastNotificationCheck(now);
        setHasUnread(false);
    }
    setIsNotificationOpen(prev => !prev);
  };
  
  const handleChatClick = () => {
    setIsChatOpen(true);
    markChatAsRead();
  };

  const handleNotificationClick = (orderId: number) => {
    setActiveView('Order');
    setIsNotificationOpen(false);
    // Future enhancement: scroll to the specific order if it's on the current page
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
                    employees={employees}
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
                    filters={filters}
                    setFilters={setFilters}
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
            loggedInUser={user}
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
                    loadMoreOrders={loadMoreOrders}
                    hasMoreOrders={hasMoreOrders}
                    isOrderLoading={isOrderLoading}
                    filters={filters}
                    setFilters={setFilters}
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
      case 'Absensi Dan Gaji':
        return <PayrollManagement 
            employees={employees}
            payrollConfigs={payrollConfigs}
            attendances={attendances}
            addAttendance={addAttendance}
            updateAttendance={updateAttendance}
            deleteAttendance={deleteAttendance}
            payrolls={payrolls}
            addPayroll={addPayroll}
            updatePayroll={updatePayroll}
            deletePayroll={deletePayroll}
        />;
      case 'Manage Absensi dan Gaji':
        return <PayrollSettingsManagement 
            employees={employees}
            payrollConfigs={payrollConfigs}
            addPayrollConfig={addPayrollConfig}
            updatePayrollConfig={updatePayrollConfig}
            deletePayrollConfig={deletePayrollConfig}
            payrolls={payrolls}
            updatePayroll={updatePayroll}
            loggedInUser={user}
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
                    customers={customers}
                    suppliers={suppliers}
                />;
      default:
        return <WelcomeContent user={user} activeView={activeView} />;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col bg-gray-100 dark:bg-slate-900 h-screen">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 gap-4">
        <div className="flex items-center gap-4">
             <button onClick={onToggleSidebar} className="lg:hidden text-slate-600 dark:text-slate-300">
                <MenuIcon className="h-6 w-6" />
             </button>
             <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{activeView}</h1>
        </div>
        <div className="flex items-center justify-end space-x-2 sm:space-x-4 w-full sm:w-auto">
          <div className="flex items-center">
              <button
                  onClick={handleChatClick}
                  className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Team Chat"
              >
                  <SendIcon className="h-6 w-6" />
                  {unreadChatCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold ring-2 ring-white dark:ring-gray-100">
                          {unreadChatCount > 9 ? '9+' : unreadChatCount}
                      </span>
                  )}
              </button>
              <button
                  onClick={handleBellClick}
                  className="relative p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                  title="Notifikasi"
              >
                  <BellIcon className="h-6 w-6" />
                  {hasUnread && (
                      <span className="absolute top-1.5 right-1.5 block h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-white dark:ring-gray-100"></span>
                  )}
              </button>
          </div>
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

       {/* Notification Modal */}
       {isNotificationOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
          onClick={() => setIsNotificationOpen(false)}
        >
          <div onClick={e => e.stopPropagation()}>
             <NotificationPanel
                  isOpen={isNotificationOpen}
                  onClose={() => setIsNotificationOpen(false)}
                  notifications={notifications}
                  onNotificationClick={handleNotificationClick}
                  onViewAll={() => handleNotificationClick(0)}
              />
          </div>
        </div>
      )}

      {/* Chat Modal */}
      {isChatOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 flex items-center justify-center"
          onClick={() => setIsChatOpen(false)}
        >
          <div onClick={e => e.stopPropagation()}>
             <ChatPanel
                  isOpen={isChatOpen}
                  onClose={() => setIsChatOpen(false)}
                  messages={teamChatMessages}
                  currentUser={user}
                  onSendMessage={addChatMessage}
              />
          </div>
        </div>
      )}
    </div>
  );
};

export default MainContent;