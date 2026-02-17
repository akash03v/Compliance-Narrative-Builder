import { useSars } from "@/hooks/use-sars";
import { useCustomers } from "@/hooks/use-customers";
import { useAlerts } from "@/hooks/use-alerts";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { FileText, Users, AlertTriangle, TrendingUp } from "lucide-react";
import { RiskScoreChart } from "@/components/RiskScoreChart";

export default function Dashboard() {
  const { data: sars, isLoading: sarsLoading } = useSars();
  const { data: customers, isLoading: customersLoading } = useCustomers();
  const { data: alerts, isLoading: alertsLoading } = useAlerts();

  const isLoading = sarsLoading || customersLoading || alertsLoading;

  const stats = [
    {
      title: "Total Customers",
      value: customers?.length || 0,
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      title: "Active Alerts",
      value: alerts?.length || 0,
      icon: AlertTriangle,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/30",
    },
    {
      title: "Generated SARs",
      value: sars?.length || 0,
      icon: FileText,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/30",
    },
    {
      title: "Compliance Score",
      value: "98%",
      icon: TrendingUp,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/30",
    },
  ];

  const riskChartData = customers?.slice(0, 5).map((c: any) => ({
    name: c.name.split(" ")[0],
    score: c.riskLevel === "high" ? 80 : c.riskLevel === "medium" ? 50 : 20,
  })) || [];

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Compliance Dashboard
            </h1>
            <p className="text-muted-foreground">
              Monitor AML activities and SAR generation status
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {stats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <Card key={stat.title} className="animate-fade-in">
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                              {stat.title}
                            </p>
                            <p className="text-3xl font-bold text-foreground">
                              {stat.value}
                            </p>
                          </div>
                          <div className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}>
                            <Icon className={`w-6 h-6 ${stat.color}`} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Risk Customers</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <RiskScoreChart data={riskChartData} />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent SARs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {sars?.slice(0, 5).map((sar: any) => (
                        <div
                          key={sar.id}
                          className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div>
                            <p className="font-medium text-foreground">{sar.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Version {sar.version}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                                sar.status === "draft"
                                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              }`}
                            >
                              {sar.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {(!sars || sars.length === 0) && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                          No SARs generated yet
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
