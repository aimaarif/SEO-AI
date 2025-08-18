import { useState, useEffect, useCallback } from "react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useLocation } from "wouter";

interface Keyword {
  id: string;
  keyword: string;
  type?: string;
  volume: number;
  difficulty: number;
  intent?: "Commercial" | "Informational" | "Navigational";
  priority?: number;
  status: string;
  createdAt: string;
}

interface KeywordTableProps {
  searchKeyword?: string;
  shouldTriggerResearch?: boolean;
}

const difficultyColors = {
  Easy: "bg-green-900 text-green-300",
  Medium: "bg-yellow-900 text-yellow-300",
  Hard: "bg-red-900 text-red-300"
};

const intentColors = {
  Commercial: "text-blue-400",
  Informational: "text-purple-400",
  Navigational: "text-green-400"
};

const getDifficultyLabel = (difficulty: number): "Easy" | "Medium" | "Hard" => {
  if (difficulty <= 30) return "Easy";
  if (difficulty <= 70) return "Medium";
  return "Hard";
};

const getIntentLabel = (keyword: string): "Commercial" | "Informational" | "Navigational" => {
  const commercialTerms = ['buy', 'best', 'top', 'review', 'price', 'cost', 'cheap', 'discount'];
  const navigationalTerms = ['login', 'sign up', 'register', 'contact', 'about'];
  
  const lowerKeyword = keyword.toLowerCase();
  
  if (navigationalTerms.some(term => lowerKeyword.includes(term))) {
    return "Navigational";
  }
  
  if (commercialTerms.some(term => lowerKeyword.includes(term))) {
    return "Commercial";
  }
  
  return "Informational";
};

const calculatePriority = (volume: number, difficulty: number): number => {
  // Simple priority calculation based on volume and difficulty
  const volumeScore = Math.min(volume / 1000, 1) * 50;
  const difficultyScore = (100 - difficulty) * 0.5;
  return Math.round(volumeScore + difficultyScore);
};



// Debounce function to prevent excessive API calls
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export function KeywordTable({ searchKeyword, shouldTriggerResearch = false }: KeywordTableProps) {
  const queryClient = useQueryClient();
  const [projectId, setProjectId] = useState("default-project"); // In a real app, this would come from user context
  const [researchStatus, setResearchStatus] = useState<string>("");
  const [, setLocation] = useLocation();

  // Debounce the search keyword to prevent excessive API calls
  const debouncedSearchKeyword = useDebounce(searchKeyword, 1000);

  // Fetch existing keywords
  const { data: keywords = [], isLoading, refetch } = useQuery({
    queryKey: ['keywords', projectId],
    queryFn: async () => {
      const response = await axios.get(`/api/keywords?projectId=${projectId}`);
      return response.data;
    },
    enabled: !!projectId
  });

  const [hasSearched, setHasSearched] = useState(false);

    // Trigger research when shouldTriggerResearch is true and we have a search keyword
    useEffect(() => {
      if (shouldTriggerResearch && debouncedSearchKeyword && debouncedSearchKeyword.trim()) {
        setHasSearched(true); // <-- mark that research was attempted
        researchMutation.mutate(debouncedSearchKeyword);
      }
    }, [shouldTriggerResearch, debouncedSearchKeyword]);


  // Keyword research mutation
  const researchMutation = useMutation({
    mutationFn: async (keyword: string) => {
      setResearchStatus("Starting research...");
      const response = await axios.post('/api/keywords/research', {
        keyword,
        projectId
      });
      return response.data;
    },
    onMutate: () => {
      setResearchStatus("Fetching search results...");
    },
    onSuccess: (data) => {
      setResearchStatus("Research completed!");
      // If we have results from the research, update the local state
      if (data.results && data.results.length > 0) {
        queryClient.setQueryData(['keywords', projectId], data.results);
      } else {
        queryClient.invalidateQueries({ queryKey: ['keywords', projectId] });
      }
      // Clear status after 3 seconds
      setTimeout(() => setResearchStatus(""), 3000);
    },
    onError: (error) => {
      setResearchStatus("Research failed. Please try again.");
      console.error('Research error:', error);
      // Clear status after 5 seconds
      setTimeout(() => setResearchStatus(""), 5000);
    }
  });

  // Trigger research when shouldTriggerResearch is true and we have a search keyword
  useEffect(() => {
    if (shouldTriggerResearch && debouncedSearchKeyword && debouncedSearchKeyword.trim()) {
      researchMutation.mutate(debouncedSearchKeyword);
    }
  }, [shouldTriggerResearch, debouncedSearchKeyword]);

  const processedKeywords: Keyword[] = keywords.map((keyword: any) => ({
    ...keyword,
    type: keyword.keyword.split(' ').length > 2 ? "Long-tail keyword" : "Primary keyword",
    intent: getIntentLabel(keyword.keyword),
    priority: calculatePriority(keyword.volume || 0, keyword.difficulty || 50)
  }));

  const handleCreateBrief = (kw: string) => {
    try {
      sessionStorage.setItem('preselected-target-keyword', kw);
    } catch (e) {
      // non-blocking if storage fails
    }
    setLocation('/content-brief');
  };

  return (
    <GlassCard className="overflow-hidden">
      <div className="p-6 border-b border-border">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Latest Research Results</h2>
          <div className="flex items-center gap-4">
            {researchStatus && (
              <span className="text-sm text-muted-foreground animate-pulse">
                {researchStatus}
              </span>
            )}
            <span className="text-sm text-muted-foreground">
              {researchMutation.isPending ? "Researching..." : 
               `Last updated: ${new Date().toLocaleTimeString()}`}
            </span>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead>Keyword</TableHead>
              <TableHead>Volume</TableHead>
              <TableHead>Difficulty</TableHead>
              <TableHead>Intent</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading || researchMutation.isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-2">
                      {researchMutation.isPending ? "Researching keyword..." : "Loading existing results..."}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            ) : processedKeywords.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  {hasSearched ? 
                    "No research results found. Try a different keyword or check your API configuration." :
                    "No research results yet. Enter a keyword above to start researching."
                  }
                </TableCell>
              </TableRow>
            ) : (
              processedKeywords.map((keyword) => (
                <TableRow key={keyword.id} className="hover:bg-white/5">
                  <TableCell>
                    <div>
                      <div className="font-medium">{keyword.keyword}</div>
                      <div className="text-sm text-muted-foreground">{keyword.type}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-primary font-semibold">
                      {keyword.volume && keyword.volume > 0 ? keyword.volume.toLocaleString() : 'N/A'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge className={difficultyColors[getDifficultyLabel(keyword.difficulty)]}>
                      {getDifficultyLabel(keyword.difficulty)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <span className={intentColors[keyword.intent || "Informational"]}>
                      {keyword.intent || "Informational"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Progress value={keyword.priority || 0} className="w-16 h-2 mr-2" />
                      <span className="text-sm">
                        {(keyword.priority || 0) >= 70 ? "High" : (keyword.priority || 0) >= 40 ? "Medium" : "Low"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button variant="link" className="text-primary hover:text-white p-0" onClick={() => handleCreateBrief(keyword.keyword)}>
                      Create Brief
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      <div className="p-6 border-t border-border">
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 animate-pulse-neon">
          Save to Google Sheets
        </Button>
      </div>
    </GlassCard>
  );
}
