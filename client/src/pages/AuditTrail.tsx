import { useParams, Link } from "wouter";
import { useSarAuditTrail } from "@/hooks/use-sars";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, User, Clock, FileEdit } from "lucide-react";
import { format } from "date-fns";

export default function AuditTrail() {
  const params = useParams();
  const sarId = parseInt(params.id as string);
  const { data: auditLogs, isLoading } = useSarAuditTrail(sarId);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <LoadingSpinner size="lg" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <Link href={`/sars/${sarId}`}>
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="w-4 h-4" />
                Back to SAR
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Audit Trail
            </h1>
            <p className="text-muted-foreground">
              Complete change history with reasons and timestamps
            </p>
          </div>

          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
            
            <div className="space-y-8">
              {auditLogs?.map((log: any, idx: number) => (
                <div key={log.id} className="relative pl-14">
                  <div className="absolute left-0 w-12 h-12 rounded-full bg-primary/10 border-4 border-background flex items-center justify-center">
                    <FileEdit className="w-5 h-5 text-primary" />
                  </div>
                  
                  <Card>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-foreground mb-1">
                            {log.action}
                          </h3>
                          {log.fieldChanged && (
                            <p className="text-sm text-muted-foreground">
                              Field: {log.fieldChanged}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {log.userId}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {format(new Date(log.timestamp), "PPp")}
                          </div>
                        </div>
                      </div>

                      {log.reason && (
                        <div className="mb-4 p-3 bg-muted/50 rounded-lg">
                          <p className="text-sm font-medium text-foreground mb-1">
                            Reason for Change:
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {log.reason}
                          </p>
                        </div>
                      )}

                      {(log.oldValue || log.newValue) && (
                        <div className="grid grid-cols-2 gap-4">
                          {log.oldValue && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                Previous Value
                              </p>
                              <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg">
                                <p className="text-sm text-foreground">
                                  {log.oldValue}
                                </p>
                              </div>
                            </div>
                          )}
                          {log.newValue && (
                            <div>
                              <p className="text-xs font-medium text-muted-foreground mb-2">
                                New Value
                              </p>
                              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg">
                                <p className="text-sm text-foreground">
                                  {log.newValue}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ))}
            </div>

            {(!auditLogs || auditLogs.length === 0) && (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No audit logs available</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
