import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { Button } from "@/components/ui/button";
import { 
  Menu, 
  X, 
  LayoutDashboard, 
  Search, 
  FileText, 
  PenTool, 
  CheckCircle, 
  Share2, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Users,
  BarChart3
} from "lucide-react";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/keyword-research", label: "Keywords", icon: Search },
  { href: "/content-brief", label: "Brief", icon: FileText },
  { href: "/writer", label: "Writer", icon: PenTool },
  { href: "/approval", label: "Approval", icon: CheckCircle },
  { href: "/distribution", label: "Distribution", icon: Share2 },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export default function Navigation() {
  const [location] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Update main content margin based on sidebar state
  useEffect(() => {
    const mainContent = document.getElementById('main-content');
    if (mainContent) {
      if (window.innerWidth >= 1024) { // lg breakpoint
        mainContent.style.marginLeft = isCollapsed ? '4rem' : '16rem';
      } else {
        mainContent.style.marginLeft = '0';
      }
    }
  }, [isCollapsed]);

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        if (window.innerWidth >= 1024) {
          mainContent.style.marginLeft = isCollapsed ? '4rem' : '16rem';
        } else {
          mainContent.style.marginLeft = '0';
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isCollapsed]);

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 z-50 h-full glass border-r border-border transition-all duration-300 ease-in-out hidden lg:flex flex-col",
        isCollapsed ? "w-16" : "w-64"
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className={cn("flex items-center", isCollapsed && "justify-center")}>
            <AIAvatar size="sm" className={cn("transition-all", isCollapsed ? "mr-0" : "mr-3")} />
            {!isCollapsed && (
              <h1 className="text-xl font-bold animate-glow">SEO AI</h1>
            )}
          </div>
          {!isCollapsed && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(true)}
              className="h-8 w-8 text-muted-foreground hover:text-primary"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Collapsed expand button */}
        {isCollapsed && (
          <div className="p-2 border-b border-border">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsCollapsed(false)}
              className="h-8 w-8 text-muted-foreground hover:text-primary mx-auto"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className="flex-1 p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location === item.href;
            
            return (
              <Link key={item.href} href={item.href}>
                <div
                  className={cn(
                    "flex items-center px-3 py-2 rounded-lg transition-all duration-200 group relative",
                    "hover:bg-muted/50 hover:text-primary",
                    isActive ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground",
                    isCollapsed ? "justify-center" : "justify-start"
                  )}
                >
                  <Icon className={cn(
                    "h-5 w-5 transition-colors",
                    isActive && "animate-pulse",
                    isCollapsed ? "mr-0" : "mr-3"
                  )} />
                  
                  {!isCollapsed && (
                    <span className="font-medium">{item.label}</span>
                  )}
                  
                  {/* Active indicator */}
                  {isActive && (
                    <div className="absolute right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
                  )}
                  
                  {/* Tooltip for collapsed state */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-background border border-border rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className={cn(
          "p-4 border-t border-border",
          isCollapsed && "text-center"
        )}>
          {!isCollapsed ? (
            <div className="text-xs text-muted-foreground">
              <div className="font-medium">SEO Automation</div>
              <div>v1.0.0</div>
            </div>
          ) : (
            <div className="w-2 h-2 bg-primary/50 rounded-full mx-auto animate-pulse" />
          )}
        </div>
      </div>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 glass border-b border-border">
        <div className="flex items-center justify-between h-16 px-4">
          <div className="flex items-center">
            <AIAvatar size="sm" className="mr-3" />
            <h1 className="text-xl font-bold animate-glow">SEO AI</h1>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-muted-foreground hover:text-primary"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
        
        {/* Mobile menu */}
        {isMobileMenuOpen && (
          <div className="border-t border-border bg-background/95 backdrop-blur-md">
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.href;
                
                return (
                  <Link key={item.href} href={item.href}>
                    <div
                      className={cn(
                        "flex items-center px-3 py-2 rounded-lg transition-colors",
                        "hover:bg-muted/50 hover:text-primary",
                        isActive ? "bg-primary/10 text-primary" : "text-muted-foreground"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="h-5 w-5 mr-3" />
                      <span className="font-medium">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto w-2 h-2 bg-primary rounded-full animate-pulse" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Mobile backdrop */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </>
  );
}
