import { apiRequest } from "./queryClient";

// Types from store (we'll use these for consistency)
export type Role = 'ADMIN' | 'SUB_ADMIN' | 'DRIVER' | 'SALES';
export type Status = 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DELIVERED' | 'CLOSED' | 'CANCELED';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
  isActive?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: string;
  category: string;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  locationUrl?: string;
  routeId?: string;
  driverId?: string;
  phone: string;
}

export interface Route {
  id: string;
  name: string;
  driverName: string;
}

export interface OrderItem {
  id?: string;
  orderId?: string;
  productId: string;
  quantity: number;
  receivedQuantity?: number;
}

export interface Order {
  id: string;
  customerId: string;
  date: string;
  status: Status;
  totalAmount: string;
  items: OrderItem[];
}

// API Functions
export const api = {
  // Auth
  login: async (username: string, password: string): Promise<User> => {
    const res = await apiRequest("POST", "/api/auth/login", { username, password });
    return res.json();
  },

  // Products
  getProducts: async (): Promise<Product[]> => {
    const res = await fetch("/api/products");
    return res.json();
  },

  updateProductStock: async (id: string, stock: number): Promise<Product> => {
    const res = await apiRequest("PATCH", `/api/products/${id}/stock`, { stock });
    return res.json();
  },

  createProduct: async (product: Omit<Product, "id">): Promise<Product> => {
    const res = await apiRequest("POST", "/api/products", product);
    return res.json();
  },

  updateProduct: async (id: string, product: Partial<Product>): Promise<Product> => {
    const res = await apiRequest("PATCH", `/api/products/${id}`, product);
    return res.json();
  },

  deleteProduct: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/products/${id}`);
  },

  // Customers
  getCustomers: async (): Promise<Customer[]> => {
    const res = await fetch("/api/customers");
    return res.json();
  },

  createCustomer: async (customer: Omit<Customer, "id">): Promise<Customer> => {
    const res = await apiRequest("POST", "/api/customers", customer);
    return res.json();
  },

  updateCustomer: async (id: string, customer: Partial<Customer>): Promise<Customer> => {
    const res = await apiRequest("PATCH", `/api/customers/${id}`, customer);
    return res.json();
  },

  deleteCustomer: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/customers/${id}`);
  },

  // Routes
  getRoutes: async (): Promise<Route[]> => {
    const res = await fetch("/api/routes");
    return res.json();
  },

  // Orders
  getOrders: async (): Promise<Order[]> => {
    const res = await fetch("/api/orders");
    return res.json();
  },

  createOrder: async (order: { customerId: string; date: string; status: Status; totalAmount: string; items: OrderItem[] }): Promise<Order> => {
    const res = await apiRequest("POST", "/api/orders", order);
    return res.json();
  },

  updateOrder: async (id: string, order: Partial<Order>): Promise<Order> => {
    const res = await apiRequest("PATCH", `/api/orders/${id}`, order);
    return res.json();
  },

  deleteOrder: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/orders/${id}`);
  },

  confirmOrderReceipt: async (id: string, receivedItems: { id: string; receivedQuantity: number }[]): Promise<Order> => {
    const res = await apiRequest("POST", `/api/orders/${id}/confirm-receipt`, { receivedItems });
    return res.json();
  },

  // Users
  getUsers: async (): Promise<User[]> => {
    const res = await fetch("/api/users");
    return res.json();
  },

  createUser: async (user: { username: string; password: string; name: string; role: Role }): Promise<User> => {
    const res = await apiRequest("POST", "/api/auth/register", user);
    return res.json();
  },

  updateUser: async (id: string, user: Partial<{ name: string; role: Role }>): Promise<User> => {
    const res = await apiRequest("PATCH", `/api/users/${id}`, user);
    return res.json();
  },

  changePassword: async (id: string, password: string): Promise<void> => {
    await apiRequest("PATCH", `/api/users/${id}/password`, { password });
  },

  toggleUserActive: async (id: string, isActive: boolean): Promise<User> => {
    const res = await apiRequest("PATCH", `/api/users/${id}/toggle-active`, { isActive });
    return res.json();
  },

  deleteUser: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/users/${id}`);
  },

  // Routes Management
  createRoute: async (route: { name: string; driverName: string }): Promise<Route> => {
    const res = await apiRequest("POST", "/api/routes", route);
    return res.json();
  },

  updateRoute: async (id: string, route: Partial<{ name: string; driverName: string }>): Promise<Route> => {
    const res = await apiRequest("PATCH", `/api/routes/${id}`, route);
    return res.json();
  },

  deleteRoute: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/routes/${id}`);
  },

  // Driver Transactions
  getDriverInventory: async (driverId: string): Promise<DriverInventory[]> => {
    const res = await fetch(`/api/driver-inventory/${driverId}`);
    return res.json();
  },

  getDriverBalance: async (driverId: string): Promise<DriverBalance> => {
    const res = await fetch(`/api/driver-balance/${driverId}`);
    return res.json();
  },

  getAllTransactions: async (): Promise<Transaction[]> => {
    const res = await fetch('/api/transactions');
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  getDriverTransactions: async (driverId: string): Promise<Transaction[]> => {
    const res = await fetch(`/api/driver-transactions/${driverId}`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  },

  bulkImportTransactions: async (rows: any[]): Promise<{ message: string; results: any[] }> => {
    const res = await apiRequest('POST', '/api/transactions/bulk-import', { rows });
    return res.json();
  },

  getAllCustomerDebts: async (): Promise<CustomerDebt[]> => {
    const res = await fetch('/api/customer-debts');
    return res.json();
  },

  getDriverCustomerDebts: async (driverId: string): Promise<CustomerDebt[]> => {
    const res = await fetch(`/api/driver-customer-debts/${driverId}`);
    return res.json();
  },

  createTransaction: async (transaction: InsertTransaction): Promise<Transaction> => {
    const res = await apiRequest("POST", "/api/transactions", transaction);
    return res.json();
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/transactions/${id}`);
  },

  loadDriverInventory: async (driverId: string, productId: string, quantity: number, mode: 'load' | 'return' = 'load'): Promise<void> => {
    await apiRequest("POST", "/api/driver-load-inventory", { driverId, productId, quantity, mode });
  },

  updateTransaction: async (id: string, updates: { quantity?: number; unitPrice?: string; customerId?: string; notes?: string }): Promise<Transaction> => {
    const res = await apiRequest("PATCH", `/api/transactions/${id}`, updates);
    return res.json();
  },

  updateCustomerDebt: async (id: string, isPaid: boolean): Promise<CustomerDebt> => {
    const res = await apiRequest("PATCH", `/api/customer-debts/${id}`, { isPaid });
    return res.json();
  },

  makePartialPayment: async (id: string, paymentAmount: number): Promise<CustomerDebt> => {
    const res = await apiRequest("POST", `/api/customer-debts/${id}/partial-payment`, { paymentAmount });
    return res.json();
  },


  // Cash Deposits - تسليم المبالغ
  getCashDeposits: async (): Promise<CashDeposit[]> => {
    const res = await fetch("/api/cash-deposits");
    return res.json();
  },

  getDriverCashDeposits: async (driverId: string): Promise<CashDeposit[]> => {
    const res = await fetch(`/api/cash-deposits/driver/${driverId}`);
    return res.json();
  },

  getPendingCashDeposits: async (): Promise<CashDeposit[]> => {
    const res = await fetch("/api/cash-deposits/pending");
    return res.json();
  },

  createCashDeposit: async (data: { driverId: string; amount: number; depositDate: string; notes?: string; confirmedBy?: string }): Promise<CashDeposit> => {
    const res = await apiRequest("POST", "/api/cash-deposits", data);
    return res.json();
  },

  updateCashDeposit: async (id: string, data: { amount?: number; notes?: string; depositDate?: string }): Promise<CashDeposit> => {
    const res = await apiRequest("PUT", `/api/cash-deposits/${id}`, data);
    return res.json();
  },

  deleteCashDeposit: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/cash-deposits/${id}`);
  },

  confirmCashDeposit: async (id: string, confirmedBy: string): Promise<CashDeposit> => {
    const res = await apiRequest("POST", `/api/cash-deposits/${id}/confirm`, { confirmedBy });
    return res.json();
  },

  rejectCashDeposit: async (id: string, confirmedBy: string): Promise<CashDeposit> => {
    const res = await apiRequest("POST", `/api/cash-deposits/${id}/reject`, { confirmedBy });
    return res.json();
  },
};

// Types for transactions
export type TransactionType = 'CASH_SALE' | 'CREDIT_SALE' | 'RETURN' | 'FREE_DISTRIBUTION' | 'FREE_SAMPLE' | 'DAMAGED' | 'EXPENSE' | 'DRIVER_DEBT';

export interface Transaction {
  id: string;
  type: TransactionType;
  driverId: string;
  customerId?: string;
  productId: string;
  quantity: number;
  unitPrice?: string;
  totalAmount?: string;
  notes?: string;
  createdAt?: string;
}

export interface InsertTransaction {
  type: TransactionType;
  driverId: string;
  customerId?: string;
  productId: string;
  quantity: number;
  unitPrice?: string;
  totalAmount?: string;
  notes?: string;
  createdAt?: string;
}

export interface DriverInventory {
  id: string;
  driverId: string;
  productId: string;
  quantity: number;
}

export interface DriverBalance {
  id: string;
  driverId: string;
  cashBalance: string;
}

export interface CustomerDebt {
  id: string;
  customerId?: string;
  driverId: string;
  amount: string;
  paidAmount: string;
  isPaid: boolean;
  createdAt?: string;
}

export interface CashDeposit {
  id: string;
  driverId: string;
  amount: string;
  status: 'PENDING' | 'CONFIRMED' | 'REJECTED';
  depositDate: string;
  createdAt?: string;
  confirmedAt?: string;
  confirmedBy?: string;
  notes?: string;
}
