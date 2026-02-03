import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['ADMIN', 'DRIVER', 'SALES']);
export const orderStatusEnum = pgEnum('order_status', ['DRAFT', 'CONFIRMED', 'ASSIGNED', 'DELIVERED', 'CLOSED', 'CANCELED']);
export const runStatusEnum = pgEnum('run_status', ['DRAFT', 'LOADED', 'OUT', 'RETURNED', 'CLOSED']);
export const returnReasonEnum = pgEnum('return_reason', ['GOOD', 'DAMAGED', 'EXPIRED']);

// Users table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: roleEnum("role").notNull().default('SALES'),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type Role = 'ADMIN' | 'DRIVER' | 'SALES';

// Products table
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  sku: text("sku").notNull().unique(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  stock: integer("stock").notNull().default(0),
  batchCount: integer("batch_count").notNull().default(0),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Routes table
export const routes = pgTable("routes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  driverName: text("driver_name").notNull(),
});

export const insertRouteSchema = createInsertSchema(routes).omit({ id: true });
export type InsertRoute = z.infer<typeof insertRouteSchema>;
export type Route = typeof routes.$inferSelect;

// Customers table
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  address: text("address").notNull(),
  locationUrl: text("location_url"),
  routeId: varchar("route_id").references(() => routes.id),
  phone: text("phone").notNull(),
});

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").notNull(),
  date: text("date").notNull(),
  status: orderStatusEnum("status").notNull().default('DRAFT'),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
});

export const insertOrderSchema = createInsertSchema(orders).omit({ id: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Order Items table
export const orderItems = pgTable("order_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Dispatch Runs table
export const dispatchRuns = pgTable("dispatch_runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  routeId: varchar("route_id").references(() => routes.id).notNull(),
  date: text("date").notNull(),
  status: runStatusEnum("status").notNull().default('DRAFT'),
  driverName: text("driver_name").notNull(),
});

export const insertDispatchRunSchema = createInsertSchema(dispatchRuns).omit({ id: true });
export type InsertDispatchRun = z.infer<typeof insertDispatchRunSchema>;
export type DispatchRun = typeof dispatchRuns.$inferSelect;

// Run Orders (junction table)
export const runOrders = pgTable("run_orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").references(() => dispatchRuns.id).notNull(),
  orderId: varchar("order_id").references(() => orders.id).notNull(),
});

export const insertRunOrderSchema = createInsertSchema(runOrders).omit({ id: true });
export type InsertRunOrder = z.infer<typeof insertRunOrderSchema>;
export type RunOrder = typeof runOrders.$inferSelect;

// Returns table
export const returns = pgTable("returns", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").references(() => dispatchRuns.id).notNull(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertReturnSchema = createInsertSchema(returns).omit({ id: true, createdAt: true });
export type InsertReturn = z.infer<typeof insertReturnSchema>;
export type Return = typeof returns.$inferSelect;

// Return Items table
export const returnItems = pgTable("return_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  returnId: varchar("return_id").references(() => returns.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  reason: returnReasonEnum("reason").notNull(),
});

export const insertReturnItemSchema = createInsertSchema(returnItems).omit({ id: true });
export type InsertReturnItem = z.infer<typeof insertReturnItemSchema>;
export type ReturnItem = typeof returnItems.$inferSelect;
