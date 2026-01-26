import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, Order, Product, Customer, DispatchRun, ReturnRecord, Route } from "@/lib/api";

// Products
export function useProducts() {
  return useQuery({
    queryKey: ["products"],
    queryFn: api.getProducts,
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, stock }: { id: string; stock: number }) => api.updateProductStock(id, stock),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });
}

// Customers
export function useCustomers() {
  return useQuery({
    queryKey: ["customers"],
    queryFn: api.getCustomers,
  });
}

export function useCreateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

export function useUpdateCustomer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...customer }: Partial<Customer> & { id: string }) => api.updateCustomer(id, customer),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
    },
  });
}

// Routes
export function useRoutes() {
  return useQuery({
    queryKey: ["routes"],
    queryFn: api.getRoutes,
  });
}

// Orders
export function useOrders() {
  return useQuery({
    queryKey: ["orders"],
    queryFn: api.getOrders,
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...order }: Partial<Order> & { id: string }) => api.updateOrder(id, order),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useDeleteOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Dispatch Runs
export function useDispatchRuns() {
  return useQuery({
    queryKey: ["dispatch-runs"],
    queryFn: api.getDispatchRuns,
  });
}

export function useCreateDispatchRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createDispatchRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-runs"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useUpdateDispatchRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...run }: Partial<DispatchRun> & { id: string }) => api.updateDispatchRun(id, run),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-runs"] });
    },
  });
}

export function useDeleteDispatchRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.deleteDispatchRun,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-runs"] });
    },
  });
}

export function useAssignOrderToRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ runId, orderId }: { runId: string; orderId: string }) => api.assignOrderToRun(runId, orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dispatch-runs"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// Returns
export function useReturns() {
  return useQuery({
    queryKey: ["returns"],
    queryFn: api.getReturns,
  });
}

export function useCreateReturn() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: api.createReturn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["returns"] });
    },
  });
}
