import { useMutation } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { RiskScoreResponse } from "@shared/routes";

export function useCalculateRiskScore() {
  return useMutation({
    mutationFn: async (customerId: number): Promise<RiskScoreResponse> => {
      const url = buildUrl(api.riskScoring.calculateForCustomer.path, { customerId });
      const res = await fetch(url, {
        method: api.riskScoring.calculateForCustomer.method,
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Customer not found");
      if (!res.ok) throw new Error("Failed to calculate risk score");
      return api.riskScoring.calculateForCustomer.responses[200].parse(await res.json());
    },
  });
}
