import { db } from "./db";
import { eq, and } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  products, type Product, type InsertProduct,
  routes, type Route, type InsertRoute,
  customers, type Customer, type InsertCustomer,
  orders, type Order, type InsertOrder,
  orderItems, type OrderItem, type InsertOrderItem,
  dispatchRuns, type DispatchRun, type InsertDispatchRun,
  runOrders, type RunOrder, type InsertRunOrder,
  returns, type Return, type InsertReturn,
  returnItems, type ReturnItem, type InsertReturnItem,
  driverInventory, type DriverInventory, type InsertDriverInventory,
  driverBalance, type DriverBalance, type InsertDriverBalance,
  customerDebts, type CustomerDebt, type InsertCustomerDebt,
  transactions, type Transaction, type InsertTransaction,
} from "@shared/schema";

export interface IStorage {
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;

  // Products
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  updateProductStock(id: string, stock: number): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  // Routes
  getAllRoutes(): Promise<Route[]>;
  getRoute(id: string): Promise<Route | undefined>;
  createRoute(route: InsertRoute): Promise<Route>;
  updateRoute(id: string, route: Partial<InsertRoute>): Promise<Route | undefined>;
  deleteRoute(id: string): Promise<boolean>;
  
  // Users (extended)
  updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<User | undefined>;
  toggleUserActive(id: string, isActive: boolean): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;

  // Customers
  getAllCustomers(): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<boolean>;

  // Orders
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined>;
  deleteOrder(id: string): Promise<boolean>;

  // Order Items
  getOrderItems(orderId: string): Promise<OrderItem[]>;
  createOrderItem(item: InsertOrderItem): Promise<OrderItem>;
  deleteOrderItems(orderId: string): Promise<boolean>;

  // Dispatch Runs
  getAllDispatchRuns(): Promise<DispatchRun[]>;
  getDispatchRun(id: string): Promise<DispatchRun | undefined>;
  createDispatchRun(run: InsertDispatchRun): Promise<DispatchRun>;
  updateDispatchRun(id: string, run: Partial<InsertDispatchRun>): Promise<DispatchRun | undefined>;
  deleteDispatchRun(id: string): Promise<boolean>;

  // Run Orders
  getRunOrders(runId: string): Promise<RunOrder[]>;
  createRunOrder(runOrder: InsertRunOrder): Promise<RunOrder>;
  deleteRunOrders(runId: string): Promise<boolean>;

  // Returns
  getAllReturns(): Promise<Return[]>;
  getReturn(id: string): Promise<Return | undefined>;
  getReturnsByRunId(runId: string): Promise<Return[]>;
  createReturn(ret: InsertReturn): Promise<Return>;
  deleteReturn(id: string): Promise<boolean>;
  deleteReturnsByRunId(runId: string): Promise<boolean>;

  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;
  deleteReturnItems(returnId: string): Promise<void>;

  // Driver Inventory
  getDriverInventory(driverId: string): Promise<DriverInventory[]>;
  getDriverInventoryItem(driverId: string, productId: string): Promise<DriverInventory | undefined>;
  upsertDriverInventory(driverId: string, productId: string, quantity: number): Promise<DriverInventory>;
  updateDriverInventory(driverId: string, productId: string, quantityChange: number): Promise<DriverInventory | undefined>;

  // Driver Balance
  getDriverBalance(driverId: string): Promise<DriverBalance | undefined>;
  upsertDriverBalance(driverId: string, cashBalance: string): Promise<DriverBalance>;
  updateDriverCashBalance(driverId: string, amountChange: string): Promise<DriverBalance | undefined>;

  // Customer Debts
  getCustomerDebts(customerId: string): Promise<CustomerDebt[]>;
  getDriverCustomerDebts(driverId: string): Promise<CustomerDebt[]>;
  createCustomerDebt(debt: InsertCustomerDebt): Promise<CustomerDebt>;
  updateCustomerDebt(id: string, isPaid: boolean): Promise<CustomerDebt | undefined>;

  // Transactions
  getAllTransactions(): Promise<Transaction[]>;
  getDriverTransactions(driverId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  // Products
  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [newProduct] = await db.insert(products).values(product).returning();
    return newProduct;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated;
  }

  async updateProductStock(id: string, stock: number): Promise<Product | undefined> {
    const [updated] = await db.update(products).set({ stock }).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    const result = await db.delete(products).where(eq(products.id, id)).returning();
    return result.length > 0;
  }

