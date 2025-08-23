import { motion } from "framer-motion";
import { ContentPreview } from "@/components/content/ContentPreview";
import { AIAvatar } from "@/components/ui/ai-avatar";
import { pageVariants, pageTransition, fadeInUp } from "@/lib/animations";
import { PenTool, Send } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateArticle, sendArticleEmail, updateArticleStatus } from "@/lib/api";
import { useLocation } from "wouter";

interface ArticleData {
  title: string;
  content: string; // assumed HTML
}

export default function Writer() {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [email, setEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [, setLocation] = useLocation();
  const [targetWordCount, setTargetWordCount] = useState<string>("");

  // Calculate word count and reading time
  const wordCount = article?.content ? 
    article.content
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim()
      .split(/\s+/)
      .filter(word => word.length > 0).length : 0;
  const readingTime = Math.ceil(wordCount / 200); // Assuming 200 words per minute

  useEffect(() => {
    const storedArticle = sessionStorage.getItem('generated-article');
    if (storedArticle) {
      try {
        setArticle(JSON.parse(storedArticle));
        return;
      } catch {}
    }

    // If no article yet, generate from brief
    const storedBrief = sessionStorage.getItem('brief-to-write');
    if (!storedBrief) return;
    try {
      const brief = JSON.parse(storedBrief) as { 
        title: string; 
        keyPoints: string[]; 
        targetAudience?: string; 
        wordCount?: string;
        id?: string;
        keywordId?: string;
        clientId?: string;
      };
      setTargetWordCount(brief.wordCount || "");
      (async () => {
        try {
          const generated = await generateArticle({
            title: brief.title,
            keyPoints: brief.keyPoints,
            targetAudience: brief.targetAudience,
            wordCount: brief.wordCount,
            contentBriefId: brief.id,
            clientId: brief.clientId,
          });
          sessionStorage.setItem('generated-article', JSON.stringify(generated));
          setArticle(generated);
        } catch (e) {
          // keep placeholder UI
          console.error('Failed to generate article:', e);
        }
      })();
    } catch {}
  }, []);

  const handleSendEmail = async () => {
    if (!email || !article) return;
    setIsSending(true);
    try {
      // If this article exists in DB, mark it as under review
      try {
        if ((article as any).id) {
          await updateArticleStatus((article as any).id, 'review');
        }
      } catch {}

      const response = await sendArticleEmail({ email, title: article.title, content: article.content, articleId: (article as any).id, clientId: (sessionStorage.getItem('selected-client-id') || localStorage.getItem('selected-client-id') || undefined) as any });
      
      // Store article data for approval page
      const pendingPayload = {
        title: article.title,
        content: article.content,
        email: email,
        timestamp: new Date().toISOString(),
        status: 'pending',
        articleId: (response as any).articleId || `article_${Date.now()}`,
        dbArticleId: (article as any).id || undefined
      };
      sessionStorage.setItem('pending-approval-article', JSON.stringify(pendingPayload));
      try { localStorage.setItem('pending-approval-article', JSON.stringify(pendingPayload)); } catch {}
      
      alert(`Article sent successfully to ${email}!`);
      setEmail("");
      
      // Navigate to approval page
      setLocation('/approval');
    } catch (error) {
      console.error('Failed to send email:', error);
      alert('Failed to send email. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
          <h1 className="text-4xl font-bold animate-glow flex items-center">
            <PenTool className="w-8 h-8 mr-3" />
            AI Writer Interface
          </h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <AIAvatar size="sm" variant="thinking" />
              <span className="text-sm text-muted-foreground typing-indicator">
                {article ? 'Draft ready' : 'Writing in progress'}
              </span>
            </div>
            
            <Button 
              variant="outline" 
              onClick={() => setLocation('/approval')}
              className="bg-background/50 border-border/50 hover:bg-background/80"
            >
              Review Articles
            </Button>
          </div>
        </motion.div>
        
        <motion.div
          variants={fadeInUp}
          initial="hidden"
          animate="show"
          transition={{ delay: 0.2 }}
        >
          <div className="prose prose-invert max-w-none">
          <div className="bg-muted/50 border border-gray-500/50 rounded-lg">
            {article ? (
              <>
                <div className="pr-4 pl-4 border-b border-border">
                  <div className="flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Draft Preview</h2>
                    <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>Word count: <span className="text-primary">{article ? wordCount.toLocaleString() : 'Generating...'}</span></span>
                      {targetWordCount && (
                        <span className="text-yellow-400">(Target: {targetWordCount})</span>
                      )}
                      <span>•</span>
                      <span>Reading time: {article ? `${readingTime} min` : 'Calculating...'}</span>
                      {article && targetWordCount && (
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          (() => {
                            try {
                              const targetRange = targetWordCount.match(/(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)/);
                              if (targetRange) {
                                const minWords = parseInt(targetRange[1].replace(/,/g, ''));
                                return wordCount >= minWords;
                              }
                              return false;
                            } catch (e) {
                              return false;
                            }
                          })() 
                            ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                            : 'bg-red-500/20 text-red-400 border border-red-500/30'
                        }`}>
                          {(() => {
                            try {
                              const targetRange = targetWordCount.match(/(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)/);
                              if (targetRange) {
                                const minWords = parseInt(targetRange[1].replace(/,/g, ''));
                                return wordCount >= minWords ? '✓ Target Met' : '✗ Too Short';
                              }
                              return 'Unknown Target';
                            } catch (e) {
                              return 'Error';
                            }
                          })()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="p-8">
                  <h1 className="text-3xl font-bold mb-6 text-white">{article.title}</h1>
                  <div className="shimmer-bg rounded-lg p-6 mb-6" dangerouslySetInnerHTML={{ __html: article.content }} />
                  </div>
              </>
            ) : (
              <div className="shimmer-bg rounded-lg p-6 mb-6">
                <p className="text-muted-foreground leading-relaxed">
                  Preparing your article based on the brief...
                </p>
              </div>
            )}
            <div className="bg-muted/30 rounded-lg p-4 mb-6">
              <div className="flex items-center space-x-2 mb-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                <span className="text-sm text-muted-foreground">
                  {article ? 'Draft complete' : 'AI is currently writing section: "Implementation Best Practices"'}
                </span>
              </div>
              {!article && (
                <div className="text-xs text-muted-foreground">
                  Current progress: {wordCount > 0 ? `${wordCount} words (${readingTime} min read)` : 'Starting...'}
                </div>
              )}
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking" />
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-thinking" style={{ animationDelay: "0.4s" }} />
              </div>
            </div>
            
            <div className="p-6 border-t border-border flex justify-between items-center">
              <div className="flex space-x-4">
                <Button variant="outline">Regenerate Section</Button>
                <Button variant="outline">Add Instructions</Button>
              </div>
              {article && (
              <div className="flex items-center space-x-2">
                <Input
                  type="email"
                  placeholder="Enter email address to get article on email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-64 bg-background/50 border-border/50 focus:border-primary text-black"
                  onKeyPress={(e) => e.key === 'Enter' && handleSendEmail()}
                />
                <Button
                  onClick={handleSendEmail}
                  disabled={!isValidEmail(email) || isSending}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                  size="sm"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send for Approval
                </Button>
              </div>
            )}
              <div className="flex space-x-4">
                <Button variant="destructive">Reject & Revise</Button>
              </div>
            </div>
          </div>
          </div>
        </motion.div>
      </div> 
    </motion.div>
  );
}
