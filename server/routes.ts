import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCustomerSchema, insertOrderSchema, insertOrderItemSchema, insertRouteSchema, insertTransactionSchema, insertExpenseCategorySchema, insertBakeryExpenseSchema,
  transactions as transactionsTable, customers as customersTable, customerDebts as customerDebtsTable,
  cashDeposits as cashDepositsTable, bakeryExpenses as bakeryExpensesTable,
  driverInventory as driverInventoryTable, driverBalance as driverBalanceTable,
} from "@shared/schema";
import { z } from "zod";
import { gte } from "drizzle-orm";
import { db } from "./db";
import multer from "multer";
import path from "path";
import fs from "fs";

const uploadsDir = path.join(process.cwd(), "uploads", "receipts");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const driverImagesDir = path.join(process.cwd(), "uploads", "driver-images");
if (!fs.existsSync(driverImagesDir)) {
  fs.mkdirSync(driverImagesDir, { recursive: true });
}

const driverImageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, driverImagesDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadDriverImage = multer({
  storage: driverImageStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|heic|heif)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, WebP, BMP, HEIC"));
    }
  },
});

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const uploadReceipt = multer({
  storage: receiptStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = /\.(jpg|jpeg|png|gif|webp|bmp|pdf)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error("نوع الملف غير مدعوم. الأنواع المسموحة: JPG, PNG, GIF, WebP, BMP, PDF"));
    }
  },
});

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.use("/uploads", (await import("express")).default.static(path.join(process.cwd(), "uploads")));

  // ============ AUTH ============
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // التحقق من وجود البيانات المطلوبة
      if (!username || !password) {
        return res.status(400).json({ message: "اسم المستخدم وكلمة المرور مطلوبان" });
      }
      
      // إزالة المسافات الزائدة من اسم المستخدم فقط
      const trimmedUsername = String(username).trim();
      
      const user = await storage.getUserByUsername(trimmedUsername);
      
      if (!user) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      
      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }

      if (user.role !== 'ADMIN' && user.role !== 'SUB_ADMIN') {
        return res.status(403).json({ message: "الدخول متاح فقط للمدير" });
      }
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/auth/register", async (req, res) => {
    try {
      const parsed = insertUserSchema.parse(req.body);
      const requestedByRole = req.headers['x-user-role'];
      if (requestedByRole === 'SUB_ADMIN' && parsed.role === 'ADMIN') {
        return res.status(403).json({ message: "لا يمكن للمدير المساعد إنشاء حساب مدير نظام" });
      }
      const existing = await storage.getUserByUsername(parsed.username);
      
      if (existing) {
        return res.status(400).json({ message: "اسم المستخدم موجود مسبقاً" });
      }
      
      const user = await storage.createUser(parsed);
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ USERS ============
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      // Remove passwords from response
      const safeUsers = users.map(({ password, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ PRODUCTS ============
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const parsed = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(parsed);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/products/:id/stock", async (req, res) => {
    try {
      const { stock } = req.body;
      const product = await storage.updateProductStock(req.params.id, stock);
      if (!product) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.updateProduct(req.params.id, req.body);
      if (!product) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteProduct(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "المنتج غير موجود" });
      }
      res.json({ message: "تم حذف المنتج" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ ROUTES ============
  app.get("/api/routes", async (req, res) => {
    try {
      const allRoutes = await storage.getAllRoutes();
      res.json(allRoutes);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/routes", async (req, res) => {
    try {
      const parsed = insertRouteSchema.parse(req.body);
      const route = await storage.createRoute(parsed);
      res.status(201).json(route);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/routes/:id", async (req, res) => {
    try {
      const route = await storage.updateRoute(req.params.id, req.body);
      if (!route) {
        return res.status(404).json({ message: "خط التوزيع غير موجود" });
      }
      res.json(route);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/routes/:id", async (req, res) => {
    try {
      await storage.deleteRoute(req.params.id);
      res.json({ message: "تم حذف خط التوزيع" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ USERS MANAGEMENT ============
  const checkSubAdminCannotModifyAdmin = async (req: any, res: any, targetUserId: string): Promise<boolean> => {
    const requestedByRole = req.headers['x-user-role'];
    if (requestedByRole === 'SUB_ADMIN') {
      const targetUser = await storage.getUser(targetUserId);
      if (targetUser && targetUser.role === 'ADMIN') {
        res.status(403).json({ message: "لا يمكن للمدير المساعد تعديل بيانات مدير النظام" });
        return false;
      }
    }
    return true;
  };

  app.patch("/api/users/:id", async (req, res) => {
    try {
      if (!(await checkSubAdminCannotModifyAdmin(req, res, req.params.id))) return;
      const { password, ...userData } = req.body;
      const user = await storage.updateUser(req.params.id, userData);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/users/:id/password", async (req, res) => {
    try {
      if (!(await checkSubAdminCannotModifyAdmin(req, res, req.params.id))) return;
      const { password } = req.body;
      if (!password || password.length < 6) {
        return res.status(400).json({ message: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });
      }
      const user = await storage.updateUserPassword(req.params.id, password);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      res.json({ message: "تم تغيير كلمة المرور بنجاح" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/users/:id/toggle-active", async (req, res) => {
    try {
      if (!(await checkSubAdminCannotModifyAdmin(req, res, req.params.id))) return;
      const { isActive } = req.body;
      const user = await storage.toggleUserActive(req.params.id, isActive);
      if (!user) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/users/:id", async (req, res) => {
    try {
      if (!(await checkSubAdminCannotModifyAdmin(req, res, req.params.id))) return;
      await storage.deleteUser(req.params.id);
      res.json({ message: "تم حذف المستخدم" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ CUSTOMERS ============
  app.get("/api/customers", async (req, res) => {
    try {
      const customers = await storage.getAllCustomers();
      res.json(customers);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.getCustomer(req.params.id);
      if (!customer) {
        return res.status(404).json({ message: "العميل غير موجود" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/customers", async (req, res) => {
    try {
      const parsed = insertCustomerSchema.parse(req.body);
      const customer = await storage.createCustomer(parsed);
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/customers/:id", async (req, res) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "العميل غير موجود" });
      }
      res.json(customer);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/customers/:id/related-counts", async (req, res) => {
    try {
      const counts = await storage.getCustomerRelatedCounts(req.params.id);
      res.json(counts);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/customers/:id/transfer/:targetId", async (req, res) => {
    try {
      await storage.transferCustomerData(req.params.id, req.params.targetId);
      const deleted = await storage.deleteCustomer(req.params.id);
      res.json({ message: "تم نقل العمليات وحذف العميل" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/customers/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomer(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "العميل غير موجود" });
      }
      res.json({ message: "تم حذف العميل" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ CUSTOMER PRICES - أسعار خاصة للعملاء ============
  app.get("/api/customer-prices/all", async (req, res) => {
    try {
      const allPrices = await storage.getAllCustomerPrices();
      res.json(allPrices);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/customer-prices/:customerId", async (req, res) => {
    try {
      const prices = await storage.getCustomerPrices(req.params.customerId);
      res.json(prices);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/customer-prices", async (req, res) => {
    try {
      const { customerId, productId, price } = req.body;
      if (!customerId || !productId || price === undefined || price === null || price === "") {
        return res.status(400).json({ message: "البيانات غير مكتملة" });
      }
      const numPrice = parseFloat(price);
      if (isNaN(numPrice) || numPrice < 0) {
        return res.status(400).json({ message: "السعر غير صالح" });
      }
      const result = await storage.setCustomerPrice({ customerId, productId, price: numPrice.toFixed(2) });
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/customer-prices/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCustomerPrice(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "السعر غير موجود" });
      }
      res.json({ message: "تم حذف السعر" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ ORDERS ============
  app.get("/api/orders", async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      // Get order items for each order
      const ordersWithItems = await Promise.all(
        orders.map(async (order) => {
          const items = await storage.getOrderItems(order.id);
          return { ...order, items };
        })
      );
      res.json(ordersWithItems);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      const items = await storage.getOrderItems(order.id);
      res.json({ ...order, items });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/orders", async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      const parsed = insertOrderSchema.parse(orderData);
      const order = await storage.createOrder(parsed);
      
      // Create order items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
          });
          
          // إذا كان الطلب مؤكد أو تم التسليم، خصم من مخزون المخبز وأضف لمخزون المندوب
          if (parsed.status === 'CONFIRMED' || parsed.status === 'DELIVERED') {
            const product = await storage.getProduct(item.productId);
            if (product) {
              const newStock = Math.max(0, product.stock - item.quantity);
              await storage.updateProductStock(item.productId, newStock);
            }
            // إضافة لمخزون المندوب (customerId يشير للمندوب في طلبات الخبز)
            if (order.customerId) {
              await storage.updateDriverInventory(order.customerId, item.productId, item.quantity);
            }
          }
        }
      }
      
      const orderItems = await storage.getOrderItems(order.id);
      res.status(201).json({ ...order, items: orderItems });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/orders/:id", async (req, res) => {
    try {
      const { items, ...orderData } = req.body;
      
      // الحصول على الطلب الحالي للتحقق من تغير الحالة
      const existingOrder = await storage.getOrder(req.params.id);
      if (!existingOrder) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      
      const order = await storage.updateOrder(req.params.id, orderData);
      if (!order) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      
      // Update order items if provided (قبل تحديث المخزون)
      if (items && Array.isArray(items)) {
        await storage.deleteOrderItems(order.id);
        for (const item of items) {
          await storage.createOrderItem({
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
          });
        }
      }
      
      // إذا تغيرت الحالة إلى مؤكد أو تم التسليم من أي حالة غير مؤكدة، خصم من مخزون المخبز وأضف لمخزون المندوب
      const confirmedStatuses = ['CONFIRMED', 'DELIVERED'];
      const wasNotConfirmed = !confirmedStatuses.includes(existingOrder.status);
      const isNowConfirmed = confirmedStatuses.includes(orderData.status);
      
      if (wasNotConfirmed && isNowConfirmed) {
        const finalItems = await storage.getOrderItems(order.id);
        for (const item of finalItems) {
          const product = await storage.getProduct(item.productId);
          if (product) {
            // خصم من مخزون المخبز
            const newStock = Math.max(0, product.stock - item.quantity);
            await storage.updateProductStock(item.productId, newStock);
          }
          // إضافة لمخزون المندوب (customerId يشير للمندوب في طلبات الخبز)
          if (order.customerId) {
            await storage.updateDriverInventory(order.customerId, item.productId, item.quantity);
          }
        }
      }
      
      const orderItems = await storage.getOrderItems(order.id);
      res.json({ ...order, items: orderItems });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // تأكيد استلام الطلب من السائق مع الكميات المستلمة
  const confirmReceiptSchema = z.object({
    receivedItems: z.array(z.object({
      id: z.string().uuid(),
      receivedQuantity: z.number().int().min(0),
    })),
  });

  app.post("/api/orders/:id/confirm-receipt", async (req, res) => {
    try {
      // التحقق من صحة البيانات
      const parseResult = confirmReceiptSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: parseResult.error.errors });
      }

      const { receivedItems } = parseResult.data;

      // تنفيذ العملية بشكل ذري
      const updatedOrder = await storage.confirmOrderReceiptAtomic(req.params.id, receivedItems);
      
      const orderItems = await storage.getOrderItems(req.params.id);
      res.json({ ...updatedOrder, items: orderItems });
    } catch (error: any) {
      console.error("Confirm receipt error:", error);
      if (error.message?.includes('غير موجود') || error.message?.includes('غير صالحة') || error.message?.includes('ليس في حالة')) {
        return res.status(400).json({ message: error.message });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/order-items/:id/received-quantity", async (req, res) => {
    try {
      const { receivedQuantity, driverId, productId, oldReceivedQuantity } = req.body;
      const newQty = Number(receivedQuantity);
      const oldQty = Number(oldReceivedQuantity);
      const diff = newQty - oldQty;

      await storage.updateOrderItemReceived(req.params.id, newQty);

      if (diff !== 0 && driverId && productId) {
        await storage.updateDriverInventory(driverId, productId, diff);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating order item received quantity:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      await storage.deleteOrderItems(orderId);
      await storage.deleteOrder(orderId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ SEED DATA ============
  app.post("/api/seed", async (req, res) => {
    try {
      // Seed Products
      const productsData = [
        { name: 'خبز صامولي', sku: 'SD-001', price: '6.50', category: 'Bread', stock: 150 },
        { name: 'باجيت فرنسي', sku: 'BG-002', price: '4.00', category: 'Bread', stock: 85 },
        { name: 'كرواسون زبدة', sku: 'CR-001', price: '3.50', category: 'Pastry', stock: 45 },
        { name: 'بان أو شوكولا', sku: 'PC-002', price: '3.75', category: 'Pastry', stock: 120 },
        { name: 'خبز ريف', sku: 'RB-001', price: '7.00', category: 'Bread', stock: 60 },
        { name: 'فوكاشيا', sku: 'FC-001', price: '18.00', category: 'Bread', stock: 30 },
        { name: 'مافن بلوبري', sku: 'MF-001', price: '3.25', category: 'Pastry', stock: 55 },
      ];
      
      for (const product of productsData) {
        await storage.createProduct(product);
      }
      
      // Seed Routes
      const routesData = [
        { name: 'وسط المدينة', driverName: 'أحمد علي' },
        { name: 'المنطقة الغربية', driverName: 'سارة خالد' },
        { name: 'الضواحي الشمالية', driverName: 'محمد فهد' },
      ];
      
      const createdRoutes = [];
      for (const route of routesData) {
        const r = await storage.createRoute(route);
        createdRoutes.push(r);
      }
      
      // Seed Customers
      const customersData = [
        { name: 'مقهى ديلي جريند', address: 'شارع الملك فهد', locationUrl: 'https://maps.google.com', routeId: createdRoutes[0]?.id, phone: '555-0101' },
        { name: 'فندق صنسيت', address: 'طريق الكورنيش', locationUrl: 'https://maps.google.com', routeId: createdRoutes[1]?.id, phone: '555-0102' },
        { name: 'مطبخ الشركات', address: 'مجمع الأعمال', locationUrl: 'https://maps.google.com', routeId: createdRoutes[2]?.id, phone: '555-0103' },
        { name: 'جوز ديلي', address: 'سوق البلد', locationUrl: 'https://maps.google.com', routeId: createdRoutes[0]?.id, phone: '555-0104' },
        { name: 'مقهى الجامعة', address: 'طريق الجامعة', locationUrl: 'https://maps.google.com', routeId: createdRoutes[1]?.id, phone: '555-0105' },
      ];
      
      for (const customer of customersData) {
        await storage.createCustomer(customer);
      }
      
      // Seed Admin User
      await storage.createUser({
        username: 'admin',
        password: 'admin123',
        name: 'مدير النظام',
        role: 'ADMIN',
      });
      
      await storage.createUser({
        username: 'driver1',
        password: 'driver123',
        name: 'أحمد المندوب',
        role: 'DRIVER',
      });
      
      await storage.createUser({
        username: 'sales1',
        password: 'sales123',
        name: 'سامي المبيعات',
        role: 'SALES',
      });
      
      res.json({ message: "تم إضافة البيانات الأولية بنجاح" });
    } catch (error) {
      console.error("Seed error:", error);
      res.status(500).json({ message: "خطأ أثناء إضافة البيانات الأولية" });
    }
  });

  // ============ DRIVER INVENTORY ============
  app.get("/api/driver-inventory/:driverId", async (req, res) => {
    try {
      const inventory = await storage.getDriverInventory(req.params.driverId);
      res.json(inventory);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/driver-inventory/:driverId", async (req, res) => {
    try {
      const { productId, quantity } = req.body;
      if (!productId || quantity === undefined || quantity < 0) {
        return res.status(400).json({ message: "بيانات غير صحيحة" });
      }
      const result = await storage.upsertDriverInventory(req.params.driverId, productId, quantity);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ DRIVER BALANCE ============
  app.get("/api/driver-balance/:driverId", async (req, res) => {
    try {
      const balance = await storage.getDriverBalance(req.params.driverId);
      res.json(balance || { driverId: req.params.driverId, cashBalance: "0" });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ CUSTOMER DEBTS ============
  app.get("/api/customer-debts", async (req, res) => {
    try {
      const debts = await storage.getAllCustomerDebts();
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/customer-debts/:customerId", async (req, res) => {
    try {
      const debts = await storage.getCustomerDebts(req.params.customerId);
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/driver-customer-debts/:driverId", async (req, res) => {
    try {
      const debts = await storage.getDriverCustomerDebts(req.params.driverId);
      res.json(debts);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/customer-debts/:id", async (req, res) => {
    try {
      const { isPaid } = req.body;
      const debt = await storage.updateCustomerDebtWithBalance(req.params.id, isPaid);
      if (!debt) {
        return res.status(404).json({ message: "الدين غير موجود" });
      }
      res.json(debt);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/customer-debts/:id/partial-payment", async (req, res) => {
    try {
      const { paymentAmount } = req.body;
      if (typeof paymentAmount !== 'number' || paymentAmount <= 0) {
        return res.status(400).json({ message: "المبلغ غير صالح" });
      }
      const debt = await storage.makePartialPayment(req.params.id, paymentAmount);
      if (!debt) {
        return res.status(404).json({ message: "الدين غير موجود" });
      }
      res.json(debt);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ TRANSACTIONS ============
  app.get("/api/transactions", async (req, res) => {
    try {
      const allTransactions = await storage.getAllTransactions();
      res.json(allTransactions);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/driver-transactions/:driverId", async (req, res) => {
    try {
      const driverTransactions = await storage.getDriverTransactions(req.params.driverId);
      res.json(driverTransactions);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/upload-receipt", uploadReceipt.single("receipt"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم اختيار ملف" });
      }
      const filePath = `/uploads/receipts/${req.file.filename}`;
      res.json({ url: filePath });
    } catch (error: any) {
      res.status(500).json({ message: error.message || "خطأ في رفع الملف" });
    }
  });

  app.post("/api/transactions", async (req, res) => {
    try {
      const body = { ...req.body };
      if (body.createdAt && typeof body.createdAt === 'string') {
        body.createdAt = new Date(body.createdAt);
      }
      const parsed = insertTransactionSchema.parse(body);
      
      const { type, customerId } = parsed;
      
      // التحقق من أن البيع الآجل يتطلب عميل
      if (type === 'CREDIT_SALE' && !customerId) {
        return res.status(400).json({ message: "البيع الآجل يتطلب تحديد العميل" });
      }
      
      const transaction = await storage.createTransactionWithUpdates(parsed);
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      if (error instanceof Error) {
        if (error.message === 'INSUFFICIENT_INVENTORY') {
          return res.status(400).json({ message: "لا يوجد مخزون كافٍ لهذا المنتج. يجب إضافة مخزون أولاً من سجل الخبز." });
        }
        if (error.message.startsWith('INSUFFICIENT_INVENTORY_QTY:')) {
          const available = error.message.split(':')[1];
          return res.status(400).json({ message: `الكمية المطلوبة أكبر من المخزون المتاح (${available})` });
        }
      }
      console.error("Transaction error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/transactions/bulk-import", async (req, res) => {
    try {
      const { rows } = req.body;
      if (!Array.isArray(rows) || rows.length === 0) {
        return res.status(400).json({ message: "لا توجد بيانات للاستيراد" });
      }

      const allUsers = await storage.getAllUsers();
      const allProducts = await storage.getAllProducts();
      const allCustomers = await storage.getAllCustomers();

      const results: { row: number; status: string; error?: string }[] = [];

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        try {
          const driver = allUsers.find(u => u.name === row.driverName?.trim());
          if (!driver) {
            results.push({ row: i + 1, status: 'error', error: `المندوب "${row.driverName}" غير موجود` });
            continue;
          }

          const typeMap: Record<string, string> = {
            'بيع نقدي': 'CASH_SALE',
            'بيع آجل': 'CREDIT_SALE',
            'مرتجع': 'RETURN',
            'توزيع مجاني': 'FREE_DISTRIBUTION',
            'عينات': 'FREE_SAMPLE',
            'تالف': 'DAMAGED',
            'مصروفات': 'EXPENSE',
            'مديونية': 'DRIVER_DEBT',
            'مديونية على المندوب': 'DRIVER_DEBT',
          };
          const type = typeMap[row.type?.trim()] || row.type?.trim();
          if (!type) {
            results.push({ row: i + 1, status: 'error', error: 'نوع العملية مطلوب' });
            continue;
          }

          const isExpense = type === 'EXPENSE' || type === 'DRIVER_DEBT';

          let productId = '';
          if (!isExpense) {
            const product = allProducts.find(p => p.name === row.productName?.trim());
            if (!product) {
              results.push({ row: i + 1, status: 'error', error: `المنتج "${row.productName}" غير موجود` });
              continue;
            }
            productId = product.id;
          } else {
            const defaultProduct = allProducts[0];
            productId = defaultProduct?.id || '';
          }

          let customerId = '';
          if (row.customerName?.trim()) {
            const customer = allCustomers.find(c => c.name === row.customerName?.trim());
            if (!customer) {
              results.push({ row: i + 1, status: 'error', error: `العميل "${row.customerName}" غير موجود` });
              continue;
            }
            customerId = customer.id;
          }

          if (type === 'CREDIT_SALE' && !customerId) {
            results.push({ row: i + 1, status: 'error', error: 'البيع الآجل يتطلب تحديد العميل' });
            continue;
          }

          const quantity = parseInt(row.quantity) || 0;
          const unitPrice = parseFloat(row.unitPrice) || 0;
          const totalAmount = isExpense ? (parseFloat(row.totalAmount) || 0) : (quantity * unitPrice);

          const txData: any = {
            driverId: driver.id,
            customerId: customerId || driver.id,
            productId,
            type,
            quantity: isExpense ? 0 : quantity,
            unitPrice: String(unitPrice),
            totalAmount: String(totalAmount),
            notes: row.notes || '',
          };

          if (row.date) {
            txData.createdAt = new Date(row.date);
          }

          const existingTx = await storage.findDuplicateTransaction(txData.driverId, txData.customerId, txData.productId, txData.type, txData.quantity, txData.totalAmount, txData.createdAt);
          if (existingTx) {
            results.push({ row: i + 1, status: 'skipped', error: 'عملية مكررة - تم تخطيها' });
            continue;
          }

          await storage.createTransactionWithUpdates(txData);
          results.push({ row: i + 1, status: 'success' });
        } catch (err: any) {
          results.push({ row: i + 1, status: 'error', error: err.message || 'خطأ غير معروف' });
        }
      }

      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const skippedCount = results.filter(r => r.status === 'skipped').length;
      let msg = `تم استيراد ${successCount} عملية بنجاح`;
      if (skippedCount > 0) msg += `، ${skippedCount} مكرر تم تخطيه`;
      if (errorCount > 0) msg += `، ${errorCount} خطأ`;
      res.json({ message: msg, results });
    } catch (error) {
      console.error("Bulk import error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/driver-load-inventory", async (req, res) => {
    try {
      const { driverId, productId, quantity, mode } = req.body;
      if (!driverId || !productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "بيانات غير صالحة" });
      }

      const isReturn = mode === 'return';
      const qtyChange = isReturn ? -quantity : quantity;

      if (isReturn) {
        const currentInv = await storage.getDriverInventoryItem(driverId, productId);
        if (!currentInv || currentInv.quantity < quantity) {
          return res.status(400).json({ message: `الكمية المتوفرة لدى المندوب (${currentInv?.quantity || 0}) أقل من كمية المرتجع (${quantity})` });
        }
      }

      await storage.updateDriverInventory(driverId, productId, qtyChange);

      const product = await storage.getProduct(productId);
      if (product) {
        const stockChange = isReturn ? quantity : -quantity;
        const newStock = Math.max(0, product.stock + stockChange);
        await storage.updateProduct(productId, { stock: newStock });
      }

      res.json({ message: isReturn ? "تم إرجاع الخبز للمخبز بنجاح" : "تم تحميل الخبز بنجاح" });
    } catch (error) {
      console.error("Load inventory error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { type, quantity, unitPrice, customerId, notes } = req.body;
      if (type === 'CREDIT_SALE' && !customerId) {
        return res.status(400).json({ message: "العميل مطلوب للبيع الآجل" });
      }
      const validTypes = ['CASH_SALE', 'CREDIT_SALE', 'RETURN', 'FREE_DISTRIBUTION', 'FREE_SAMPLE', 'DAMAGED', 'EXPENSE', 'DRIVER_DEBT'];
      if (type && !validTypes.includes(type)) {
        return res.status(400).json({ message: "نوع العملية غير صالح" });
      }
      const updated = await storage.updateTransactionWithUpdates(req.params.id, {
        type,
        quantity,
        unitPrice,
        customerId,
        notes,
      });
      if (!updated) {
        return res.status(404).json({ message: "العملية غير موجودة" });
      }
      res.json(updated);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/transactions/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteTransactionWithUpdates(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "العملية غير موجودة" });
      }
      res.json({ message: "تم حذف العملية بنجاح" });
    } catch (error) {
      console.error("Delete transaction error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ CASH DEPOSITS - تسليم المبالغ ============
  app.get("/api/cash-deposits", async (req, res) => {
    try {
      const deposits = await storage.getAllCashDeposits();
      res.json(deposits);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/cash-deposits/driver/:driverId", async (req, res) => {
    try {
      const deposits = await storage.getDriverCashDeposits(req.params.driverId);
      res.json(deposits);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/cash-deposits/pending", async (req, res) => {
    try {
      const deposits = await storage.getPendingCashDeposits();
      res.json(deposits);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/cash-deposits", async (req, res) => {
    try {
      const { driverId, amount, depositDate, notes, confirmedBy } = req.body;
      if (!driverId || !amount || !depositDate) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const deposit = await storage.createCashDeposit({
        driverId,
        amount: String(amount),
        depositDate,
        notes,
      });
      if (confirmedBy && deposit) {
        const confirmed = await storage.confirmCashDeposit(deposit.id, confirmedBy);
        return res.json(confirmed || deposit);
      }
      res.json(deposit);
    } catch (error) {
      console.error("Create deposit error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/cash-deposits/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteCashDeposit(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "طلب التسليم غير موجود" });
      }
      res.json({ message: "تم حذف طلب التسليم بنجاح" });
    } catch (error) {
      console.error("Delete deposit error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/cash-deposits/:id", async (req, res) => {
    try {
      const { amount, notes, depositDate } = req.body;
      const updateData: { amount?: string; notes?: string; depositDate?: string } = {};
      if (amount !== undefined) updateData.amount = String(amount);
      if (notes !== undefined) updateData.notes = notes;
      if (depositDate !== undefined) updateData.depositDate = depositDate;
      const deposit = await storage.updateCashDeposit(req.params.id, updateData);
      if (!deposit) {
        return res.status(404).json({ message: "طلب التسليم غير موجود" });
      }
      res.json(deposit);
    } catch (error) {
      console.error("Update deposit error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/cash-deposits/:id/confirm", async (req, res) => {
    try {
      const { confirmedBy } = req.body;
      if (!confirmedBy) {
        return res.status(400).json({ message: "معرف المؤكد مطلوب" });
      }
      const deposit = await storage.confirmCashDeposit(req.params.id, confirmedBy);
      if (!deposit) {
        return res.status(404).json({ message: "طلب التسليم غير موجود أو تم معالجته مسبقاً" });
      }
      res.json(deposit);
    } catch (error) {
      console.error("Confirm deposit error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/cash-deposits/:id/reject", async (req, res) => {
    try {
      const { confirmedBy } = req.body;
      if (!confirmedBy) {
        return res.status(400).json({ message: "معرف المرفض مطلوب" });
      }
      const deposit = await storage.rejectCashDeposit(req.params.id, confirmedBy);
      if (!deposit) {
        return res.status(404).json({ message: "طلب التسليم غير موجود" });
      }
      res.json(deposit);
    } catch (error) {
      console.error("Reject deposit error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Expense Categories - بنود المصروفات
  app.get("/api/expense-categories", async (_req, res) => {
    try {
      const categories = await storage.getExpenseCategories();
      res.json(categories);
    } catch (error) {
      console.error("Get expense categories error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/expense-categories", async (req, res) => {
    try {
      const validated = insertExpenseCategorySchema.parse(req.body);
      const category = await storage.createExpenseCategory(validated);
      res.json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(400).json({ message: "اسم البند موجود مسبقاً" });
      }
      console.error("Create expense category error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/expense-categories/:id", async (req, res) => {
    try {
      const validated = insertExpenseCategorySchema.partial().parse(req.body);
      const category = await storage.updateExpenseCategory(req.params.id, validated);
      if (!category) {
        return res.status(404).json({ message: "البند غير موجود" });
      }
      res.json(category);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      if (error.code === '23505') {
        return res.status(400).json({ message: "اسم البند موجود مسبقاً" });
      }
      console.error("Update expense category error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/expense-categories/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteExpenseCategory(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "البند غير موجود" });
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === '23503') {
        return res.status(400).json({ message: "لا يمكن حذف البند لوجود مصروفات مرتبطة به" });
      }
      console.error("Delete expense category error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // Bakery Expenses - مصروفات المخبز
  app.get("/api/bakery-expenses", async (_req, res) => {
    try {
      const expenses = await storage.getBakeryExpenses();
      res.json(expenses);
    } catch (error) {
      console.error("Get bakery expenses error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/bakery-expenses", async (req, res) => {
    try {
      const validated = insertBakeryExpenseSchema.parse(req.body);
      const expense = await storage.createBakeryExpense(validated);
      res.json(expense);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      console.error("Create bakery expense error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.put("/api/bakery-expenses/:id", async (req, res) => {
    try {
      const validated = insertBakeryExpenseSchema.partial().parse(req.body);
      const expense = await storage.updateBakeryExpense(req.params.id, validated);
      if (!expense) {
        return res.status(404).json({ message: "المصروف غير موجود" });
      }
      res.json(expense);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      console.error("Update bakery expense error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/bakery-expenses/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteBakeryExpense(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "المصروف غير موجود" });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete bakery expense error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ DRIVER DAILY IMAGES ============
  app.get("/api/driver-daily-images/:driverId/:imageDate", async (req, res) => {
    try {
      const images = await storage.getDriverDailyImages(req.params.driverId, req.params.imageDate);
      res.json(images);
    } catch (error) {
      console.error("Get driver daily images error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/driver-daily-images", uploadDriverImage.single("image"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "لم يتم اختيار صورة" });
      }
      const { driverId, imageDate } = req.body;
      if (!driverId || !imageDate) {
        return res.status(400).json({ message: "بيانات ناقصة" });
      }
      const imagePath = `/uploads/driver-images/${req.file.filename}`;
      const image = await storage.createDriverDailyImage({ driverId, imageDate, imagePath });
      res.json(image);
    } catch (error: any) {
      console.error("Upload driver daily image error:", error);
      res.status(500).json({ message: error.message || "خطأ في رفع الصورة" });
    }
  });

  app.delete("/api/driver-daily-images/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteDriverDailyImage(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "الصورة غير موجودة" });
      }
      const fullPath = path.join(process.cwd(), deleted.imagePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Delete driver daily image error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ INCREMENTAL DATA LOAD ============
  app.get("/api/incremental", async (req, res) => {
    try {
      const since = req.query.since ? new Date(req.query.since as string) : null;
      const tables = (req.query.tables as string || "").split(",").filter(Boolean);

      const result: Record<string, any[]> = {};

      const shouldInclude = (table: string) => tables.length === 0 || tables.includes(table);

      if (shouldInclude("transactions")) {
        if (since) {
          result.transactions = await db.select().from(transactionsTable).where(gte(transactionsTable.updatedAt, since));
        } else {
          result.transactions = await storage.getAllTransactions();
        }
      }

      if (shouldInclude("customers")) {
        if (since) {
          result.customers = await db.select().from(customersTable).where(gte(customersTable.updatedAt, since));
        } else {
          result.customers = await storage.getAllCustomers();
        }
      }

      if (shouldInclude("customer_debts")) {
        if (since) {
          result.customer_debts = await db.select().from(customerDebtsTable).where(gte(customerDebtsTable.updatedAt, since));
        } else {
          result.customer_debts = await storage.getAllCustomerDebts();
        }
      }

      if (shouldInclude("cash_deposits")) {
        if (since) {
          result.cash_deposits = await db.select().from(cashDepositsTable).where(gte(cashDepositsTable.updatedAt, since));
        } else {
          result.cash_deposits = await storage.getAllCashDeposits();
        }
      }

      if (shouldInclude("bakery_expenses")) {
        if (since) {
          result.bakery_expenses = await db.select().from(bakeryExpensesTable).where(gte(bakeryExpensesTable.updatedAt, since));
        } else {
          result.bakery_expenses = await storage.getBakeryExpenses();
        }
      }

      if (shouldInclude("driver_inventory")) {
        if (since) {
          result.driver_inventory = await db.select().from(driverInventoryTable).where(gte(driverInventoryTable.updatedAt, since));
        } else {
          result.driver_inventory = await db.select().from(driverInventoryTable);
        }
      }

      if (shouldInclude("driver_balance")) {
        if (since) {
          result.driver_balance = await db.select().from(driverBalanceTable).where(gte(driverBalanceTable.updatedAt, since));
        } else {
          result.driver_balance = await db.select().from(driverBalanceTable);
        }
      }

      res.json({ data: result, timestamp: new Date().toISOString() });
    } catch (error) {
      console.error("Incremental load error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  return httpServer;
}
