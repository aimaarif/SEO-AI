import { Queue, Worker } from 'bullmq';
import { redis } from './redis.js';

// Queue names
export const QUEUE_NAMES = {
  AUTOMATION: 'seo-automation',
  BRIEF_GENERATION: 'brief-generation',
  ARTICLE_GENERATION: 'article-generation',
  APPROVAL_PROCESS: 'approval-process',
  PUBLISHING: 'publishing'
} as const;

// Job types
export const JOB_TYPES = {
  PROCESS_EXCEL_ROW: 'process-excel-row',
  GENERATE_BRIEF: 'generate-brief',
  GENERATE_ARTICLE: 'generate-article',
  SEND_FOR_APPROVAL: 'send-for-approval',
  PUBLISH_ARTICLE: 'publish-article'
} as const;

// Main automation queue
const automationQueue = new Queue(QUEUE_NAMES.AUTOMATION, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100, // Keep last 100 completed jobs
    removeOnFail: 50,      // Keep last 50 failed jobs
    attempts: 3,            // Retry failed jobs 3 times
    backoff: {
      type: 'exponential',
      delay: 2000,          // Start with 2 seconds
    },
    delay: 1000,            // 1 second delay between jobs
  }
});

// Brief generation queue
const briefQueue = new Queue(QUEUE_NAMES.BRIEF_GENERATION, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 3000,
    },
  }
});

// Article generation queue
const articleQueue = new Queue(QUEUE_NAMES.ARTICLE_GENERATION, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 50,
    removeOnFail: 25,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
});

// Approval process queue
const approvalQueue = new Queue(QUEUE_NAMES.APPROVAL_PROCESS, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  }
});

// Publishing queue
const publishingQueue = new Queue(QUEUE_NAMES.PUBLISHING, {
  connection: redis,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  }
});

// Queue scheduler for delayed jobs (removed for compatibility)
// const queueScheduler = new QueueScheduler(QUEUE_NAMES.AUTOMATION, {
//   connection: redis
// });

// Job data interfaces
export interface ExcelRowJobData {
  clientId: string;
  rowId: string;
  keyword: string;
  contentType?: string;
  targetAudience?: string;
  batchId: string;
}

export interface BriefJobData {
  clientId: string;
  rowId: string;
  keyword: string;
  contentType: string;
  targetAudience?: string;
  batchId: string;
}

export interface ArticleJobData {
  clientId: string;
  rowId: string;
  briefId: string;
  keyword: string;
  contentType: string;
  targetAudience?: string;
  batchId: string;
}

export interface ApprovalJobData {
  clientId: string;
  rowId: string;
  articleId: string;
  keyword: string;
  batchId: string;
}

export interface PublishingJobData {
  clientId: string;
  rowId: string;
  articleId: string;
  keyword: string;
  batchId: string;
}

// Queue event handlers
automationQueue.on('completed', (job) => {
  console.log(`✅ Automation job completed: ${job.id} - ${job.name}`);
});

automationQueue.on('failed', (job, err) => {
  console.error(`❌ Automation job failed: ${job?.id} - ${job?.name}`, err);
});

automationQueue.on('stalled', (jobId) => {
  console.warn(`⚠️ Automation job stalled: ${jobId}`);
});

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('🛑 Shutting down queues...');
    await Promise.all([
      automationQueue.close(),
      briefQueue.close(),
      articleQueue.close(),
      approvalQueue.close(),
      publishingQueue.close()
    ]);
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('🛑 Shutting down queues...');
    await Promise.all([
      automationQueue.close(),
      briefQueue.close(),
      articleQueue.close(),
      approvalQueue.close(),
      publishingQueue.close()
    ]);
    process.exit(0);
  });

// Export all queues
export {
  automationQueue,
  briefQueue,
  articleQueue,
  approvalQueue,
  publishingQueue
};
