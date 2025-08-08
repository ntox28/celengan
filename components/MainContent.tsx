

import React from 'react';
import CustomerManagement from './customers/CustomerManagement';
import { EmployeePosition, User as AuthUser } from '../lib/supabaseClient';
import EmployeeManagement from './employees/EmployeeManagement';
import SettingsManagement from './settings/SettingsManagement';
import BahanManagement from './bahan/BahanManagement';
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

type MainContentProps = {
  user: AuthUser;
  activeView: string;
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
    user, activeView,
    customers, addCustomer, updateCustomer, deleteCustomer,
    bahanList, addBahan, updateBahan, deleteBahan,
    employees, addEmployee, updateEmployee, deleteEmployee,
    orders, addOrder, updateOrder, deleteOrder, addPaymentToOrder, updateOrderStatus, updateOrderItemStatus,
    expenses, addExpense, updateExpense, deleteExpense,
    banks, addBank, updateBank, deleteBank,
    printers, addPrinter, updatePrinter, deletePrinter,
    assets, addAsset, updateAsset, deleteAsset,
    debts, addDebt, updateDebt, deleteDebt,
    notaSetting, updateNotaSetting,
    suppliers, addSupplier, updateSupplier, deleteSupplier,
    stockMovements,
    finishings, addFinishing, updateFinishing, deleteFinishing,
    onToggleSidebar
  } = props;
  
  const employee = employees.find(e => e.user_id === user.id);
  // This logic mirrors Dashboard.tsx to ensure consistency.
  // The 'employees' table is the source of truth for the user's position.
  const userRole = employee?.position || (user.user_metadata as { userrole?: EmployeePosition })?.userrole || 'Kasir';
  const displayName = employee ? employee.name : (user.email || 'Pengguna');
  const avatarSeed = displayName;


  const renderContent = () => {
    switch (activeView) {
      case 'Dashboard':
        return <DashboardView orders={orders} customers={customers} expenses={expenses} finishings={finishings} />;
      case 'Keuangan':
        return <FinanceView orders={orders} expenses={expenses} customers={customers} bahanList={bahanList} employees={employees} banks={banks} />;
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
                    printers={printers}
                    finishings={finishings}
                    addFinishing={addFinishing}
                    updateFinishing={updateFinishing}
                    deleteFinishing={deleteFinishing}
                    notaSetting={notaSetting}
                    updateNotaSetting={updateNotaSetting}
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
      case 'Transaksi':
        return <TransactionManagement 
                    orders={orders} 
                    customers={customers} 
                    bahanList={bahanList} 
                    loggedInUser={user} 
                    employees={employees} 
                    addPaymentToOrder={addPaymentToOrder}
                    banks={banks}
                    printers={printers}
                    finishings={finishings}
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
                    printers={printers}
                    addPrinter={addPrinter}
                    updatePrinter={updatePrinter}
                    deletePrinter={deletePrinter}
                    finishings={finishings}
                    addFinishing={addFinishing}
                    updateFinishing={updateFinishing}
                    deleteFinishing={deleteFinishing}
                />;
      default:
        return <WelcomeContent user={user} activeView={activeView} />;
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col bg-gray-100 dark:bg-slate-900 h-screen">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center pb-6 border-b border-slate-200 dark:border-slate-700 flex-shrink-0 gap-4 relative">
        <div className="flex items-center gap-4">
             <button onClick={onToggleSidebar} className="lg:hidden text-slate-600 dark:text-slate-300">
                <MenuIcon className="h-6 w-6" />
             </button>
             <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">{activeView}</h1>
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto">
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
