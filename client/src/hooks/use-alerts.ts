import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";

export function useAlerts(customerId?: number) {
  return useQuery({
    queryKey: [api.alerts.list.path, customerId],
    queryFn: async () => {
      const params = customerId ? `?customerId=${customerId}` : "";
      const res = await fetch(`${api.alerts.list.path}${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch alerts");
      return api.alerts.list.responses[200].parse(await res.json());
    },
  });
}
