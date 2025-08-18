import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CheckCircle, Edit, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchComments, createComment, type Comment, fetchClients, publishToClientWordpress, startClientWordpressOAuth } from "@/lib/api";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ApprovalPanelProps {
  onClearArticle?: () => void;
  onStatusChange?: (status: 'approved' | 'rejected' | 'changes-requested') => void;
  articleId?: string; // Add articleId prop
}

const mockStats = [
  { label: "SEO Score", value: "94/100", color: "text-primary" },
  { label: "Readability", value: "Good", color: "text-green-400" },
  { label: "Plagiarism", value: "0% Detected", color: "text-green-400" },
  { label: "AI Detection", value: "32% (Human-like)", color: "text-yellow-400" }
];

export function ApprovalPanel({ onClearArticle, onStatusChange, articleId }: ApprovalPanelProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState("");
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [clients, setClients] = useState<Array<{ id: string; brandName: string; connectionType?: string }>>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(() => {
    try { return sessionStorage.getItem('selected-client-id') || undefined; } catch { return undefined; }
  });

  // Fetch comments when articleId changes
  useEffect(() => {
    if (articleId) {
      setIsLoadingComments(true);
      fetchComments(articleId)
        .then((fetchedComments) => {
          console.log('Fetched comments:', fetchedComments);
          fetchedComments.forEach(comment => {
            console.log(`Comment ${comment.id} timestamp:`, comment.createdAt);
          });
          setComments(fetchedComments);
        })
        .catch(console.error)
        .finally(() => setIsLoadingComments(false));
    }
  }, [articleId]);

  useEffect(() => {
    fetchClients().then((list) => {
      setClients((list || []).map((c: any) => ({ 
        id: c.id, 
        brandName: c.brandName,
        connectionType: c.connectionType 
      })));
    }).catch(() => setClients([]));
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      try { sessionStorage.setItem('selected-client-id', selectedClientId); } catch {}
    }
  }, [selectedClientId]);

  const handleApprove = async () => {
    if (!articleId) return;
    if (!selectedClientId) {
      alert('Select a client before publishing.');
      return;
    }
    setIsProcessing(true);
    try {
      const result = await publishToClientWordpress(selectedClientId, articleId);
      if (result?.success && onStatusChange) {
        onStatusChange('approved');
      }
    } catch (e) {
      // If publish fails due to auth, send user to connect
      startClientWordpressOAuth(selectedClientId, articleId);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    setIsProcessing(true);
    // Handle rejection logic here
    if (onStatusChange) {
      onStatusChange('rejected');
    }
    // Don't clear article immediately - let user see the status change
    // The parent component can decide when to clear it
    setIsProcessing(false);
  };

  const handleRequestChanges = async () => {
    setIsProcessing(true);
    // Handle request changes logic here
    if (onStatusChange) {
      onStatusChange('changes-requested');
    }
    // Don't clear article data as user might want to review changes
    setIsProcessing(false);
  };

  const handleAddComment = async () => {
    if (commentText.trim() && articleId) {
      try {
        const newComment = await createComment(articleId, {
          author: "John Doe", // Keeping the same author as requested
          initials: "JD",
          content: commentText.trim()
        });
        
        console.log('New comment created:', newComment);
        console.log('Comment timestamp:', newComment.createdAt);
        
        setComments([newComment, ...comments]); // Add new comment at the top
        setCommentText(""); // Clear the text area
      } catch (error) {
        console.error('Failed to create comment:', error);
        // You could add a toast notification here
      }
    }
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      // Ensure we have a valid timestamp string
      if (!timestamp || typeof timestamp !== 'string') {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Unknown time';
      }
  
      // Parse the timestamp and ensure it's treated as UTC
      const date = new Date(timestamp);
      
      // Check if the date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid timestamp received:', timestamp);
        return 'Unknown time';
      }
      
      // Get current time in UTC
      const now = new Date();
      const diffInMilliseconds = now.getTime() - date.getTime();
      const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
      
      // Debug logging to help identify the issue
      console.log('Original timestamp:', timestamp);
      console.log('Parsed date:', date.toISOString());
      console.log('Current time:', now.toISOString());
      console.log('Difference in minutes:', diffInMinutes);
      
      if (diffInMinutes < 1) {
        return "Just now";
      } else if (diffInMinutes < 60) {
        return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes < 1440) {
        const hours = Math.floor(diffInMinutes / 60);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffInMinutes < 43200) { // 30 days
        const days = Math.floor(diffInMinutes / 1440);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      } else {
        // For older comments, show the actual date in local time
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    } catch (error) {
      console.error('Error formatting timestamp:', error, 'Timestamp:', timestamp);
      return 'Unknown time';
    }
  };

  const formatDetailedTimestamp = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) {
        return 'Invalid timestamp';
      }
      
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    } catch (error) {
      return 'Unknown time';
    }
  };

  

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Select Client</h3>
        <Select value={selectedClientId} onValueChange={(v) => setSelectedClientId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Choose a client" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.brandName} {c.connectionType && `(${c.connectionType === 'oauth' ? 'OAuth' : 'App Password'})`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </GlassCard>
      {/* Approval Actions */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Approval Actions</h3>
        <div className="space-y-4">
          <Button 
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            onClick={handleApprove}
            disabled={isProcessing || !selectedClientId}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Approve & Publish'}
          </Button>
          <Button 
            className="w-full bg-yellow-600 hover:bg-yellow-700 text-white"
            onClick={handleRequestChanges}
            disabled={isProcessing}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Request Changes'}
          </Button>
          <Button 
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            onClick={handleReject}
            disabled={isProcessing}
          >
            <XCircle className="w-4 h-4 mr-2" />
            {isProcessing ? 'Processing...' : 'Reject Article'}
          </Button>
        </div>
      </GlassCard>


      {/* Comments Section */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Comments & Feedback</h3>
        
        {isLoadingComments ? (
          <div className="text-center py-4">
            <p className="text-muted-foreground">Loading comments...</p>
          </div>
        ) : (
          <>
            <div className="space-y-4 mb-4">
              {comments.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-muted-foreground">No comments yet. Be the first to add feedback!</p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="bg-muted/30 rounded-lg p-4">
                    <div className="flex items-center space-x-2 mb-2">
                      <Avatar className="w-6 h-6">
                        <AvatarFallback className="text-xs bg-blue-500 text-white">
                          {comment.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{comment.author}</span>
                      <span 
                        className="text-xs text-muted-foreground cursor-help" 
                        title={formatDetailedTimestamp(comment.createdAt)}
                      >
                        {formatTimestamp(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{comment.content}</p>
                  </div>
                ))
              )}
            </div>
            
            <div className="space-y-3">
              <Textarea 
                placeholder="Add your feedback or suggestions..."
                className="bg-muted/50 border-border resize-none focus:border-primary text-black"
                rows={3}
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
              />
              <Button 
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAddComment}
                disabled={!commentText.trim() || !articleId}
              >
                Add Comment
              </Button>
            </div>
          </>
        )}
      </GlassCard>

      {/* Article Stats */}
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold mb-4">Article Analytics</h3>
        <div className="space-y-3">
          {mockStats.map((stat) => (
            <div key={stat.label} className="flex justify-between">
              <span className="text-muted-foreground">{stat.label}</span>
              <span className={`font-semibold ${stat.color}`}>{stat.value}</span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
