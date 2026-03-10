# Bakery Distribution Management System

## Overview

This is a comprehensive bakery distribution and logistics management system built with a React frontend and Express backend. The application is designed for Arabic-speaking users (RTL layout) and provides functionality for managing bakery orders, dispatch runs, delivery tracking, inventory management, customer relationships, and returns processing.

The system is restricted to Admin-only login. Drivers and Sales users are managed as employees but cannot log in. The Admin operates all pages including driver pages (Field Operations, Daily Report, My Customers) with a driver selector dropdown to operate on behalf of any driver.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: Zustand with persistence middleware for global state (user session, authentication)
- **Data Fetching**: TanStack React Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables, RTL (right-to-left) layout support
- **Build Tool**: Vite with custom plugins for Replit integration

### Backend Architecture
- **Framework**: Express.js 5 with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Schema Validation**: Zod with drizzle-zod for type-safe schema generation
- **API Pattern**: RESTful API endpoints under `/api` prefix
- **Session Management**: Express sessions with connect-pg-simple for PostgreSQL session storage

### Data Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` contains all database table definitions
- **Migrations**: Drizzle Kit for database migrations (`drizzle-kit push`)
- **Shared Types**: Schema types are shared between frontend and backend via the `@shared` path alias

### Key Entities
- **Users**: Authentication with role-based permissions (ADMIN, SUB_ADMIN, DRIVER, SALES). SUB_ADMIN has all ADMIN capabilities except CSV import/export.
- **Products**: Bakery items with SKU, pricing, and stock tracking
- **Customers**: Customer profiles with delivery addresses and route assignments
- **Routes**: Delivery routes with assigned drivers
- **Orders**: Customer orders with line items and status workflow (DRAFT → CONFIRMED → ASSIGNED → DELIVERED → CLOSED)
- **Transactions**: Field operations log (CASH_SALE, CREDIT_SALE, RETURN, FREE_DISTRIBUTION, FREE_SAMPLE, DAMAGED, EXPENSE). EXPENSE transactions support optional receipt image upload (receiptImage field, stored in uploads/receipts/)
- **Driver Inventory**: Per-driver product stock tracking
- **Driver Balance**: Per-driver cash balance tracking
- **Customer Debts**: Credit sale debt tracking with partial payment support
- **Cash Deposits**: Driver-to-bakery cash deposit tracking with confirmation workflow
- **Expense Categories**: Dynamic bakery expense categories (user-managed, stored in `expense_categories` table)
- **Bakery Expenses**: General bakery expenses (rent, salaries, etc.) linked to dynamic categories
- **Driver Daily Images**: Per-driver per-day image uploads (up to 50MB each, stored in uploads/driver-images/)

### Reports
- **Daily Withdrawal Report** (`/daily-withdrawal-report`): Daily bread withdrawal report per customer showing quantities per product type (white, brown, medium, شاورما, wrapped), returns, financial calculations (amounts, paid, remaining). Supports print and Excel export (Excel restricted from SUB_ADMIN).
- **Driver Cumulative Balance** (`/driver-cumulative-balance`): Shows cumulative balance for all drivers across all days. Displays total sales (cash + credit), amounts paid to bakery, unpaid debts, expenses, bread sold count, and running cumulative balance. Expandable daily breakdown per driver.
- **Bakery Cash Vault** (`/bakery-cash-vault`): Cash flow audit page showing all income (confirmed driver deposits) and expenses (bakery expenses + driver expenses). Date range filter, type filter, print support. Shows period totals and all-time vault balance.

### Removed Tables (cleaned up)
- dispatch_runs, run_orders, returns, return_items, order_modifications, order_modification_items (empty/unused legacy tables)

### Build System
- **Development**: Vite dev server with HMR for frontend, tsx for backend
- **Production**: Custom build script using esbuild for server bundling, Vite for client
- **Output**: Compiled to `dist/` directory with server as CommonJS module

## External Dependencies

### Database
- **PostgreSQL**: Primary database, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: Session storage in PostgreSQL

### UI Framework
- **Radix UI**: Comprehensive set of accessible UI primitives (dialogs, dropdowns, forms, etc.)
- **shadcn/ui**: Pre-built component library with New York style variant
- **Lucide React**: Icon library

### Development Tools
- **Replit Plugins**: 
  - `@replit/vite-plugin-runtime-error-modal`: Error overlay
  - `@replit/vite-plugin-cartographer`: Development tooling
  - `@replit/vite-plugin-dev-banner`: Development banner

### Fonts
- **Cairo**: Primary Arabic font
- **Inter**: Secondary Latin font
- **JetBrains Mono**: Monospace font for code/data display

### Docker Deployment
- **Dockerfile**: node:20-alpine, builds frontend+backend, copies committed migrations, runs `npm start`
- **docker-compose.yml**: Service `alsultan-bakery` + `db` (postgres:15-alpine with healthcheck), internal port 3000, external port 3020
- **Migrations**: Committed in `migrations/` folder, safe with `IF NOT EXISTS` / `DO $$ EXCEPTION WHEN duplicate_object` for existing databases
- **Migration execution**: `runMigrations()` called automatically at server startup in production mode (server/index.ts)
- **Migration retry**: Up to 10 retries with 3s delay for DB connection readiness
- **Environment**: `.env` file (not committed), `.env.example` as template
- **Build command**: `docker compose up -d --build`