import { motion } from "framer-motion";
import { SettingsPanel } from "@/components/settings/SettingsPanel";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { Settings as SettingsIcon } from "lucide-react";

export default function Settings() {
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
          <SettingsIcon className="w-8 h-8 mr-3" />
          Settings & Configuration
        </motion.h1>
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-2 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.div variants={fadeInUp}>
            <SettingsPanel />
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
