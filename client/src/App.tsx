import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import OrdersPage from "@/pages/Orders";
import InventoryPage from "@/pages/Inventory";
import CustomersPage from "@/pages/Customers";
import SettingsPage from "@/pages/Settings";
import LoginPage from "@/pages/Login";
import UsersManagementPage from "@/pages/UsersManagement";
import RoutesManagementPage from "@/pages/RoutesManagement";
import DriverTransactionsPage from "@/pages/DriverTransactions";
import CashDepositsPage from "@/pages/CashDeposits";
import DriverDailyReportPage from "@/pages/DriverDailyReport";
import MyCustomersPage from "@/pages/MyCustomers";
import BakeryExpensesPage from "@/pages/BakeryExpenses";
import DailyWithdrawalReportPage from "@/pages/DailyWithdrawalReport";
import RepPrintSheetPage from "@/pages/RepPrintSheet";

function Router() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/settings" component={SettingsPage} />
      <Route path="/users" component={UsersManagementPage} />
      <Route path="/routes" component={RoutesManagementPage} />
      <Route path="/driver-transactions" component={DriverTransactionsPage} />
      <Route path="/cash-deposits" component={CashDepositsPage} />
      <Route path="/driver-daily-report" component={DriverDailyReportPage} />
      <Route path="/my-customers" component={MyCustomersPage} />
      <Route path="/bakery-expenses" component={BakeryExpensesPage} />
      <Route path="/daily-withdrawal-report" component={DailyWithdrawalReportPage} />
      <Route path="/rep-print-sheet" component={RepPrintSheetPage} />
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
