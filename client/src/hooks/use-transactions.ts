import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useTransactions(customerId?: number) {
  return useQuery({
    queryKey: [api.transactions.list.path, customerId],
    queryFn: async () => {
      const params = customerId ? `?customerId=${customerId}` : "";
      const res = await fetch(`${api.transactions.list.path}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch transactions");
      return api.transactions.list.responses[200].parse(await res.json());
    },
  });
}
