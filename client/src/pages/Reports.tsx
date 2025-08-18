import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/ui/glass-card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  FileText, 
  CheckCircle, 
  Share2, 
  Calendar,
  Filter,
  Download,
  Eye,
  Target,
  Activity,
  Zap,
  Clock,
  Award
} from "lucide-react";

interface Report {
  id: string;
  clientId: string;
  clientName: string;
  reportType: "daily" | "weekly" | "monthly";
  startDate: string;
  endDate: string;
  keywordsResearched: number;
  briefsCreated: number;
  articlesWritten: number;
  articlesApproved: number;
  articlesPublished: number;
  distributionPlatforms: string[];
  performanceMetrics: {
    organicTraffic: number;
    keywordRankings: number;
    backlinks: number;
    socialEngagement: number;
  };
}

const mockReports: Report[] = [
  {
    id: "1",
    clientId: "1",
    clientName: "TechFlow Solutions",
    reportType: "weekly",
    startDate: "2024-01-15",
    endDate: "2024-01-21",
    keywordsResearched: 47,
    briefsCreated: 12,
    articlesWritten: 8,
    articlesApproved: 6,
    articlesPublished: 5,
    distributionPlatforms: ["WordPress", "LinkedIn", "Twitter"],
    performanceMetrics: {
      organicTraffic: 15420,
      keywordRankings: 23,
      backlinks: 156,
      socialEngagement: 2340
    }
  },
  {
    id: "2",
    clientId: "2",
    clientName: "GreenLeaf Marketing",
    reportType: "monthly",
    startDate: "2024-01-01",
    endDate: "2024-01-31",
    keywordsResearched: 89,
    briefsCreated: 25,
    articlesWritten: 18,
    articlesApproved: 15,
    articlesPublished: 12,
    distributionPlatforms: ["WordPress", "Medium", "LinkedIn", "Twitter", "Facebook"],
    performanceMetrics: {
      organicTraffic: 28750,
      keywordRankings: 45,
      backlinks: 289,
      socialEngagement: 5670
    }
  },
  {
    id: "3",
    clientId: "3",
    clientName: "Digital Dynamics",
    reportType: "daily",
    startDate: "2024-01-22",
    endDate: "2024-01-22",
    keywordsResearched: 12,
    briefsCreated: 3,
    articlesWritten: 2,
    articlesApproved: 1,
    articlesPublished: 1,
    distributionPlatforms: ["WordPress", "LinkedIn"],
    performanceMetrics: {
      organicTraffic: 3420,
      keywordRankings: 8,
      backlinks: 45,
      socialEngagement: 890
    }
  }
];

const mockClients = [
  { id: "1", name: "TechFlow Solutions" },
  { id: "2", name: "GreenLeaf Marketing" },
  { id: "3", name: "Digital Dynamics" },
  { id: "4", name: "All Clients" }
];