  // Routes
  async getAllRoutes(): Promise<Route[]> {
    return db.select().from(routes);
  }

  async getRoute(id: string): Promise<Route | undefined> {
    const [route] = await db.select().from(routes).where(eq(routes.id, id));
    return route;
  }

  async createRoute(route: InsertRoute): Promise<Route> {
    const [newRoute] = await db.insert(routes).values(route).returning();
    return newRoute;
  }

  async updateRoute(id: string, route: Partial<InsertRoute>): Promise<Route | undefined> {
    const [updated] = await db.update(routes).set(route).where(eq(routes.id, id)).returning();
    return updated;
  }

  async deleteRoute(id: string): Promise<boolean> {
    await db.delete(routes).where(eq(routes.id, id));
    return true;
  }

  // Users (extended)
  async updateUser(id: string, user: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(user).where(eq(users.id, id)).returning();
    return updated;
  }

  async updateUserPassword(id: string, password: string): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ password }).where(eq(users.id, id)).returning();
    return updated;
  }

  async toggleUserActive(id: string, isActive: boolean): Promise<User | undefined> {
    const [updated] = await db.update(users).set({ isActive }).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    await db.delete(users).where(eq(users.id, id));
    return true;
  }

  // Customers
  async getAllCustomers(): Promise<Customer[]> {
    return db.select().from(customers);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: string, customer: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const [updated] = await db.update(customers).set(customer).where(eq(customers.id, id)).returning();
    return updated;
  }

  async deleteCustomer(id: string): Promise<boolean> {
    const result = await db.delete(customers).where(eq(customers.id, id)).returning();
    return result.length > 0;
  }

  // Orders
  async getAllOrders(): Promise<Order[]> {
    return db.select().from(orders);
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    const [newOrder] = await db.insert(orders).values(order).returning();
    return newOrder;
  }

  async updateOrder(id: string, order: Partial<InsertOrder>): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set(order).where(eq(orders.id, id)).returning();
    return updated;
  }

  async deleteOrder(id: string): Promise<boolean> {
    const result = await db.delete(orders).where(eq(orders.id, id));
    return true;
  }

  // Order Items
  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    return db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  }

  async createOrderItem(item: InsertOrderItem): Promise<OrderItem> {
    const [newItem] = await db.insert(orderItems).values(item).returning();
    return newItem;
  }

  async deleteOrderItems(orderId: string): Promise<boolean> {
    await db.delete(orderItems).where(eq(orderItems.orderId, orderId));
    return true;
  }

  // Dispatch Runs
  async getAllDispatchRuns(): Promise<DispatchRun[]> {
    return db.select().from(dispatchRuns);
  }

  async getDispatchRun(id: string): Promise<DispatchRun | undefined> {
    const [run] = await db.select().from(dispatchRuns).where(eq(dispatchRuns.id, id));
    return run;
  }

  async createDispatchRun(run: InsertDispatchRun): Promise<DispatchRun> {
    const [newRun] = await db.insert(dispatchRuns).values(run).returning();
    return newRun;
  }

  async updateDispatchRun(id: string, run: Partial<InsertDispatchRun>): Promise<DispatchRun | undefined> {
    const [updated] = await db.update(dispatchRuns).set(run).where(eq(dispatchRuns.id, id)).returning();
    return updated;
  }

  async deleteDispatchRun(id: string): Promise<boolean> {
    await db.delete(dispatchRuns).where(eq(dispatchRuns.id, id));
    return true;
  }

  // Run Orders
  async getRunOrders(runId: string): Promise<RunOrder[]> {
    return db.select().from(runOrders).where(eq(runOrders.runId, runId));
  }

  async createRunOrder(runOrder: InsertRunOrder): Promise<RunOrder> {
    const [newRunOrder] = await db.insert(runOrders).values(runOrder).returning();
    return newRunOrder;
  }

  async deleteRunOrders(runId: string): Promise<boolean> {
    await db.delete(runOrders).where(eq(runOrders.runId, runId));
    return true;
  }

  // Returns
  async getAllReturns(): Promise<Return[]> {
    return db.select().from(returns);
  }

  async getReturn(id: string): Promise<Return | undefined> {
    const [ret] = await db.select().from(returns).where(eq(returns.id, id));
    return ret;
  }

  async getReturnsByRunId(runId: string): Promise<Return[]> {
    return db.select().from(returns).where(eq(returns.runId, runId));
  }

  async deleteReturnsByRunId(runId: string): Promise<boolean> {
    const runReturns = await this.getReturnsByRunId(runId);
    for (const ret of runReturns) {
      await this.deleteReturnItems(ret.id);
    }
    await db.delete(returns).where(eq(returns.runId, runId));
    return true;
  }

  async createReturn(ret: InsertReturn): Promise<Return> {
    const [newReturn] = await db.insert(returns).values(ret).returning();
    return newReturn;
  }

  async deleteReturn(id: string): Promise<boolean> {
    await this.deleteReturnItems(id);
    const result = await db.delete(returns).where(eq(returns.id, id)).returning();
    return result.length > 0;
  }

  // Return Items
  async getReturnItems(returnId: string): Promise<ReturnItem[]> {
    return db.select().from(returnItems).where(eq(returnItems.returnId, returnId));
  }

  async createReturnItem(item: InsertReturnItem): Promise<ReturnItem> {
    const [newItem] = await db.insert(returnItems).values(item).returning();
    return newItem;
  }

  async deleteReturnItems(returnId: string): Promise<void> {
    await db.delete(returnItems).where(eq(returnItems.returnId, returnId));
  }

  // Driver Inventory
  async getDriverInventory(driverId: string): Promise<DriverInventory[]> {
    return db.select().from(driverInventory).where(eq(driverInventory.driverId, driverId));
  }

  async getDriverInventoryItem(driverId: string, productId: string): Promise<DriverInventory | undefined> {
    const [item] = await db.select().from(driverInventory)
      .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)));
    return item;
  }

  async upsertDriverInventory(driverId: string, productId: string, quantity: number): Promise<DriverInventory> {
    const existing = await this.getDriverInventoryItem(driverId, productId);
    if (existing) {
      const [updated] = await db.update(driverInventory)
        .set({ quantity })
        .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)))
        .returning();
      return updated;
    } else {
      const [newItem] = await db.insert(driverInventory).values({ driverId, productId, quantity }).returning();
      return newItem;
    }
  }

  async updateDriverInventory(driverId: string, productId: string, quantityChange: number): Promise<DriverInventory | undefined> {
    const existing = await this.getDriverInventoryItem(driverId, productId);
    if (existing) {
      const newQuantity = Math.max(0, existing.quantity + quantityChange);
      const [updated] = await db.update(driverInventory)
        .set({ quantity: newQuantity })
        .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)))
        .returning();
      return updated;
    } else if (quantityChange > 0) {
      const [newItem] = await db.insert(driverInventory).values({ driverId, productId, quantity: quantityChange }).returning();
      return newItem;
    }
    return undefined;
  }

  // Driver Balance
  async getDriverBalance(driverId: string): Promise<DriverBalance | undefined> {
    const [balance] = await db.select().from(driverBalance).where(eq(driverBalance.driverId, driverId));
    return balance;
  }

  async upsertDriverBalance(driverId: string, cashBalance: string): Promise<DriverBalance> {
    const existing = await this.getDriverBalance(driverId);
    if (existing) {
      const [updated] = await db.update(driverBalance)
        .set({ cashBalance })
        .where(eq(driverBalance.driverId, driverId))
        .returning();
      return updated;
    } else {
      const [newBalance] = await db.insert(driverBalance).values({ driverId, cashBalance }).returning();
      return newBalance;
    }
  }

  async updateDriverCashBalance(driverId: string, amountChange: string): Promise<DriverBalance | undefined> {
    const existing = await this.getDriverBalance(driverId);
    const currentBalance = existing ? parseFloat(existing.cashBalance) : 0;
    const newBalance = (currentBalance + parseFloat(amountChange)).toFixed(2);
    return this.upsertDriverBalance(driverId, newBalance);
  }

  // Customer Debts
  async getCustomerDebts(customerId: string): Promise<CustomerDebt[]> {
    return db.select().from(customerDebts).where(eq(customerDebts.customerId, customerId));
  }

  async getDriverCustomerDebts(driverId: string): Promise<CustomerDebt[]> {
    return db.select().from(customerDebts).where(eq(customerDebts.driverId, driverId));
  }

  async createCustomerDebt(debt: InsertCustomerDebt): Promise<CustomerDebt> {
    const [newDebt] = await db.insert(customerDebts).values(debt).returning();
    return newDebt;
  }

  async updateCustomerDebt(id: string, isPaid: boolean): Promise<CustomerDebt | undefined> {
    const [updated] = await db.update(customerDebts).set({ isPaid }).where(eq(customerDebts.id, id)).returning();
    return updated;
  }

  // Transactions
  async getAllTransactions(): Promise<Transaction[]> {
    return db.select().from(transactions);
  }

  async getDriverTransactions(driverId: string): Promise<Transaction[]> {
    return db.select().from(transactions).where(eq(transactions.driverId, driverId));
  }

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const [newTransaction] = await db.insert(transactions).values(transaction).returning();
    return newTransaction;
  }

  // Atomic transaction creation with all related updates using DB transaction
  async createTransactionWithUpdates(transaction: InsertTransaction): Promise<Transaction> {
    const { type, driverId, customerId, productId, quantity } = transaction;
    const totalAmount = transaction.totalAmount || "0";
    
    return await db.transaction(async (tx) => {
      // إنشاء العملية
      const [newTransaction] = await tx.insert(transactions).values(transaction).returning();
      
      // Helper function for inventory update within transaction
      const updateInventoryInTx = async (qtyChange: number) => {
        const [existing] = await tx.select().from(driverInventory)
          .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)));
        
        if (existing) {
          await tx.update(driverInventory)
            .set({ quantity: existing.quantity + qtyChange })
            .where(eq(driverInventory.id, existing.id));
        } else if (qtyChange > 0) {
          await tx.insert(driverInventory).values({ driverId, productId, quantity: qtyChange });
        }
      };
      
      // Helper function for balance update within transaction
      const updateBalanceInTx = async (amount: string) => {
        const [existing] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, driverId));
        const currentBalance = existing ? parseFloat(existing.cashBalance) : 0;
        const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);
        
        if (existing) {
          await tx.update(driverBalance).set({ cashBalance: newBalance }).where(eq(driverBalance.driverId, driverId));
        } else {
          await tx.insert(driverBalance).values({ driverId, cashBalance: newBalance });
        }
      };
      
      // معالجة أنواع العمليات المختلفة
      switch (type) {
        case 'CASH_SALE':
          await updateInventoryInTx(-quantity);
          await updateBalanceInTx(totalAmount);
          break;
          
        case 'CREDIT_SALE':
          await updateInventoryInTx(-quantity);
          await tx.insert(customerDebts).values({
            customerId,
            driverId,
            amount: totalAmount,
            isPaid: false,
          });
          break;
          
        case 'RETURN':
          await updateInventoryInTx(quantity);
          break;
          
        case 'FREE_DISTRIBUTION':
        case 'FREE_SAMPLE':
          await updateInventoryInTx(-quantity);
          break;
      }
      
      return newTransaction;
    });
  }

  // Update debt payment with driver balance adjustment using DB transaction
  async updateCustomerDebtWithBalance(id: string, isPaid: boolean): Promise<CustomerDebt | undefined> {
    return await db.transaction(async (tx) => {
      // First get the debt to know the amount and driver
      const [debt] = await tx.select().from(customerDebts).where(eq(customerDebts.id, id));
      if (!debt) return undefined;
      
      // Update the debt status
      const [updated] = await tx.update(customerDebts).set({ isPaid }).where(eq(customerDebts.id, id)).returning();
      
      // Helper function for balance update within transaction
      const updateBalanceInTx = async (driverId: string, amount: string) => {
        const [existing] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, driverId));
        const currentBalance = existing ? parseFloat(existing.cashBalance) : 0;
        const newBalance = (currentBalance + parseFloat(amount)).toFixed(2);
        
        if (existing) {
          await tx.update(driverBalance).set({ cashBalance: newBalance }).where(eq(driverBalance.driverId, driverId));
        } else {
          await tx.insert(driverBalance).values({ driverId, cashBalance: newBalance });
        }
      };
      
      // If marking as paid, add the amount to driver's cash balance
      if (isPaid && !debt.isPaid) {
        await updateBalanceInTx(debt.driverId, debt.amount);
      }
      // If marking as unpaid (reversing), subtract from driver's cash balance
      else if (!isPaid && debt.isPaid) {
        await updateBalanceInTx(debt.driverId, (-parseFloat(debt.amount)).toFixed(2));
      }
      
      return updated;
    });
  }
}

export const storage = new DatabaseStorage();
