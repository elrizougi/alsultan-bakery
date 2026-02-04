import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import OrdersPage from "@/pages/Orders";
import InventoryPage from "@/pages/Inventory";
import ReturnsPage from "@/pages/Returns";
import CustomersPage from "@/pages/Customers";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import ReportsPage from "@/pages/Reports";
import UsersManagementPage from "@/pages/UsersManagement";
import RoutesManagementPage from "@/pages/RoutesManagement";
import DriverTransactionsPage from "@/pages/DriverTransactions";
import OrderModificationsPage from "@/pages/OrderModifications";
import DriverReportPage from "@/pages/DriverReport";
import CashDepositsPage from "@/pages/CashDeposits";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/reports" component={ReportsPage} />
      <Route path="/users" component={UsersManagementPage} />
      <Route path="/routes" component={RoutesManagementPage} />
      <Route path="/driver-transactions" component={DriverTransactionsPage} />
      <Route path="/order-modifications" component={OrderModificationsPage} />
      <Route path="/driver-report" component={DriverReportPage} />
      <Route path="/cash-deposits" component={CashDepositsPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <Toaster />
        <Router />
    </QueryClientProvider>
  );
}

export default App;
