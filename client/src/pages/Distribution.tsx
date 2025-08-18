import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { SocialPreview } from "@/components/distribution/SocialPreview";
import { ImageGallery } from "@/components/distribution/ImageGallery";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { Share2, Calendar, Send } from "lucide-react";

const platforms = [
  { id: "wordpress", label: "WordPress Blog", checked: true },
  { id: "twitter", label: "Twitter", checked: true },
  { id: "linkedin", label: "LinkedIn", checked: true },
  { id: "facebook", label: "Facebook", checked: false },
];

export default function Distribution() {
  return (
    <motion.div
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
      transition={pageTransition}
      className="py-16 px-4 sm:px-6 lg:px-8"
    >
      <div className="max-w-7xl mx-auto">
        <motion.h1 
          className="text-4xl font-bold mb-8 animate-glow flex items-center"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <Share2 className="w-8 h-8 mr-3" />
          Distribution Center
        </motion.h1>
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Social Media Preview */}
          <motion.div className="space-y-6" variants={fadeInUp}>
            <SocialPreview />
          </motion.div>

          {/* Distribution Settings */}
          <motion.div className="space-y-6" variants={fadeInUp}>
            {/* Platform Selection */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-4">Distribution Platforms</h2>
              <div className="space-y-3">
                {platforms.map((platform) => (
                  <div key={platform.id} className="flex items-center space-x-3">
                    <Checkbox 
                      id={platform.id}
                      defaultChecked={platform.checked}
                    />
                    <Label htmlFor={platform.id} className="cursor-pointer">
                      {platform.label}
                    </Label>
                  </div>
                ))}
              </div>
            </GlassCard>

            <ImageGallery />

            {/* Scheduling */}
            <GlassCard className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Publishing Schedule
              </h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="publish-date" className="text-sm font-medium mb-2 block">
                    Publish Date
                  </Label>
                  <Input
                    id="publish-date"
                    type="datetime-local"
                    className="bg-muted/50 border-border focus:border-primary"
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox id="auto-publish" defaultChecked />
                    <Label htmlFor="auto-publish" className="text-sm cursor-pointer">
                      Auto-publish to blog
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Checkbox id="schedule-social" defaultChecked />
                    <Label htmlFor="schedule-social" className="text-sm cursor-pointer">
                      Schedule social media posts
                    </Label>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Action Buttons */}
            <div className="space-y-3">
              <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon">
                <Send className="w-4 h-4 mr-2" />
                Publish Now
              </Button>
              <Button variant="outline" className="w-full">
                <Calendar className="w-4 h-4 mr-2" />
                Schedule for Later
              </Button>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
