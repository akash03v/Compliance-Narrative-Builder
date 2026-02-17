import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import type { GenerateSarInput, UpdateSectionInput, SarComparisonResponse, ExplainSentenceResponse } from "@shared/routes";

export function useSars() {
  return useQuery({
    queryKey: [api.sars.list.path],
    queryFn: async () => {
      const res = await fetch(api.sars.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch SARs");
      return api.sars.list.responses[200].parse(await res.json());
    },
  });
}

export function useSar(id: number) {
  return useQuery({
    queryKey: [api.sars.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sars.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch SAR");
      return api.sars.get.responses[200].parse(await res.json());
    },
  });
}

export function useGenerateSar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: GenerateSarInput) => {
      const validated = api.sars.generate.input.parse(data);
      const res = await fetch(api.sars.generate.path, {
        method: api.sars.generate.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 404) throw new Error("Customer not found");
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message);
      }
      if (!res.ok) throw new Error("Failed to generate SAR");
      return api.sars.generate.responses[201].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.sars.list.path] });
    },
  });
}

export function useUpdateSarSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ sarId, sectionId, ...data }: { sarId: number; sectionId: number } & UpdateSectionInput) => {
      const validated = api.sars.updateSection.input.parse(data);
      const url = buildUrl(api.sars.updateSection.path, { sarId, sectionId });
      const res = await fetch(url, {
        method: api.sars.updateSection.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (res.status === 404) throw new Error("SAR or section not found");
      if (res.status === 400) {
        const error = await res.json();
        throw new Error(error.message);
      }
      if (!res.ok) throw new Error("Failed to update section");
      return api.sars.updateSection.responses[200].parse(await res.json());
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.sars.get.path, variables.sarId] });
      queryClient.invalidateQueries({ queryKey: [api.sars.auditTrail.path, variables.sarId] });
    },
  });
}

export function useSarComparison(id: number, fromVersion?: number, toVersion?: number) {
  return useQuery({
    queryKey: [api.sars.compare.path, id, fromVersion, toVersion],
    queryFn: async (): Promise<SarComparisonResponse> => {
      const url = buildUrl(api.sars.compare.path, { id });
      const params = new URLSearchParams();
      if (fromVersion !== undefined) params.append("fromVersion", String(fromVersion));
      if (toVersion !== undefined) params.append("toVersion", String(toVersion));
      const queryString = params.toString();
      const fullUrl = queryString ? `${url}?${queryString}` : url;
      const res = await fetch(fullUrl, { credentials: "include" });
      if (res.status === 404) throw new Error("SAR not found");
      if (!res.ok) throw new Error("Failed to compare SAR versions");
      return api.sars.compare.responses[200].parse(await res.json());
    },
    enabled: id > 0,
  });
}

export function useSarAuditTrail(id: number) {
  return useQuery({
    queryKey: [api.sars.auditTrail.path, id],
    queryFn: async () => {
      const url = buildUrl(api.sars.auditTrail.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("SAR not found");
      if (!res.ok) throw new Error("Failed to fetch audit trail");
      return api.sars.auditTrail.responses[200].parse(await res.json());
    },
    enabled: id > 0,
  });
}

export function useExplainSentence(sentenceId: number) {
  return useQuery({
    queryKey: [api.sars.explainSentence.path, sentenceId],
    queryFn: async (): Promise<ExplainSentenceResponse> => {
      const url = buildUrl(api.sars.explainSentence.path, { sentenceId });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) throw new Error("Sentence not found");
      if (!res.ok) throw new Error("Failed to explain sentence");
      return api.sars.explainSentence.responses[200].parse(await res.json());
    },
    enabled: sentenceId > 0,
  });
}
