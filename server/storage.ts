import { db } from "./db";
import { eq } from "drizzle-orm";
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
  createReturn(ret: InsertReturn): Promise<Return>;
  deleteReturn(id: string): Promise<boolean>;

  // Return Items
  getReturnItems(returnId: string): Promise<ReturnItem[]>;
  createReturnItem(item: InsertReturnItem): Promise<ReturnItem>;
  deleteReturnItems(returnId: string): Promise<void>;
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
}

export const storage = new DatabaseStorage();
