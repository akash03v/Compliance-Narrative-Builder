import { useState } from "react";
import { useCustomers } from "@/hooks/use-customers";
import { useCalculateRiskScore } from "@/hooks/use-risk-scoring";
import { useGenerateSar } from "@/hooks/use-sars";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";
import { Search, FileText, BarChart3 } from "lucide-react";
import { useLocation } from "wouter";

export default function Customers() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: customers, isLoading } = useCustomers();
  const { mutate: calculateRisk, isPending: isCalculating } = useCalculateRiskScore();
  const { mutate: generateSar, isPending: isGenerating } = useGenerateSar();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const filteredCustomers = customers?.filter((c: any) =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.customerId.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCalculateRisk = (customerId: number) => {
    calculateRisk(customerId, {
      onSuccess: (data) => {
        toast({
          title: "Risk Score Calculated",
          description: `Total risk score: ${data.totalRiskScore}. Triggered ${data.triggeredRules.length} rules.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Calculation failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const handleGenerateSar = (customerId: number) => {
    generateSar({ customerId }, {
      onSuccess: (sar) => {
        toast({
          title: "SAR Generated",
          description: "AI has generated a new SAR narrative",
        });
        setLocation(`/sars/${sar.id}`);
      },
      onError: (error) => {
        toast({
          title: "Generation failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      default: return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Customers
              </h1>
              <p className="text-muted-foreground">
                Manage customer risk profiles and generate SARs
              </p>
            </div>
          </div>

          <Card className="mb-6 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search customers by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </Card>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="space-y-4">
              {filteredCustomers?.map((customer: any) => (
                <Card key={customer.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {customer.name}
                        </h3>
                        <Badge variant="outline" className={getRiskColor(customer.riskLevel)}>
                          {customer.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Customer ID</p>
                          <p className="font-medium text-foreground">{customer.customerId}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Account</p>
                          <p className="font-medium text-foreground">{customer.accountNumber}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Country</p>
                          <p className="font-medium text-foreground">{customer.countryOfResidence || "N/A"}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Occupation</p>
                          <p className="font-medium text-foreground">{customer.occupation || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCalculateRisk(customer.id)}
                        disabled={isCalculating}
                        className="gap-2"
                      >
                        {isCalculating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <BarChart3 className="w-4 h-4" />
                        )}
                        Calculate Risk
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleGenerateSar(customer.id)}
                        disabled={isGenerating}
                        className="gap-2"
                      >
                        {isGenerating ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <FileText className="w-4 h-4" />
                        )}
                        Generate SAR
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
              {(!filteredCustomers || filteredCustomers.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No customers found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
