import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Navigation from "@/components/layout/Navigation";
import Dashboard from "@/pages/Dashboard";
import KeywordResearch from "@/pages/KeywordResearch";
import ContentBrief from "@/pages/ContentBrief";
import Writer from "@/pages/Writer";
import Approval from "@/pages/Approval";
import Distribution from "@/pages/Distribution";
import Clients from "@/pages/Clients";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import { useCursorTrail } from "@/hooks/use-cursor-trail";

function CursorTrail() {
  const { position } = useCursorTrail();
  
  return (
    <div 
      className="cursor-trail"
      style={{
        left: position.x - 10,
        top: position.y - 10,
      }}
    />
  );
}

function Router() {
  return (
    <div className="min-h-screen neural-bg">
      <Navigation />
      {/* Main content area - spacing handled by CSS based on sidebar state */}
      <main id="main-content" className="transition-all duration-300 ease-in-out lg:pt-0 pt-16">
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/keyword-research" component={KeywordResearch} />
          <Route path="/content-brief" component={ContentBrief} />
          <Route path="/writer" component={Writer} />
          <Route path="/approval" component={Approval} />
          <Route path="/distribution" component={Distribution} />
          <Route path="/clients" component={Clients} />
          <Route path="/reports" component={Reports} />
          <Route path="/settings" component={Settings} />
          <Route component={NotFound} />
        </Switch>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <CursorTrail />
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
