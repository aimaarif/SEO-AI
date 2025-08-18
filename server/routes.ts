import type { Express, Response, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import cookieParser from "cookie-parser";
import { 
  insertUserSchema, 
  insertProjectSchema, 
  insertKeywordSchema, 
  insertContentBriefSchema, 
  insertArticleSchema, 
  insertDistributionSchema,
  insertCommentSchema,
  insertClientSchema
} from "@shared/schema";
import { encryptSecret, decryptSecret } from "./secure";

// Utility function to calculate optimal token usage
function calculateOptimalTokens(wordCount: string | undefined): number {
  if (!wordCount) return 3000; // Default fallback
  
  try {
    const wordCountMatch = wordCount.match(/(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)/);
    
    if (wordCountMatch) {
      const upperLimit = parseInt(wordCountMatch[2].replace(/,/g, ''));
      // Efficient token calculation: 1.2x word count + buffer for HTML markup
      return Math.min(Math.max(upperLimit * 1.2 + 300, 2000), 5000);
    }
  } catch (e) {
    console.log('Failed to parse word count, using default:', e);
  }
  
  return 3000; // Default fallback
}

interface SearchResult {
  title: string;
  snippet: string;
  link: string;
  volume?: number;
  difficulty?: number;
}

// Simple in-memory cache for keyword research results
const keywordCache = new Map<string, { volume: number; difficulty: number; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Performance monitoring
const performanceStats = {
  totalRequests: 0,
  averageTime: 0,
  cacheHits: 0,
  cacheMisses: 0
};

async function performKeywordResearch(keyword: string, apiKey: string): Promise<SearchResult[]> {
  const startTime = Date.now();
  performanceStats.totalRequests++;
  
  try {
    // Early fallback to mock data if no API key is provided
    if (!apiKey || apiKey === 'your-serp-api-key-here') {
      console.log('Using mock data for keyword research (no SERP API key provided)');
      const mockResults = generateMockSearchResults(keyword);
      updatePerformanceStats(startTime, true);
      return mockResults;
    }

    // Check cache first
    const cacheKey = `${keyword.toLowerCase()}_${apiKey}`;
    const cached = keywordCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
      console.log('Using cached keyword data for:', keyword);
      performanceStats.cacheHits++;
      const cachedResults = generateMockSearchResults(keyword).map(result => ({
        ...result,
        volume: cached.volume,
        difficulty: cached.difficulty
      }));
      updatePerformanceStats(startTime, true);
      return cachedResults;
    }
    performanceStats.cacheMisses++;

    // First, get organic search results (this is fast)
    const searchResponse = await axios.get('https://serpapi.com/search.json', {
      params: {
        q: keyword,
        api_key: apiKey,
        engine: 'google',
        num: 10
      },
      timeout: 10000 // 10 second timeout
    });

    const searchResults: SearchResult[] = [];

    if (searchResponse.data.organic_results) {
      // Get search results and extract potential keywords
      const organicResults = searchResponse.data.organic_results.slice(0, 10);
      
      // Get volume data for the main keyword with timeout
      let mainKeywordData: { volume: number; difficulty: number };
      try {
        mainKeywordData = await Promise.race([
          getKeywordVolumeData([keyword], apiKey),
          new Promise<{ volume: number; difficulty: number }>((_, reject) => 
            setTimeout(() => reject(new Error('Volume data timeout')), 15000)
          )
        ]);
        
        // Cache the result
        keywordCache.set(cacheKey, {
          ...mainKeywordData,
          timestamp: Date.now()
        });
      } catch (volumeError) {
        console.log('Volume data fetch failed or timed out, using estimation');
        mainKeywordData = estimateVolumeAndDifficulty(keyword);
      }
      
      for (const result of organicResults) {
        const title = result.title || '';
        
        // Use the main keyword's volume data as base, with some variation
        const volumeVariation = 0.8 + (Math.random() * 0.4); // ±20% variation
        const difficultyVariation = -10 + (Math.random() * 20); // ±10 variation
        
        searchResults.push({
          title,
          snippet: result.snippet || '',
          link: result.link || '',
          volume: Math.round(mainKeywordData.volume * volumeVariation),
          difficulty: Math.max(1, Math.min(100, mainKeywordData.difficulty + difficultyVariation))
        });
      }
    }

    const results = searchResults.length > 0 ? searchResults : generateMockSearchResults(keyword);
    updatePerformanceStats(startTime, false);
    return results;
  } catch (error) {
    console.error('SERP API error:', error);
    // Fallback to mock data if API fails
    console.log('Falling back to mock data due to API error');
    const mockResults = generateMockSearchResults(keyword);
    updatePerformanceStats(startTime, false);
    return mockResults;
  }
}

function updatePerformanceStats(startTime: number, isCached: boolean) {
  const duration = Date.now() - startTime;
  performanceStats.averageTime = (performanceStats.averageTime * (performanceStats.totalRequests - 1) + duration) / performanceStats.totalRequests;
  
  console.log(`Research completed in ${duration}ms (${isCached ? 'cached' : 'fresh'})`);
  console.log(`Performance stats: Avg=${Math.round(performanceStats.averageTime)}ms, Cache hit rate=${Math.round((performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses)) * 100)}%`);
}

function extractKeywordsFromTitle(title: string, originalKeyword: string): string[] {
  const keywords = [] as string[];
  keywords.push(originalKeyword);
  const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
  const words = title.toLowerCase().split(/\s+/).filter(word => 
    word.length > 2 && commonWords.indexOf(word) === -1 && !word.match(/^\d+$/)
  );
  if (words.length >= 2) {
    keywords.push(words.slice(0, 2).join(' '));
    if (words.length >= 3) {
      keywords.push(words.slice(0, 3).join(' '));
    }
  }
  const unique: string[] = [];
  for (let i = 0; i < keywords.length; i++) {
    const k = keywords[i];
    if (unique.indexOf(k) === -1) unique.push(k);
  }
  return unique;
}

async function getKeywordVolumeData(keywords: string[], apiKey: string): Promise<{ volume: number; difficulty: number }> {
  try {
    // Try multiple SERP API endpoints for volume data
    const keyword = keywords[0];
    
    // Method 1: Try Google Trends with shorter timeout and reduced data
    try {
      const trendsResponse = await Promise.race([
        axios.get('https://serpapi.com/search.json', {
          params: {
            q: keyword,
            api_key: apiKey,
            engine: 'google_trends',
            data_type: 'TIMESERIES',
            geo: 'US',
            date: 'now 7-d', // Reduced from 12-m to 7-d for faster response
            hl: 'en',
            tz: String(new Date().getTimezoneOffset())
          },
          timeout: 8000 // 8 second timeout
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Trends timeout')), 8000))
      ]) as any;

      if (
        trendsResponse.data &&
        trendsResponse.data.interest_over_time &&
        Array.isArray(trendsResponse.data.interest_over_time.timeline_data)
      ) {
        const volume = calculateVolumeFromTrends(
          trendsResponse.data.interest_over_time.timeline_data
        );
        const difficulty = calculateDifficultyFromVolume(volume);
        return { volume, difficulty };
      }
    } catch (trendsError) {
      console.log('Google Trends endpoint failed, trying autocomplete');
    }

    // Method 2: Try Google Autocomplete (usually faster than trends)
    try {
      const autocompleteResponse = await Promise.race([
        axios.get('https://serpapi.com/search.json', {
          params: {
            q: keyword,
            api_key: apiKey,
            engine: 'google_autocomplete'
          },
          timeout: 5000 // 5 second timeout
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Autocomplete timeout')), 5000))
      ]) as any;

      if (autocompleteResponse.data && autocompleteResponse.data.suggestions) {
        // Estimate volume based on autocomplete suggestions
        const suggestionCount = autocompleteResponse.data.suggestions.length;
        const volume = estimateVolumeFromSuggestions(keyword, suggestionCount);
        const difficulty = calculateDifficultyFromVolume(volume);
        return { volume, difficulty };
      }
    } catch (autocompleteError) {
      console.log('Google Autocomplete endpoint failed');
    }

    // Method 3: Try Google Shopping (fastest fallback)
    try {
      const shoppingResponse = await Promise.race([
        axios.get('https://serpapi.com/search.json', {
          params: {
            q: keyword,
            api_key: apiKey,
            engine: 'google_shopping'
          },
          timeout: 5000 // 5 second timeout
        }),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error('Shopping timeout')), 5000))
      ]) as any;

      if (shoppingResponse.data && shoppingResponse.data.shopping_results) {
        const resultCount = shoppingResponse.data.shopping_results.length;
        const volume = estimateVolumeFromShoppingResults(keyword, resultCount);
        const difficulty = calculateDifficultyFromVolume(volume);
        return { volume, difficulty };
      }
    } catch (shoppingError) {
      console.log('Google Shopping endpoint failed');
    }

  } catch (error) {
    console.log('All SERP API volume methods failed, using estimation');
  }

  // Fallback to estimation based on keyword characteristics
  return estimateVolumeAndDifficulty(keywords[0]);
}

function calculateVolumeFromTrends(trendsData: any[]): number {
  if (!trendsData || trendsData.length === 0) return 1000;

  // timeline_data entries look like:
  // { date, timestamp, values: [{ query, value: "63", extracted_value: 63 }] }
  const values: number[] = trendsData
    .map((point: any) => {
      if (typeof point?.extracted_value === 'number') return point.extracted_value;
      if (Array.isArray(point?.values) && point.values.length > 0) {
        const v = point.values[0];
        return typeof v?.extracted_value === 'number'
          ? v.extracted_value
          : typeof v?.value === 'number'
            ? v.value
            : parseInt(v?.value, 10) || 0;
      }
      if (typeof point?.value === 'number') return point.value;
      if (typeof point?.value === 'string') return parseInt(point.value, 10) || 0;
      return 0;
    })
    .filter((n: number) => Number.isFinite(n));

  if (values.length === 0) return 1000;

  const totalInterest = values.reduce((sum, n) => sum + n, 0);
  const averageInterest = totalInterest / values.length; // 0..100 scale

  // Approximate monthly volume from Trends score
  // This multiplier is heuristic and can be tuned per niche
  const estimated = Math.round(averageInterest * 120);
  return Math.max(100, estimated);
}

function estimateVolumeFromSuggestions(keyword: string, suggestionCount: number): number {
  // More suggestions = higher volume (more people searching for variations)
  const baseVolume = Math.max(1000, suggestionCount * 500);
  
  // Adjust based on keyword characteristics
  const wordCount = keyword.split(' ').length;
  if (wordCount === 1) return baseVolume * 3; // Single words have higher volume
  if (wordCount === 2) return baseVolume * 2; // Two-word phrases have medium volume
  return baseVolume; // Long-tail keywords have lower volume
}

function estimateVolumeFromShoppingResults(keyword: string, resultCount: number): number {
  // More shopping results = higher commercial intent and volume
  const baseVolume = Math.max(1000, resultCount * 200);
  
  // Commercial keywords typically have higher volume
  const hasCommercialTerms = /\b(buy|best|top|review|price|cost|cheap|discount|sale)\b/i.test(keyword);
  if (hasCommercialTerms) {
    return baseVolume * 1.5;
  }
  
  return baseVolume;
}

function calculateDifficultyFromVolume(volume: number): number {
  // Higher volume = lower difficulty (easier to rank for)
  if (volume > 10000) return Math.floor(Math.random() * 30) + 1; // Easy
  if (volume > 5000) return Math.floor(Math.random() * 40) + 20; // Medium
  if (volume > 1000) return Math.floor(Math.random() * 50) + 40; // Medium-Hard
  return Math.floor(Math.random() * 60) + 60; // Hard
}

function estimateVolumeAndDifficulty(keyword: string): { volume: number; difficulty: number } {
  // Estimate based on keyword characteristics
  const wordCount = keyword.split(' ').length;
  const hasNumbers = /\d/.test(keyword);
  const hasYear = /\b(2024|2025|2023)\b/.test(keyword);
  const hasActionWords = /\b(best|top|free|how|what|why|guide|tutorial|review)\b/i.test(keyword);
  
  let volume = 1000; // Base volume
  let difficulty = 50; // Base difficulty
  
  // Adjust based on characteristics
  if (wordCount === 1) {
    volume = Math.floor(Math.random() * 50000) + 10000; // High volume for single words
    difficulty = Math.floor(Math.random() * 80) + 60; // High difficulty
  } else if (wordCount === 2) {
    volume = Math.floor(Math.random() * 20000) + 5000; // Medium-high volume
    difficulty = Math.floor(Math.random() * 60) + 30; // Medium difficulty
  } else {
    volume = Math.floor(Math.random() * 10000) + 1000; // Lower volume for long-tail
    difficulty = Math.floor(Math.random() * 50) + 20; // Lower difficulty
  }
  
  // Adjust for specific patterns
  if (hasYear) volume += Math.floor(Math.random() * 5000);
  if (hasActionWords) volume += Math.floor(Math.random() * 3000);
  if (hasNumbers) volume += Math.floor(Math.random() * 2000);
  
  return { volume, difficulty };
}

function generateMockSearchResults(keyword: string): SearchResult[] {
  const mockTitles = [
    `Best ${keyword} in 2024`,
    `Top 10 ${keyword} Tools`,
    `How to Use ${keyword} Effectively`,
    `${keyword} Guide for Beginners`,
    `${keyword} vs Competitors`,
    `Advanced ${keyword} Techniques`,
    `${keyword} Best Practices`,
    `${keyword} Tutorial Step by Step`,
    `${keyword} Examples and Use Cases`,
    `${keyword} Tips and Tricks`
  ];

  return mockTitles.map((title, index) => {
    // Use the same estimation logic for mock data
    const keywordData = estimateVolumeAndDifficulty(keyword);
    
    return {
      title,
      snippet: `This is a sample snippet for ${title}. It provides useful information about ${keyword} and related topics.`,
      link: `https://example.com/${keyword.replace(/\s+/g, '-').toLowerCase()}-${index + 1}`,
      volume: keywordData.volume,
      difficulty: keywordData.difficulty
    };
  });
}

interface BriefData {
  title: string;
  keyPoints: string[];
  wordCount: string;
}

function generateMockBrief(targetKeyword: string, contentType: string, targetAudience?: string): BriefData {
  const contentTypeMap: Record<string, string> = {
    'how-to': 'How-to Guide',
    'list': 'List Article',
    'comparison': 'Comparison',
    'review': 'Review',
    'tutorial': 'Tutorial',
    'case-study': 'Case Study'
  };

  const contentTitle = contentTypeMap[contentType] || 'Article';
  const audienceText = targetAudience ? ` for ${targetAudience}` : '';

  const mockKeyPoints = [
    `What is ${targetKeyword} and why it matters`,
    `Key features and benefits of ${targetKeyword}`,
    `How to implement ${targetKeyword} effectively`,
    `Best practices and common pitfalls to avoid`,
    `Real-world examples and case studies`,
    `Future trends and developments in ${targetKeyword}`
  ];

  const wordCounts = ['1,500 - 2,000 words', '2,000 - 2,500 words', '2,500 - 3,000 words', '3,000 - 3,500 words'];
  const randomWordCount = wordCounts[Math.floor(Math.random() * wordCounts.length)];

  return {
    title: `The Complete ${contentTitle} to ${targetKeyword}${audienceText}`,
    keyPoints: mockKeyPoints,
    wordCount: randomWordCount
  };
}

async function generateBriefWithChatGPT(targetKeyword: string, contentType: string, apiKey: string, targetAudience?: string): Promise<BriefData> {
  try {
    const contentTypeMap: Record<string, string> = {
      'how-to': 'how-to guide',
      'list': 'list article',
      'comparison': 'comparison article',
      'review': 'review article',
      'tutorial': 'tutorial',
      'case-study': 'case study'
    };

    const contentTitle = contentTypeMap[contentType] || 'article';
    const audienceText = targetAudience ? ` for ${targetAudience}` : '';

    // Optimized prompt - more concise
    const prompt = `Brief for ${contentTitle}: "${targetKeyword}"${audienceText}

Return JSON:
{
  "title": "Title",
  "keyPoints": ["Point 1", "Point 2", "Point 3", "Point 4", "Point 5"],
  "wordCount": "2,000 - 2,500 words"
}`;

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'Content strategist. Create briefs in JSON format.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 350, // Further reduced
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 second timeout
    });

    const content = response.data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          title: parsed.title || `The Complete Guide to ${targetKeyword}`,
          keyPoints: parsed.keyPoints || [`Introduction to ${targetKeyword}`],
          wordCount: parsed.wordCount || '2,000 - 2,500 words'
        };
      }
    } catch (parseError) {
      console.log('Failed to parse JSON from ChatGPT response, using fallback');
    }

    return generateMockBrief(targetKeyword, contentType, targetAudience);
  } catch (error) {
    console.error('ChatGPT API error:', error);
    return generateMockBrief(targetKeyword, contentType, targetAudience);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable cookie parsing for OAuth token persistence
  app.use(cookieParser());
  
  // Resolve a usable project id. Maps placeholder "default-project" (or missing)
  // to a real test project belonging to a seeded test user.
  async function resolveProjectId(requested?: string): Promise<string> {
    if (requested && requested !== "default-project") return requested;
    // Ensure a test user exists
    let testUser = await storage.getUserByUsername('test-user');
    if (!testUser) {
      testUser = await storage.createUser({ username: 'test-user', password: 'test-password' });
    }
    // Ensure a project exists for the test user
    const existing = await storage.getProjects(testUser.id);
    if (existing && existing.length > 0) return existing[0].id;
    const created = await storage.createProject({
      userId: testUser.id,
      name: 'Test SEO Project',
      description: 'A test project for SEO automation'
    } as any);
    return created.id;
  }
  
  // Clients CRUD
  app.get("/api/clients", async (_req, res) => {
    try {
      const clients = await storage.getClients();
      // Do not expose secrets
      const sanitized = clients.map((c: any) => ({
        ...c,
        wpClientSecret: c.wpClientSecret ? "__encrypted__" : null,
        wpAppPassword: c.wpAppPassword ? "__encrypted__" : null,
        wpAccessToken: undefined,
        wpRefreshToken: undefined,
      }));
      res.json(sanitized);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const client = await storage.getClient(req.params.id);
      if (!client) return res.status(404).json({ error: "Client not found" });
      const sanitized: any = { ...client };
      
      // Sanitize sensitive fields
      if (sanitized.wpClientSecret) sanitized.wpClientSecret = "__encrypted__";
      if (sanitized.wpAppPassword) sanitized.wpAppPassword = "__encrypted__";
      delete sanitized.wpAccessToken;
      delete sanitized.wpRefreshToken;
      
      res.json(sanitized);
    } catch {
      res.status(500).json({ error: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      // Assign a default user if not provided (for now)
      const payload: any = { ...req.body };
      if (!payload.userId) {
        try {
          const user = await storage.getUserByUsername('test-user');
          if (user?.id) payload.userId = user.id;
        } catch {}
      }
      const data = insertClientSchema.parse(payload);
      const encrypted = { ...payload } as any;
      
      // Encrypt sensitive fields based on connection type
      if (encrypted.connectionType === 'oauth') {
        if (encrypted.wpClientSecret) encrypted.wpClientSecret = encryptSecret(encrypted.wpClientSecret);
        if (encrypted.wpAccessToken) encrypted.wpAccessToken = encryptSecret(encrypted.wpAccessToken);
        if (encrypted.wpRefreshToken) encrypted.wpRefreshToken = encryptSecret(encrypted.wpRefreshToken);
      } else if (encrypted.connectionType === 'application_password') {
        if (encrypted.wpAppPassword) encrypted.wpAppPassword = encryptSecret(encrypted.wpAppPassword);
      }
      
      const created = await storage.createClient(encrypted);
      const sanitized: any = { ...created };
      
      // Sanitize sensitive fields
      if (sanitized.wpClientSecret) sanitized.wpClientSecret = "__encrypted__";
      if (sanitized.wpAppPassword) sanitized.wpAppPassword = "__encrypted__";
      delete sanitized.wpAccessToken; 
      delete sanitized.wpRefreshToken;
      
      res.status(201).json(sanitized);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      // Allow partial updates
      const updateData = insertClientSchema.partial().parse(req.body);
      const payload = { ...updateData } as any;
      
      // Encrypt sensitive fields based on connection type
      if (payload.connectionType === 'oauth') {
        if (payload.wpClientSecret && payload.wpClientSecret !== "__encrypted__") payload.wpClientSecret = encryptSecret(payload.wpClientSecret);
        if (payload.wpAccessToken) payload.wpAccessToken = encryptSecret(payload.wpAccessToken);
        if (payload.wpRefreshToken) payload.wpRefreshToken = encryptSecret(payload.wpRefreshToken);
      } else if (payload.connectionType === 'application_password') {
        if (payload.wpAppPassword && payload.wpAppPassword !== "__encrypted__") payload.wpAppPassword = encryptSecret(payload.wpAppPassword);
      }
      
      const updated = await storage.updateClient(req.params.id, payload);
      const sanitized: any = { ...updated };
      
      // Sanitize sensitive fields
      if (sanitized.wpClientSecret) sanitized.wpClientSecret = "__encrypted__";
      if (sanitized.wpAppPassword) sanitized.wpAppPassword = "__encrypted__";
      delete sanitized.wpAccessToken; 
      delete sanitized.wpRefreshToken;
      
      res.json(sanitized);
    } catch (error) {
      res.status(400).json({ error: "Invalid client data" });
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      await storage.deleteClient(req.params.id);
      res.status(204).send();
    } catch {
      res.status(500).json({ error: "Failed to delete client" });
    }
  });
  // Removed legacy global WordPress OAuth routes. Use per-client routes exclusively.

  // Multi-client WordPress OAuth: start auth for a specific client
  app.get("/auth/wordpress/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { articleId } = req.query as { articleId?: string };
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (!client.wpClientId || !client.wpRedirectUri) {
        return res.status(400).json({ error: "Client is missing OAuth credentials" });
      }
      const state = encodeURIComponent(JSON.stringify({ clientId, articleId }));
      const authUrl = `https://public-api.wordpress.com/oauth2/authorize?client_id=${encodeURIComponent(
        client.wpClientId
      )}&redirect_uri=${encodeURIComponent(client.wpRedirectUri)}&response_type=code&state=${state}&scope=${encodeURIComponent('global')}`;
      return res.redirect(authUrl);
    } catch (error) {
      console.error("/auth/wordpress/:clientId error:", error);
      res.status(500).json({ error: "Failed to start client OAuth" });
    }
  });

  // Fallback OAuth callback without clientId: extract from state and redirect to per-client handler
  app.get("/oauth/callback", async (req, res) => {
    try {
      const { state } = req.query as { state?: string };
      let clientId: string | undefined;
      try {
        if (state && typeof state === 'string') {
          const parsed = JSON.parse(state);
          if (parsed && typeof parsed.clientId === 'string') {
            clientId = parsed.clientId;
          }
        }
      } catch {}
      if (!clientId && typeof (req.query as any).clientId === 'string') {
        clientId = (req.query as any).clientId as string;
      }
      if (!clientId) {
        return res.status(400).json({ error: "Missing clientId in OAuth state" });
      }
      const params = new URLSearchParams(req.query as any).toString();
      const destination = `/oauth/callback/${encodeURIComponent(clientId)}${params ? `?${params}` : ''}`;
      return res.redirect(destination);
    } catch (error) {
      console.error("/oauth/callback (no clientId) error:", error);
      return res.status(500).json({ error: "Failed to route OAuth callback" });
    }
  });

  // Handle legacy or generic redirect path "/callback" by forwarding to per-client handler
  app.get("/callback", async (req, res) => {
    try {
      const { state } = req.query as { state?: string };
      let clientId: string | undefined;
      try {
        if (state && typeof state === 'string') {
          const parsed = JSON.parse(state);
          if (parsed && typeof parsed.clientId === 'string') {
            clientId = parsed.clientId;
          }
        }
      } catch {}
      if (!clientId && typeof (req.query as any).clientId === 'string') {
        clientId = (req.query as any).clientId as string;
      }
      if (!clientId) {
        return res.status(400).json({ error: "Missing clientId in OAuth state" });
      }
      const params = new URLSearchParams(req.query as any).toString();
      const destination = `/oauth/callback/${encodeURIComponent(clientId)}${params ? `?${params}` : ''}`;
      return res.redirect(destination);
    } catch (error) {
      console.error("/callback alias error:", error);
      return res.status(500).json({ error: "Failed to route WordPress callback" });
    }
  });

  // OAuth callback per client
  app.get("/oauth/callback/:clientId", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { code, state } = req.query as { code?: string; state?: string };
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (!code) return res.status(400).json({ error: "Missing authorization code" });
      if (!client.wpClientId || !client.wpClientSecret || !client.wpRedirectUri) {
        return res.status(400).json({ error: "Client is missing OAuth credentials" });
      }
      const body = new URLSearchParams();
      body.append("client_id", client.wpClientId);
      body.append("client_secret", decryptSecret(client.wpClientSecret));
      body.append("redirect_uri", client.wpRedirectUri);
      body.append("code", code);
      body.append("grant_type", "authorization_code");

      const tokenResp = await axios.post(
        "https://public-api.wordpress.com/oauth2/token",
        body.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
      );

      const accessToken = tokenResp.data?.access_token as string | undefined;
      const refreshToken = tokenResp.data?.refresh_token as string | undefined;
      const expiresIn = tokenResp.data?.expires_in as number | undefined;
      const tokenExpiry = expiresIn ? new Date(Date.now() + (expiresIn - 60) * 1000) : undefined;

      try {
        console.log("OAuth callback token exchange:", {
          clientId,
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken,
          expiresIn,
          tokenExpiryISO: tokenExpiry ? tokenExpiry.toISOString() : null,
        });
      } catch {}

      await storage.updateClient(clientId, {
        wpAccessToken: accessToken ? encryptSecret(accessToken) : undefined,
        wpRefreshToken: refreshToken ? encryptSecret(refreshToken) : undefined,
        tokenExpiry,
      } as any);

      let articleId: string | undefined;
      try {
        if (state && typeof state === 'string') {
          const parsed = JSON.parse(state);
          articleId = parsed?.articleId;
        }
      } catch {}

      // Redirect to approval page, preserving articleId if present
      const redirect = `/approval${articleId ? `?articleId=${encodeURIComponent(articleId)}` : ''}`;
      res.redirect(redirect);
    } catch (error) {
      console.error("/oauth/callback/:clientId error:", error);
      res.status(500).json({ error: "Failed to complete client OAuth" });
    }
  });

  async function ensureValidClientToken(clientId: string): Promise<{ accessToken: string; client: any }> {
    const client = await storage.getClient(clientId);
    if (!client) throw new Error("Client not found");
    if (!client.wpAccessToken) throw new Error("Client not connected to WordPress");
    const now = new Date();
    const tokenExpiry = client.tokenExpiry ? new Date(client.tokenExpiry) : undefined;
    // If token expiry known and still valid, use it
    if (tokenExpiry && tokenExpiry.getTime() > now.getTime()) {
      return { accessToken: decryptSecret(client.wpAccessToken), client };
    }
    // If no expiry recorded, assume current access token is valid
    if (!tokenExpiry) {
      return { accessToken: decryptSecret(client.wpAccessToken), client };
    }
    // Otherwise, attempt to refresh
    if (!client.wpRefreshToken || !client.wpClientId || !client.wpClientSecret) {
      throw new Error("Missing refresh credentials");
    }
    try { console.log("Refreshing WordPress token for client", clientId); } catch {}
    const body = new URLSearchParams();
    body.append("client_id", client.wpClientId);
    body.append("client_secret", decryptSecret(client.wpClientSecret));
    body.append("grant_type", "refresh_token");
    body.append("refresh_token", decryptSecret(client.wpRefreshToken));

    const tokenResp = await axios.post(
      "https://public-api.wordpress.com/oauth2/token",
      body.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" }, timeout: 15000 }
    );
    const newAccess = tokenResp.data?.access_token as string | undefined;
    const newRefresh = tokenResp.data?.refresh_token as string | undefined;
    const expiresIn = tokenResp.data?.expires_in as number | undefined;
    const tokenExpiryNew = expiresIn ? new Date(Date.now() + (expiresIn - 60) * 1000) : undefined;
    await storage.updateClient(clientId, {
      wpAccessToken: newAccess ? encryptSecret(newAccess) : undefined,
      wpRefreshToken: newRefresh ? encryptSecret(newRefresh) : undefined,
      tokenExpiry: tokenExpiryNew,
    } as any);
    return { accessToken: newAccess || decryptSecret(client.wpAccessToken), client: await storage.getClient(clientId) };
  }

  // Explicit token refresh endpoint
  app.post("/api/clients/:clientId/refresh-token", async (req, res) => {
    try {
      const { clientId } = req.params;
      const { accessToken } = await ensureValidClientToken(clientId);
      res.json({ success: true, accessToken: !!accessToken });
    } catch (e: any) {
      res.status(400).json({ error: e?.message || "Failed to refresh token" });
    }
  });

  // Verify WordPress connection credentials
  app.post("/api/clients/:clientId/verify-connection", async (req, res) => {
    try {
      const { clientId } = req.params;
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (!client.wpSiteUrl) return res.status(400).json({ error: "WordPress site URL is required" });

      let isValid = false;
      let error = "";

      if (client.connectionType === 'oauth') {
        try {
          const { accessToken } = await ensureValidClientToken(clientId);
          // Test the connection by making a simple API call
          const response = await axios.get(`${client.wpSiteUrl}/wp-json/wp/v2/users/me`, {
            headers: { Authorization: `Bearer ${accessToken}` },
            timeout: 10000
          });
          isValid = response.status === 200;
        } catch (e: any) {
          error = e?.message || "OAuth connection failed";
        }
      } else if (client.connectionType === 'application_password') {
        if (!client.wpUsername || !client.wpAppPassword) {
          return res.status(400).json({ error: "Username and application password are required" });
        }
        
        try {
          const credentials = Buffer.from(`${client.wpUsername}:${decryptSecret(client.wpAppPassword)}`).toString('base64');
          const response = await axios.get(`${client.wpSiteUrl}/wp-json/wp/v2/users/me`, {
            headers: { Authorization: `Basic ${credentials}` },
            timeout: 10000
          });
          isValid = response.status === 200;
        } catch (e: any) {
          error = e?.message || "Application password authentication failed";
        }
      } else {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      res.json({ success: isValid, error: isValid ? "" : error });
    } catch (e: any) {
      res.status(500).json({ error: e?.message || "Failed to verify connection" });
    }
  });

  // Publish article to client's WordPress
  app.post("/api/clients/:clientId/publish", async (req, res) => {
    try {
      const { clientId } = req.params as { clientId: string };
      const { articleId } = req.body as { articleId?: string };
      if (!articleId) return res.status(400).json({ error: "articleId is required" });
      
      const client = await storage.getClient(clientId);
      if (!client) return res.status(404).json({ error: "Client not found" });
      if (!client.wpSiteUrl) return res.status(400).json({ error: "Client is missing WordPress site URL" });
      
      const article = await storage.getArticle(articleId);
      if (!article) return res.status(404).json({ error: "Article not found" });

      // Normalize and select endpoint
      let siteUrlRaw: string = String(client.wpSiteUrl).trim();
      if (!/^https?:\/\//i.test(siteUrlRaw)) {
        siteUrlRaw = `https://${siteUrlRaw}`;
      }
      let endpoint: string;
      try {
        const siteUrl = new URL(siteUrlRaw);
        const hostname = siteUrl.hostname;
        if (/\.wordpress\.com$/i.test(hostname)) {
          // Use WordPress.com REST API when site is hosted on wordpress.com
          endpoint = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(hostname)}/posts`;
        } else {
          // Self-hosted site
          endpoint = `${siteUrl.origin.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
        }
      } catch (e) {
        console.error("Invalid wpSiteUrl for client", clientId, client.wpSiteUrl, e);
        return res.status(400).json({ error: "Invalid WordPress site URL configured for client" });
      }

      const payload = { title: article.title, content: article.content, status: "draft" };
      let headers: any = { "Content-Type": "application/json" };
      
      // Set up authentication based on connection type
      if (client.connectionType === 'oauth') {
        const { accessToken } = await ensureValidClientToken(clientId);
        headers.Authorization = `Bearer ${accessToken}`;
      } else if (client.connectionType === 'application_password') {
        if (!client.wpUsername || !client.wpAppPassword) {
          return res.status(400).json({ error: "Username and application password are required" });
        }
        const credentials = Buffer.from(`${client.wpUsername}:${decryptSecret(client.wpAppPassword)}`).toString('base64');
        headers.Authorization = `Basic ${credentials}`;
      } else {
        return res.status(400).json({ error: "Invalid connection type" });
      }

      try { console.log("Publishing draft to:", endpoint, "for client", clientId, "using", client.connectionType); } catch {}
      const postResp = await axios.post(endpoint, payload, {
        headers,
        timeout: 15000,
      });

      const wpPostId = postResp.data?.id;
      const wpLink = postResp.data?.link || postResp.data?.guid?.rendered || '';

      // Mark article as approved and record distribution
      try {
        const updated = await storage.updateArticle(articleId, { status: 'approved' } as any);
        try { broadcastArticleUpdate(articleId, { id: articleId, article: { status: 'approved' } }); } catch {}
        try {
          await storage.createDistribution({
            articleId: articleId,
            clientId: clientId,
            platform: 'wordpress',
            platformId: String(wpPostId || ''),
            status: 'pending',
            publishedAt: new Date(),
          } as any);
        } catch {}
        try {
          await storage.createActivity({
            type: 'article_approved',
            title: `Article approved: ${updated.title}`,
            description: 'Draft created on WordPress',
            articleId,
            clientId,
            metadata: { wpPostId, link: wpLink, connectionType: client.connectionType }
          } as any);
        } catch {}
      } catch {}

      res.json({ success: true, wpPostId, wpLink });
    } catch (error: any) {
      console.error("Publish error:", error?.response?.data || error);
      const message = error?.message || (error?.response?.data?.message) || "Failed to publish article";
      res.status(500).json({ error: message });
    }
  });


  // In-memory SSE subscribers per article id
  const articleSubscribers = new Map<string, Set<Response>>();

  function broadcastArticleUpdate(articleId: string, payload: unknown) {
    const subs = articleSubscribers.get(articleId);
    if (!subs || subs.size === 0) return;
    const data = `data: ${JSON.stringify(payload)}\n\n`;
    subs.forEach((res) => {
      try {
        res.write(data);
      } catch {}
    });
  }
  
  function getUTCTimestamp(): string {
    return new Date().toISOString(); // This ensures UTC timestamps
  }

  // Subscribe to article updates via Server-Sent Events
  app.get("/api/articles/:id/subscribe", (req, res) => {
    const { id } = req.params;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    // Register subscriber
    if (!articleSubscribers.has(id)) {
      articleSubscribers.set(id, new Set());
    }
    const subs = articleSubscribers.get(id)!;
    subs.add(res);

    // Send a comment to open the stream and an initial ping
    res.write(": connected\n\n");
    res.write("event: ping\n");
    res.write("data: {}\n\n");

    // Keep-alive ping (some proxies/timeouts ~30s)
    const ping = setInterval(() => {
      try {
        res.write("event: ping\n");
        res.write("data: {}\n\n");
      } catch {}
    }, 25000);

    req.on("close", () => {
      clearInterval(ping);
      const set = articleSubscribers.get(id);
      if (set) {
        set.delete(res);
        if (set.size === 0) articleSubscribers.delete(id);
      }
      try { res.end(); } catch {}
    });
  });
  // User routes
  app.get("/api/users/:id", async (req, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      res.status(400).json({ error: "Invalid user data" });
    }
  });

  // Project routes
  app.get("/api/projects", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: "userId is required" });
      }
      const projects = await storage.getProjects(userId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const project = await storage.getProject(req.params.id);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const projectData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const updateData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(req.params.id, updateData);
      res.json(project);
    } catch (error) {
      res.status(400).json({ error: "Invalid project data" });
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      await storage.deleteProject(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Keyword routes
  app.get("/api/keywords", async (req, res) => {
    try {
      const { projectId } = req.query;
      if (!projectId || typeof projectId !== 'string') {
        return res.status(400).json({ error: "projectId is required" });
      }
      const keywords = await storage.getKeywords(projectId);
      res.json(keywords);
    } catch (error) {
      console.error("Error fetching keywords:", error);
      // Return empty array if database is unavailable
      res.json([]);
    }
  });

  app.get("/api/keywords/:id", async (req, res) => {
    try {
      const keyword = await storage.getKeyword(req.params.id);
      if (!keyword) {
        return res.status(404).json({ error: "Keyword not found" });
      }
      res.json(keyword);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/keywords", async (req, res) => {
    try {
      const keywordData = insertKeywordSchema.parse(req.body);
      const keyword = await storage.createKeyword(keywordData);
      res.status(201).json(keyword);
    } catch (error) {
      res.status(400).json({ error: "Invalid keyword data" });
    }
  });

  app.put("/api/keywords/:id", async (req, res) => {
    try {
      const updateData = insertKeywordSchema.partial().parse(req.body);
      const keyword = await storage.updateKeyword(req.params.id, updateData);
      res.json(keyword);
    } catch (error) {
      res.status(400).json({ error: "Invalid keyword data" });
    }
  });

  app.delete("/api/keywords/:id", async (req, res) => {
    try {
      await storage.deleteKeyword(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Keyword Research endpoint using SERP API
  app.post("/api/keywords/research", async (req, res) => {
    try {
      const { keyword, projectId } = req.body;
      
      if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({ error: "Keyword is required" });
      }

      // Resolve to a valid project id (maps placeholder to a real seeded project)
      const finalProjectId = await resolveProjectId(projectId);

      const serpApiKey = process.env.SERP_API_KEY || "your-serp-api-key-here";

      // Call SERP API to get search results
      const searchResults = await performKeywordResearch(keyword, serpApiKey);
      
      try {
        // Save results to database
        const savedKeywords = await Promise.all(
          searchResults.map(async (result) => {
            const keywordData = {
              projectId: finalProjectId,
              keyword: result.title,
              searchVolume: result.volume || 0,
              difficulty: result.difficulty || 50,
              status: "researched"
            };
            return await storage.createKeyword(keywordData);
          })
        );

        // Record activity
        try {
          await storage.createActivity({
            type: 'keyword_researched',
            title: `Keyword research completed for "${keyword}"`,
            description: `Found ${savedKeywords.length} high-potential keywords`,
            projectId: finalProjectId,
            createdAt: getUTCTimestamp(),
            metadata: { input: keyword, count: savedKeywords.length }
          } as any);
        } catch {}

        res.json({
          success: true,
          keyword,
          results: savedKeywords,
          count: savedKeywords.length,
          performance: {
            cacheHitRate: Math.round((performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses)) * 100),
            averageTime: Math.round(performanceStats.averageTime)
          }
        });
      } catch (dbError) {
        console.error("Database error:", dbError);
        // Return the search results even if database save fails
        const payload = {
          success: true,
          keyword,
          results: searchResults.map((result, index) => ({
            id: `temp-${index}`,
            projectId: finalProjectId,
            keyword: result.title,
            searchVolume: result.volume || 0,
            difficulty: result.difficulty || 50,
            status: "researched",
            createdAt: new Date().toISOString()
          })),
          count: searchResults.length,
          warning: "Results saved to memory only (database unavailable)",
          performance: {
            cacheHitRate: Math.round((performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses)) * 100),
            averageTime: Math.round(performanceStats.averageTime)
          }
        };

        try {
          await storage.createActivity({
            type: 'keyword_researched',
            title: `Keyword research completed for "${keyword}"`,
            description: `Found ${searchResults.length} high-potential keywords`,
            projectId: finalProjectId,
            metadata: { input: keyword, count: searchResults.length }
          } as any);
        } catch {}

        res.json(payload);
      }
    } catch (error) {
      console.error("Keyword research error:", error);
      res.status(500).json({ error: "Failed to perform keyword research" });
    }
  });

  // Performance monitoring endpoint
  app.get("/api/performance", (req, res) => {
    res.json({
      keywordResearch: {
        totalRequests: performanceStats.totalRequests,
        averageTime: Math.round(performanceStats.averageTime),
        cacheHits: performanceStats.cacheHits,
        cacheMisses: performanceStats.cacheMisses,
        cacheHitRate: Math.round((performanceStats.cacheHits / (performanceStats.cacheHits + performanceStats.cacheMisses)) * 100)
      }
    });
  });

  // Setup endpoint for testing - creates a test project and keyword
  app.post("/api/setup-test", async (req, res) => {
    try {
      // Create a test user if not exists
      let testUser = await storage.getUserByUsername('test-user');
      if (!testUser) {
        testUser = await storage.createUser({
          username: 'test-user',
          password: 'test-password'
        });
      }

      // Create a test project if not exists
      let testProject = await storage.getProjects(testUser.id);
      if (testProject.length === 0) {
        testProject = [await storage.createProject({
          userId: testUser.id,
          name: 'Test SEO Project',
          description: 'A test project for SEO automation'
        })];
      }

      // Create a test keyword if not exists
      const testKeywords = await storage.getKeywords(testProject[0].id);
      if (testKeywords.length === 0) {
        const testKeyword = await storage.createKeyword({
          projectId: testProject[0].id,
          keyword: 'test keyword',
          searchVolume: 1000,
          difficulty: 50,
          status: 'researched'
        });
        return res.json({
          success: true,
          keywordId: testKeyword.id,
          projectId: testProject[0].id,
          userId: testUser.id
        });
      }

      return res.json({
        success: true,
        keywordId: testKeywords[0].id,
        projectId: testProject[0].id,
        userId: testUser.id
      });
    } catch (error) {
      console.error('Setup test error:', error);
      res.status(500).json({ error: "Failed to setup test data" });
    }
  });

  // Keyword Metrics endpoint for getting volume and difficulty data
  app.post("/api/keywords/metrics", async (req, res) => {
    try {
      const { keywords } = req.body;
      
      if (!keywords || !Array.isArray(keywords)) {
        return res.status(400).json({ error: "Keywords array is required" });
      }

      const serpApiKey = process.env.SERP_API_KEY || "your-serp-api-key-here";
      const metrics = [];

      for (const keyword of keywords) {
        try {
          const keywordData = await getKeywordVolumeData([keyword], serpApiKey);
          metrics.push({
            keyword,
            volume: keywordData.volume,
            difficulty: keywordData.difficulty
          });
        } catch (error) {
          console.error(`Error getting metrics for keyword "${keyword}":`, error);
          // Use estimation as fallback
          const estimatedData = estimateVolumeAndDifficulty(keyword);
          metrics.push({
            keyword,
            volume: estimatedData.volume,
            difficulty: estimatedData.difficulty
          });
        }
      }

      res.json({
        success: true,
        metrics
      });
    } catch (error) {
      console.error("Keyword metrics error:", error);
      res.status(500).json({ error: "Failed to get keyword metrics" });
    }
  });

  // Content Brief routes
  app.get("/api/content-briefs", async (req, res) => {
    try {
      const { keywordId } = req.query;
      const briefs = await storage.getContentBriefs(keywordId as string);
      res.json(briefs);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/content-briefs/:id", async (req, res) => {
    try {
      const brief = await storage.getContentBrief(req.params.id);
      if (!brief) {
        return res.status(404).json({ error: "Content brief not found" });
      }
      res.json(brief);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/content-briefs", async (req, res) => {
    try {
      const briefData = insertContentBriefSchema.parse(req.body);
      const brief = await storage.createContentBrief(briefData);
      res.status(201).json(brief);
    } catch (error) {
      res.status(400).json({ error: "Invalid content brief data" });
    }
  });

  app.put("/api/content-briefs/:id", async (req, res) => {
    try {
      const updateData = insertContentBriefSchema.partial().parse(req.body);
      const brief = await storage.updateContentBrief(req.params.id, updateData);
      res.json(brief);
    } catch (error) {
      res.status(400).json({ error: "Invalid content brief data" });
    }
  });

  app.delete("/api/content-briefs/:id", async (req, res) => {
    try {
      await storage.deleteContentBrief(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Article routes
  app.get("/api/articles", async (req, res) => {
    try {
      const { contentBriefId } = req.query;
      const articles = await storage.getArticles(contentBriefId as string);
      res.json(articles);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/articles/:id", async (req, res) => {
    try {
      const article = await storage.getArticle(req.params.id);
      if (!article) {
        return res.status(404).json({ error: "Article not found" });
      }
      res.json(article);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/articles", async (req, res) => {
    try {
      const articleData = insertArticleSchema.parse(req.body);
      const article = await storage.createArticle(articleData);
      res.status(201).json(article);
    } catch (error) {
      res.status(400).json({ error: "Invalid article data" });
    }
  });

  app.put("/api/articles/:id", async (req, res) => {
    try {
      const updateData = insertArticleSchema.partial().parse(req.body);
      const article = await storage.updateArticle(req.params.id, updateData);
      // Broadcast update to SSE subscribers
      try {
        broadcastArticleUpdate(req.params.id, { id: req.params.id, article });
      } catch {}
      res.json(article);
    } catch (error) {
      res.status(400).json({ error: "Invalid article data" });
    }
  });

  app.delete("/api/articles/:id", async (req, res) => {
    try {
      await storage.deleteArticle(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Comment routes
  app.get("/api/articles/:articleId/comments", async (req, res) => {
    try {
      const comments = await storage.getComments(req.params.articleId);
      res.json(comments);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/articles/:articleId/comments", async (req, res) => {
    try {
      const commentData = insertCommentSchema.parse({
        ...req.body,
        articleId: req.params.articleId
      });
      const comment = await storage.createComment(commentData);
      res.status(201).json(comment);
    } catch (error) {
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.put("/api/comments/:id", async (req, res) => {
    try {
      const updateData = insertCommentSchema.partial().parse(req.body);
      const comment = await storage.updateComment(req.params.id, updateData);
      res.json(comment);
    } catch (error) {
      res.status(400).json({ error: "Invalid comment data" });
    }
  });

  app.delete("/api/comments/:id", async (req, res) => {
    try {
      await storage.deleteComment(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Distribution routes
  app.get("/api/distributions", async (req, res) => {
    try {
      const { articleId } = req.query;
      const distributions = await storage.getDistributions(articleId as string);
      res.json(distributions);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/distributions/:id", async (req, res) => {
    try {
      const distribution = await storage.getDistribution(req.params.id);
      if (!distribution) {
        return res.status(404).json({ error: "Distribution not found" });
      }
      res.json(distribution);
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/distributions", async (req, res) => {
    try {
      const distributionData = insertDistributionSchema.parse(req.body);
      const distribution = await storage.createDistribution(distributionData);
      try {
        if (distribution.status === 'published') {
          await storage.createActivity({
            type: 'article_published',
            title: `Article published to ${distribution.platform}`,
            description: 'Publishing complete',
            articleId: distribution.articleId,
            clientId: distribution.clientId || undefined,
            metadata: { platformId: distribution.platformId, platform: distribution.platform }
          } as any);
        }
      } catch {}
      res.status(201).json(distribution);
    } catch (error) {
      res.status(400).json({ error: "Invalid distribution data" });
    }
  });

  app.put("/api/distributions/:id", async (req, res) => {
    try {
      const updateData = insertDistributionSchema.partial().parse(req.body);
      const distribution = await storage.updateDistribution(req.params.id, updateData);
      try {
        if (distribution.status === 'published') {
          await storage.createActivity({
            type: 'article_published',
            title: `Article published to ${distribution.platform}`,
            description: 'Publishing complete',
            articleId: distribution.articleId,
            clientId: distribution.clientId || undefined,
            metadata: { platformId: distribution.platformId, platform: distribution.platform }
          } as any);
        }
      } catch {}
      res.json(distribution);
    } catch (error) {
      res.status(400).json({ error: "Invalid distribution data" });
    }
  });

  app.delete("/api/distributions/:id", async (req, res) => {
    try {
      await storage.deleteDistribution(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // AI Content Brief Generation routes
  app.post("/api/generate-brief", async (req, res) => {
    try {
      const { targetKeyword, contentType, targetAudience, keywordId, clientId } = req.body;
      
      if (!targetKeyword || !contentType) {
        return res.status(400).json({ error: "Target keyword and content type are required" });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      let briefData;
      
      if (!openaiApiKey || openaiApiKey === 'your-openai-api-key-here') {
        briefData = generateMockBrief(targetKeyword, contentType, targetAudience);
      } else {
        briefData = await generateBriefWithChatGPT(targetKeyword, contentType, openaiApiKey, targetAudience);
      }

      // Save to database if keywordId is provided
      if (keywordId) {
        const dbBriefData = {
          keywordId,
          clientId: clientId || null,
          title: briefData.title,
          outline: briefData.keyPoints,
          targetAudience: targetAudience || null,
          tone: 'professional',
          wordCount: briefData.wordCount ? parseInt(briefData.wordCount.match(/\d+/)?.[0] || '2000') : 2000,
          status: 'draft'
        };
        
        const savedBrief = await storage.createContentBrief(dbBriefData);

        // Record activity
        try {
          let projectId: string | undefined;
          try {
            const kw = await storage.getKeyword(keywordId);
            projectId = kw?.projectId;
          } catch {}
          await storage.createActivity({
            type: 'brief_generated',
            title: `Content brief generated for "${briefData.title}"`,
            description: 'Ready for review',
            projectId,
            clientId: clientId || undefined,
            keywordId,
            contentBriefId: savedBrief.id,
            metadata: { targetKeyword, contentType }
          } as any);
        } catch {}
        return res.json({
          ...briefData,
          id: savedBrief.id,
          keywordId: savedBrief.keywordId,
          clientId: savedBrief.clientId
        });
      }

      // Return without saving if no keywordId provided
      res.json(briefData);
    } catch (error) {
      console.error('Error generating brief:', error);
      res.status(500).json({ error: "Failed to generate brief" });
    }
  });

  app.put("/api/edit-brief/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const edits = req.body;
      
      // For now, just return the edited data
      // In a real app, you'd save this to the database
      res.json(edits);
    } catch (error) {
      console.error('Error editing brief:', error);
      res.status(500).json({ error: "Failed to edit brief" });
    }
  });

  app.post("/api/generate-article", async (req, res) => {
    try {
      const { title, keyPoints, targetAudience, wordCount, contentBriefId, clientId } = req.body as { 
        title: string; 
        keyPoints: string[]; 
        targetAudience?: string; 
        wordCount?: string;
        contentBriefId?: string;
        clientId?: string;
      };
      if (!title || !Array.isArray(keyPoints) || keyPoints.length === 0) {
        return res.status(400).json({ error: "title and keyPoints are required" });
      }

      const openaiApiKey = process.env.OPENAI_API_KEY;
      let articleContent;
      
      if (!openaiApiKey || openaiApiKey === 'your-openai-api-key-here') {
        // Mock article HTML preserving theme
        articleContent = `
          <p class="text-muted-foreground leading-relaxed mb-4">This is a mock article generated without an API key. Add OPENAI_API_KEY to generate real content.</p>
          ${keyPoints.map((kp, i) => `<h2 class=\"text-2xl font-semibold mt-6 mb-3\">${i+1}. ${kp}</h2><p class=\"text-muted-foreground leading-relaxed\">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>`).join('')}
        `;
      } else {

        // Calculate max_tokens more efficiently
        let maxTokens = calculateOptimalTokens(wordCount);
        console.log(`Using max_tokens: ${maxTokens}`);

        // Optimized system message - concise but effective
        const systemMessage = `Content writer. Generate articles matching word count. Use HTML h2/h3 headings. Output clean HTML.`;

        // Streamlined user prompt - remove redundancy
        const sectionBullets = keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join("\n");
        const audienceText = targetAudience ? `Audience: ${targetAudience}.` : '';
        const wordCountText = wordCount ? `Words: ${wordCount}.` : '';
        
        const userPrompt = `Article: "${title}"

${audienceText}
${wordCountText}

Outline:
${sectionBullets}

Use h2/h3 headings, paragraphs. Keep professional tone. Include examples. Length: ${wordCount || '2000-3000 words'}.`;

        // Log token usage for monitoring
        const estimatedInputTokens = systemMessage.length / 4 + userPrompt.length / 4;
        console.log(`Estimated input tokens: ~${Math.round(estimatedInputTokens)}`);
        console.log(`Total estimated cost: ~${Math.round((estimatedInputTokens + maxTokens) / 1000 * 0.002)} USD`);

        const completion = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-3.5-turbo',
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: maxTokens
        }, {
          headers: {
            Authorization: `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        });

        articleContent = completion.data.choices?.[0]?.message?.content || '';
        
        // Validate word count
        if (wordCount && articleContent) {
          const actualWordCount = articleContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim().split(/\s+/).filter((word: string) => word.length > 0).length;
          const targetRange = wordCount.match(/(\d{1,3}(?:,\d{3})*)\s*-\s*(\d{1,3}(?:,\d{3})*)/);
          
          if (targetRange) {
            const minWords = parseInt(targetRange[1].replace(/,/g, ''));
            const maxWords = parseInt(targetRange[2].replace(/,/g, ''));
            
            console.log(`Generated article: ${actualWordCount} words, Target: ${minWords}-${maxWords} words`);
            
            if (actualWordCount < minWords) {
              console.log(`WARNING: Generated article is too short. Expected: ${minWords}-${maxWords}, Got: ${actualWordCount}`);
            }
          }
        }
      }

      // Save to database if contentBriefId is provided
      if (contentBriefId) {
        const dbArticleData = {
          contentBriefId,
          clientId: clientId || null,
          title,
          content: articleContent,
          seoScore: null,
          status: 'draft'
        };
        
        const savedArticle = await storage.createArticle(dbArticleData);

        // Record activity
        try {
          let projectId: string | undefined;
          try {
            const brief = await storage.getContentBrief(contentBriefId);
            if (brief?.keywordId) {
              const kw = await storage.getKeyword(brief.keywordId);
              projectId = kw?.projectId;
            }
          } catch {}
          await storage.createActivity({
            type: 'article_generated',
            title: `Draft article created: ${title}`,
            description: 'Draft is ready for review',
            projectId,
            clientId: clientId || undefined,
            contentBriefId,
            articleId: savedArticle.id,
            metadata: { wordCount }
          } as any);
        } catch {}
        return res.json({ 
          title, 
          content: articleContent,
          id: savedArticle.id,
          contentBriefId: savedArticle.contentBriefId,
          clientId: savedArticle.clientId
        });
      }

      // Return without saving if no contentBriefId provided
      return res.json({ title, content: articleContent });
    } catch (error: any) {
      console.error('Error generating article:', error);
      
      // Better error handling with specific error messages
      if (error.response?.status === 400) {
        console.error('OpenAI API 400 error details:', error.response.data);
        return res.status(400).json({ 
          error: 'Invalid request to OpenAI API. Please check your API key and try again.' 
        });
      }
      
      if (error.response?.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid OpenAI API key. Please check your configuration.' 
        });
      }
      
      if (error.response?.status === 429) {
        return res.status(429).json({ 
          error: 'Rate limit exceeded. Please try again later.' 
        });
      }
      
      res.status(500).json({ error: 'Failed to generate article. Please try again.' });
    }
  });

  // Email sending endpoint
  app.post("/api/send-article-email", async (req, res) => {
    try {
      const { email, title, content, articleId: providedArticleId } = req.body as { email?: string; title?: string; content?: string; articleId?: string };
      if (!email || !title || !content) {
        return res.status(400).json({ error: "email, title and content are required" });
      }

      // Lazy import to avoid loading nodemailer unless needed
      const { sendArticleEmail } = await import("./mailer");

      // Prefer provided database article id; otherwise generate a unique fallback id
      const articleId = providedArticleId || `article_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const subject = `Your Article: ${title}`;

      // Debug: Log the CLIENT_URL being used
      console.log('CLIENT_URL from env:', process.env.CLIENT_URL);
      console.log('Using CLIENT_URL:', process.env.CLIENT_URL || 'http://localhost:5000');

      // Force the CLIENT_URL to be localhost:5000 for now
      const clientUrl = 'http://localhost:5000';

      // Resolve clientId for email approval links
      let clientIdForEmail: string | undefined;
      try {
        if (providedArticleId) {
          const articleFromDb = await storage.getArticle(providedArticleId);
          clientIdForEmail = (articleFromDb as any)?.clientId || undefined;
          console.log(`[EMAIL SEND] Client ID from article: ${clientIdForEmail || 'not found'}`);
          
          if (!clientIdForEmail && (articleFromDb as any)?.contentBriefId) {
            const brief = await storage.getContentBrief((articleFromDb as any).contentBriefId);
            clientIdForEmail = (brief as any)?.clientId || undefined;
            console.log(`[EMAIL SEND] Client ID from brief: ${clientIdForEmail || 'not found'}`);
            
            if (!clientIdForEmail && (brief as any)?.keywordId) {
              const kw = await storage.getKeyword((brief as any).keywordId);
              clientIdForEmail = (kw as any)?.clientId || undefined;
              console.log(`[EMAIL SEND] Client ID from keyword: ${clientIdForEmail || 'not found'}`);
            }
          }
        }
      } catch (error) {
        console.error(`[EMAIL SEND] Error resolving client ID:`, error);
      }

      // Fallback: if exactly one client exists in DB, use it
      if (!clientIdForEmail) {
        try {
          const allClients = await storage.getClients();
          if (Array.isArray(allClients) && allClients.length === 1) {
            clientIdForEmail = allClients[0].id;
            console.log(`[EMAIL SEND] Fallback to single client in DB: ${clientIdForEmail}`);
          } else {
            console.log(`[EMAIL SEND] No single-client fallback available. Clients count: ${allClients?.length ?? 0}`);
          }
        } catch (e) {
          console.error(`[EMAIL SEND] Failed to load clients for fallback:`, e);
        }
      }

      // Use server URL for direct email approval endpoints
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
      
      // Create email approval URLs with client ID if available
      const approveHref = clientIdForEmail
        ? `${serverUrl}/api/email/approve/${articleId}?clientId=${encodeURIComponent(clientIdForEmail)}`
        : `${serverUrl}/api/email/approve/${articleId}`;
      
      const requestChangesHref = `${serverUrl}/api/email/request-changes/${articleId}`;
      const rejectHref = `${serverUrl}/api/email/reject/${articleId}`;
      
      console.log(`[EMAIL SEND] Email approval URLs:`, {
        approve: approveHref,
        requestChanges: requestChangesHref,
        reject: rejectHref,
        clientId: clientIdForEmail
      });

      const html = `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          <h1 style="font-size: 20px; margin: 0 0 16px 0;">${title}</h1>
          <div>${content}</div>
          <div style="margin-top:24px; padding:16px; background:#f6f6f6; border-radius:8px;">
            <p style="margin:0 0 12px 0; font-size:14px; color:#555;">Actions</p>
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <a href="${approveHref}" 
                 style="display: inline-block; width: 100%; padding: 12px 16px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 500;">
                ✓ Approve & Publish
              </a>
              <a href="${requestChangesHref}" 
                 style="display: inline-block; width: 100%; padding: 12px 16px; background-color: #ca8a04; color: white; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 500;">
                ✏ Request Changes
              </a>
              <a href="${rejectHref}" 
                 style="display: inline-block; width: 100%; padding: 12px 16px; background-color: #dc2626; color: white; text-decoration: none; border-radius: 6px; text-align: center; font-weight: 500;">
                ✗ Reject Article
              </a>
            </div>
          </div>
        </div>
      `;

      await sendArticleEmail({ to: email, subject, html });

      // Record activity
      try {
        let projectId: string | undefined;
        let contentBriefId: string | undefined;
        try {
          if (providedArticleId) {
            const article = await storage.getArticle(providedArticleId);
            if (article) {
              contentBriefId = article.contentBriefId;
              const brief = await storage.getContentBrief(article.contentBriefId);
              if (brief?.keywordId) {
                const kw = await storage.getKeyword(brief.keywordId);
                projectId = kw?.projectId;
              }
            }
          }
        } catch {}
        await storage.createActivity({
          type: 'article_sent_for_approval',
          title: `Article sent for approval: ${title}`,
          description: `Approval email sent to ${email}`,
          projectId,
          articleId: providedArticleId,
          contentBriefId,
          metadata: { email }
        } as any);
      } catch {}

      res.json({ success: true, articleId });
    } catch (error) {
      console.error("Failed to send article email:", error);
      res.status(500).json({ error: "Failed to send email" });
    }
  });

  // Activities feed
  app.get("/api/activities", async (req, res) => {
    try {
      const { projectId, limit } = req.query as { projectId?: string; limit?: string };
      const items = await storage.getActivities({ projectId, limit: limit ? parseInt(limit, 10) : undefined });
      res.json(items);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      res.status(500).json({ error: 'Failed to fetch activities' });
    }
  });

  // Email approval endpoints - Direct publishing from email
  app.get("/api/email/approve/:articleId", async (req, res) => {
    try {
      console.log(`[EMAIL APPROVAL] Starting approval process for article: ${req.params.articleId}`);
      
      const { articleId } = req.params;
      const { clientId } = req.query as { clientId?: string };
      
      console.log(`[EMAIL APPROVAL] Article ID: ${articleId}, Client ID: ${clientId || 'not provided'}`);
      
      // Get article from database
      const article = await storage.getArticle(articleId);
      if (!article) {
        console.error(`[EMAIL APPROVAL] Article not found: ${articleId}`);
        return res.status(404).json({ error: "Article not found" });
      }
      
      console.log(`[EMAIL APPROVAL] Found article: ${article.title}`);
      
      // Determine which client to use
      let targetClientId = clientId;
      if (!targetClientId) {
        // Try to get clientId from article
        targetClientId = (article as any)?.clientId;
        console.log(`[EMAIL APPROVAL] Client ID from article: ${targetClientId || 'not found'}`);
        
        if (!targetClientId && (article as any)?.contentBriefId) {
          // Try to get clientId from content brief
          try {
            const brief = await storage.getContentBrief((article as any).contentBriefId);
            targetClientId = (brief as any)?.clientId;
            console.log(`[EMAIL APPROVAL] Client ID from brief: ${targetClientId || 'not found'}`);
          } catch (briefError) {
            console.error(`[EMAIL APPROVAL] Error getting brief:`, briefError);
          }
        }
      }

      // Fallback: if still missing, and there is exactly one client in DB, use it
      if (!targetClientId) {
        try {
          const allClients = await storage.getClients();
          if (Array.isArray(allClients) && allClients.length === 1) {
            targetClientId = allClients[0].id;
            console.log(`[EMAIL APPROVAL] Fallback to single client in DB: ${targetClientId}`);
          } else {
            console.log(`[EMAIL APPROVAL] No single-client fallback available. Clients count: ${allClients?.length ?? 0}`);
          }
        } catch (e) {
          console.error(`[EMAIL APPROVAL] Failed to load clients for fallback:`, e);
        }
      }
      
      if (!targetClientId) {
        console.error(`[EMAIL APPROVAL] No client ID found for article: ${articleId}`);
        // Redirect to client selection page for multi-client setups
        const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
        const selectorUrl = `${serverUrl}/api/email/approve/${encodeURIComponent(articleId)}/select-client`;
        console.log(`[EMAIL APPROVAL] Redirecting to client selection: ${selectorUrl}`);
        return res.redirect(selectorUrl);
      }
      
      console.log(`[EMAIL APPROVAL] Using client ID: ${targetClientId}`);
      
      // Get client details
      const client = await storage.getClient(targetClientId);
      if (!client) {
        console.error(`[EMAIL APPROVAL] Client not found: ${targetClientId}`);
        return res.status(404).json({ error: "Client not found" });
      }
      
      console.log(`[EMAIL APPROVAL] Found client: ${client.brandName}, Connection type: ${client.connectionType}`);
      
      if (!client.wpSiteUrl) {
        console.error(`[EMAIL APPROVAL] Client missing WordPress site URL: ${targetClientId}`);
        return res.status(400).json({ error: "Client is missing WordPress site URL" });
      }
      
      // Check if client has proper credentials
      if (client.connectionType === 'oauth' && !client.wpAccessToken) {
        console.error(`[EMAIL APPROVAL] Client missing OAuth token: ${targetClientId}`);
        return res.status(400).json({ 
          error: "Client needs to reconnect to WordPress. Please contact support." 
        });
      }
      
      if (client.connectionType === 'application_password' && (!client.wpUsername || !client.wpAppPassword)) {
        console.error(`[EMAIL APPROVAL] Client missing app password credentials: ${targetClientId}`);
        return res.status(400).json({ 
          error: "Client is missing WordPress credentials. Please contact support." 
        });
      }
      
      console.log(`[EMAIL APPROVAL] Client credentials validated, proceeding with publishing`);
      
      // Normalize and select endpoint
      let siteUrlRaw: string = String(client.wpSiteUrl).trim();
      if (!/^https?:\/\//i.test(siteUrlRaw)) {
        siteUrlRaw = `https://${siteUrlRaw}`;
      }
      
      let endpoint: string;
      try {
        const siteUrl = new URL(siteUrlRaw);
        const hostname = siteUrl.hostname;
        if (/\.wordpress\.com$/i.test(hostname)) {
          endpoint = `https://public-api.wordpress.com/wp/v2/sites/${encodeURIComponent(hostname)}/posts`;
        } else {
          endpoint = `${siteUrl.origin.replace(/\/$/, '')}/wp-json/wp/v2/posts`;
        }
        console.log(`[EMAIL APPROVAL] Using endpoint: ${endpoint}`);
      } catch (e) {
        console.error(`[EMAIL APPROVAL] Invalid wpSiteUrl for client ${targetClientId}:`, client.wpSiteUrl, e);
        return res.status(400).json({ error: "Invalid WordPress site URL configured for client" });
      }
      
      const payload = { title: article.title, content: article.content, status: "draft" };
      let headers: any = { "Content-Type": "application/json" };
      
      // Set up authentication based on connection type
      if (client.connectionType === 'oauth') {
        try {
          const { accessToken } = await ensureValidClientToken(targetClientId);
          headers.Authorization = `Bearer ${accessToken}`;
          console.log(`[EMAIL APPROVAL] Using OAuth token for client: ${targetClientId}`);
        } catch (tokenError) {
          console.error(`[EMAIL APPROVAL] OAuth token error for client ${targetClientId}:`, tokenError);
          return res.status(400).json({ 
            error: "Client needs to reconnect to WordPress. Please contact support." 
          });
        }
      } else if (client.connectionType === 'application_password') {
        const credentials = Buffer.from(`${client.wpUsername}:${decryptSecret(client.wpAppPassword || '')}`).toString('base64');
        headers.Authorization = `Basic ${credentials}`;
        console.log(`[EMAIL APPROVAL] Using app password for client: ${targetClientId}`);
      } else {
        console.error(`[EMAIL APPROVAL] Invalid connection type: ${client.connectionType}`);
        return res.status(400).json({ error: "Invalid connection type" });
      }
      
      console.log(`[EMAIL APPROVAL] Publishing to WordPress...`);
      const postResp = await axios.post(endpoint, payload, {
        headers,
        timeout: 15000,
      });
      
      const wpPostId = postResp.data?.id;
      const wpLink = postResp.data?.link || postResp.data?.guid?.rendered || '';
      
      console.log(`[EMAIL APPROVAL] Successfully published to WordPress. Post ID: ${wpPostId}, Link: ${wpLink}`);
      
      // Mark article as approved and record distribution
      try {
        const updated = await storage.updateArticle(articleId, { status: 'approved' } as any);
        console.log(`[EMAIL APPROVAL] Article status updated to approved`);
        
        try { 
          broadcastArticleUpdate(articleId, { id: articleId, article: { status: 'approved' } }); 
          console.log(`[EMAIL APPROVAL] Article update broadcasted`);
        } catch (broadcastError) {
          console.error(`[EMAIL APPROVAL] Broadcast error:`, broadcastError);
        }
        
        try {
          await storage.createDistribution({
            articleId: articleId,
            clientId: targetClientId,
            platform: 'wordpress',
            platformId: String(wpPostId || ''),
            status: 'pending',
            publishedAt: new Date(),
          } as any);
          console.log(`[EMAIL APPROVAL] Distribution record created`);
        } catch (distError) {
          console.error(`[EMAIL APPROVAL] Distribution creation error:`, distError);
        }
        
        try {
          await storage.createActivity({
            type: 'article_approved',
            title: `Article approved via email: ${updated.title}`,
            description: 'Draft created on WordPress via email approval',
            articleId,
            clientId: targetClientId,
            metadata: { wpPostId, link: wpLink, connectionType: client.connectionType, approvedVia: 'email' }
          } as any);
          console.log(`[EMAIL APPROVAL] Activity record created`);
        } catch (activityError) {
          console.error(`[EMAIL APPROVAL] Activity creation error:`, activityError);
        }
      } catch (dbError) {
        console.error(`[EMAIL APPROVAL] Database update error:`, dbError);
      }
      
      // Redirect to success page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const successUrl = `${clientUrl}/approval?status=approved&articleId=${articleId}&wpPostId=${wpPostId}&wpLink=${encodeURIComponent(wpLink || '')}&approvedVia=email`;
      
      console.log(`[EMAIL APPROVAL] Redirecting to: ${successUrl}`);
      res.redirect(successUrl);
      
    } catch (error: any) {
      console.error(`[EMAIL APPROVAL] Error:`, error?.response?.data || error);
      const message = error?.message || (error?.response?.data?.message) || "Failed to approve and publish article";
      
      // Redirect to error page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const errorUrl = `${clientUrl}/approval?error=${encodeURIComponent(message)}&articleId=${req.params.articleId}`;
      
      console.error(`[EMAIL APPROVAL] Redirecting to error page: ${errorUrl}`);
      res.redirect(errorUrl);
    }
  });

  // Simple client selection page for email approvals in multi-client setups
  app.get("/api/email/approve/:articleId/select-client", async (req, res) => {
    try {
      const { articleId } = req.params;
      const allClients = await storage.getClients();

      if (!Array.isArray(allClients) || allClients.length === 0) {
        return res.status(400).send(`<html><body><h2>No clients configured</h2><p>Please add a client in Settings and try again.</p></body></html>`);
      }

      // Render a minimal HTML selection page (no framework dependency)
      const serverUrl = process.env.SERVER_URL || 'http://localhost:5000';
      const clientOptions = allClients.map((c) => {
        const href = `${serverUrl}/api/email/approve/${encodeURIComponent(articleId)}?clientId=${encodeURIComponent(c.id)}`;
        const connection = c.connectionType === 'oauth' ? 'OAuth' : (c.connectionType === 'application_password' ? 'App Password' : 'Unknown');
        return `<li style="margin:8px 0;"><a href="${href}" style="display:inline-block;padding:10px 14px;border-radius:6px;background:#111;color:#fff;text-decoration:none;">Approve & Publish as ${escapeHtml(c.brandName || 'Client')} (${connection})</a></li>`;
      }).join('');

      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Select Client</title>
  </head>
  <body style="font-family: Arial, sans-serif; background:#0b0b0b; color:#e5e7eb; padding:24px;">
    <div style="max-width:640px;margin:0 auto;">
      <h1 style="margin:0 0 16px 0;">Select Client to Publish</h1>
      <p style="margin:0 0 16px 0;color:#9ca3af;">Multiple clients are configured. Choose which client’s WordPress to publish this article to.</p>
      <ul style="list-style:none;padding:0;margin:0;">${clientOptions}</ul>
      <p style="margin-top:24px;color:#9ca3af;">Article ID: ${escapeHtml(articleId)}</p>
    </div>
  </body>
  <script>
    // No JS needed; pure links
  </script>
</html>`;

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.status(200).send(html);
    } catch (error) {
      console.error('[EMAIL APPROVAL] Client selection render error:', error);
      return res.status(500).send('<html><body><h2>Failed to render client selection.</h2></body></html>');
    }
  });

  function escapeHtml(input) {
    try {
      return String(input)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    } catch {
      return '';
    }
  }

  app.get("/api/email/request-changes/:articleId", async (req, res) => {
    try {
      console.log(`[EMAIL REQUEST CHANGES] Starting request changes process for article: ${req.params.articleId}`);
      
      const { articleId } = req.params;
      
      // Get article from database
      const article = await storage.getArticle(articleId);
      if (!article) {
        console.error(`[EMAIL REQUEST CHANGES] Article not found: ${articleId}`);
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Update article status
      await storage.updateArticle(articleId, { status: 'changes-requested' } as any);
      console.log(`[EMAIL REQUEST CHANGES] Article status updated to changes-requested`);
      
      // Record activity
      try {
        await storage.createActivity({
          type: 'article_changes_requested',
          title: `Changes requested via email: ${article.title}`,
          description: 'Article changes requested via email',
          articleId,
          metadata: { requestedVia: 'email' }
        } as any);
        console.log(`[EMAIL REQUEST CHANGES] Activity record created`);
      } catch (activityError) {
        console.error(`[EMAIL REQUEST CHANGES] Activity creation error:`, activityError);
      }
      
      // Redirect to approval page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const redirectUrl = `${clientUrl}/approval?status=changes-requested&articleId=${articleId}&requestedVia=email`;
      
      console.log(`[EMAIL REQUEST CHANGES] Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
      
    } catch (error: any) {
      console.error(`[EMAIL REQUEST CHANGES] Error:`, error);
      const message = error?.message || "Failed to request changes";
      
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const errorUrl = `${clientUrl}/approval?error=${encodeURIComponent(message)}&articleId=${req.params.articleId}`;
      
      res.redirect(errorUrl);
    }
  });

  app.get("/api/email/reject/:articleId", async (req, res) => {
    try {
      console.log(`[EMAIL REJECT] Starting reject process for article: ${req.params.articleId}`);
      
      const { articleId } = req.params;
      
      // Get article from database
      const article = await storage.getArticle(articleId);
      if (!article) {
        console.error(`[EMAIL REJECT] Article not found: ${articleId}`);
        return res.status(404).json({ error: "Article not found" });
      }
      
      // Update article status
      await storage.updateArticle(articleId, { status: 'rejected' } as any);
      console.log(`[EMAIL REJECT] Article status updated to rejected`);
      
      // Record activity
      try {
        await storage.createActivity({
          type: 'article_rejected',
          title: `Article rejected via email: ${article.title}`,
          description: 'Article rejected via email',
          articleId,
          metadata: { rejectedVia: 'email' }
        } as any);
        console.log(`[EMAIL REJECT] Activity record created`);
      } catch (activityError) {
        console.error(`[EMAIL REJECT] Activity creation error:`, activityError);
      }
      
      // Redirect to approval page
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const redirectUrl = `${clientUrl}/approval?status=rejected&articleId=${articleId}&rejectedVia=email`;
      
      console.log(`[EMAIL REJECT] Redirecting to: ${redirectUrl}`);
      res.redirect(redirectUrl);
      
    } catch (error: any) {
      console.error(`[EMAIL REJECT] Error:`, error);
      const message = error?.message || "Failed to reject article";
      
      const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
      const errorUrl = `${clientUrl}/approval?error=${encodeURIComponent(message)}&articleId=${req.params.articleId}`;
      
      res.redirect(errorUrl);
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
