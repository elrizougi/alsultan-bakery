import { useState } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { useStore, Order, Status } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/status-badge";
import { Plus, Search, Filter } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function OrdersPage() {
  const { orders, customers, products, addOrder, updateOrderStatus } = useStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredOrders = orders.filter(order => {
    const customer = customers.find(c => c.id === order.customerId);
    const matchesSearch = customer?.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          order.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  return (
    <AdminLayout>
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">Manage customer orders and statuses.</p>
          </div>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create Order
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </div>

        <div className="rounded-md border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const customer = customers.find(c => c.id === order.customerId);
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium font-mono text-xs">{order.id}</TableCell>
                    <TableCell>{customer?.name}</TableCell>
                    <TableCell>{order.date}</TableCell>
                    <TableCell>{order.items.reduce((acc, item) => acc + item.quantity, 0)} units</TableCell>
                    <TableCell>${order.totalAmount.toFixed(2)}</TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {order.status === 'DRAFT' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-primary"
                          onClick={() => updateOrderStatus(order.id, 'CONFIRMED')}
                        >
                          Confirm
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <CreateOrderDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />
      </div>
    </AdminLayout>
  );
}

function CreateOrderDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { customers, products, addOrder } = useStore();
  
  // Minimal form for mockup purposes
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, we'd gather form data here. 
    // For mockup, let's just create a random order.
    const randomCustomer = customers[0];
    const newOrder: Order = {
      id: `o${Math.floor(Math.random() * 1000)}`,
      customerId: randomCustomer.id,
      date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
      items: [{ productId: products[0].id, quantity: 10 }],
      totalAmount: products[0].price * 10
    };
    addOrder(newOrder);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Select customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="p-4 bg-muted rounded-md text-sm text-muted-foreground">
            Mockup Note: This would contain a full product selection grid. 
            Clicking "Create" adds a sample order for demonstration.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit">Create Order</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
