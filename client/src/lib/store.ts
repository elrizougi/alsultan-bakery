import { create } from 'zustand';
import { format, addDays, subDays } from 'date-fns';

// --- Types ---

export type Status = 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DELIVERED' | 'CLOSED' | 'CANCELED';
export type RunStatus = 'DRAFT' | 'LOADED' | 'OUT' | 'RETURNED' | 'CLOSED';
export type ReturnReason = 'GOOD' | 'DAMAGED' | 'EXPIRED';

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  category: string;
}

export interface Customer {
  id: string;
  name: string;
  address: string;
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
  { id: 'p1', name: 'Sourdough Loaf', sku: 'SD-001', price: 6.50, category: 'Bread' },
  { id: 'p2', name: 'Baguette', sku: 'BG-002', price: 4.00, category: 'Bread' },
  { id: 'p3', name: 'Croissant (Butter)', sku: 'CR-001', price: 3.50, category: 'Pastry' },
  { id: 'p4', name: 'Pain au Chocolat', sku: 'PC-002', price: 3.75, category: 'Pastry' },
  { id: 'p5', name: 'Rye Bread', sku: 'RB-001', price: 7.00, category: 'Bread' },
  { id: 'p6', name: 'Focaccia Sheet', sku: 'FC-001', price: 18.00, category: 'Bread' },
  { id: 'p7', name: 'Blueberry Muffin', sku: 'MF-001', price: 3.25, category: 'Pastry' },
];

const ROUTES: Route[] = [
  { id: 'r1', name: 'Downtown Morning', driverName: 'John Doe' },
  { id: 'r2', name: 'Westside Loop', driverName: 'Jane Smith' },
  { id: 'r3', name: 'North Suburbs', driverName: 'Mike Johnson' },
];

const CUSTOMERS: Customer[] = [
  { id: 'c1', name: 'The Daily Grind Cafe', address: '123 Main St', routeId: 'r1', phone: '555-0101' },
  { id: 'c2', name: 'Sunset Hotel', address: '456 Ocean Dr', routeId: 'r2', phone: '555-0102' },
  { id: 'c3', name: 'Corporate Kitchen', address: '789 Biz Park', routeId: 'r3', phone: '555-0103' },
  { id: 'c4', name: 'Joe\'s Deli', address: '321 Market St', routeId: 'r1', phone: '555-0104' },
  { id: 'c5', name: 'University Cafe', address: '999 College Ave', routeId: 'r2', phone: '555-0105' },
];

// Generate some sample orders
const TODAY = format(new Date(), 'yyyy-MM-dd');
const YESTERDAY = format(subDays(new Date(), 1), 'yyyy-MM-dd');
const TOMORROW = format(addDays(new Date(), 1), 'yyyy-MM-dd');

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
  {
    id: 'o4', customerId: 'c1', date: YESTERDAY, status: 'CLOSED', totalAmount: 90.00,
    items: [{ productId: 'p1', quantity: 12 }, { productId: 'p3', quantity: 10 }]
  },
];

const DISPATCH_RUNS: DispatchRun[] = [
  { id: 'run1', routeId: 'r2', date: TODAY, status: 'LOADED', driverName: 'Jane Smith', orderIds: ['o3'] },
  { id: 'run2', routeId: 'r1', date: YESTERDAY, status: 'CLOSED', driverName: 'John Doe', orderIds: ['o4'] },
];

const RETURNS: ReturnRecord[] = [
  { id: 'ret1', runId: 'run2', customerId: 'c1', items: [{ productId: 'p3', quantity: 2, reason: 'DAMAGED' }] }
];

// --- Store ---

interface AppState {
  products: Product[];
  routes: Route[];
  customers: Customer[];
  orders: Order[];
  dispatchRuns: DispatchRun[];
  returns: ReturnRecord[];
  
  // Actions
  addOrder: (order: Order) => void;
  updateOrderStatus: (id: string, status: Status) => void;
  createDispatchRun: (run: DispatchRun) => void;
  updateRunStatus: (id: string, status: RunStatus) => void;
  addReturn: (ret: ReturnRecord) => void;
  assignOrderToRun: (runId: string, orderId: string) => void;
}

export const useStore = create<AppState>((set) => ({
  products: PRODUCTS,
  routes: ROUTES,
  customers: CUSTOMERS,
  orders: ORDERS,
  dispatchRuns: DISPATCH_RUNS,
  returns: RETURNS,

  addOrder: (order) => set((state) => ({ orders: [...state.orders, order] })),
  
  updateOrderStatus: (id, status) => set((state) => ({
    orders: state.orders.map(o => o.id === id ? { ...o, status } : o)
  })),

  createDispatchRun: (run) => set((state) => ({ dispatchRuns: [...state.dispatchRuns, run] })),

  updateRunStatus: (id, status) => set((state) => ({
    dispatchRuns: state.dispatchRuns.map(r => r.id === id ? { ...r, status } : r)
  })),

  addReturn: (ret) => set((state) => ({ returns: [...state.returns, ret] })),

  assignOrderToRun: (runId, orderId) => set((state) => {
    // Also update order status to ASSIGNED
    const updatedOrders = state.orders.map(o => o.id === orderId ? { ...o, status: 'ASSIGNED' as Status } : o);
    const updatedRuns = state.dispatchRuns.map(r => 
      r.id === runId && !r.orderIds.includes(orderId) 
        ? { ...r, orderIds: [...r.orderIds, orderId] } 
        : r
    );
    return { orders: updatedOrders, dispatchRuns: updatedRuns };
  }),
}));
