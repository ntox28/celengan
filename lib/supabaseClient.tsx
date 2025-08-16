import { createClient } from '@supabase/supabase-js';
import type { User as AuthUser, Session as AuthSession } from '@supabase/auth-js';

const supabaseUrl = 'https://xkvgflhjcnkythytbkuj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhrdmdmbGhqY25reXRoeXRia3VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDM4OTYsImV4cCI6MjA3MDAxOTg5Nn0.X9CM27REAKqjD82jAgZEKRGTo0LTkUpI8Df5feUOxww';

// All type definitions must come before they are used in createClient.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type CustomerLevel = 'End Customer' | 'Retail' | 'Grosir' | 'Reseller' | 'Corporate';
export type EmployeePosition = 'Admin' | 'Kasir' | 'Office' | 'Produksi';
export type ProductionStatus = 'Belum Dikerjakan' | 'Proses' | 'Ready';
export type PaymentStatus = 'Belum Lunas' | 'Lunas';
export type OrderStatus = 'Pending' | 'Waiting' | 'Proses' | 'Ready' | 'Delivered';
export type AssetCategory = 'Aset Lancar' | 'Aset Tetap' | 'Aset Tidak Terwujud' | 'Aset Lainnya';
export type AssetStatus = 'Baik' | 'Perbaikan' | 'Rusak' | 'Dijual';
export type DebtCategory = 'Pinjaman Bank' | 'Kredit Aset' | 'Hutang Pemasok' | 'Lainnya';
export type DebtStatus = 'Belum Lunas' | 'Lunas Sebagian' | 'Lunas';
export type StockMovementType = 'in' | 'out';
export type ExpenseCategory = 'Bahan' | 'Konsumsi' | 'Bulanan' | 'Operasional' | 'Lain-lain';
export type PrinterType = 'Thermal 58mm' | 'Thermal 80mm' | 'Dot Matrix';
export type PrintTarget = 'SPK' | 'Nota' | 'Struk';
export type PayrollStatus = 'pending_approval' | 'approved' | 'rejected' | 'paid';


export type YouTubePlaylistItem = {
    url: string;
    title: string;
};

export type Customer = {
    id: number;
    created_at: string;
    name: string;
    email: string;
    phone: string;
    address: string;
    level: CustomerLevel;
};

export type Employee = {
    id: number;
    created_at: string;
    name: string;
    position: EmployeePosition;
    email: string | null;
    phone: string | null;
    user_id: string | null;
};

export type Bahan = {
    id: number;
    created_at: string;
    name: string;
    harga_end_customer: number;
    harga_retail: number;
    harga_grosir: number;
    harga_reseller: number;
    harga_corporate: number;
    stock_qty?: number;
};

export type Expense = {
    id: number;
    created_at: string;
    tanggal: string;
    jenis_pengeluaran: ExpenseCategory;
    keterangan: string | null;
    supplier_id: number | null;
    bahan_id: number | null;
    qty: number;
    harga: number;
};

export type OrderRow = {
    id: number;
    created_at: string;
    no_nota: string;
    tanggal: string;
    pelanggan_id: number;
    status_pembayaran: PaymentStatus;
    status_pesanan: OrderStatus;
    pelaksana_order_id: string | null;
    pelaksana_produksi_id: string | null;
    pelaksana_delivery_id: string | null;
};

export type Order = OrderRow & {
    order_items: OrderItem[];
    payments: Payment[];
};

export type OrderItem = {
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
};

export type Payment = {
    id: number;
    created_at: string;
    order_id: number;
    amount: number;
    payment_date: string;
    kasir_id: string | null;
    bank_id: number | null;
};

export type Bank = {
    id: number;
    created_at: string;
    name: string;
    account_holder: string;
    account_number: string;
    category: 'Bank' | 'Digital Wallet' | 'Qris';
};

export type Asset = {
    id: number;
    created_at: string;
    name: string;
    category: AssetCategory;
    purchase_price: number;
    purchase_date: string;
    status: AssetStatus;
    is_dynamic?: boolean;
};

