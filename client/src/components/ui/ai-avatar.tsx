import { cn } from "@/lib/utils";
import { Brain, Bot, Zap } from "lucide-react";

interface AIAvatarProps {
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "thinking";
  className?: string;
  icon?: "brain" | "bot" | "zap";
}

export function AIAvatar({ 
  size = "md", 
  variant = "primary", 
  className,
  icon = "brain"
}: AIAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-12 h-12", 
    lg: "w-16 h-16"
  };

  const iconSizes = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8"
  };

  const IconComponent = {
    brain: Brain,
    bot: Bot,
    zap: Zap
  }[icon];

  return (
    <div
      className={cn(
        "ai-avatar rounded-lg flex items-center justify-center",
        sizeClasses[size],
        variant === "thinking" && "animate-pulse",
        className
      )}
    >
      <IconComponent className={cn(iconSizes[size], "text-black")} />
    </div>
  );
}
