import { createClient } from '@supabase/supabase-js';
import type { User as AuthUser, Session as AuthSession } from '@supabase/auth-js';

const supabaseUrl = 'https://xkvgflhjcnkythytbkuj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdmdmbGhqY25reXRoeXRia3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDM4OTYsImV4cCI6MjA3MDAxOTg5Nn0.X9CM27REAKqjD82jAgZEKRGTo0LTkUpI8Df5feUOxww';

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Re-export Supabase types for convenience
export type User = AuthUser;
export type Session = AuthSession;

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CustomerLevel = 'End Customer' | 'Retail' | 'Grosir' | 'Reseller' | 'Corporate';
export type EmployeePosition = 'Admin' | 'Kasir' | 'Office' | 'Produksi';
export type ProductionStatus = 'Belum Dikerjakan' | 'Proses' | 'Selesai';
export type PaymentStatus = 'Belum Lunas' | 'Lunas';
export type OrderStatus = 'Pending' | 'Proses';
export type AssetCategory = 'Aset Lancar' | 'Aset Tetap' | 'Aset Tidak Terwujud' | 'Aset Lainnya';
export type AssetStatus = 'Baik' | 'Perbaikan' | 'Rusak' | 'Dijual';
export type DebtCategory = 'Pinjaman Bank' | 'Kredit Aset' | 'Hutang Pemasok' | 'Lainnya';
export type DebtStatus = 'Belum Lunas' | 'Lunas Sebagian' | 'Lunas';
export type StockMovementType = 'in' | 'out';
export type ExpenseCategory = 'Bahan' | 'Konsumsi' | 'Bulanan' | 'Operasional' | 'Lain-lain';
export type PrinterType = 'Thermal 58mm' | 'Thermal 80mm' | 'Dot Matrix';
export type PrintTarget = 'SPK' | 'Nota' | 'Struk';

export interface Customer {
    id: number;
    created_at: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    level: CustomerLevel;
}

export interface Employee {
    id: number;
    created_at: string;
    name: string;
    position: EmployeePosition;
    email: string | null;
    phone: string | null;
    user_id: string | null;
}

export interface Bahan {
    id: number;
    created_at: string;
    name: string;
    harga_end_customer: number;
    harga_retail: number;
    harga_grosir: number;
    harga_reseller: number;
    harga_corporate: number;
    stock_qty?: number;
}

export interface Expense {
    id: number;
    created_at: string;
    tanggal: string;
    jenis_pengeluaran: ExpenseCategory;
    keterangan: string | null;
    supplier_id: number | null;
    bahan_id: number | null;
    qty: number;
    harga: number;
}

export interface OrderRow {
    id: number;
    created_at: string;
    no_nota: string;
    tanggal: string;
    pelanggan_id: number;
    pelaksana_id: string | null;
    status_pembayaran: PaymentStatus;
    status_pesanan: OrderStatus;
}

export interface Order extends OrderRow {
    order_items: OrderItem[];
    payments: Payment[];
}

export interface OrderItem {
    id: number;
    created_at: string;
    order_id: number;
    bahan_id: number;
    deskripsi_pesanan: string | null;
    panjang: number | null;
    lebar: number | null;
    qty: number;
    status_produksi: ProductionStatus;
    finishing_id: number | null;
}

export interface Payment {
    id: number;
    created_at: string;
    order_id: number;
    amount: number;
    payment_date: string;
    kasir_id: string | null;
    bank_id: number | null;
}

export interface Bank {
    id: number;
    created_at: string;
    name: string;
    account_holder: string;
    account_number: string;
    category: 'Bank' | 'Digital Wallet' | 'Qris';
}

export interface Asset {
    id: number;
    created_at: string;
    name: string;
    category: AssetCategory;
    purchase_price: number;
    purchase_date: string;
    status: AssetStatus;
    is_dynamic?: boolean;
}

export interface Debt {
    id: number;
    created_at: string;
    creditor_name: string;
    category: DebtCategory;
    description: string;
    total_amount: number;
    due_date: string;
    status: DebtStatus;
}

export interface NotaSetting {
    prefix: string;
    start_number_str: string;
}

export interface Supplier {
    id: number;
    created_at: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    specialty: string | null;
}

export interface StockMovement {
    id: number;
    created_at: string;

    bahan_id: number;
    type: StockMovementType;
    quantity: number;
    supplier_id: number | null;
    notes: string | null;
}

export interface Finishing {
    id: number;
    created_at: string;
    name: string;
    panjang_tambahan: number;
    lebar_tambahan: number;
}

export interface Printer {
    id: number;
    created_at: string;
    name: string;
    type: PrinterType;
    target: PrintTarget;
    is_default: boolean;
}

export interface DisplaySettings {
    id: number;
    created_at: string;
    youtube_url: string[] | null;
}


export interface Database {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'>;
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>;
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, 'id' | 'created_at'>;
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>;
      };
      bahan: {
        Row: Bahan;
        Insert: Omit<Bahan, 'id' | 'created_at' | 'stock_qty'>;
        Update: Partial<Omit<Bahan, 'id' | 'created_at'>>;
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderRow, 'id' | 'created_at'>>;
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderItem, 'id' | 'created_at'>>;
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>;
      };
      banks: {
        Row: Bank;
        Insert: Omit<Bank, 'id' | 'created_at'>;
        Update: Partial<Omit<Bank, 'id' | 'created_at'>>;
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>;
        Update: Partial<Omit<Asset, 'id' | 'created_at' | 'is_dynamic'>>;
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, 'id' | 'created_at'>;
        Update: Partial<Omit<Debt, 'id' | 'created_at'>>;
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'id' | 'created_at'>;
        Update: Partial<Omit<Supplier, 'id' | 'created_at'>>;
      };
      stock_movements: {
        Row: StockMovement;
        Insert: Omit<StockMovement, 'id' | 'created_at'>;
        Update: Partial<Omit<StockMovement, 'id' | 'created_at'>>;
      };
      finishings: {
        Row: Finishing;
        Insert: Omit<Finishing, 'id' | 'created_at'>;
        Update: Partial<Omit<Finishing, 'id' | 'created_at'>>;
      };
      printers: {
        Row: Printer;
        Insert: Omit<Printer, 'id' | 'created_at'>;
        Update: Partial<Omit<Printer, 'id' | 'created_at'>>;
      };
      display_settings: {
        Row: DisplaySettings;
        Insert: Omit<DisplaySettings, 'id' | 'created_at'>;
        Update: Partial<Omit<DisplaySettings, 'id' | 'created_at'>>;
      };
      settings: {
        Row: { key: string; value: string; };
        Insert: { key: string; value: string; };
        Update: { value: string; };
      }
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      [_ in never]: never
    };
  };
}