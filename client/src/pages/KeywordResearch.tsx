import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KeywordTable } from "@/components/keyword/KeywordTable";
import { pageVariants, pageTransition, fadeInUp } from "@/lib/animations";
import { Search } from "lucide-react";

export default function KeywordResearch() {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [shouldTriggerResearch, setShouldTriggerResearch] = useState(false);

  const handleRunResearch = async () => {
    if (!searchKeyword.trim()) {
      return;
    }
    // Trigger the research by setting shouldTriggerResearch to true
    setShouldTriggerResearch(true);
  };

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchKeyword(e.target.value);
    // Reset the research trigger when user types new keyword
    setShouldTriggerResearch(false);
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
        <motion.div 
          className="flex justify-between items-center mb-8"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <h1 className="text-4xl font-bold animate-glow">Keyword Research</h1>
          <div className="flex items-center gap-4 text-black">
            <Input
              type="text"
              placeholder="Enter keyword to research..."
              value={searchKeyword}
              onChange={handleKeywordChange}
              className="w-80 bg-background/50 border-border/50 focus:border-primary"
              onKeyPress={(e) => e.key === 'Enter' && handleRunResearch()}
            />
            <Button 
              className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon"
              onClick={handleRunResearch}
              disabled={!searchKeyword.trim()}
            >
              <Search className="w-4 h-4 mr-2" />
              Run Research Agent
            </Button>
          </div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
        >
          <KeywordTable searchKeyword={searchKeyword} shouldTriggerResearch={shouldTriggerResearch} />
        </motion.div>
      </div>
    </motion.div>
  );
}
