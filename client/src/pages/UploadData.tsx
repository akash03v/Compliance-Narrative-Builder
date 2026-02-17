import { useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { FileUploadZone } from "@/components/FileUploadZone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFileUpload } from "@/hooks/use-data-upload";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Upload } from "lucide-react";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export default function UploadData() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { mutate: uploadFile, isPending } = useFileUpload();
  const { toast } = useToast();

  const handleUpload = () => {
    if (!selectedFile) return;

    uploadFile(selectedFile, {
      onSuccess: (data) => {
        toast({
          title: "Data uploaded successfully",
          description: `Created ${data.customersCreated} customers, ${data.transactionsCreated} transactions, ${data.alertsCreated} alerts`,
        });
        setSelectedFile(null);
      },
      onError: (error) => {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive",
        });
      },
    });
  };

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Upload Data
            </h1>
            <p className="text-muted-foreground">
              Import customer, transaction, and alert data from CSV or JSON files
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Data Import</CardTitle>
              <CardDescription>
                Upload a CSV or JSON file containing customer data, transactions, and alerts.
                The system will automatically parse and store the data.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FileUploadZone
                onFileSelect={setSelectedFile}
                disabled={isPending}
              />

              {selectedFile && (
                <div className="p-4 rounded-lg bg-muted/50 flex items-center justify-between animate-slide-up">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{selectedFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selectedFile.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleUpload}
                    disabled={isPending}
                    className="gap-2"
                  >
                    {isPending ? (
                      <>
                        <LoadingSpinner size="sm" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t">
                <h3 className="font-semibold text-foreground">Expected Format</h3>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">CSV:</span> Must include headers matching field names
                  </p>
                  <p>
                    <span className="font-medium text-foreground">JSON:</span> Object with customers, transactions, and alerts arrays
                  </p>
                  <div className="mt-4 p-4 rounded-lg bg-muted font-mono text-xs">
                    <pre>{`{
  "customers": [...],
  "transactions": [...],
  "alerts": [...]
}`}</pre>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
