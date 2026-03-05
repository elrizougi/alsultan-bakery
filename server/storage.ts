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
  orderModifications, type OrderModification, type InsertOrderModification,
  orderModificationItems, type OrderModificationItem, type InsertOrderModificationItem,
  cashDeposits, type CashDeposit, type InsertCashDeposit,
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
  updateOrderItemReceived(id: string, receivedQuantity: number): Promise<OrderItem | undefined>;
  confirmOrderReceiptAtomic(orderId: string, receivedItems: { id: string; receivedQuantity: number }[]): Promise<Order | undefined>;

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
  deleteRunOrdersByOrderId(orderId: string): Promise<boolean>;

  // Returns
  getAllReturns(): Promise<Return[]>;
  getReturn(id: string): Promise<Return | undefined>;
  getReturnsByRunId(runId: string): Promise<Return[]>;
  getReturnsByOrderId(orderId: string): Promise<Return[]>;
  createReturn(ret: InsertReturn): Promise<Return>;
  deleteReturn(id: string): Promise<boolean>;
  deleteReturnsByRunId(runId: string): Promise<boolean>;
  deleteReturnsByOrderId(orderId: string): Promise<boolean>;

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
  getAllCustomerDebts(): Promise<CustomerDebt[]>;
  getCustomerDebts(customerId: string): Promise<CustomerDebt[]>;
  getDriverCustomerDebts(driverId: string): Promise<CustomerDebt[]>;
  createCustomerDebt(debt: InsertCustomerDebt): Promise<CustomerDebt>;
  updateCustomerDebt(id: string, isPaid: boolean): Promise<CustomerDebt | undefined>;
  makePartialPayment(id: string, paymentAmount: number): Promise<CustomerDebt | undefined>;

  // Transactions
  getAllTransactions(): Promise<Transaction[]>;
  getDriverTransactions(driverId: string): Promise<Transaction[]>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  deleteTransactionWithUpdates(id: string): Promise<boolean>;
  updateTransactionWithUpdates(id: string, updates: { quantity?: number; unitPrice?: string; customerId?: string; notes?: string }): Promise<Transaction | undefined>;

  // Order Modifications
  getAllOrderModifications(): Promise<OrderModification[]>;
  getPendingOrderModifications(): Promise<OrderModification[]>;
  getOrderModification(id: string): Promise<OrderModification | undefined>;
  getOrderModificationItems(modificationId: string): Promise<OrderModificationItem[]>;
  createOrderModification(modification: InsertOrderModification, items: InsertOrderModificationItem[]): Promise<OrderModification>;
  approveOrderModification(id: string): Promise<OrderModification | undefined>;
  rejectOrderModification(id: string): Promise<OrderModification | undefined>;

  // Cash Deposits - تسليم المبالغ
  getAllCashDeposits(): Promise<CashDeposit[]>;
  getDriverCashDeposits(driverId: string): Promise<CashDeposit[]>;
  getPendingCashDeposits(): Promise<CashDeposit[]>;
  createCashDeposit(deposit: InsertCashDeposit): Promise<CashDeposit>;
  confirmCashDeposit(id: string, confirmedBy: string): Promise<CashDeposit | undefined>;
  rejectCashDeposit(id: string, confirmedBy: string): Promise<CashDeposit | undefined>;
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

  async updateOrderItemReceived(id: string, receivedQuantity: number): Promise<OrderItem | undefined> {
    const [updated] = await db.update(orderItems)
      .set({ receivedQuantity })
      .where(eq(orderItems.id, id))
      .returning();
    return updated;
  }

  async confirmOrderReceiptAtomic(orderId: string, receivedItems: { id: string; receivedQuantity: number }[]): Promise<Order | undefined> {
    return await db.transaction(async (tx) => {
      // التحقق من الطلب
      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      if (!order || order.status !== 'CONFIRMED') {
        throw new Error('الطلب غير موجود أو ليس في حالة مؤكد');
      }

      // جلب عناصر الطلب للتحقق
      const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
      const itemMap = new Map(items.map(i => [i.id, i]));

      // تحديث الكميات المستلمة لكل منتج وإضافتها لمخزون السائق
      const driverId = order.customerId;
      
      for (const received of receivedItems) {
        const item = itemMap.get(received.id);
        if (!item) {
          throw new Error(`عنصر غير موجود: ${received.id}`);
        }
        if (received.receivedQuantity < 0 || received.receivedQuantity > item.quantity) {
          throw new Error(`كمية غير صالحة للعنصر: ${received.id}`);
        }
        await tx.update(orderItems)
          .set({ receivedQuantity: received.receivedQuantity })
          .where(eq(orderItems.id, received.id));

        // إضافة الكمية المستلمة إلى مخزون السائق
        if (received.receivedQuantity > 0) {
          const [existing] = await tx.select().from(driverInventory)
            .where(and(
              eq(driverInventory.driverId, driverId),
              eq(driverInventory.productId, item.productId)
            ));

          if (existing) {
            await tx.update(driverInventory)
              .set({ quantity: existing.quantity + received.receivedQuantity })
              .where(eq(driverInventory.id, existing.id));
          } else {
            await tx.insert(driverInventory).values({
              driverId,
              productId: item.productId,
              quantity: received.receivedQuantity,
            });
          }
        }
      }

      // تحديث حالة الطلب إلى مستلم
      const [updated] = await tx.update(orders)
        .set({ status: 'ASSIGNED' })
        .where(eq(orders.id, orderId))
        .returning();

      return updated;
    });
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

  async deleteRunOrdersByOrderId(orderId: string): Promise<boolean> {
    await db.delete(runOrders).where(eq(runOrders.orderId, orderId));
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

  async getReturnsByOrderId(orderId: string): Promise<Return[]> {
    return db.select().from(returns).where(eq(returns.orderId, orderId));
  }

  async deleteReturnsByOrderId(orderId: string): Promise<boolean> {
    const orderReturns = await this.getReturnsByOrderId(orderId);
    for (const ret of orderReturns) {
      await this.deleteReturnItems(ret.id);
    }
    await db.delete(returns).where(eq(returns.orderId, orderId));
    return true;
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
  async getAllCustomerDebts(): Promise<CustomerDebt[]> {
    return db.select().from(customerDebts);
  }

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
        case 'DAMAGED':
          await updateInventoryInTx(-quantity);
          break;
          
        case 'FREE_DISTRIBUTION':
        case 'FREE_SAMPLE':
          await updateInventoryInTx(-quantity);
          break;

        case 'EXPENSE':
          await updateBalanceInTx((-parseFloat(totalAmount)).toFixed(2));
          break;
      }
      
      return newTransaction;
    });
  }

  async updateTransactionWithUpdates(id: string, updates: { quantity?: number; unitPrice?: string; customerId?: string; notes?: string }): Promise<Transaction | undefined> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(transactions).where(eq(transactions.id, id));
      if (!existing) return undefined;

      const { type, driverId, productId } = existing;
      const oldQuantity = existing.quantity;
      const oldTotalAmount = existing.totalAmount || "0";
      const oldCustomerId = existing.customerId;

      const newQuantity = updates.quantity ?? oldQuantity;
      const newUnitPrice = updates.unitPrice ?? existing.unitPrice;
      const newTotalAmount = (parseFloat(newUnitPrice || "0") * newQuantity).toFixed(2);
      const newCustomerId = updates.customerId ?? oldCustomerId;

      const updateInventoryInTx = async (qtyChange: number) => {
        const [inv] = await tx.select().from(driverInventory)
          .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)));
        if (inv) {
          await tx.update(driverInventory)
            .set({ quantity: inv.quantity + qtyChange })
            .where(eq(driverInventory.id, inv.id));
        }
      };

      const updateBalanceInTx = async (amount: string) => {
        const [bal] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, driverId));
        if (bal) {
          const newBalance = (parseFloat(bal.cashBalance) + parseFloat(amount)).toFixed(2);
          await tx.update(driverBalance).set({ cashBalance: newBalance }).where(eq(driverBalance.driverId, driverId));
        }
      };

      const quantityDiff = newQuantity - oldQuantity;
      const amountDiff = parseFloat(newTotalAmount) - parseFloat(oldTotalAmount);

      switch (type) {
        case 'CASH_SALE':
          if (quantityDiff !== 0) await updateInventoryInTx(-quantityDiff);
          if (amountDiff !== 0) await updateBalanceInTx(amountDiff.toFixed(2));
          break;
        case 'CREDIT_SALE':
          if (quantityDiff !== 0) await updateInventoryInTx(-quantityDiff);
          if (amountDiff !== 0 || oldCustomerId !== newCustomerId) {
            const allDebts = await tx.select().from(customerDebts)
              .where(and(
                eq(customerDebts.customerId, oldCustomerId!),
                eq(customerDebts.driverId, driverId),
                eq(customerDebts.amount, oldTotalAmount),
                eq(customerDebts.isPaid, false)
              ));
            if (allDebts.length > 0) {
              await tx.update(customerDebts)
                .set({ amount: newTotalAmount, customerId: newCustomerId })
                .where(eq(customerDebts.id, allDebts[0].id));
            }
          }
          break;
        case 'RETURN':
        case 'DAMAGED':
          if (quantityDiff !== 0) await updateInventoryInTx(-quantityDiff);
          break;
        case 'FREE_DISTRIBUTION':
        case 'FREE_SAMPLE':
          if (quantityDiff !== 0) await updateInventoryInTx(-quantityDiff);
          break;
        case 'EXPENSE':
          if (amountDiff !== 0) await updateBalanceInTx((-amountDiff).toFixed(2));
          break;
      }

      const [updated] = await tx.update(transactions)
        .set({
          quantity: newQuantity,
          unitPrice: newUnitPrice,
          totalAmount: newTotalAmount,
          customerId: newCustomerId,
          notes: updates.notes ?? existing.notes,
        })
        .where(eq(transactions.id, id))
        .returning();

      return updated;
    });
  }

  async deleteTransactionWithUpdates(id: string): Promise<boolean> {
    return await db.transaction(async (tx) => {
      const [existing] = await tx.select().from(transactions).where(eq(transactions.id, id));
      if (!existing) return false;

      const { type, driverId, productId, quantity, totalAmount, customerId } = existing;

      const updateInventoryInTx = async (qtyChange: number) => {
        const [inv] = await tx.select().from(driverInventory)
          .where(and(eq(driverInventory.driverId, driverId), eq(driverInventory.productId, productId)));
        if (inv) {
          await tx.update(driverInventory)
            .set({ quantity: inv.quantity + qtyChange })
            .where(eq(driverInventory.id, inv.id));
        }
      };

      const updateBalanceInTx = async (amount: string) => {
        const [bal] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, driverId));
        if (bal) {
          const newBalance = (parseFloat(bal.cashBalance) + parseFloat(amount)).toFixed(2);
          await tx.update(driverBalance).set({ cashBalance: newBalance }).where(eq(driverBalance.driverId, driverId));
        }
      };

      switch (type) {
        case 'CASH_SALE':
          await updateInventoryInTx(quantity);
          await updateBalanceInTx((-parseFloat(totalAmount || "0")).toFixed(2));
          break;
        case 'CREDIT_SALE':
          await updateInventoryInTx(quantity);
          if (customerId) {
            const allDebts = await tx.select().from(customerDebts)
              .where(and(
                eq(customerDebts.customerId, customerId),
                eq(customerDebts.driverId, driverId),
                eq(customerDebts.amount, totalAmount || "0"),
                eq(customerDebts.isPaid, false)
              ));
            if (allDebts.length > 0) {
              await tx.delete(customerDebts).where(eq(customerDebts.id, allDebts[0].id));
            }
          }
          break;
        case 'RETURN':
        case 'DAMAGED':
          await updateInventoryInTx(quantity);
          break;
        case 'FREE_DISTRIBUTION':
        case 'FREE_SAMPLE':
          await updateInventoryInTx(quantity);
          break;
        case 'EXPENSE':
          await updateBalanceInTx(totalAmount || "0");
          break;
      }

      await tx.delete(transactions).where(eq(transactions.id, id));
      return true;
    });
  }

  // Update debt payment with driver balance adjustment using DB transaction
  async updateCustomerDebtWithBalance(id: string, isPaid: boolean): Promise<CustomerDebt | undefined> {
    return await db.transaction(async (tx) => {
      const [debt] = await tx.select().from(customerDebts).where(eq(customerDebts.id, id));
      if (!debt) return undefined;
      
      const [updated] = await tx.update(customerDebts).set({ isPaid }).where(eq(customerDebts.id, id)).returning();
      
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
      
      if (isPaid && !debt.isPaid) {
        const remainingAmount = parseFloat(debt.amount) - parseFloat(debt.paidAmount || "0");
        await updateBalanceInTx(debt.driverId, remainingAmount.toFixed(2));
      } else if (!isPaid && debt.isPaid) {
        const remainingAmount = parseFloat(debt.amount) - parseFloat(debt.paidAmount || "0");
        await updateBalanceInTx(debt.driverId, (-remainingAmount).toFixed(2));
      }
      
      return updated;
    });
  }

  // Partial payment for debt
  async makePartialPayment(id: string, paymentAmount: number): Promise<CustomerDebt | undefined> {
    return await db.transaction(async (tx) => {
      const [debt] = await tx.select().from(customerDebts).where(eq(customerDebts.id, id));
      if (!debt) return undefined;
      
      const currentPaid = parseFloat(debt.paidAmount || "0");
      const totalAmount = parseFloat(debt.amount);
      const remaining = totalAmount - currentPaid;
      
      // Only apply up to the remaining amount
      const appliedAmount = Math.min(paymentAmount, remaining);
      if (appliedAmount <= 0) return undefined;
      
      const newPaidAmount = currentPaid + appliedAmount;
      const isPaid = newPaidAmount >= totalAmount;
      
      const [updated] = await tx.update(customerDebts)
        .set({ 
          paidAmount: newPaidAmount.toFixed(2),
          isPaid 
        })
        .where(eq(customerDebts.id, id))
        .returning();
      
      // Add only the applied amount to driver's cash balance
      const [existing] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, debt.driverId));
      const currentBalance = existing ? parseFloat(existing.cashBalance) : 0;
      const newBalance = (currentBalance + appliedAmount).toFixed(2);
      
      if (existing) {
        await tx.update(driverBalance).set({ cashBalance: newBalance }).where(eq(driverBalance.driverId, debt.driverId));
      } else {
        await tx.insert(driverBalance).values({ driverId: debt.driverId, cashBalance: newBalance });
      }
      
      return updated;
    });
  }

  // Order Modifications
  async getAllOrderModifications(): Promise<OrderModification[]> {
    return db.select().from(orderModifications);
  }

  async getPendingOrderModifications(): Promise<OrderModification[]> {
    return db.select().from(orderModifications).where(eq(orderModifications.status, "PENDING"));
  }

  async getOrderModification(id: string): Promise<OrderModification | undefined> {
    const [modification] = await db.select().from(orderModifications).where(eq(orderModifications.id, id));
    return modification;
  }

  async getOrderModificationItems(modificationId: string): Promise<OrderModificationItem[]> {
    return db.select().from(orderModificationItems).where(eq(orderModificationItems.modificationId, modificationId));
  }

  async createOrderModification(modification: InsertOrderModification, items: InsertOrderModificationItem[]): Promise<OrderModification> {
    return await db.transaction(async (tx) => {
      const [newModification] = await tx.insert(orderModifications).values(modification).returning();
      
      for (const item of items) {
        await tx.insert(orderModificationItems).values({
          ...item,
          modificationId: newModification.id,
        });
      }
      
      return newModification;
    });
  }

  async approveOrderModification(id: string): Promise<OrderModification | undefined> {
    return await db.transaction(async (tx) => {
      const [modification] = await tx.select().from(orderModifications).where(eq(orderModifications.id, id));
      if (!modification || modification.status !== "PENDING") return undefined;

      const items = await tx.select().from(orderModificationItems).where(eq(orderModificationItems.modificationId, id));
      const driverId = modification.driverId;

      // تطبيق التعديلات على مخزون السائق
      for (const item of items) {
        const diff = item.requestedQuantity - item.originalQuantity;
        
        if (diff !== 0) {
          const [existing] = await tx.select().from(driverInventory)
            .where(and(
              eq(driverInventory.driverId, driverId),
              eq(driverInventory.productId, item.productId)
            ));

          if (existing) {
            const newQty = Math.max(0, existing.quantity + diff);
            await tx.update(driverInventory)
              .set({ quantity: newQty })
              .where(eq(driverInventory.id, existing.id));
          } else if (diff > 0) {
            await tx.insert(driverInventory).values({
              driverId,
              productId: item.productId,
              quantity: diff,
            });
          }
        }
      }

      // تحديث كميات الاستلام في عناصر الطلب
      for (const item of items) {
        await tx.update(orderItems)
          .set({ receivedQuantity: item.requestedQuantity })
          .where(and(
            eq(orderItems.orderId, modification.orderId),
            eq(orderItems.productId, item.productId)
          ));
      }

      // تحديث حالة التعديل
      const [updated] = await tx.update(orderModifications)
        .set({ status: "APPROVED", processedAt: new Date() })
        .where(eq(orderModifications.id, id))
        .returning();

      // تحديث حالة الطلب إلى مستلم (ASSIGNED يعني أن السائق استلم الطلب)
      await tx.update(orders)
        .set({ status: "ASSIGNED" })
        .where(eq(orders.id, modification.orderId));

      return updated;
    });
  }

  async rejectOrderModification(id: string): Promise<OrderModification | undefined> {
    const [updated] = await db.update(orderModifications)
      .set({ status: "REJECTED", processedAt: new Date() })
      .where(eq(orderModifications.id, id))
      .returning();
    return updated;
  }

  // Cash Deposits - تسليم المبالغ
  async getAllCashDeposits(): Promise<CashDeposit[]> {
    return db.select().from(cashDeposits);
  }

  async getDriverCashDeposits(driverId: string): Promise<CashDeposit[]> {
    return db.select().from(cashDeposits).where(eq(cashDeposits.driverId, driverId));
  }

  async getPendingCashDeposits(): Promise<CashDeposit[]> {
    return db.select().from(cashDeposits).where(eq(cashDeposits.status, "PENDING"));
  }

  async createCashDeposit(deposit: InsertCashDeposit): Promise<CashDeposit> {
    const [newDeposit] = await db.insert(cashDeposits).values(deposit).returning();
    return newDeposit;
  }

  async confirmCashDeposit(id: string, confirmedBy: string): Promise<CashDeposit | undefined> {
    return db.transaction(async (tx) => {
      const [deposit] = await tx.select().from(cashDeposits).where(eq(cashDeposits.id, id));
      if (!deposit || deposit.status !== "PENDING") {
        return undefined;
      }

      // Update deposit status
      const [updated] = await tx.update(cashDeposits)
        .set({ status: "CONFIRMED", confirmedAt: new Date(), confirmedBy })
        .where(eq(cashDeposits.id, id))
        .returning();

      // Deduct amount from driver's cash balance (ensure balance exists)
      const [balance] = await tx.select().from(driverBalance).where(eq(driverBalance.driverId, deposit.driverId));
      if (balance) {
        const newBalance = parseFloat(balance.cashBalance) - parseFloat(deposit.amount);
        await tx.update(driverBalance)
          .set({ cashBalance: newBalance.toFixed(2) })
          .where(eq(driverBalance.driverId, deposit.driverId));
      } else {
        // Create balance record with negative amount (deposit submitted before any balance)
        const negativeAmount = (0 - parseFloat(deposit.amount)).toFixed(2);
        await tx.insert(driverBalance).values({
          driverId: deposit.driverId,
          cashBalance: negativeAmount,
        });
      }

      return updated;
    });
  }

  async rejectCashDeposit(id: string, confirmedBy: string): Promise<CashDeposit | undefined> {
    // Only reject PENDING deposits
    const [deposit] = await db.select().from(cashDeposits).where(eq(cashDeposits.id, id));
    if (!deposit || deposit.status !== "PENDING") {
      return undefined;
    }
    
    const [updated] = await db.update(cashDeposits)
      .set({ status: "REJECTED", confirmedAt: new Date(), confirmedBy })
      .where(eq(cashDeposits.id, id))
      .returning();
    return updated;
  }
}

export const storage = new DatabaseStorage();
