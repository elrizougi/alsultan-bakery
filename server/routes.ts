import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCustomerSchema, insertOrderSchema, insertOrderItemSchema, insertDispatchRunSchema, insertReturnSchema, insertReturnItemSchema, insertRouteSchema, insertRunOrderSchema, insertTransactionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

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
  app.patch("/api/users/:id", async (req, res) => {
    try {
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

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      const orderId = req.params.id;
      // Delete all related records first
      await storage.deleteRunOrdersByOrderId(orderId);
      await storage.deleteReturnsByOrderId(orderId);
      await storage.deleteOrderItems(orderId);
      await storage.deleteOrder(orderId);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting order:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ DISPATCH RUNS ============
  app.get("/api/dispatch-runs", async (req, res) => {
    try {
      const runs = await storage.getAllDispatchRuns();
      // Get order IDs for each run
      const runsWithOrders = await Promise.all(
        runs.map(async (run) => {
          const runOrders = await storage.getRunOrders(run.id);
          return { ...run, orderIds: runOrders.map(ro => ro.orderId) };
        })
      );
      res.json(runsWithOrders);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/dispatch-runs/:id", async (req, res) => {
    try {
      const run = await storage.getDispatchRun(req.params.id);
      if (!run) {
        return res.status(404).json({ message: "الرحلة غير موجودة" });
      }
      const runOrders = await storage.getRunOrders(run.id);
      res.json({ ...run, orderIds: runOrders.map(ro => ro.orderId) });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/dispatch-runs", async (req, res) => {
    try {
      const { orderIds, ...runData } = req.body;
      const parsed = insertDispatchRunSchema.parse(runData);
      const run = await storage.createDispatchRun(parsed);
      
      // Assign orders to run
      if (orderIds && Array.isArray(orderIds)) {
        for (const orderId of orderIds) {
          await storage.createRunOrder({ runId: run.id, orderId });
          await storage.updateOrder(orderId, { status: 'ASSIGNED' });
        }
      }
      
      const runOrders = await storage.getRunOrders(run.id);
      res.status(201).json({ ...run, orderIds: runOrders.map(ro => ro.orderId) });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/dispatch-runs/:id", async (req, res) => {
    try {
      const { orderIds, ...runData } = req.body;
      
      // Update run data if provided
      let run = await storage.getDispatchRun(req.params.id);
      if (!run) {
        return res.status(404).json({ message: "الرحلة غير موجودة" });
      }
      
      if (Object.keys(runData).length > 0) {
        run = await storage.updateDispatchRun(req.params.id, runData) || run;
      }
      
      // Update orderIds if provided
      if (orderIds !== undefined && Array.isArray(orderIds)) {
        // Delete existing run orders
        await storage.deleteRunOrders(run.id);
        // Create new run orders
        for (const orderId of orderIds) {
          await storage.createRunOrder({ runId: run.id, orderId });
        }
      }
      
      const runOrders = await storage.getRunOrders(run.id);
      res.json({ ...run, orderIds: runOrders.map(ro => ro.orderId) });
    } catch (error) {
      console.error("Error updating dispatch run:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/dispatch-runs/:id/assign-order", async (req, res) => {
    try {
      const { orderId } = req.body;
      const run = await storage.getDispatchRun(req.params.id);
      if (!run) {
        return res.status(404).json({ message: "الرحلة غير موجودة" });
      }
      
      await storage.createRunOrder({ runId: run.id, orderId });
      await storage.updateOrder(orderId, { status: 'ASSIGNED' });
      
      const runOrders = await storage.getRunOrders(run.id);
      res.json({ ...run, orderIds: runOrders.map(ro => ro.orderId) });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/dispatch-runs/:id", async (req, res) => {
    try {
      await storage.deleteReturnsByRunId(req.params.id);
      await storage.deleteRunOrders(req.params.id);
      await storage.deleteDispatchRun(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting dispatch run:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  // ============ RETURNS ============
  app.get("/api/returns", async (req, res) => {
    try {
      const allReturns = await storage.getAllReturns();
      const returnsWithItems = await Promise.all(
        allReturns.map(async (ret) => {
          const items = await storage.getReturnItems(ret.id);
          return { ...ret, items };
        })
      );
      res.json(returnsWithItems);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/returns", async (req, res) => {
    try {
      console.log("Creating return with data:", JSON.stringify(req.body));
      const { items, ...returnData } = req.body;
      
      const parsed = insertReturnSchema.parse(returnData);
      console.log("Parsed return data:", JSON.stringify(parsed));
      const ret = await storage.createReturn(parsed);
      console.log("Created return:", JSON.stringify(ret));
      
      // Create return items and update inventory
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createReturnItem({
            returnId: ret.id,
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason,
          });
          
          // Deduct from driver inventory
          if (ret.driverId) {
            await storage.updateDriverInventory(ret.driverId, item.productId, -item.quantity);
          }
          
          // Return GOOD items to bakery stock (not damaged or expired)
          if (item.reason === 'GOOD') {
            const product = await storage.getProduct(item.productId);
            if (product) {
              await storage.updateProductStock(item.productId, product.stock + item.quantity);
            }
          }
        }
      }
      
      const returnItems = await storage.getReturnItems(ret.id);
      res.status(201).json({ ...ret, items: returnItems });
    } catch (error) {
      console.error("Error creating return:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/returns/:id", async (req, res) => {
    try {
      const deleted = await storage.deleteReturn(req.params.id);
      if (!deleted) {
        return res.status(404).json({ message: "المرتجع غير موجود" });
      }
      res.json({ message: "تم حذف المرتجع" });
    } catch (error) {
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

  app.post("/api/transactions", async (req, res) => {
    try {
      const parsed = insertTransactionSchema.parse(req.body);
      
      const { type, customerId } = parsed;
      
      // التحقق من أن البيع الآجل يتطلب عميل
      if (type === 'CREDIT_SALE' && !customerId) {
        return res.status(400).json({ message: "البيع الآجل يتطلب تحديد العميل" });
      }
      
      // استخدام الدالة الذرية لإنشاء العملية مع جميع التحديثات
      const transaction = await storage.createTransactionWithUpdates(parsed);
      
      res.status(201).json(transaction);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: error.errors });
      }
      console.error("Transaction error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/driver-load-inventory", async (req, res) => {
    try {
      const { driverId, productId, quantity } = req.body;
      if (!driverId || !productId || !quantity || quantity <= 0) {
        return res.status(400).json({ message: "بيانات غير صالحة" });
      }

      await storage.updateDriverInventory(driverId, productId, quantity);

      res.json({ message: "تم تحميل الخبز بنجاح" });
    } catch (error) {
      console.error("Load inventory error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.patch("/api/transactions/:id", async (req, res) => {
    try {
      const { quantity, unitPrice, customerId, notes } = req.body;
      const updated = await storage.updateTransactionWithUpdates(req.params.id, {
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

  // ============ ORDER MODIFICATIONS ============
  app.get("/api/order-modifications", async (req, res) => {
    try {
      const modifications = await storage.getAllOrderModifications();
      const result = await Promise.all(modifications.map(async (mod) => ({
        ...mod,
        items: await storage.getOrderModificationItems(mod.id),
      })));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.get("/api/order-modifications/pending", async (req, res) => {
    try {
      const modifications = await storage.getPendingOrderModifications();
      const result = await Promise.all(modifications.map(async (mod) => ({
        ...mod,
        items: await storage.getOrderModificationItems(mod.id),
      })));
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  const modificationSchema = z.object({
    orderId: z.string().uuid(),
    driverId: z.string().uuid(),
    items: z.array(z.object({
      productId: z.string().uuid(),
      originalQuantity: z.number().int().min(0),
      requestedQuantity: z.number().int().min(0),
    })),
    notes: z.string().optional(),
  });

  app.post("/api/order-modifications", async (req, res) => {
    try {
      const parseResult = modificationSchema.safeParse(req.body);
      if (!parseResult.success) {
        return res.status(400).json({ message: "بيانات غير صالحة", errors: parseResult.error.errors });
      }

      const { orderId, driverId, items, notes } = parseResult.data;
      
      const modification = await storage.createOrderModification(
        { orderId, driverId, status: "PENDING", notes },
        items.map(item => ({
          modificationId: "", // سيتم تعيينه داخل الدالة
          productId: item.productId,
          originalQuantity: item.originalQuantity,
          requestedQuantity: item.requestedQuantity,
        }))
      );

      res.status(201).json(modification);
    } catch (error) {
      console.error("Create modification error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/order-modifications/:id/approve", async (req, res) => {
    try {
      const modification = await storage.approveOrderModification(req.params.id);
      if (!modification) {
        return res.status(404).json({ message: "طلب التعديل غير موجود أو تمت معالجته مسبقاً" });
      }
      res.json(modification);
    } catch (error) {
      console.error("Approve modification error:", error);
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.post("/api/order-modifications/:id/reject", async (req, res) => {
    try {
      const modification = await storage.rejectOrderModification(req.params.id);
      if (!modification) {
        return res.status(404).json({ message: "طلب التعديل غير موجود" });
      }
      res.json(modification);
    } catch (error) {
      console.error("Reject modification error:", error);
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
      const { driverId, amount, depositDate, notes } = req.body;
      if (!driverId || !amount || !depositDate) {
        return res.status(400).json({ message: "البيانات المطلوبة غير مكتملة" });
      }
      const deposit = await storage.createCashDeposit({
        driverId,
        amount: String(amount),
        depositDate,
        notes,
      });
      res.json(deposit);
    } catch (error) {
      console.error("Create deposit error:", error);
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

  return httpServer;
}
