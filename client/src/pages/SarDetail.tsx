import { useState } from "react";
import { useParams, Link } from "wouter";
import { useSar, useUpdateSarSection, useSarComparison } from "@/hooks/use-sars";
import { Sidebar } from "@/components/Sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { ConfidenceBadge } from "@/components/ConfidenceBadge";
import { useToast } from "@/hooks/use-toast";
import { 
  Edit, 
  Save, 
  X, 
  Eye, 
  History, 
  ArrowLeft,
  Info
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useExplainSentence } from "@/hooks/use-sars";

export default function SarDetail() {
  const params = useParams();
  const sarId = parseInt(params.id as string);
  const { data: sar, isLoading } = useSar(sarId);
  const { mutate: updateSection, isPending } = useUpdateSarSection();
  const { toast } = useToast();

  const [editingSection, setEditingSection] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editReason, setEditReason] = useState("");
  const [selectedSentenceId, setSelectedSentenceId] = useState<number | null>(null);

  const { data: sentenceExplanation, isLoading: isLoadingExplanation } = useExplainSentence(
    selectedSentenceId || 0
  );

  const handleEditSection = (sectionId: number, currentContent: string) => {
    setEditingSection(sectionId);
    setEditContent(currentContent);
    setEditReason("");
  };

  const handleSaveSection = () => {
    if (!editingSection || !editReason.trim()) {
      toast({
        title: "Reason required",
        description: "Please provide a reason for this edit",
        variant: "destructive",
      });
      return;
    }

    updateSection(
      {
        sarId,
        sectionId: editingSection,
        content: editContent,
        reason: editReason,
      },
      {
        onSuccess: () => {
          toast({
            title: "Section updated",
            description: "Changes saved to audit trail",
          });
          setEditingSection(null);
          setEditContent("");
          setEditReason("");
        },
        onError: (error) => {
          toast({
            title: "Update failed",
            description: error.message,
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleCancelEdit = () => {
    setEditingSection(null);
    setEditContent("");
    setEditReason("");
  };

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

  if (!sar) {
    return (
      <div className="flex h-screen bg-background">
        <Sidebar />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">SAR not found</p>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-8 max-w-5xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <Link href="/sars">
                <Button variant="ghost" size="sm" className="gap-2 mb-2">
                  <ArrowLeft className="w-4 h-4" />
                  Back to SARs
                </Button>
              </Link>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                {sar.title}
              </h1>
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={
                    sar.status === "published"
                      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }
                >
                  {sar.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Version {sar.version}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/sars/${sarId}/compare`}>
                <Button variant="outline" className="gap-2">
                  <History className="w-4 h-4" />
                  Version History
                </Button>
              </Link>
              <Link href={`/sars/${sarId}/audit`}>
                <Button variant="outline" className="gap-2">
                  <Eye className="w-4 h-4" />
                  Audit Trail
                </Button>
              </Link>
            </div>
          </div>

          <div className="space-y-6">
            {sar.sections?.map((section: any) => (
              <Card key={section.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-xl mb-2">
                        {section.sectionType}
                      </CardTitle>
                      <ConfidenceBadge level={section.confidenceLevel} />
                    </div>
                    {editingSection !== section.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditSection(section.id, section.content)}
                        className="gap-2"
                      >
                        <Edit className="w-4 h-4" />
                        Edit
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {editingSection === section.id ? (
                    <div className="space-y-4">
                      <Textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={8}
                        className="font-mono text-sm"
                      />
                      <div>
                        <label className="text-sm font-medium text-foreground mb-2 block">
                          Reason for Edit (Required)
                        </label>
                        <Input
                          value={editReason}
                          onChange={(e) => setEditReason(e.target.value)}
                          placeholder="Explain why you're making this change..."
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleSaveSection}
                          disabled={isPending || !editReason.trim()}
                          className="gap-2"
                        >
                          {isPending ? (
                            <LoadingSpinner size="sm" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                          Save Changes
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleCancelEdit}
                          disabled={isPending}
                          className="gap-2"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                        {section.content}
                      </p>
                      {section.sentences && section.sentences.length > 0 && (
                        <div className="pt-4 border-t space-y-2">
                          <h4 className="text-sm font-semibold text-foreground mb-3">
                            Evidence Links
                          </h4>
                          {section.sentences.map((sentence: any) => (
                            <div
                              key={sentence.id}
                              className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                              onClick={() => setSelectedSentenceId(sentence.id)}
                            >
                              <div className="flex items-start gap-3">
                                <Info className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-sm text-foreground mb-2">
                                    {sentence.sentenceText}
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <ConfidenceBadge level={sentence.confidenceLevel} />
                                    <span className="text-xs text-muted-foreground">
                                      Click to view supporting evidence
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>

      <Dialog open={!!selectedSentenceId} onOpenChange={() => setSelectedSentenceId(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Evidence & Provenance</DialogTitle>
            <DialogDescription>
              Supporting transactions and rules that generated this statement
            </DialogDescription>
          </DialogHeader>
          {isLoadingExplanation ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          ) : sentenceExplanation ? (
            <div className="space-y-6">
              <div>
                <h4 className="font-semibold text-foreground mb-2">Statement</h4>
                <p className="text-sm text-muted-foreground p-4 bg-muted rounded-lg">
                  {sentenceExplanation.sentence.sentenceText}
                </p>
                <div className="mt-2">
                  <ConfidenceBadge level={sentenceExplanation.sentence.confidenceLevel} />
                </div>
              </div>

              {sentenceExplanation.supportingTransactions?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Supporting Transactions ({sentenceExplanation.supportingTransactions.length})
                  </h4>
                  <div className="space-y-2">
                    {sentenceExplanation.supportingTransactions.map((txn: any) => (
                      <div key={txn.id} className="p-4 bg-muted rounded-lg text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Amount:</span>{" "}
                            <span className="font-medium">${txn.amount} {txn.currency}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Type:</span>{" "}
                            <span className="font-medium">{txn.transactionType}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Direction:</span>{" "}
                            <span className="font-medium">{txn.direction}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Counterparty:</span>{" "}
                            <span className="font-medium">{txn.counterparty || "N/A"}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {sentenceExplanation.supportingRules?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-foreground mb-3">
                    Triggered Rules ({sentenceExplanation.supportingRules.length})
                  </h4>
                  <div className="space-y-2">
                    {sentenceExplanation.supportingRules.map((rule: any, idx: number) => (
                      <div key={idx} className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-900 rounded-lg">
                        <p className="font-medium text-foreground mb-1">{rule.ruleName}</p>
                        <p className="text-sm text-muted-foreground">{rule.ruleDescription}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
