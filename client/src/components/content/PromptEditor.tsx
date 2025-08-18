import { useState, useEffect } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { Loader2 } from "lucide-react";

interface PromptEditorProps {
  onGenerateBrief: (data: { targetKeyword: string; contentType: string; targetAudience: string }) => void;
  isLoading: boolean;
  initialTargetKeyword?: string;
}

export function PromptEditor({ onGenerateBrief, isLoading, initialTargetKeyword }: PromptEditorProps) {
  const [formData, setFormData] = useState({
    targetKeyword: "",
    contentType: "",
    targetAudience: "",
  });

  // Allow external pages to prefill the target keyword
  useEffect(() => {
    if (initialTargetKeyword) {
      setFormData(prev => ({
        ...prev,
        targetKeyword: initialTargetKeyword,
      }));
    }
  }, [initialTargetKeyword]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.targetKeyword && formData.contentType) {
      onGenerateBrief(formData);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const isFormValid = formData.targetKeyword.trim() && formData.contentType;

  return (
    <GlassCard className="p-8">
      <h2 className="text-2xl font-semibold mb-6 flex items-center">
        <AIAvatar size="sm" className="mr-3" />
        Brief Generator
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <Label htmlFor="keyword" className="text-sm font-medium mb-2 block">
            Target Keyword *
          </Label>
          <Input
            id="keyword"
            placeholder="AI content automation tools"
            className="bg-muted/50 border-border focus:border-primary text-black"
            value={formData.targetKeyword}
            onChange={(e) => handleInputChange("targetKeyword", e.target.value)}
            required
          />
        </div>
        
        <div>
          <Label htmlFor="content-type" className="text-sm font-medium mb-2 block">
            Content Type *
          </Label>
          <Select 
            value={formData.contentType} 
            onValueChange={(value) => handleInputChange("contentType", value)}
            required
          >
            <SelectTrigger className="bg-muted/50 border-border focus:border-primary text-black">
              <SelectValue placeholder="Select content type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="how-to">How-to Guide</SelectItem>
              <SelectItem value="list">List Article</SelectItem>
              <SelectItem value="comparison">Comparison</SelectItem>
              <SelectItem value="review">Review</SelectItem>
              <SelectItem value="tutorial">Tutorial</SelectItem>
              <SelectItem value="case-study">Case Study</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div>
          <Label htmlFor="audience" className="text-sm font-medium mb-2 block">
            Target Audience (Optional)
          </Label>
          <Input
            id="audience"
            placeholder="Marketing professionals, content creators"
            className="bg-muted/50 border-border focus:border-primary text-black"
            value={formData.targetAudience}
            onChange={(e) => handleInputChange("targetAudience", e.target.value)}
          />
        </div>
        
        <Button 
          type="submit"
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon"
          disabled={!isFormValid || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Brief...
            </>
          ) : (
            "Generate Brief"
          )}
        </Button>
      </form>
    </GlassCard>
  );
}
