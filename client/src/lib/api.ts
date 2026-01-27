import { apiRequest } from "./queryClient";

// Types from store (we'll use these for consistency)
export type Role = 'ADMIN' | 'DRIVER' | 'SALES';
export type Status = 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DELIVERED' | 'CLOSED' | 'CANCELED';
export type RunStatus = 'DRAFT' | 'LOADED' | 'OUT' | 'RETURNED' | 'CLOSED';
export type ReturnReason = 'GOOD' | 'DAMAGED' | 'EXPIRED';

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
}

export interface Order {
  id: string;
  customerId: string;
  date: string;
  status: Status;
  totalAmount: string;
  items: OrderItem[];
}

export interface DispatchRun {
  id: string;
  routeId: string;
  date: string;
  status: RunStatus;
  driverName: string;
  orderIds: string[];
}

export interface ReturnItemData {
  productId: string;
  quantity: number;
  reason: ReturnReason;
}

export interface ReturnRecord {
  id: string;
  runId: string;
  customerId: string;
  items: ReturnItemData[];
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

  // Dispatch Runs
  getDispatchRuns: async (): Promise<DispatchRun[]> => {
    const res = await fetch("/api/dispatch-runs");
    return res.json();
  },

  createDispatchRun: async (run: Omit<DispatchRun, "id">): Promise<DispatchRun> => {
    const res = await apiRequest("POST", "/api/dispatch-runs", run);
    return res.json();
  },

  updateDispatchRun: async (id: string, run: Partial<DispatchRun>): Promise<DispatchRun> => {
    const res = await apiRequest("PATCH", `/api/dispatch-runs/${id}`, run);
    return res.json();
  },

  deleteDispatchRun: async (id: string): Promise<void> => {
    await apiRequest("DELETE", `/api/dispatch-runs/${id}`);
  },

  assignOrderToRun: async (runId: string, orderId: string): Promise<DispatchRun> => {
    const res = await apiRequest("POST", `/api/dispatch-runs/${runId}/assign-order`, { orderId });
    return res.json();
  },

  // Returns
  getReturns: async (): Promise<ReturnRecord[]> => {
    const res = await fetch("/api/returns");
    return res.json();
  },

  createReturn: async (ret: { runId: string; customerId: string; items: ReturnItemData[] }): Promise<ReturnRecord> => {
    const res = await apiRequest("POST", "/api/returns", ret);
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
};
