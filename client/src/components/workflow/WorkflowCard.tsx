import { GlassCard } from "@/components/ui/glass-card";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface WorkflowCardProps {
  title: string;
  description: string;
  status: "active" | "thinking" | "waiting" | "pending";
  progress: number;
  icon?: "brain" | "bot" | "zap";
}

const statusConfig = {
  active: {
    badge: "ACTIVE",
    color: "text-primary",
    variant: "default" as const
  },
  thinking: {
    badge: "THINKING", 
    color: "text-yellow-400",
    variant: "secondary" as const
  },
  waiting: {
    badge: "WAITING",
    color: "text-muted-foreground", 
    variant: "outline" as const
  },
  pending: {
    badge: "PENDING",
    color: "text-muted-foreground",
    variant: "outline" as const
  }
};

export function WorkflowCard({ title, description, status, progress, icon }: WorkflowCardProps) {
  const config = statusConfig[status];
  
  return (
    <GlassCard className="p-6">
      <div className="flex items-center justify-between mb-4">
        <AIAvatar 
          variant={status === "thinking" ? "thinking" : "primary"} 
          icon={icon}
        />
        <Badge 
          variant={config.variant}
          className={cn("text-sm font-medium", config.color)}
        >
          {config.badge}
        </Badge>
      </div>
      
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground text-sm mb-3">{description}</p>
      
      {status === "thinking" ? (
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-primary rounded-full animate-thinking" />
          <div className="w-2 h-2 bg-primary rounded-full animate-thinking" style={{ animationDelay: "0.2s" }} />
          <div className="w-2 h-2 bg-primary rounded-full animate-thinking" style={{ animationDelay: "0.4s" }} />
        </div>
      ) : (
        <Progress value={progress} className="h-2" />
      )}
    </GlassCard>
  );
}