export type Debt = {
    id: number;
    created_at: string;
    creditor_name: string;
    category: DebtCategory;
    description: string;
    total_amount: number;
    due_date: string;
    status: DebtStatus;
};

export type NotaSetting = {
    prefix: string;
    start_number_str: string;
};

export type Supplier = {
    id: number;
    created_at: string;
    name: string;
    contact_person: string | null;
    phone: string | null;
    specialty: string | null;
};

export type StockMovement = {
    id: number;
    created_at: string;

    bahan_id: number;
    type: StockMovementType;
    quantity: number;
    supplier_id: number | null;
    notes: string | null;
};

export type Finishing = {
    id: number;
    created_at: string;
    name: string;
    panjang_tambahan: number;
    lebar_tambahan: number;
};

export type Printer = {
    id: number;
    created_at: string;
    name: string;
    type: PrinterType;
    target: PrintTarget;
    is_default: boolean;
};

export type DisplaySettings = {
    id: number;
    created_at: string;
    youtube_url: YouTubePlaylistItem[] | null;
};

export type PayrollConfig = {
    id: number;
    created_at: string;
    employee_id: number;
    regular_rate_per_hour: number;
    overtime_rate_per_hour: number;
};

export type Attendance = {
    id: number;
    created_at: string;
    employee_id: number;
    check_in: string;
    check_out: string | null;
    overtime_minutes: number;
    notes: string | null;
    shift: 'Pagi' | 'Sore' | null;
    catatan_lembur: string | null;
    potongan: number | null;
    catatan_potongan: string | null;
    payroll_id: number | null;
};

export type Payroll = {
    id: number;
    created_at: string;
    employee_id: number;
    period_start: string;
    period_end: string;
    total_regular_hours: number;
    total_overtime_hours: number;
    base_salary: number;
    overtime_pay: number;
    bonus: number;
    potongan: number;
    notes: string | null;
    catatan_potongan: string | null;
    total_salary: number;
    status: PayrollStatus;
    approved_by: string | null;
    approved_at: string | null;
};


