import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";
import { ApprovalPanel } from "@/components/approval/ApprovalPanel";
import { Badge } from "@/components/ui/badge";
import { pageVariants, pageTransition, staggerContainer, fadeInUp } from "@/lib/animations";
import { CheckSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { fetchArticleById, updateArticleStatus, subscribeToArticle } from "@/lib/api";
import { useLocation } from "wouter";

interface PendingArticle {
  title: string;
  content: string;
  email: string;
  timestamp: string;
  status?: 'pending' | 'approved' | 'rejected' | 'changes-requested';
  articleId?: string;
  dbArticleId?: string; // Add this field
}

export default function Approval() {
  const [pendingArticle, setPendingArticle] = useState<PendingArticle | null>(null);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedSession = sessionStorage.getItem('pending-approval-article');
    const storedLocal = !storedSession ? localStorage.getItem('pending-approval-article') : null;
    const raw = storedSession || storedLocal;
    if (raw) {
      try {
        const article = JSON.parse(raw);
        if (!article.status) {
          article.status = 'pending';
        }
        setPendingArticle(article);
        // Keep storages in sync
        sessionStorage.setItem('pending-approval-article', JSON.stringify(article));
        try { localStorage.setItem('pending-approval-article', JSON.stringify(article)); } catch {}
      } catch (e) {
        console.error('Failed to parse stored article:', e);
      }
    }

    // Check for URL parameters (from email clicks or WP redirect)
    const urlParams = new URLSearchParams(window.location.search);
    const statusFromUrl = urlParams.get('status');
    const articleIdFromUrl = urlParams.get('articleId');
    const wpPostId = urlParams.get('wpPostId');
    const wpLink = urlParams.get('wpLink');
    const approvedVia = urlParams.get('approvedVia');
    const requestedVia = urlParams.get('requestedVia');
    const rejectedVia = urlParams.get('rejectedVia');
    const error = urlParams.get('error');

    // Handle errors from email approval
    if (error) {
      setSuccessMessage(`Error: ${decodeURIComponent(error)}`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 8000);
      setLocation('/approval');
      return;
    }

    // Handle successful email approval with WordPress publishing
    if (wpPostId && approvedVia === 'email') {
      const message = wpLink 
        ? `Article approved and published to WordPress! Post ID: #${wpPostId}. View: ${wpLink}`
        : `Article approved and published to WordPress! Post ID: #${wpPostId}`;
      setSuccessMessage(message);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 8000);
      setLocation('/approval');
      return;
    }

    // Handle email approval without WordPress publishing (fallback)
    if (wpPostId) {
      setSuccessMessage(`Draft created on WordPress (#${wpPostId}).`);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 5000);
      setLocation('/approval');
      return;
    }

    // Handle email status changes
    if (statusFromUrl && (approvedVia === 'email' || requestedVia === 'email' || rejectedVia === 'email')) {
      const statusMessages = {
        'approved': 'Article has been approved and published via email!',
        'rejected': 'Article has been rejected via email.',
        'changes-requested': 'Changes have been requested for this article via email.'
      };
      setSuccessMessage(statusMessages[statusFromUrl as keyof typeof statusMessages] || 'Status updated successfully via email!');
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 8000);
      setLocation('/approval');
      return;
    }

    // Handle regular status changes (from web interface)
    if (statusFromUrl) {
      try {
        const rawNow = sessionStorage.getItem('pending-approval-article') || localStorage.getItem('pending-approval-article');
        if (!rawNow) return;
        const article = JSON.parse(rawNow);
        // If articleId provided, ensure it matches; otherwise accept
        if (!articleIdFromUrl || article.articleId === articleIdFromUrl) {
          const updatedArticle = { ...article, status: statusFromUrl as any };
          setPendingArticle(updatedArticle);
          // Update both storages
          sessionStorage.setItem('pending-approval-article', JSON.stringify(updatedArticle));
          try { localStorage.setItem('pending-approval-article', JSON.stringify(updatedArticle)); } catch {}

          // Persist to DB if we have dbArticleId
          try {
            if (article.dbArticleId) {
              updateArticleStatus(article.dbArticleId, statusFromUrl);
            }
          } catch {}
        
        // Show success message for email-initiated changes
        const statusMessages = {
          'approved': 'Article has been approved and published!',
          'rejected': 'Article has been rejected.',
          'changes-requested': 'Changes have been requested for this article.'
        };
        setSuccessMessage(statusMessages[statusFromUrl as keyof typeof statusMessages] || 'Status updated successfully!');
        setShowSuccessMessage(true);
        
        // Hide message after 5 seconds
        setTimeout(() => setShowSuccessMessage(false), 5000);
        
        // Clear URL parameters
        setLocation('/approval');
        }
      } catch (e) {
        console.error('Failed to update article status from URL:', e);
      }
    }
  }, [setLocation]);

  // Function to clear stored article data
  const clearStoredArticle = () => {
    sessionStorage.removeItem('pending-approval-article');
    try { localStorage.removeItem('pending-approval-article'); } catch {}
    setPendingArticle(null);
  };

  // Function to handle status changes
  const handleStatusChange = (status: 'approved' | 'rejected' | 'changes-requested') => {
    if (pendingArticle) {
      const updatedArticle = { ...pendingArticle, status };
      setPendingArticle(updatedArticle);
      // Update session storage
      sessionStorage.setItem('pending-approval-article', JSON.stringify(updatedArticle));
      try { localStorage.setItem('pending-approval-article', JSON.stringify(updatedArticle)); } catch {}

      // Persist to DB if available
      try {
        const raw = sessionStorage.getItem('pending-approval-article') || localStorage.getItem('pending-approval-article');
        const parsed = raw ? JSON.parse(raw) : null;
        if (parsed?.dbArticleId) {
          updateArticleStatus(parsed.dbArticleId, status);
        }
      } catch {}
      
      // Show success message
      const statusMessages = {
        'approved': 'Article has been approved and published!',
        'rejected': 'Article has been rejected.',
        'changes-requested': 'Changes have been requested for this article.'
      };
      setSuccessMessage(statusMessages[status] || 'Status updated successfully!');
      setShowSuccessMessage(true);
      
      // Hide message after 5 seconds
      setTimeout(() => setShowSuccessMessage(false), 5000);
    }
  };

  // Real-time status updates via SSE when we have a dbArticleId
  useEffect(() => {
    const raw = sessionStorage.getItem('pending-approval-article') || localStorage.getItem('pending-approval-article');
    const parsed = raw ? JSON.parse(raw) : null;
    const dbArticleId: string | undefined = parsed?.dbArticleId;
    if (!dbArticleId) return;

    // Initial fetch to hydrate current status
    (async () => {
      try {
        const data = await fetchArticleById(dbArticleId);
        if (data?.status) {
          setPendingArticle(prev => prev ? { ...prev, status: data.status as any } : prev);
        }
      } catch {}
    })();

    const unsubscribe = subscribeToArticle(dbArticleId, (payload) => {
      const status = payload?.article?.status;
      if (status) {
        setPendingArticle(prev => prev ? { ...prev, status } : prev);
        // Persist in storage so other tabs or refresh keep in sync
        try {
          const nowRaw = sessionStorage.getItem('pending-approval-article') || localStorage.getItem('pending-approval-article');
          const now = nowRaw ? JSON.parse(nowRaw) : {};
          const updated = { ...now, status };
          sessionStorage.setItem('pending-approval-article', JSON.stringify(updated));
          try { localStorage.setItem('pending-approval-article', JSON.stringify(updated)); } catch {}
        } catch {}
      }
    });

    return () => unsubscribe();
  }, []);

  // Function to get badge variant and text based on status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return { variant: 'default' as const, text: 'Approved', className: 'text-green-600' };
      case 'rejected':
        return { variant: 'destructive' as const, text: 'Rejected', className: 'text-red-400' };
      case 'changes-requested':
        return { variant: 'secondary' as const, text: 'Changes Requested', className: 'text-yellow-400' };
      default:
        return { variant: 'secondary' as const, text: 'Pending Review', className: 'text-yellow-400' };
    }
  };

  // Calculate word count and reading time
  const wordCount = pendingArticle?.content ? pendingArticle.content.split(/\s+/).length : 0;
  const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

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
          <CheckSquare className="w-8 h-8 mr-3" />
          Editorial Approval Panel
        </motion.h1>
        
        {/* Success Message */}
        {showSuccessMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-green-500/20 border border-green-500/30 rounded-lg"
          >
            <p className="text-green-400 text-center font-medium">
              {successMessage}
            </p>
          </motion.div>
        )}
        
        <motion.div 
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          variants={staggerContainer}
          initial="hidden"
          animate="show"
        >
          {/* Article Preview */}
          <motion.div className="lg:col-span-2" variants={fadeInUp}>
            <GlassCard className="p-8">
              {pendingArticle ? (
                <>
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-semibold">Article Review</h2>
                    <Badge variant={getStatusBadge(pendingArticle.status || 'pending').variant} className={getStatusBadge(pendingArticle.status || 'pending').className}>
                      {getStatusBadge(pendingArticle.status || 'pending').text}
                    </Badge>
                  </div>
                  
                  <div className="prose prose-invert max-w-none">
                    <h1 className="text-2xl font-bold mb-4">
                      {pendingArticle.title}
                    </h1>
                    <div className="text-muted-foreground text-sm mb-6">
                      <span>Word count: {wordCount.toLocaleString()}</span> • <span>Reading time: {readingTime} min</span> • <span>SEO Score: 94/100</span>
                    </div>
                    
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
                      <div className="flex items-center space-x-2 text-sm text-blue-400">
                        <span>📧 Sent to: {pendingArticle.email}</span>
                        <span>•</span>
                        <span>🕒 {new Date(pendingArticle.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                    
                    <div className="bg-muted/30 rounded-lg p-6 relative">
                      <div 
                        className="leading-relaxed mb-4"
                        dangerouslySetInnerHTML={{ __html: pendingArticle.content }}
                      />
                      
                      {/* Inline Comment Indicator */}
                      <div className="absolute right-2 top-2">
                        <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-black text-xs font-bold cursor-pointer">
                          1
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <CheckSquare className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                  <h2 className="text-2xl font-semibold mb-2">No Articles Pending Review</h2>
                  <p className="text-muted-foreground">
                    Articles sent for approval will appear here for review.
                  </p>
                </div>
              )}
            </GlassCard>
          </motion.div>

          <motion.div variants={fadeInUp}>
            {pendingArticle ? (
              <ApprovalPanel 
                onClearArticle={clearStoredArticle} 
                onStatusChange={handleStatusChange}
                articleId={pendingArticle.dbArticleId}
              />
            ) : (
              <GlassCard className="p-6">
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold mb-2">Approval Panel</h3>
                  <p className="text-sm text-muted-foreground">
                    Use the Writer page to send articles for approval.
                  </p>
                </div>
              </GlassCard>
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