export default function Reports() {
  const [selectedClient, setSelectedClient] = useState<string>("4");
  const [selectedTimeRange, setSelectedTimeRange] = useState<string>("all");
  const [reports, setReports] = useState<Report[]>(mockReports);

  const filteredReports = reports.filter(report => {
    const clientMatch = selectedClient === "4" || report.clientId === selectedClient;
    const timeMatch = selectedTimeRange === "all" || report.reportType === selectedTimeRange;
    return clientMatch && timeMatch;
  });

  const totalStats = filteredReports.reduce((acc, report) => ({
    keywordsResearched: acc.keywordsResearched + report.keywordsResearched,
    briefsCreated: acc.briefsCreated + report.briefsCreated,
    articlesWritten: acc.articlesWritten + report.articlesWritten,
    articlesApproved: acc.articlesApproved + report.articlesApproved,
    articlesPublished: acc.articlesPublished + report.articlesPublished,
    organicTraffic: acc.organicTraffic + report.performanceMetrics.organicTraffic,
    keywordRankings: acc.keywordRankings + report.performanceMetrics.keywordRankings,
    backlinks: acc.backlinks + report.performanceMetrics.backlinks,
    socialEngagement: acc.socialEngagement + report.performanceMetrics.socialEngagement,
  }), {
    keywordsResearched: 0,
    briefsCreated: 0,
    articlesWritten: 0,
    articlesApproved: 0,
    articlesPublished: 0,
    organicTraffic: 0,
    keywordRankings: 0,
    backlinks: 0,
    socialEngagement: 0,
  });

  const statsCards = [
    {
      title: "Keywords Researched",
      value: totalStats.keywordsResearched,
      icon: Target,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10"
    },
    {
      title: "Briefs Created",
      value: totalStats.briefsCreated,
      icon: FileText,
      color: "text-green-500",
      bgColor: "bg-green-500/10"
    },
    {
      title: "Articles Written",
      value: totalStats.articlesWritten,
      icon: FileText,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10"
    },
    {
      title: "Articles Approved",
      value: totalStats.articlesApproved,
      icon: CheckCircle,
      color: "text-orange-500",
      bgColor: "bg-orange-500/10"
    },
    {
      title: "Articles Published",
      value: totalStats.articlesPublished,
      icon: Share2,
      color: "text-pink-500",
      bgColor: "bg-pink-500/10"
    },
    {
      title: "Organic Traffic",
      value: totalStats.organicTraffic.toLocaleString(),
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10"
    }
  ];

  const performanceCards = [
    {
      title: "Keyword Rankings",
      value: totalStats.keywordRankings,
      icon: Award,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10"
    },
    {
      title: "Backlinks",
      value: totalStats.backlinks,
      icon: Activity,
      color: "text-teal-500",
      bgColor: "bg-teal-500/10"
    },
    {
      title: "Social Engagement",
      value: totalStats.socialEngagement.toLocaleString(),
      icon: Zap,
      color: "text-red-500",
      bgColor: "bg-red-500/10"
    }
  ];

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
        {/* Header */}
        <motion.div 
          className="mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <motion.h1 
            variants={fadeInUp}
            className="text-4xl font-bold mb-4 flex items-center"
          >
            <BarChart3 className="w-8 h-8 mr-3 text-primary" />
            Performance Reports
          </motion.h1>
          <motion.p 
            variants={fadeInUp}
            className="text-muted-foreground"
          >
            Track your SEO automation performance and client progress
          </motion.p>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="mb-8"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-6">
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium">Filters:</span>
              </div>
              
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select client" />
                </SelectTrigger>
                <SelectContent>
                  {mockClients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedTimeRange} onValueChange={setSelectedTimeRange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>

              <Button variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
            </div>
          </GlassCard>
        </motion.div>

        {/* Stats Overview */}
        <motion.div 
          className="mb-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statsCards.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div key={stat.title} variants={fadeInUp}>
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        {stat.title}
                      </CardTitle>
                      <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                        <Icon className={`w-4 h-4 ${stat.color}`} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <p className="text-xs text-muted-foreground">
                        {index < 5 ? "This period" : "Total traffic"}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Performance Metrics */}
        <motion.div 
          className="mb-8"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-6 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              Performance Metrics
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {performanceCards.map((metric) => {
                const Icon = metric.icon;
                return (
                  <div key={metric.title} className="text-center">
                    <div className={`w-16 h-16 rounded-full ${metric.bgColor} flex items-center justify-center mx-auto mb-4`}>
                      <Icon className={`w-8 h-8 ${metric.color}`} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2">{metric.value}</h3>
                    <p className="text-sm text-muted-foreground">{metric.title}</p>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>

        {/* Detailed Reports */}
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Detailed Reports
              </h2>
              <Badge variant="secondary">
                {filteredReports.length} reports
              </Badge>
            </div>
            
            <div className="space-y-4">
              {filteredReports.map((report) => (
                <div
                  key={report.id}
                  className="p-4 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="font-semibold">{report.clientName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {report.startDate} - {report.endDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {report.reportType.charAt(0).toUpperCase() + report.reportType.slice(1)}
                      </Badge>
                      <Button variant="ghost" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Keywords:</span>
                      <span className="ml-2 font-medium">{report.keywordsResearched}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Briefs:</span>
                      <span className="ml-2 font-medium">{report.briefsCreated}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Articles:</span>
                      <span className="ml-2 font-medium">{report.articlesWritten}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Published:</span>
                      <span className="ml-2 font-medium">{report.articlesPublished}</span>
                    </div>
                  </div>
                  
                  <div className="mt-4 flex flex-wrap gap-2">
                    {report.distributionPlatforms.map((platform) => (
                      <Badge key={platform} variant="secondary" className="text-xs">
                        {platform}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
              
              {filteredReports.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No reports found for the selected filters</p>
                  <p className="text-sm">Try adjusting your filters to see more results</p>
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="mt-8"
          variants={fadeInUp}
          initial="hidden"
          animate="show"
        >
          <GlassCard className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Calendar className="w-6 h-6 mb-2" />
                <span>Schedule Report</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Download className="w-6 h-6 mb-2" />
                <span>Export Data</span>
              </Button>
              <Button variant="outline" className="h-auto p-4 flex-col">
                <Share2 className="w-6 h-6 mb-2" />
                <span>Share Report</span>
              </Button>
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </motion.div>
  );
} 