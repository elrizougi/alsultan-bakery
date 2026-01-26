import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import OrdersPage from "@/pages/Orders";
import DispatchPage from "@/pages/Dispatch";
import RunDetailsPage from "@/pages/RunDetails";
import InventoryPage from "@/pages/Inventory";
import ReturnsPage from "@/pages/Returns";
import CustomersPage from "@/pages/Customers";
import SettingsPage from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/orders" component={OrdersPage} />
      <Route path="/dispatch" component={DispatchPage} />
      <Route path="/dispatch/:id" component={RunDetailsPage} />
      <Route path="/inventory" component={InventoryPage} />
      <Route path="/returns" component={ReturnsPage} />
      <Route path="/customers" component={CustomersPage} />
      <Route path="/settings" component={SettingsPage} />
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
