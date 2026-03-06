import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, decimal, timestamp, pgEnum, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const roleEnum = pgEnum('role', ['ADMIN', 'DRIVER', 'SALES']);
export const orderStatusEnum = pgEnum('order_status', ['DRAFT', 'CONFIRMED', 'ASSIGNED', 'DELIVERED', 'CLOSED', 'CANCELED']);
export const transactionTypeEnum = pgEnum('transaction_type', ['CASH_SALE', 'CREDIT_SALE', 'RETURN', 'FREE_DISTRIBUTION', 'FREE_SAMPLE', 'DAMAGED', 'EXPENSE', 'DRIVER_DEBT']);

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
  driverId: varchar("driver_id").references(() => users.id),
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
  receivedQuantity: integer("received_quantity"),
});

export const insertOrderItemSchema = createInsertSchema(orderItems).omit({ id: true });
export type InsertOrderItem = z.infer<typeof insertOrderItemSchema>;
export type OrderItem = typeof orderItems.$inferSelect;

// Driver Inventory table - مخزون المندوب
export const driverInventory = pgTable("driver_inventory", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => users.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(0),
});

export const insertDriverInventorySchema = createInsertSchema(driverInventory).omit({ id: true });
export type InsertDriverInventory = z.infer<typeof insertDriverInventorySchema>;
export type DriverInventory = typeof driverInventory.$inferSelect;

// Driver Balance table - رصيد المندوب النقدي
export const driverBalance = pgTable("driver_balance", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => users.id).notNull().unique(),
  cashBalance: decimal("cash_balance", { precision: 10, scale: 2 }).notNull().default("0"),
});

export const insertDriverBalanceSchema = createInsertSchema(driverBalance).omit({ id: true });
export type InsertDriverBalance = z.infer<typeof insertDriverBalanceSchema>;
export type DriverBalance = typeof driverBalance.$inferSelect;

// Customer Debts table - ديون العملاء
export const customerDebts = pgTable("customer_debts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  driverId: varchar("driver_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paidAmount: decimal("paid_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  isPaid: boolean("is_paid").notNull().default(false),
});

export const insertCustomerDebtSchema = createInsertSchema(customerDebts).omit({ id: true, createdAt: true });
export type InsertCustomerDebt = z.infer<typeof insertCustomerDebtSchema>;
export type CustomerDebt = typeof customerDebts.$inferSelect;

// Transactions table - سجل العمليات
export const transactions = pgTable("transactions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => users.id).notNull(),
  customerId: varchar("customer_id").references(() => customers.id).notNull(),
  productId: varchar("product_id").references(() => products.id).notNull(),
  type: transactionTypeEnum("type").notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: decimal("unit_price", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  notes: text("notes"),
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({ id: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type TransactionType = 'CASH_SALE' | 'CREDIT_SALE' | 'RETURN' | 'FREE_DISTRIBUTION' | 'FREE_SAMPLE' | 'DAMAGED' | 'EXPENSE' | 'DRIVER_DEBT';

// Cash Deposits - تسليم المبالغ المحصلة للمخبز
export const depositStatusEnum = pgEnum("deposit_status", ["PENDING", "CONFIRMED", "REJECTED"]);

export const cashDeposits = pgTable("cash_deposits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  driverId: varchar("driver_id").references(() => users.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  status: depositStatusEnum("status").notNull().default("PENDING"),
  depositDate: text("deposit_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
  confirmedBy: varchar("confirmed_by").references(() => users.id),
  notes: text("notes"),
});

export const insertCashDepositSchema = createInsertSchema(cashDeposits).omit({ id: true, createdAt: true, confirmedAt: true });
export type InsertCashDeposit = z.infer<typeof insertCashDepositSchema>;
export type CashDeposit = typeof cashDeposits.$inferSelect;
export type DepositStatus = 'PENDING' | 'CONFIRMED' | 'REJECTED';

// Expense Categories - بنود المصروفات
export const expenseCategories = pgTable("expense_categories", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  color: text("color").notNull().default("bg-gray-100 text-gray-800"),
});

export const insertExpenseCategorySchema = createInsertSchema(expenseCategories).omit({ id: true });
export type InsertExpenseCategory = z.infer<typeof insertExpenseCategorySchema>;
export type ExpenseCategoryRecord = typeof expenseCategories.$inferSelect;

// Bakery Expenses - مصروفات المخبز
export const bakeryExpenses = pgTable("bakery_expenses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  categoryId: varchar("category_id").references(() => expenseCategories.id).notNull(),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description").notNull(),
  expenseDate: text("expense_date").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  createdBy: varchar("created_by").references(() => users.id),
});

export const insertBakeryExpenseSchema = createInsertSchema(bakeryExpenses).omit({ id: true, createdAt: true });
export type InsertBakeryExpense = z.infer<typeof insertBakeryExpenseSchema>;
export type BakeryExpense = typeof bakeryExpenses.$inferSelect;
