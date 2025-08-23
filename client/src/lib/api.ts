interface BriefRequest {
  targetKeyword: string;
  contentType: string;
  targetAudience?: string;
  keywordId?: string;
  clientId?: string;
}

interface BriefResponse {
  title: string;
  keyPoints: string[];
  wordCount: string;
  id?: string;
  keywordId?: string;
  clientId?: string;
}

export async function generateContentBrief(data: BriefRequest): Promise<BriefResponse> {
  try {
    const response = await fetch('/api/generate-brief', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to generate brief');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating brief:', error);
    throw error;
  }
}

export async function editContentBrief(briefId: string, edits: Partial<BriefResponse>): Promise<BriefResponse> {
  try {
    const response = await fetch(`/api/edit-brief/${briefId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(edits),
    });

    if (!response.ok) {
      throw new Error('Failed to edit brief');
    }

    return await response.json();
  } catch (error) {
    console.error('Error editing brief:', error);
    throw error;
  }
}

export interface GenerateArticleRequest {
  title: string;
  keyPoints: string[];
  targetAudience?: string;
  wordCount?: string;
  contentBriefId?: string;
  clientId?: string;
}

export interface GenerateArticleResponse {
  title: string;
  content: string; // HTML or Markdown
  id?: string;
  contentBriefId?: string;
  clientId?: string;
}

export async function generateArticle(data: GenerateArticleRequest): Promise<GenerateArticleResponse> {
  try {
    const response = await fetch('/api/generate-article', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to generate article');
    }

    return await response.json();
  } catch (error) {
    console.error('Error generating article:', error);
    throw error;
  }
}

export async function sendArticleEmail(data: { email: string; title: string; content: string; articleId?: string; clientId?: string }): Promise<{ success: boolean; articleId: string }> {
  try {
    const response = await fetch('/api/send-article-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error('Failed to send email');
    }

    return await response.json();
  } catch (error) {
    console.error('Error sending article email:', error);
    throw error;
  }
}

export async function fetchArticleById(id: string): Promise<{ id: string; title: string; content: string; status: string; contentBriefId?: string; clientId?: string }> {
  try {
    const res = await fetch(`/api/articles/${id}`);
    if (!res.ok) throw new Error('Failed to fetch article');
    return await res.json();
  } catch (error) {
    console.error('Error fetching article:', error);
    throw error;
  }
}

export async function updateArticleStatus(id: string, status: string): Promise<void> {
  try {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update article status');
  } catch (error) {
    console.error('Error updating article status:', error);
    throw error;
  }
}

// Subscribe to real-time article updates via Server-Sent Events
export function subscribeToArticle(
  id: string,
  onUpdate: (data: { id: string; article?: any }) => void,
): () => void {
  const es = new EventSource(`/api/articles/${id}/subscribe`);

  es.addEventListener('message', (evt) => {
    try {
      const data = JSON.parse(evt.data);
      onUpdate(data);
    } catch {}
  });

  // Optional ping handler
  es.addEventListener('ping', () => {});

  es.onerror = () => {
    // Let the browser auto-reconnect; could add backoff if desired
  };

  return () => {
    try { es.close(); } catch {}
  };
}

// Comment API functions
export interface Comment {
  id: string;
  articleId: string;
  author: string;
  initials: string;
  content: string;
  createdAt: string;
}

export async function fetchComments(articleId: string): Promise<Comment[]> {
  try {
    const res = await fetch(`/api/articles/${articleId}/comments`);
    if (!res.ok) throw new Error('Failed to fetch comments');
    return await res.json();
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
}

export async function createComment(articleId: string, comment: { author: string; initials: string; content: string }): Promise<Comment> {
  try {
    const res = await fetch(`/api/articles/${articleId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!res.ok) throw new Error('Failed to create comment');
    return await res.json();
  } catch (error) {
    console.error('Error creating comment:', error);
    throw error;
  }
}

export async function updateComment(id: string, comment: Partial<{ author: string; initials: string; content: string }>): Promise<Comment> {
  try {
    const res = await fetch(`/api/comments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(comment),
    });
    if (!res.ok) throw new Error('Failed to update comment');
    return await res.json();
  } catch (error) {
    console.error('Error updating comment:', error);
    throw error;
  }
}

export async function deleteComment(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/comments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete comment');
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}

// Clients API
export interface Client {
  id?: string;
  brandName: string;
  email: string; // Add this line
  tagline: string;
  mission: string;
  vision: string;
  coreValues: string[];
  brandPurpose: string;
  usp: string;
  logo: string;
  colorPalette: string[];
  typography: {
    primary: string;
    secondary: string;
  };
  brandImagery: string[];
  videoAudioBranding: string;
  brandVoice: string;
  tone: string;
  messagingPillars: string[];
  elevatorPitch: string;
  targetAudience: {
    primary: string;
    secondary: string;
    demographics: string;
  };
  locations: string[];
  marketPositioning: string;
  competitorAnalysis: string;
  customerJourney: string;
  website: string;
  socialMediaProfiles: {
    platform: string;
    url: string;
  }[];
  coreKeywordSilos: string[];
  contentStrategy: string;
  seoStrategy: string;
  adCopy: string[];
  socialCalendar: string;
  emailTemplates: string[];
  brandGuidelines: string;
  // WordPress connection fields
  wpSiteUrl?: string;
  // Application Password fields
  wpUsername?: string;
  wpAppPassword?: string;
  subscription?: {
    plan: string;
    monthlyCost: number;
    credits: number;
    usedCredits: number;
    nextBilling: string;
  };
}



export async function fetchClients(): Promise<Client[]> {
  const res = await fetch('/api/clients');
  if (!res.ok) throw new Error('Failed to fetch clients');
  return await res.json();
}

export async function createClient(payload: any): Promise<Client> {
  const res = await fetch('/api/clients', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('Failed to create client');
  return await res.json();
}

export async function updateClient(client: Client): Promise<Client> {
  try {
    const response = await fetch(`/api/clients/${client.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(client),
    });

    if (!response.ok) {
      throw new Error('Failed to update client');
    }

    return await response.json();
  } catch (error) {
    console.error('Error updating client:', error);
    throw error;
  }
}

export async function publishToClientWordpress(clientId: string, articleId: string): Promise<{ success: boolean; wpPostId?: string; wpLink?: string }>{
  const res = await fetch(`/api/clients/${clientId}/publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ articleId }),
  });
  if (!res.ok) throw new Error('Failed to publish');
  return await res.json();
}



export async function verifyWordPressConnection(clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/clients/${clientId}/verify-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Failed to verify connection');
    return await res.json();
  } catch (error) {
    console.error('Error verifying WordPress connection:', error);
    throw error;
  }
}

export async function fetchClientExcel(clientId: string): Promise<any[]> {
  const res = await fetch(`/api/clients/${clientId}/excel`);
  if (!res.ok) throw new Error('Failed to fetch client Excel data');
  const result = await res.json();
  return result.data || [];
}

// Automation API
export async function startClientAutomation(clientId: string): Promise<{ 
  success: boolean; 
  message: string; 
  jobCount: number; 
  batchId?: string; 
  workerStatus?: string;
  error?: string;
  requiresSchedule?: boolean;
  scheduleCount?: number;
  nextRunAt?: string;
  timeUntilNext?: number;
}> {
  const res = await fetch(`/api/automation/start/${clientId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to start automation');
  }
  
  return await res.json();
}

export async function startMultiClientAutomation(clientIds: string[]): Promise<{
  success: boolean;
  message: string;
  totalJobsEnqueued: number;
  results: Array<{
    clientId: string;
    success: boolean;
    jobCount?: number;
    batchId?: string;
    clientName?: string;
    error?: string;
    message?: string;
  }>;
  summary: {
    totalClients: number;
    successful: number;
    failed: number;
  };
  workerStatus?: string;
}> {
  const res = await fetch('/api/automation/start-multiple', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientIds })
  });
  
  if (!res.ok) {
    const errorData = await res.json();
    throw new Error(errorData.message || 'Failed to start multi-client automation');
  }
  
  return await res.json();
}

