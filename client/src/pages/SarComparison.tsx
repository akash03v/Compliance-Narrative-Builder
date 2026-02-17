import { useParams, Link } from "wouter";
import { useSarComparison } from "@/hooks/use-sars";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ArrowLeft, Plus, Minus, Edit } from "lucide-react";

export default function SarComparison() {
  const params = useParams();
  const sarId = parseInt(params.id as string);
  const { data: comparison, isLoading } = useSarComparison(sarId);

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

  if (!comparison) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Comparison not available</p>
        </main>
      </div>
    );
  }

  const getChangeIcon = (type: string) => {
    switch (type) {
      case "added": return <Plus className="w-4 h-4 text-green-600" />;
      case "removed": return <Minus className="w-4 h-4 text-red-600" />;
      case "modified": return <Edit className="w-4 h-4 text-blue-600" />;
    }
  };

  const getChangeColor = (type: string) => {
    switch (type) {
      case "added": return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900";
      case "removed": return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900";
      case "modified": return "bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-900";
    }
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto">
          <div className="mb-8">
            <Link href={`/sars/${sarId}`}>
              <Button variant="ghost" size="sm" className="gap-2 mb-2">
                <ArrowLeft className="w-4 h-4" />
                Back to SAR
              </Button>
            </Link>
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Version Comparison
            </h1>
            <p className="text-muted-foreground">
              Comparing Version {comparison.previousVersion} → Version {comparison.currentVersion}
            </p>
          </div>

          <div className="space-y-6">
            {comparison.changes.map((change, idx) => (
              <Card key={idx} className={`border-2 ${getChangeColor(change.type)}`}>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    {getChangeIcon(change.type)}
                    <CardTitle className="text-lg">
                      {change.sectionType}
                    </CardTitle>
                    <span className="text-sm font-medium capitalize ml-auto">
                      {change.type}
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  {change.type === "modified" && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Previous Version
                        </h4>
                        <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {change.oldContent}
                          </p>
                        </div>
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground mb-2">
                          Current Version
                        </h4>
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg">
                          <p className="text-sm text-foreground whitespace-pre-wrap">
                            {change.newContent}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  {change.type === "added" && (
                    <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900 rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {change.newContent}
                      </p>
                    </div>
                  )}
                  {change.type === "removed" && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900 rounded-lg">
                      <p className="text-sm text-foreground whitespace-pre-wrap">
                        {change.oldContent}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
