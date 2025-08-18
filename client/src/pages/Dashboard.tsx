import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { Zap, Activity, Clock } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const workflowData = [
  {
    title: "Keyword Research",
    description: "Next run: Today 9:00 AM",
    status: "active" as const,
    progress: 75,
    icon: "brain" as const
  },
  {
    title: "Content Brief", 
    description: "Analyzing top topics...",
    status: "thinking" as const,
    progress: 0,
    icon: "bot" as const
  },
  {
    title: "AI Writer",
    description: "Awaiting brief approval", 
    status: "waiting" as const,
    progress: 25,
    icon: "zap" as const
  },
  {
    title: "Approval",
    description: "2 items need review",
    status: "pending" as const, 
    progress: 0,
    icon: "brain" as const
  }
];

const aiAgents = [
  {
    name: "Research Agent",
    status: "Analyzing competitor keywords",
    active: true,
    avatar: "R"
  },
  {
    name: "Writer Agent", 
    status: "Idle - Awaiting instructions",
    active: false,
    avatar: "W"
  },
  {
    name: "Distribution Agent",
    status: "Ready for deployment",
    active: false,
    avatar: "D"
  }
];

type ActivityItem = {
  id: string;
  type: string;
  title: string;
  description?: string;
  createdAt?: string;
};

function timeAgo(iso?: string): string {
  if (!iso) return "just now";
  
  try {
    const then = new Date(iso).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.floor((now - then) / 1000));
    
    // Debug logging
    console.log('TimeAgo - Original:', iso);
    console.log('TimeAgo - Parsed timestamp:', then);
    console.log('TimeAgo - Current time:', now);
    console.log('TimeAgo - Difference in seconds:', diff);
    
    if (diff < 60) return `${diff}s ago`;
    const minutes = Math.floor(diff / 60);
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days === 1 ? "" : "s"} ago`;
  } catch (error) {
    console.error('Error in timeAgo:', error, 'ISO string:', iso);
    return "unknown time";
  }
}

function colorForType(type: string): string {
  switch (type) {
    case "keyword_researched":
      return "bg-primary";
    case "brief_generated":
      return "bg-blue-400";
    case "article_generated":
      return "bg-purple-400";
    case "article_sent_for_approval":
      return "bg-yellow-500";
    case "article_approved":
      return "bg-green-400";
    case "article_published":
      return "bg-green-500";
    default:
      return "bg-muted";
  }
}

export default function Dashboard() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoadingActivities(true);
    // Fetch only the 5 most recent activities
    fetch(`/api/activities?limit=5`, { credentials: "include" })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text());
        return res.json();
      })
      .then((data: ActivityItem[]) => {
        if (isMounted) setActivities(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (isMounted) setActivities([]);
      })
      .finally(() => {
        if (isMounted) setLoadingActivities(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const recentActivity = useMemo(() => {
    return activities.map((a, index) => ({
      id: a.id,
      title: a.title,
      description: `${a.description || ""} • ${timeAgo(a.createdAt)}`.trim(),
      color: colorForType(a.type),
      pulse: index === 0,
    }));
  }, [activities]);

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
        {/* Hero Section */}
        <motion.div 
          className="text-center mb-12"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-5xl md:text-7xl font-black mb-6 leading-tight"
          >
            <span className="animate-glow">AI-Powered</span><br />
            <span className="text-primary">SEO Automation</span>
          </motion.h1>
          
          <motion.p 
            variants={fadeInUp}
            className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8"
          >
            Streamline your content workflow with intelligent keyword research, AI writing, and automated distribution.
          </motion.p>
          
          <motion.div variants={fadeInUp}>
            <Button 
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon px-8 py-4 text-lg"
            >
              <Zap className="w-5 h-5 mr-2" />
              Start Automation
            </Button>
          </motion.div>
        </motion.div>

        {/* Workflow Status Cards */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {workflowData.map((workflow, index) => (
            <motion.div key={workflow.title} variants={fadeInUp}>
              <WorkflowCard {...workflow} />
            </motion.div>
          ))}
        </motion.div>

        {/* AI Agents Section */}
        <motion.div 
          className="mb-12"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Zap className="text-primary mr-3" />
              Active AI Agents
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {aiAgents.map((agent, index) => (
                <div 
                  key={agent.name}
                  className="flex items-center space-x-4 p-4 rounded-lg bg-muted/30"
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white ${
                    agent.active 
                      ? "ai-avatar" 
                      : index === 1 
                        ? "bg-gradient-to-r from-purple-500 to-pink-500 animate-float" 
                        : "bg-gradient-to-r from-blue-500 to-cyan-500 animate-float"
                  }`} style={index === 2 ? { animationDelay: "1s" } : {}}>
                    {agent.active ? (
                      <span className="text-black">{agent.avatar}</span>
                    ) : (
                      <span>{agent.avatar}</span>
                    )}
                  </div>
                  <div>
                    <h3 className="font-semibold">{agent.name}</h3>
                    <p className={`text-sm text-muted-foreground ${agent.active ? "typing-indicator" : ""}`}>
                      {agent.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center">
              <Activity className="w-6 h-6 mr-3" />
              Recent Activity
            </h2>
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div 
                  key={activity.id}
                  className="flex items-center space-x-4 p-4 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className={`w-2 h-2 rounded-full ${
                    (activity as any).pulse ? "animate-pulse" : ""
                  } ${activity.color}`} />
                  <div className="flex-1">
                    <p className="font-medium">{activity.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
}