// Worker management API
export async function startAutomationWorker(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/automation/worker/start', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to start worker');
  return await res.json();
}

export async function stopAutomationWorker(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/automation/worker/stop', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error('Failed to stop worker');
  return await res.json();
}

export async function getWorkerStatus(): Promise<{ success: boolean; status: any; timestamp: string }> {
  const res = await fetch('/api/automation/worker/status');
  if (!res.ok) throw new Error('Failed to get worker status');
  return await res.json();
}

// Automation Schedule API
export async function getAutomationSchedules(clientId: string): Promise<{ success: boolean; schedules: any[]; clientId: string; clientName: string }> {
  const res = await fetch(`/api/automation/schedules/${clientId}`);
  if (!res.ok) throw new Error('Failed to get automation schedules');
  return await res.json();
}

export async function createAutomationSchedule(scheduleData: any): Promise<{ success: boolean; schedule: any; message: string }> {
  const res = await fetch('/api/automation/schedules', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData),
  });
  if (!res.ok) throw new Error('Failed to create automation schedule');
  return await res.json();
}

export async function updateAutomationSchedule(id: string, scheduleData: any): Promise<{ success: boolean; schedule: any; message: string }> {
  const res = await fetch(`/api/automation/schedules/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scheduleData),
  });
  if (!res.ok) throw new Error('Failed to update automation schedule');
  return await res.json();
}

export async function deleteAutomationSchedule(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/automation/schedules/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete automation schedule');
  return await res.json();
}

export async function pauseAutomationSchedule(id: string): Promise<{ success: boolean; schedule: any; message: string }> {
  const res = await fetch(`/api/automation/schedules/${id}/pause`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to pause automation schedule');
  return await res.json();
}

export async function resumeAutomationSchedule(id: string): Promise<{ success: boolean; schedule: any; message: string }> {
  const res = await fetch(`/api/automation/schedules/${id}/resume`, {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to resume automation schedule');
  return await res.json();
}

export async function getSchedulerStatus(): Promise<{ success: boolean; isRunning: boolean; timestamp: string }> {
  const res = await fetch('/api/automation/scheduler/status');
  if (!res.ok) throw new Error('Failed to get scheduler status');
  return await res.json();
}

export async function startScheduler(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/automation/scheduler/start', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to start scheduler');
  return await res.json();
}

export async function stopScheduler(): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/automation/scheduler/stop', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to stop scheduler');
  return await res.json();
}

export async function testScheduler(): Promise<{ success: boolean; message: string; activeSchedules: number; executedCount: number; currentTime: string }> {
  const res = await fetch('/api/automation/scheduler/test', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to test scheduler');
  return await res.json();
}

export async function getSchedulerDebugInfo(): Promise<{ 
  success: boolean; 
  currentTime: string; 
  schedulerRunning: boolean; 
  totalSchedules: number; 
  schedules: any[] 
}> {
  const res = await fetch('/api/automation/scheduler/debug');
  if (!res.ok) throw new Error('Failed to get scheduler debug info');
  return await res.json();
}
