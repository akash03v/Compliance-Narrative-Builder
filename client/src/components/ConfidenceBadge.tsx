import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ConfidenceBadgeProps {
  level: "high" | "medium" | "low";
  className?: string;
}

export function ConfidenceBadge({ level, className }: ConfidenceBadgeProps) {
  const colors = {
    high: "confidence-badge-high",
    medium: "confidence-badge-medium",
    low: "confidence-badge-low",
  };

  const labels = {
    high: "High Confidence",
    medium: "Medium Confidence",
    low: "Low Confidence",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "text-xs font-semibold px-2.5 py-0.5",
        colors[level],
        className
      )}
    >
      {labels[level]}
    </Badge>
  );
}
