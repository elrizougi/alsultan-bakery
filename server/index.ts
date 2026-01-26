import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { storage } from "./storage";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

async function seedDatabaseIfEmpty() {
  try {
    const users = await storage.getAllUsers();
    if (users.length === 0) {
      console.log("Database is empty. Seeding initial data...");
      
      // Seed Users
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
      
      console.log("Database seeded successfully!");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

(async () => {
  await seedDatabaseIfEmpty();
  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    },
  );
})();
