import { useState } from "react";
import { useAlerts } from "@/hooks/use-alerts";
import { useCustomers } from "@/hooks/use-customers";
import { Sidebar } from "@/components/Sidebar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Search, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export default function Alerts() {
  const [searchTerm, setSearchTerm] = useState("");
  const { data: alerts, isLoading } = useAlerts();
  const { data: customers } = useCustomers();

  const getCustomerName = (customerId: number) => {
    const customer = customers?.find((c: any) => c.id === customerId);
    return customer?.name || "Unknown";
  };

  const filteredAlerts = alerts?.filter((a: any) => {
    const customerName = getCustomerName(a.customerId);
    return (
      a.ruleName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customerName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const getRiskColor = (score: number) => {
    if (score >= 70) return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
    if (score >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Alerts
            </h1>
            <p className="text-muted-foreground">
              Review AML rule violations and suspicious activity patterns
            </p>
          </div>

          <Card className="mb-6 p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search alerts by rule name or customer..."
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
              {filteredAlerts?.map((alert: any) => (
                <Card key={alert.id} className="p-6 hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {alert.ruleName}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            Customer: {getCustomerName(alert.customerId)}
                          </p>
                        </div>
                        <Badge variant="outline" className={getRiskColor(alert.riskScore)}>
                          Risk Score: {alert.riskScore}
                        </Badge>
                      </div>
                      {alert.ruleDescription && (
                        <p className="text-sm text-muted-foreground mb-3">
                          {alert.ruleDescription}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Triggered: {format(new Date(alert.triggeredAt), "PPpp")}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
              {(!filteredAlerts || filteredAlerts.length === 0) && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No alerts found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
