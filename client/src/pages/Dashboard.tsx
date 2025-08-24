import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { WorkflowCard } from "@/components/workflow/WorkflowCard";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { Zap, Activity, Clock, Loader2, AlertCircle, Calendar, CheckCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchClients, startClientAutomation, startMultiClientAutomation, getWorkerStatus, getSchedulerStatus, startScheduler } from "@/lib/api";
import { ScheduleManager } from "@/components/scheduler/ScheduleManager";

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
  const [clients, setClients] = useState<any[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('selected-client-ids') ||
                    localStorage.getItem('selected-client-ids');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [isStartingAutomation, setIsStartingAutomation] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<any>(null);
  const [schedulerStatus, setSchedulerStatus] = useState<any>(null);
  const [automationReadiness, setAutomationReadiness] = useState<any>(null);

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

  // Load clients and worker status
  useEffect(() => {
    fetchClients()
      .then((clientsList) => {
        setClients(clientsList);
        // Auto-select the first client if available and no clients are currently selected
        if (clientsList.length > 0 && selectedClientIds.length === 0 && clientsList[0].id) {
          setSelectedClientIds([clientsList[0].id]);
        }
      })
      .catch(() => setClients([]));

    // Load worker and scheduler status
    getWorkerStatus()
      .then((status) => {
        setWorkerStatus(status.status);
      })
      .catch(() => setWorkerStatus(null));

    getSchedulerStatus()
      .then((status) => {
        setSchedulerStatus(status);
        // Start scheduler if not running
        if (!status.isRunning) {
          startScheduler().catch(console.error);
        }
      })
      .catch(() => setSchedulerStatus(null));
  }, []); // Only run once on mount

  // Listen for changes to selected clients in storage
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const storedClientIds = sessionStorage.getItem('selected-client-ids') || 
                               localStorage.getItem('selected-client-ids') || '[]';
        const parsedIds = JSON.parse(storedClientIds);
        if (JSON.stringify(parsedIds) !== JSON.stringify(selectedClientIds)) {
          setSelectedClientIds(parsedIds);
        }
      } catch (error) {
        console.error('Error reading client selection from storage:', error);
      }
    };

    // Listen for storage events (when other tabs/pages change storage)
    window.addEventListener('storage', handleStorageChange);
    
    // Also check periodically for changes (for same-tab updates)
    const interval = setInterval(handleStorageChange, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [selectedClientIds]);

  // Update storage when selectedClientIds changes
  useEffect(() => {
    try {
      sessionStorage.setItem('selected-client-ids', JSON.stringify(selectedClientIds));
      localStorage.setItem('selected-client-ids', JSON.stringify(selectedClientIds));
    } catch (error) {
      console.error('Error saving client selection to storage:', error);
    }
  }, [selectedClientIds]);

  // Check automation readiness when clients change
  useEffect(() => {
    if (selectedClientIds.length > 0) {
      checkMultiClientAutomationReadiness(selectedClientIds);
    } else {
      setAutomationReadiness(null);
    }
  }, [selectedClientIds]);

  const checkMultiClientAutomationReadiness = async (clientIds: string[]) => {
    try {
      // Check readiness for all selected clients
      const readinessChecks = await Promise.all(
        clientIds.map(async (clientId) => {
          const response = await fetch(`/api/automation/status/${clientId}`);
          if (response.ok) {
            const data = await response.json();
            return data.automationReadiness;
          }
          return null;
        })
      );

      // Aggregate readiness across all clients
      const aggregatedReadiness = aggregateReadiness(readinessChecks.filter(Boolean));
      setAutomationReadiness(aggregatedReadiness);
    } catch (error) {
      console.error('Failed to check automation readiness:', error);
    }
  };

  const aggregateReadiness = (readinessChecks: any[]) => {
    if (readinessChecks.length === 0) return null;

    const hasSchedule = readinessChecks.every(check => check.hasSchedule);
    const pendingJobs = readinessChecks.reduce((total, check) => total + check.pendingJobs, 0);
    const canStartAutomation = hasSchedule && pendingJobs > 0;
    const scheduleCount = readinessChecks.reduce((total, check) => total + check.scheduleCount, 0);
    
    // Find the earliest next run time
    const nextRuns = readinessChecks
      .map(check => check.nextScheduledRun)
      .filter(Boolean)
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());
    
    const nextScheduledRun = nextRuns.length > 0 ? nextRuns[0].toISOString() : null;

    return {
      hasSchedule,
      pendingJobs,
      canStartAutomation,
      scheduleCount,
      nextScheduledRun,
      clientCount: readinessChecks.length
    };
  };

  const handleStartAutomation = async () => {
    if (selectedClientIds.length === 0) {
      alert('Please select at least one client first using the dropdown above.');
      return;
    }

    // Check if automation can be started
    if (automationReadiness && !automationReadiness.canStartAutomation) {
      if (!automationReadiness.hasSchedule) {
        alert('Please set up automation schedules for all selected clients before starting automation.');
        return;
      }
      if (automationReadiness.pendingJobs === 0) {
        alert('No pending jobs to process. All keywords have been processed or are already in progress.');
        return;
      }
    }

    // Check if automation is ready according to schedule timing
    if (automationReadiness?.nextScheduledRun) {
      const nextRun = new Date(automationReadiness.nextScheduledRun);
      const now = new Date();
      if (now < nextRun) {
        const timeUntilNext = Math.ceil((nextRun.getTime() - now.getTime()) / (1000 * 60));
        alert(`Automation is scheduled but not ready to run yet. Next run in approximately ${timeUntilNext} minutes.\n\nAutomation will run automatically according to your schedule.`);
        return;
      }
    }

    setIsStartingAutomation(true);
    try {
      // Use the new multi-client automation API
      const result = await startMultiClientAutomation(selectedClientIds);
      
      if (result.success) {
        const message = `Automation started successfully for ${result.summary.successful} out of ${result.summary.totalClients} client(s)! Enqueued ${result.totalJobsEnqueued} total jobs for processing.`;
        
        // Show detailed results if there were failures
        if (result.summary.failed > 0) {
          const failedClients = result.results
            .filter(r => !r.success)
            .map(r => r.clientName || r.clientId)
            .join(', ');
          
          alert(`${message}\n\nFailed clients: ${failedClients}\n\nCheck the console for detailed results.`);
        } else {
          alert(message);
        }
        
        // Log detailed results to console
        console.log('Multi-client automation results:', result);
      } else {
        alert('Failed to start automation for all selected clients. Please check the console for details.');
      }
    } catch (error) {
      console.error('Failed to start automation:', error);
      alert('Failed to start automation. Please check the console for details.');
    } finally {
      setIsStartingAutomation(false);
    }
  };

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
          <motion.p 
            variants={fadeInUp}
            className="text-sm text-muted-foreground max-w-2xl mx-auto mb-8"
          >
            💡 Automation will only process keywords for the selected client(s) above. Select multiple clients to run automation for all of them.
          </motion.p>
          
          <motion.div variants={fadeInUp}>
            <Button 
              size="lg"
              className={`${
                automationReadiness?.canStartAutomation 
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon' 
                  : 'bg-muted text-muted-foreground'
              } px-8 py-4 text-lg`}
              onClick={handleStartAutomation}
              disabled={isStartingAutomation || selectedClientIds.length === 0 || !automationReadiness?.canStartAutomation}
            >
              {isStartingAutomation ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Starting...
                </>
              ) : selectedClientIds.length === 0 ? (
                <>
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Select Client(s) First
                </>
              ) : !automationReadiness?.hasSchedule ? (
                <>
                  <Calendar className="w-5 h-5 mr-2" />
                  Set Schedule First
                </>
              ) : automationReadiness?.pendingJobs === 0 ? (
                <>
                  <CheckCircle className="w-5 h-5 mr-2" />
                  No Pending Jobs
                </>
              ) : automationReadiness?.nextScheduledRun && new Date(automationReadiness.nextScheduledRun) > new Date() ? (
                <>
                  <Clock className="w-5 h-5 mr-2" />
                  Scheduled ({automationReadiness.nextScheduledRun ? 
                    Math.ceil((new Date(automationReadiness.nextScheduledRun).getTime() - new Date().getTime()) / (1000 * 60)) + 'm' : 'Soon'
                  })
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Start Automation ({selectedClientIds.length} client{selectedClientIds.length > 1 ? 's' : ''})
                </>
              )}
            </Button>
            {clients.length > 0 && (
              <motion.div 
                variants={fadeInUp}
                className="mt-4 space-y-2"
              >
                <p className="text-sm text-muted-foreground">
                  Selected client{selectedClientIds.length > 1 ? 's' : ''}: <span className="font-semibold text-primary">
                    {selectedClientIds.length === 0 ? 'None' : 
                     selectedClientIds.length === 1 ? 
                       clients.find(c => c.id === selectedClientIds[0])?.brandName || 'Unknown' :
                       `${selectedClientIds.length} clients selected`
                    }
                  </span>
                </p>
                <select
                  multiple
                  value={selectedClientIds}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setSelectedClientIds(selectedOptions);
                  }}
                  className="w-full max-w-xs px-3 py-2 border border-input bg-background/50 rounded-md text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-black"
                  size={Math.min(5, clients.length)}
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id!}>{c.brandName}</option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  💡 Hold Ctrl/Cmd to select multiple clients
                </p>
              </motion.div>
            )}
            {workerStatus && (
              <motion.p 
                variants={fadeInUp}
                className={`text-sm mt-2 ${
                  workerStatus.automation ? 'text-green-500' : 'text-yellow-500'
                }`}
              >
                Worker Status: {workerStatus.automation ? '🟢 Running' : '🟡 Not Running'}
              </motion.p>
            )}
            {schedulerStatus && (
              <motion.p 
                variants={fadeInUp}
                className={`text-sm mt-1 ${
                  schedulerStatus.isRunning ? 'text-green-500' : 'text-yellow-500'
                }`}
              >
                Scheduler Status: {schedulerStatus.isRunning ? '🟢 Running' : '🟡 Not Running'}
              </motion.p>
            )}
            
            {/* Automation Readiness Status */}
            {automationReadiness && selectedClientIds.length > 0 && (
              <motion.div 
                variants={fadeInUp}
                className="mt-3 p-3 rounded-lg border border-border bg-muted/30"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Automation Status:</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    automationReadiness.canStartAutomation 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {automationReadiness.canStartAutomation ? 'Ready' : 'Not Ready'}
                  </span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Clients:</span>
                    <span className="text-blue-600">
                      {automationReadiness.clientCount || 1}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Schedule:</span>
                    <span className={automationReadiness.hasSchedule ? 'text-green-600' : 'text-red-600'}>
                      {automationReadiness.hasSchedule ? '✅ Set' : '❌ Not Set'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Jobs:</span>
                    <span className={automationReadiness.pendingJobs > 0 ? 'text-blue-600' : 'text-gray-600'}>
                      {automationReadiness.pendingJobs}
                    </span>
                  </div>
                  {automationReadiness.nextScheduledRun && (
                    <div className="flex justify-between">
                      <span>Next Run:</span>
                      <span className="text-blue-600">
                        {new Date(automationReadiness.nextScheduledRun).toLocaleString(undefined, {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZoneName: 'short'
                        })}
                      </span>
                    </div>
                  )}
                  {automationReadiness.nextScheduledRun && (
                    <div className="flex justify-between">
                      <span>Time Until Run:</span>
                      <span className="text-blue-600">
                        {(() => {
                          const nextRun = new Date(automationReadiness.nextScheduledRun);
                          const now = new Date();
                          const diffMs = nextRun.getTime() - now.getTime();
                          if (diffMs <= 0) return 'Ready now';
                          const diffMins = Math.ceil(diffMs / (1000 * 60));
                          if (diffMins < 60) return `${diffMins}m`;
                          const diffHours = Math.ceil(diffMins / 60);
                          return `${diffHours}h`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
                
                {!automationReadiness.hasSchedule && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                    💡 Set up automation schedules for all selected clients to enable content generation
                    <br />
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="mt-2 text-xs h-6 px-2"
                      onClick={() => {
                        // Scroll to schedule manager section
                        const scheduleSection = document.getElementById('schedule-manager');
                        if (scheduleSection) {
                          scheduleSection.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Manage Schedules
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
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

        {/* Schedule Manager Section */}
        {selectedClientIds.length > 0 && (
          <motion.div 
            id="schedule-manager"
            className="mb-12"
            variants={fadeInUp}
            initial="hidden"
            animate="show"
          >
            <ScheduleManager 
              clientId={selectedClientIds[0]} 
              clientName={clients.find(c => c.id === selectedClientIds[0])?.brandName || 'Unknown Client'} 
            />
            {selectedClientIds.length > 1 && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  💡 Showing schedules for first selected client. 
                  To manage schedules for other clients, select them individually.
                </p>
              </div>
            )}
          </motion.div>
        )}

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
