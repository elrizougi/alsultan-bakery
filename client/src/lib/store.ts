import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { format, addDays, subDays } from 'date-fns';

// --- Types ---

export type Role = 'ADMIN' | 'DRIVER' | 'SALES';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

export type Status = 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DELIVERED' | 'CLOSED' | 'CANCELED';
export type RunStatus = 'DRAFT' | 'LOADED' | 'OUT' | 'RETURNED' | 'CLOSED';
export type ReturnReason = 'GOOD' | 'DAMAGED' | 'EXPIRED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
  stock: number;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
  locationUrl?: string;
  routeId: string;
  phone: string;
}

export interface Route {
  id: string;
  name: string;
  driverName: string;
}

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  date: string; // ISO date string
  status: Status;
  items: OrderItem[];
  totalAmount: number;
}

export interface DispatchRun {
  id: string;
  routeId: string;
  date: string;
  status: RunStatus;
  driverName: string;
  orderIds: string[];
}

export interface ReturnItem {
  productId: string;
  quantity: number;
  reason: ReturnReason;
}

export interface ReturnRecord {
  id: string;
  runId: string;
  customerId: string;
  items: ReturnItem[];
}

// --- Initial Data ---

const PRODUCTS: Product[] = [
  { id: 'p1', name: 'خبز صامولي', sku: 'SD-001', price: 6.50, category: 'Bread', stock: 150 },
  { id: 'p2', name: 'باجيت فرنسي', sku: 'BG-002', price: 4.00, category: 'Bread', stock: 85 },
  { id: 'p3', name: 'كرواسون زبدة', sku: 'CR-001', price: 3.50, category: 'Pastry', stock: 45 },
  { id: 'p4', name: 'بان أو شوكولا', sku: 'PC-002', price: 3.75, category: 'Pastry', stock: 120 },
  { id: 'p5', name: 'خبز ريف', sku: 'RB-001', price: 7.00, category: 'Bread', stock: 60 },
  { id: 'p6', name: 'فوكاشيا', sku: 'FC-001', price: 18.00, category: 'Bread', stock: 30 },
  { id: 'p7', name: 'مافن بلوبري', sku: 'MF-001', price: 3.25, category: 'Pastry', stock: 55 },
];

const ROUTES: Route[] = [
  { id: 'r1', name: 'وسط المدينة', driverName: 'أحمد علي' },
  { id: 'r2', name: 'المنطقة الغربية', driverName: 'سارة خالد' },
  { id: 'r3', name: 'الضواحي الشمالية', driverName: 'محمد فهد' },
];

const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'مقهى ديلي جريند', address: 'شارع الملك فهد', locationUrl: 'https://maps.google.com', routeId: 'r1', phone: '555-0101' },
  { id: 'c2', name: 'فندق صنسيت', address: 'طريق الكورنيش', locationUrl: 'https://maps.google.com', routeId: 'r2', phone: '555-0102' },
  { id: 'c3', name: 'مطبخ الشركات', address: 'مجمع الأعمال', locationUrl: 'https://maps.google.com', routeId: 'r3', phone: '555-0103' },
  { id: 'c4', name: 'جوز ديلي', address: 'سوق البلد', locationUrl: 'https://maps.google.com', routeId: 'r1', phone: '555-0104' },
  { id: 'c5', name: 'مقهى الجامعة', address: 'طريق الجامعة', locationUrl: 'https://maps.google.com', routeId: 'r2', phone: '555-0105' },
];

const TODAY = format(new Date(), 'yyyy-MM-dd');

const ORDERS: Order[] = [
  {
    id: 'o1', customerId: 'c1', date: TODAY, status: 'CONFIRMED', totalAmount: 85.50,
    items: [{ productId: 'p1', quantity: 10 }, { productId: 'p3', quantity: 15 }]
  },
  {
    id: 'o2', customerId: 'c4', date: TODAY, status: 'DRAFT', totalAmount: 45.00,
    items: [{ productId: 'p2', quantity: 20 }]
  },
  {
    id: 'o3', customerId: 'c2', date: TODAY, status: 'ASSIGNED', totalAmount: 120.00,
    items: [{ productId: 'p6', quantity: 5 }, { productId: 'p3', quantity: 20 }]
  },
];

const DISPATCH_RUNS: DispatchRun[] = [
  { id: 'run1', routeId: 'r2', date: TODAY, status: 'LOADED', driverName: 'سارة خالد', orderIds: ['o3'] },
];

const RETURNS: ReturnRecord[] = [];

// --- Store ---

interface AppState {
  user: User | null;
  products: Product[];
  routes: Route[];
  customers: Customer[];
  orders: Order[];
  dispatchRuns: DispatchRun[];
  returns: ReturnRecord[];
  
  // Actions
  login: (username: string, role: Role) => void;
  logout: () => void;
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Status) => void;
  createDispatchRun: (run: DispatchRun) => void;
  updateRunStatus: (id: string, status: RunStatus) => void;
  addReturn: (ret: ReturnRecord) => void;
  addCustomer: (customer: Customer) => void;
  assignOrderToRun: (runId: string, orderId: string) => void;
  updateProductStock: (productId: string, newStock: number) => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      products: PRODUCTS,
      routes: ROUTES,
      customers: CUSTOMERS,
      orders: ORDERS,
      dispatchRuns: DISPATCH_RUNS,
      returns: RETURNS,

      login: (username, role) => set({ 
        user: { id: 'u1', username, role, name: username === 'admin' ? 'مدير النظام' : 'موظف' } 
      }),
      logout: () => set({ user: null }),

      addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
      
      updateOrderStatus: (id, status) => set((state) => ({
        orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
      })),

      createDispatchRun: (run) => set((state) => ({ dispatchRuns: [...state.dispatchRuns, run] })),

      updateRunStatus: (id, status) => set((state) => ({
        dispatchRuns: state.dispatchRuns.map(r => r.id === id ? { ...r, status } : r)
      })),

      addReturn: (ret) => set((state) => ({ returns: [ret, ...state.returns] })),
      
      addCustomer: (customer) => set((state) => ({ customers: [...state.customers, customer] })),

      assignOrderToRun: (runId, orderId) => set((state) => {
        const updatedOrders = state.orders.map(o => o.id === orderId ? { ...o, status: 'ASSIGNED' as Status } : o);
        const updatedRuns = state.dispatchRuns.map(r => 
          r.id === runId && !r.orderIds.includes(orderId) 
            ? { ...r, orderIds: [...r.orderIds, orderId] } 
            : r
        );
        return { orders: updatedOrders, dispatchRuns: updatedRuns };
      }),

      updateProductStock: (productId, newStock) => set((state) => ({
        products: state.products.map(p => p.id === productId ? { ...p, stock: newStock } : p)
      })),
    }),
    {
      name: 'bakery-storage',
    }
  )
);
