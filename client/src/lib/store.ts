import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// --- Types ---

export type Role = 'ADMIN' | 'SUB_ADMIN' | 'DRIVER' | 'SALES';

export interface User {
  id: string;
  username: string;
  role: Role;
  name: string;
}

export type Status = 'DRAFT' | 'CONFIRMED' | 'ASSIGNED' | 'DELIVERED' | 'CLOSED' | 'CANCELED';

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
  productId: string;
  quantity: number;
}

export interface Order {
  id: string;
  customerId: string;
  date: string;
  status: Status;
  items: OrderItem[];
  totalAmount: string;
}

// --- Store (Auth Only - Data from API) ---

interface AppState {
  user: User | null;
  
  // Actions
  login: (user: User) => void;
  logout: () => void;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,

      login: (user) => set({ user }),
      logout: () => set({ user: null }),
    }),
    {
      name: 'bakery-auth',
    }
  )
);
