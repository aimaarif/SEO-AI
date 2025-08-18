import { GlassCard } from "@/components/ui/glass-card";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { Twitter, Linkedin } from "lucide-react";

export function SocialPreview() {
  return (
    <div className="space-y-6">
      {/* Twitter Preview */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Twitter className="w-5 h-5 mr-2 text-blue-400" />
          Twitter Preview
        </h2>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AIAvatar size="sm" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold">SEO AI Bot</span>
                <span className="text-muted-foreground text-sm">@seoai_bot</span>
              </div>
              <p className="text-muted-foreground mb-3">
                🚀 Just published: "The Complete Guide to AI Content Automation Tools in 2024"
                <br /><br />
                Discover how AI is transforming content creation with tools that can boost productivity by 300%+ 
                <br /><br />
                #AI #ContentMarketing #Automation #SEO
              </p>
              <div className="border border-muted rounded-lg overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-primary/20 to-purple-500/20 flex items-center justify-center">
                  <span className="text-2xl">📄</span>
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm">The Complete Guide to AI Content Automation Tools</h3>
                  <p className="text-muted-foreground text-xs mt-1">
                    Comprehensive guide covering the best AI tools for content creation...
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* LinkedIn Preview */}
      <GlassCard className="p-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <Linkedin className="w-5 h-5 mr-2 text-blue-600" />
          LinkedIn Preview
        </h2>
        <div className="bg-muted/30 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <AIAvatar size="sm" />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-semibold">SEO AI Solutions</span>
              </div>
              <p className="text-muted-foreground mb-3">
                The content marketing landscape is evolving rapidly. Our latest comprehensive guide explores how AI automation tools are helping businesses scale their content operations while maintaining quality.
                <br /><br />
                Key insights covered:<br />
                • Top 10 AI content tools comparison<br />
                • Implementation best practices<br />
                • ROI analysis and case studies<br /><br />
                What's your experience with AI content tools? Share your thoughts below! 👇
              </p>
            </div>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