export type Database = {
  public: {
    Tables: {
      customers: {
        Row: Customer;
        Insert: Omit<Customer, 'id' | 'created_at'>;
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>;
        Relationships: [];
      };
      employees: {
        Row: Employee;
        Insert: Omit<Employee, 'id' | 'created_at'>;
        Update: Partial<Omit<Employee, 'id' | 'created_at'>>;
        Relationships: [];
      };
      bahan: {
        Row: Bahan;
        Insert: Omit<Bahan, 'id' | 'created_at'>;
        Update: Partial<Omit<Bahan, 'id' | 'created_at'>>;
        Relationships: [];
      };
      expenses: {
        Row: Expense;
        Insert: Omit<Expense, 'id' | 'created_at'>;
        Update: Partial<Omit<Expense, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "expenses_bahan_id_fkey",
            columns: ["bahan_id"],
            isOneToOne: false,
            referencedRelation: "bahan",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "expenses_supplier_id_fkey",
            columns: ["supplier_id"],
            isOneToOne: false,
            referencedRelation: "suppliers",
            referencedColumns: ["id"],
          }
        ];
      };
      orders: {
        Row: OrderRow;
        Insert: Omit<OrderRow, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderRow, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "orders_pelanggan_id_fkey",
            columns: ["pelanggan_id"],
            isOneToOne: false,
            referencedRelation: "customers",
            referencedColumns: ["id"],
          }
        ];
      };
      order_items: {
        Row: OrderItem;
        Insert: Omit<OrderItem, 'id' | 'created_at'>;
        Update: Partial<Omit<OrderItem, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "order_items_bahan_id_fkey",
            columns: ["bahan_id"],
            isOneToOne: false,
            referencedRelation: "bahan",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "order_items_finishing_id_fkey",
            columns: ["finishing_id"],
            isOneToOne: false,
            referencedRelation: "finishings",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "order_items_order_id_fkey",
            columns: ["order_id"],
            isOneToOne: false,
            referencedRelation: "orders",
            referencedColumns: ["id"],
          }
        ];
      };
      payments: {
        Row: Payment;
        Insert: Omit<Payment, 'id' | 'created_at'>;
        Update: Partial<Omit<Payment, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "payments_bank_id_fkey",
            columns: ["bank_id"],
            isOneToOne: false,
            referencedRelation: "banks",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "payments_order_id_fkey",
            columns: ["order_id"],
            isOneToOne: false,
            referencedRelation: "orders",
            referencedColumns: ["id"],
          }
        ];
      };
      banks: {
        Row: Bank;
        Insert: Omit<Bank, 'id' | 'created_at'>;
        Update: Partial<Omit<Bank, 'id' | 'created_at'>>;
        Relationships: [];
      };
      assets: {
        Row: Asset;
        Insert: Omit<Asset, 'id' | 'created_at'>;
        Update: Partial<Omit<Asset, 'id' | 'created_at'>>;
        Relationships: [];
      };
      debts: {
        Row: Debt;
        Insert: Omit<Debt, 'id' | 'created_at'>;
        Update: Partial<Omit<Debt, 'id' | 'created_at'>>;
        Relationships: [];
      };
      suppliers: {
        Row: Supplier;
        Insert: Omit<Supplier, 'id' | 'created_at'>;
        Update: Partial<Omit<Supplier, 'id' | 'created_at'>>;
        Relationships: [];
      };
      stock_movements: {
        Row: StockMovement;
        Insert: Omit<StockMovement, 'id' | 'created_at'>;
        Update: Partial<Omit<StockMovement, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "stock_movements_bahan_id_fkey",
            columns: ["bahan_id"],
            isOneToOne: false,
            referencedRelation: "bahan",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "stock_movements_supplier_id_fkey",
            columns: ["supplier_id"],
            isOneToOne: false,
            referencedRelation: "suppliers",
            referencedColumns: ["id"],
          }
        ];
      };
      finishings: {
        Row: Finishing;
        Insert: Omit<Finishing, 'id' | 'created_at'>;
        Update: Partial<Omit<Finishing, 'id' | 'created_at'>>;
        Relationships: [];
      };
      printers: {
        Row: Printer;
        Insert: Omit<Printer, 'id' | 'created_at'>;
        Update: Partial<Omit<Printer, 'id' | 'created_at'>>;
        Relationships: [];
      };
      display_settings: {
        Row: DisplaySettings;
        Insert: Omit<DisplaySettings, 'id' | 'created_at'>;
        Update: Partial<Omit<DisplaySettings, 'id' | 'created_at'>>;
        Relationships: [];
      };
      settings: {
        Row: { key: string; value: string; };
        Insert: { key: string; value: string; };
        Update: { key?: string; value?: string; };
        Relationships: [];
      };
      payroll_configs: {
        Row: PayrollConfig;
        Insert: Omit<PayrollConfig, 'id' | 'created_at'>;
        Update: Partial<Omit<PayrollConfig, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "payroll_configs_employee_id_fkey",
            columns: ["employee_id"],
            isOneToOne: true,
            referencedRelation: "employees",
            referencedColumns: ["id"],
          }
        ];
      };
      attendances: {
        Row: Attendance;
        Insert: Omit<Attendance, 'id' | 'created_at'>;
        Update: Partial<Omit<Attendance, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "attendances_employee_id_fkey",
            columns: ["employee_id"],
            isOneToOne: false,
            referencedRelation: "employees",
            referencedColumns: ["id"],
          },
          {
            foreignKeyName: "fk_payroll",
            columns: ["payroll_id"],
            isOneToOne: false,
            referencedRelation: "payrolls",
            referencedColumns: ["id"],
          }
        ];
      };
      payrolls: {
        Row: Payroll;
        Insert: Omit<Payroll, 'id' | 'created_at'>;
        Update: Partial<Omit<Payroll, 'id' | 'created_at'>>;
        Relationships: [
          {
            foreignKeyName: "payrolls_employee_id_fkey",
            columns: ["employee_id"],
            isOneToOne: false,
            referencedRelation: "employees",
            referencedColumns: ["id"],
          }
        ];
      };
    };
    Views: {
      [_ in never]: never
    };
    Functions: {
      import_backup_data: {
        Args: {
          backup_data: any
        }
        Returns: undefined
      }
    };
  };
}

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