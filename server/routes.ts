import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertProductSchema, insertCustomerSchema, insertOrderSchema, insertOrderItemSchema, insertDispatchRunSchema, insertReturnSchema, insertReturnItemSchema, insertRouteSchema, insertRunOrderSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // ============ AUTH ============
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;
      const user = await storage.getUserByUsername(username);
      
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
      const order = await storage.updateOrder(req.params.id, orderData);
      if (!order) {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      
      // Update order items if provided
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
      
      const orderItems = await storage.getOrderItems(order.id);
      res.json({ ...order, items: orderItems });
    } catch (error) {
      res.status(500).json({ message: "خطأ في الخادم" });
    }
  });

  app.delete("/api/orders/:id", async (req, res) => {
    try {
      await storage.deleteOrderItems(req.params.id);
      await storage.deleteOrder(req.params.id);
      res.status(204).send();
    } catch (error) {
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
      const { items, ...returnData } = req.body;
      const parsed = insertReturnSchema.parse(returnData);
      const ret = await storage.createReturn(parsed);
      
      // Create return items
      if (items && Array.isArray(items)) {
        for (const item of items) {
          await storage.createReturnItem({
            returnId: ret.id,
            productId: item.productId,
            quantity: item.quantity,
            reason: item.reason,
          });
        }
      }
      
      const returnItems = await storage.getReturnItems(ret.id);
      res.status(201).json({ ...ret, items: returnItems });
    } catch (error) {
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

  return httpServer;
}
