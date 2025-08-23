import { useState } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Save, X, Loader2, PenTool } from "lucide-react";
import { generateArticle } from "@/lib/api";
import { useLocation } from "wouter";

interface BriefData {
  title: string;
  keyPoints: string[];
  wordCount: string;
  targetAudience?: string;
  id?: string;
  keywordId?: string;
  clientId?: string;
}

interface ContentPreviewProps {
  brief: BriefData | null;
  isLoading: boolean;
  isEditing: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEdits: (edits: Partial<BriefData>) => void;
}

export function ContentPreview({ 
  brief, 
  isLoading, 
  isEditing, 
  onStartEditing, 
  onCancelEditing, 
  onSaveEdits 
}: ContentPreviewProps) {
  const [editData, setEditData] = useState<BriefData | null>(null);
  const [isSendingToWriter, setIsSendingToWriter] = useState(false);
  const [, setLocation] = useLocation();

  const handleStartEditing = () => {
    if (brief) {
      setEditData({ ...brief });
      onStartEditing();
    }
  };

  const handleSaveEdits = () => {
    if (editData) {
      onSaveEdits(editData);
      setEditData(null);
    }
  };

  const handleCancelEditing = () => {
    setEditData(null);
    onCancelEditing();
  };

  const updateEditData = (field: keyof BriefData, value: string | string[]) => {
    if (editData) {
      setEditData(prev => prev ? { ...prev, [field]: value } : null);
    }
  };

  const addKeyPoint = () => {
    if (editData) {
      setEditData(prev => prev ? { ...prev, keyPoints: [...prev.keyPoints, ""] } : null);
    }
  };

  const removeKeyPoint = (index: number) => {
    if (editData && editData.keyPoints.length > 1) {
      const newKeyPoints = editData.keyPoints.filter((_, i) => i !== index);
      setEditData(prev => prev ? { ...prev, keyPoints: newKeyPoints } : null);
    }
  };

  const updateKeyPoint = (index: number, value: string) => {
    if (editData) {
      const newKeyPoints = [...editData.keyPoints];
      newKeyPoints[index] = value;
      setEditData(prev => prev ? { ...prev, keyPoints: newKeyPoints } : null);
    }
  };

  const handleSendToWriter = async () => {
    if (!brief || isSendingToWriter) return;
    try {
      setIsSendingToWriter(true);
      // Store brief so Writer page can generate if needed
      sessionStorage.setItem('brief-to-write', JSON.stringify({
        title: brief.title,
        keyPoints: brief.keyPoints,
        targetAudience: brief.targetAudience,
        wordCount: brief.wordCount,
        id: brief.id,
        keywordId: brief.keywordId,
        clientId: brief.clientId,
      }));
      // Best-effort pre-generate to speed up UX
      try {
        const article = await generateArticle({
          title: brief.title,
          keyPoints: brief.keyPoints,
          targetAudience: brief.targetAudience,
          wordCount: brief.wordCount,
          contentBriefId: brief.id,
          clientId: brief.clientId,
        });
        sessionStorage.setItem('generated-article', JSON.stringify(article));
      } catch (e) {
        // Ignore here; Writer page will generate if missing
      }
      setLocation('/writer');
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingToWriter(false);
    }
  };

  if (!brief && !isLoading) {
    return (
      <GlassCard className="overflow-hidden">
        <div className="p-8 text-center">
          <AIAvatar size="lg" className="mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Brief Generated</h3>
          <p className="text-muted-foreground">
            Fill out the form on the left and click "Generate Brief" to get started.
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Generated Brief</h2>
        </div>
      </div>
      
      <div className="p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin mr-3" />
            <span>Generating your content brief...</span>
          </div>
        ) : brief ? (
          <div className="space-y-6">
            {isEditing ? (
              // Edit Mode
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-title" className="text-sm font-medium mb-2 block">
                    Article Title
                  </Label>
                  <Input
                    id="edit-title"
                    value={editData?.title || ""}
                    onChange={(e) => updateEditData("title", e.target.value)}
                    className="bg-muted/50 border-border focus:border-primary text-black"
                  />
                </div>
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">
                    Key Points to Cover
                  </Label>
                  <div className="space-y-2">
                    {editData?.keyPoints.map((point, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <Input
                          value={point}
                          onChange={(e) => updateKeyPoint(index, e.target.value)}
                          className="bg-muted/50 border-border focus:border-primary text-black"
                          placeholder={`Key point ${index + 1}`}
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeKeyPoint(index)}
                          disabled={editData.keyPoints.length <= 1}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addKeyPoint}
                      className="mt-2"
                    >
                      Add Key Point
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="edit-wordcount" className="text-sm font-medium mb-2 block">
                    Target Word Count
                  </Label>
                  <Input
                    id="edit-wordcount"
                    value={editData?.wordCount || ""}
                    onChange={(e) => updateEditData("wordCount", e.target.value)}
                    className="bg-muted/50 border-border focus:border-primary text-black"
                  />
                </div>
                
                <div className="flex space-x-4 pt-4">
                  <Button onClick={handleSaveEdits} className="flex-1">
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button variant="outline" onClick={handleCancelEditing} className="flex-1">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              // Display Mode
              <div className="space-y-4">
                <div className="shimmer-bg rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-primary">Article Title</h3>
                  <p className="text-muted-foreground">"{brief.title}"</p>
                </div>
                
                <div className="shimmer-bg rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-primary">Key Points to Cover</h3>
                  <ul className="text-muted-foreground space-y-1">
                    {brief.keyPoints.map((point, index) => (
                      <li key={index}>• {point}</li>
                    ))}
                  </ul>
                </div>
                
                <div className="shimmer-bg rounded-lg p-4">
                  <h3 className="font-semibold mb-2 text-primary">Target Word Count</h3>
                  <p className="text-muted-foreground">{brief.wordCount}</p>
                </div>
              </div>
            )}
          </div>
        ) : null}
        <div className="flex justify-between items-center  mt-4">
        <Button
          onClick={handleSendToWriter}
          disabled={!brief || isSendingToWriter}
          className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon"
        >
          {isSendingToWriter ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <PenTool className="w-4 h-4 mr-2 text-black" /> 
              Send to Writer
            </>
          )}
        </Button>
          {brief && !isEditing && (
            <Button variant="outline" size="sm" onClick={handleStartEditing}>
              <Edit className="w-4 h-4 mr-2" />
              Edit Brief
            </Button>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
