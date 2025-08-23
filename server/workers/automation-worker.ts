import { Worker, Job } from 'bullmq';
import { redis } from '../queue/redis.js';
import { fileURLToPath } from 'url';
import { 
  automationQueue, 
  briefQueue, 
  articleQueue, 
  approvalQueue, 
  publishingQueue,
  QUEUE_NAMES,
  JOB_TYPES,
  type ExcelRowJobData,
  type BriefJobData,
  type ArticleJobData,
  type ApprovalJobData,
  type PublishingJobData
} from '../queue/queues.js';
import { storage } from '../storage.js';
import { db } from '../db.js';
import { clientExcels } from '../../shared/schema.js';
import { eq } from 'drizzle-orm';
import axios from 'axios';

// Configuration
const WORKER_CONFIG = {
  concurrency: 1, // Process one job at a time for sequential processing
  removeOnComplete: { count: 100 },
  removeOnFail: { count: 50 },
};

// API endpoints (should come from environment variables)
const API_BASE_URL = process.env.SERVER_URL || 'http://localhost:5000';

export class AutomationWorker {
  private worker: Worker;
  private isRunning = false;

  constructor() {
    this.worker = new Worker(
      QUEUE_NAMES.AUTOMATION,
      this.processJob.bind(this),
      {
        connection: redis,
        concurrency: WORKER_CONFIG.concurrency,
        removeOnComplete: WORKER_CONFIG.removeOnComplete,
        removeOnFail: WORKER_CONFIG.removeOnFail,
      }
    );

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.worker.on('completed', (job) => {
      console.log(`✅ Job completed: ${job.id} - ${job.name}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`❌ Job failed: ${job?.id} - ${job?.name}`, err);
      
      // Update row status to 'failed' if job fails
      if (job && job.data) {
        this.updateRowStatus(job.data.rowId, 'failed').catch(console.error);
      }
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`⚠️ Job stalled: ${jobId}`);
    });

    this.worker.on('error', (err) => {
      console.error('❌ Worker error:', err);
    });

    // Add more detailed event handlers for debugging
    this.worker.on('active', (job) => {
      console.log(`🔄 Job started: ${job.id} - ${job.name}`);
    });

    this.worker.on('progress', (job, progress) => {
      console.log(`📊 Job progress: ${job.id} - ${progress}%`);
    });
  }

  /**
   * Main job processing function
   */
  private async processJob(job: Job): Promise<void> {
    const { name, data } = job;
    console.log(`🔄 Processing job: ${name} for row: ${data.rowId}`);
    console.log(`📋 Job data:`, JSON.stringify(data, null, 2));

    try {
      switch (name) {
        case JOB_TYPES.PROCESS_EXCEL_ROW:
          console.log(`✅ Processing Excel row job`);
          await this.processExcelRow(data as ExcelRowJobData);
          break;
        default:
          console.log(`❌ Unknown job type: ${name}`);
          throw new Error(`Unknown job type: ${name}`);
      }
    } catch (error) {
      console.error(`❌ Failed to process job ${name}:`, error);
      throw error; // Re-throw to trigger retry logic
    }
  }

  /**
   * Process a single Excel row through the entire automation workflow
   */
  private async processExcelRow(data: ExcelRowJobData): Promise<void> {
    const { clientId, rowId, keyword, contentType, targetAudience, batchId } = data;
    
    console.log(`📝 Starting automation for row ${rowId}: ${keyword}`);
    
    try {
      // Step 1: Generate content brief
      console.log(`📋 Step 1: Generating brief for "${keyword}"`);
      const brief = await this.generateBrief(keyword, contentType, targetAudience, clientId || undefined);
      
      if (!brief) {
        throw new Error('Failed to generate content brief');
      }

      // Step 2: Generate article from brief
      console.log(`📄 Step 2: Generating article from brief`);
      const article = await this.generateArticle(brief, targetAudience, clientId);
      
      if (!article) {
        throw new Error('Failed to generate article');
      }

    
      // Validate article has required fields
      if (!article.id && !article._id) {
        console.error(`❌ Article missing ID field. Available fields:`, Object.keys(article));
        throw new Error('Generated article missing ID field');
      }

      const articleId = article.id || article._id;
      console.log(`🆔 Using article ID: ${articleId}`);

      // Step 3: Send for approval
      console.log(`✉️ Step 3: Sending article for approval`);
      if (!clientId) {
        throw new Error('Client ID is required for sending approval');
      }
      const approvalResult = await this.sendForApproval(clientId, articleId, article.title, article.content);
      
      if (!approvalResult.success) {
        throw new Error('Failed to send article for approval');
      }

      // Update row status to 'pending_approval' (not 'done' since it needs manual approval)
      await this.updateRowStatus(rowId, 'pending_approval');
      
      console.log(`✅ Automation completed successfully for row ${rowId}: ${keyword} - Article sent for approval`);
      
      // Record success activity
      if (clientId) {
        await this.recordActivity('automation_completed', `Automation completed for: ${keyword} - Article sent for approval`, clientId, {
          rowId,
          keyword,
          contentType,
          targetAudience,
          batchId,
          articleId: article.id,
          status: 'pending_approval'
        });
      }

    } catch (error) {
      console.error(`❌ Automation failed for row ${rowId}:`, error);
      
      // Update row status to 'failed'
      await this.updateRowStatus(rowId, 'failed');
      
      // Record failure activity
      if (clientId) {
        await this.recordActivity('automation_failed', `Automation failed for: ${keyword}`, clientId, {
          rowId,
          keyword,
          contentType,
          targetAudience,
          batchId,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      throw error;
    }
  }

  /**
   * Generate content brief using the existing API
   */
  private async generateBrief(keyword: string, contentType: string, targetAudience?: string, clientId?: string): Promise<any> {
    try {
      // For automation, we need to create a temporary keyword record to get a keywordId
      // This allows us to save the brief to the database and get an ID
      
      // First, ensure we have a project for automation
      const projectId = await this.getOrCreateAutomationProject();
      
      const tempKeyword = await storage.createKeyword({
        projectId: projectId,
        keyword: keyword,
        searchVolume: 0,
        difficulty: 0,
        cpc: 0,
        status: 'draft'
      } as any);

      const response = await axios.post(`${API_BASE_URL}/api/generate-brief`, {
        targetKeyword: keyword,
        contentType,
        targetAudience,
        keywordId: tempKeyword.id,
        clientId: clientId || undefined
      }, {
        timeout: 60000 // Increased to 1 minute for brief generation
      });

      if (response.data && response.data.title && response.data.id) {
        return response.data;
      }
      
      throw new Error('Invalid brief response');
    } catch (error) {
      console.error('❌ Brief generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate article from brief using the existing API
   */
  private async generateArticle(brief: any, targetAudience?: string, clientId?: string): Promise<any> {
    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-article`, {
        title: brief.title,
        keyPoints: brief.keyPoints || brief.outline,
        targetAudience,
        wordCount: brief.wordCount || '2,000 - 2,500 words',
        contentBriefId: brief.id, // This will save the article to the database
        clientId
      }, {
        timeout: 180000 // Increased to 2 minutes for longer article generation
      });

      if (response.data && response.data.content && response.data.id) {
        return response.data;
      }
      
      throw new Error('Invalid article response');
    } catch (error) {
      console.error('❌ Article generation failed:', error);
      throw error;
    }
  }

  /**
   * Send article for approval using the existing API
   */
  private async sendForApproval(clientId: string, articleId: string, title: string, content: string): Promise<{ success: boolean }> {
    try {
      // Get client email
      const client = await storage.getClient(clientId);
      if (!client || !client.email) {
        throw new Error('Client email not found');
      }

      const response = await axios.post(`${API_BASE_URL}/api/send-article-email`, {
        email: client.email,
        title,
        content,
        articleId,
        clientId
      }, {
        timeout: 30000
      });

      return { success: response.data.success === true };
    } catch (error) {
      console.error('❌ Send for approval failed:', error);
      throw error;
    }
  }



  /**
   * Update the automation status of a specific row
   */
  private async updateRowStatus(rowId: string, status: 'processing' | 'done' | 'failed' | 'pending_approval'): Promise<void> {
    try {
      await db.update(clientExcels)
        .set({ automation: status })
        .where(eq(clientExcels.id, rowId));
      
      console.log(`🔄 Updated row ${rowId} status to: ${status}`);
    } catch (error) {
      console.error(`❌ Failed to update row ${rowId} status:`, error);
    }
  }

  /**
   * Get or create an automation project for storing temporary keywords
   */
  private async getOrCreateAutomationProject(): Promise<string> {
    try {
      // First, try to find an existing automation project
      const projects = await storage.getProjects('automation-user');
      
      if (projects && projects.length > 0) {
        return projects[0].id;
      }
      
      // Create a test user for automation if it doesn't exist
      let testUser = await storage.getUserByUsername('automation-user');
      if (!testUser) {
        testUser = await storage.createUser({ 
          username: 'automation-user', 
          password: 'automation-password' 
        });
      }
      
      // Create an automation project
      const project = await storage.createProject({
        userId: testUser.id,
        name: 'SEO Automation Project',
        description: 'Automated SEO content generation project'
      } as any);
      
      return project.id;
    } catch (error) {
      console.error('❌ Failed to get or create automation project:', error);
      throw error;
    }
  }

  /**
   * Record activity for tracking
   */
  private async recordActivity(type: string, title: string, clientId: string, metadata: any): Promise<void> {
    try {
      await storage.createActivity({
        type,
        title,
        description: 'Automated workflow execution',
        clientId,
        metadata
      } as any);
    } catch (error) {
      console.error('❌ Failed to record activity:', error);
    }
  }

  /**
   * Start the worker
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Worker is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Automation worker started');
    console.log(`⚙️ Configuration: concurrency=${WORKER_CONFIG.concurrency}`);
    console.log(`🎯 Listening to queue: ${QUEUE_NAMES.AUTOMATION}`);
    console.log(`🔧 Job types: ${Object.values(JOB_TYPES).join(', ')}`);
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️ Worker is not running');
      return;
    }

    console.log('🛑 Stopping automation worker...');
    await this.worker.close();
    this.isRunning = false;
    console.log('✅ Automation worker stopped');
  }

  /**
   * Check if worker is running
   */
  isWorkerRunning(): boolean {
    return this.isRunning;
  }
}

// Main execution - Only runs when explicitly started
async function main() {
  console.log('🚀 Starting SEO Automation Worker...');
  
  const worker = new AutomationWorker();
  
  // Start the worker
  worker.start();
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Received SIGINT, shutting down gracefully...');
    await worker.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
    await worker.stop();
    process.exit(0);
  });
  
  // Keep the process alive
  process.stdin.resume();
}

// Only run if explicitly started with --start flag
if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes('--start')) {
  main().catch(console.error);
} else if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log('🔄 Automation Worker loaded but not started automatically.');
  console.log('💡 To start the worker, run: npm run worker:start');
  console.log('💡 Or use the "Start Automation" button in the dashboard.');
}

export default AutomationWorker;
