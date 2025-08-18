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

export async function sendArticleEmail(data: { email: string; title: string; content: string; articleId?: string }): Promise<{ success: boolean; articleId: string }> {
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
  connectionType?: 'oauth' | 'application_password';
  wpSiteUrl?: string;
  // OAuth fields
  wpClientId?: string;
  wpClientSecret?: string;
  wpRedirectUri?: string;
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

export function startClientWordpressOAuth(clientId: string, articleId?: string) {
  const qs = articleId ? `?articleId=${encodeURIComponent(articleId)}` : '';
  window.location.href = `/auth/wordpress/${encodeURIComponent(clientId)}${qs}`;
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
