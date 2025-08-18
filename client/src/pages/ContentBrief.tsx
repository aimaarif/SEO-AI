import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { PromptEditor } from "@/components/content/PromptEditor";
import { ContentPreview } from "@/components/content/ContentPreview";
import { Button } from "@/components/ui/button";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { FileText, Send, Edit, AlertCircle } from "lucide-react";
import { useContentBrief } from "@/hooks/use-content-brief";

export default function ContentBrief() {
  const {
    brief,
    isLoading,
    error,
    isEditing,
    generateBrief,
    editBrief,
    startEditing,
    cancelEditing,
    clearBrief,
  } = useContentBrief();

  // Read preselected keyword from sessionStorage when navigating from Keyword Research
  const preselectedKeyword = typeof window !== 'undefined' ? sessionStorage.getItem('preselected-target-keyword') || undefined : undefined;
  // Clear it to avoid reusing unintentionally on future visits
  if (preselectedKeyword) {
    sessionStorage.removeItem('preselected-target-keyword');
  }

  const handleGenerateBrief = (formData: { targetKeyword: string; contentType: string; targetAudience: string }) => {
    generateBrief(formData);
  };

  const handleEditBrief = (edits: any) => {
    editBrief(edits);
  };

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
          className="text-4xl font-bold mb-8 animate-glow"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          Content Brief Generator
        </motion.h1>
        
        {error && (
          <motion.div 
            className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center space-x-2 text-destructive"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
          >
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </motion.div>
        )}
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeInUp}>
            <PromptEditor 
              onGenerateBrief={handleGenerateBrief}
              isLoading={isLoading}
              initialTargetKeyword={preselectedKeyword}
            />
          </motion.div>

          <motion.div variants={fadeInUp}>
            <ContentPreview
              brief={brief}
              isLoading={isLoading}
              isEditing={isEditing}
              onStartEditing={startEditing}
              onCancelEditing={cancelEditing}
              onSaveEdits={handleEditBrief}
            />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
