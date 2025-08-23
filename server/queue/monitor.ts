import { Queue } from 'bullmq';
import { 
  automationQueue, 
  briefQueue, 
  articleQueue, 
  approvalQueue, 
  publishingQueue 
} from './queues.js';
import { redis } from './redis.js';

export class QueueMonitor {
  private queues: Map<string, Queue>;
  private isMonitoring = false;
  private intervalId?: NodeJS.Timeout;

  constructor() {
    this.queues = new Map([
      ['automation', automationQueue],
      ['brief', briefQueue],
      ['article', articleQueue],
      ['approval', approvalQueue],
      ['publishing', publishingQueue]
    ]);
  }

  /**
   * Start monitoring all queues
   */
  start(intervalMs: number = 5000): void {
    if (this.isMonitoring) {
      console.log('⚠️ Monitor is already running');
      return;
    }

    this.isMonitoring = true;
    console.log('📊 Starting queue monitor...');
    
    // Initial status
    this.logQueueStatus();
    
    // Set up periodic monitoring
    this.intervalId = setInterval(() => {
      this.logQueueStatus();
    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      console.log('⚠️ Monitor is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    this.isMonitoring = false;
    console.log('🛑 Queue monitor stopped');
  }

  /**
   * Log current status of all queues
   */
  private async logQueueStatus(): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      console.log(`\n📊 Queue Status - ${timestamp}`);
      console.log('='.repeat(60));

      for (const [name, queue] of this.queues) {
        const stats = await queue.getJobCounts();
        const waiting = stats.waiting || 0;
        const active = stats.active || 0;
        const completed = stats.completed || 0;
        const failed = stats.failed || 0;
        const delayed = stats.delayed || 0;
        const paused = stats.paused || 0;

        const status = this.getQueueStatusIndicator(waiting, active, failed);
        
        console.log(`${status} ${name.padEnd(12)} | Waiting: ${waiting.toString().padStart(3)} | Active: ${active.toString().padStart(3)} | Completed: ${completed.toString().padStart(3)} | Failed: ${failed.toString().padStart(3)} | Delayed: ${delayed.toString().padStart(3)} | Paused: ${paused.toString().padStart(3)}`);
      }

      console.log('='.repeat(60));
      
      // Show Redis connection status
      const redisStatus = redis.status;
      const redisIndicator = redisStatus === 'ready' ? '🟢' : redisStatus === 'connecting' ? '🟡' : '🔴';
      console.log(`${redisIndicator} Redis Status: ${redisStatus}`);
      
    } catch (error) {
      console.error('❌ Failed to get queue status:', error);
    }
  }

  /**
   * Get status indicator based on queue metrics
   */
  private getQueueStatusIndicator(waiting: number, active: number, failed: number): string {
    if (failed > 0) return '🔴'; // Failed jobs
    if (waiting > 10) return '🟡'; // High queue
    if (active > 0) return '🟢'; // Processing
    if (waiting > 0) return '🔵'; // Waiting
    return '⚪'; // Idle
  }

  /**
   * Get detailed job information for a specific queue
   */
  async getQueueDetails(queueName: string): Promise<any> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    try {
      const [waiting, active, completed, failed, delayed, paused] = await Promise.all([
        queue.getJobs(['waiting'], 0, 10),
        queue.getJobs(['active'], 0, 10),
        queue.getJobs(['completed'], 0, 10),
        queue.getJobs(['failed'], 0, 10),
        queue.getJobs(['delayed'], 0, 10),
        queue.getJobs(['paused'], 0, 10)
      ]);

      return {
        name: queueName,
        waiting: waiting.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp
        })),
        active: active.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          progress: job.progress
        })),
        completed: completed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          finishedOn: job.finishedOn
        })),
        failed: failed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          failedReason: job.failedReason
        })),
        delayed: delayed.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp,
          delay: job.delay
        })),
        paused: paused.map(job => ({
          id: job.id,
          name: job.name,
          data: job.data,
          timestamp: job.timestamp
        }))
      };
    } catch (error) {
      console.error(`❌ Failed to get details for queue '${queueName}':`, error);
      throw error;
    }
  }

  /**
   * Get failed jobs with retry options
   */
  async getFailedJobs(queueName: string, limit: number = 20): Promise<any[]> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    try {
      const failedJobs = await queue.getJobs(['failed'], 0, limit);
      return failedJobs.map(job => ({
        id: job.id,
        name: job.name,
        data: job.data,
        timestamp: job.timestamp,
        failedReason: job.failedReason,
        attemptsMade: job.attemptsMade,
        maxAttempts: job.opts.attempts || 3
      }));
    } catch (error) {
      console.error(`❌ Failed to get failed jobs for queue '${queueName}':`, error);
      throw error;
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job '${jobId}' not found`);
      }

      if (job.failedReason) {
        await job.retry();
        console.log(`✅ Retried failed job ${jobId} in queue '${queueName}'`);
        return true;
      } else {
        console.log(`⚠️ Job ${jobId} is not failed, cannot retry`);
        return false;
      }
    } catch (error) {
      console.error(`❌ Failed to retry job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Remove a job from queue
   */
  async removeJob(queueName: string, jobId: string): Promise<boolean> {
    const queue = this.queues.get(queueName);
    if (!queue) {
      throw new Error(`Queue '${queueName}' not found`);
    }

    try {
      const job = await queue.getJob(jobId);
      if (!job) {
        throw new Error(`Job '${jobId}' not found`);
      }

      await job.remove();
      console.log(`🗑️ Removed job ${jobId} from queue '${queueName}'`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to remove job ${jobId}:`, error);
      throw error;
    }
  }

  /**
   * Get Redis memory usage
   */
  async getRedisMemoryUsage(): Promise<any> {
    try {
      const info = await redis.info('memory');
      const lines = info.split('\r\n');
      const memoryInfo: any = {};
      
      lines.forEach(line => {
        if (line.includes(':')) {
          const [key, value] = line.split(':');
          memoryInfo[key] = value;
        }
      });

      return {
        usedMemory: memoryInfo.used_memory_human,
        usedMemoryPeak: memoryInfo.used_memory_peak_human,
        usedMemoryRss: memoryInfo.used_memory_rss_human,
        memFragmentationRatio: memoryInfo.mem_fragmentation_ratio,
        keyspaceHits: memoryInfo.keyspace_hits,
        keyspaceMisses: memoryInfo.keyspace_misses
      };
    } catch (error) {
      console.error('❌ Failed to get Redis memory usage:', error);
      return null;
    }
  }

  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<any> {
    try {
      const redisStatus = redis.status;
      const queueStats = await Promise.all(
        Array.from(this.queues.values()).map(async (queue) => {
          const stats = await queue.getJobCounts();
          return {
            name: queue.name,
            waiting: stats.waiting || 0,
            active: stats.active || 0,
            failed: stats.failed || 0
          };
        })
      );

      const totalWaiting = queueStats.reduce((sum, stat) => sum + stat.waiting, 0);
      const totalActive = queueStats.reduce((sum, stat) => sum + stat.active, 0);
      const totalFailed = queueStats.reduce((sum, stat) => sum + stat.failed, 0);

      const health = {
        status: 'healthy',
        issues: [] as string[],
        redis: redisStatus,
        queues: queueStats,
        totals: {
          waiting: totalWaiting,
          active: totalActive,
          failed: totalFailed
        }
      };

      // Check for issues
      if (redisStatus !== 'ready') {
        health.status = 'unhealthy';
        health.issues.push('Redis connection not ready');
      }

      if (totalFailed > 0) {
        health.status = totalFailed > 10 ? 'unhealthy' : 'warning';
        health.issues.push(`${totalFailed} failed jobs`);
      }

      if (totalWaiting > 100) {
        health.status = 'warning';
        health.issues.push('High queue backlog');
      }

      return health;
    } catch (error) {
      console.error('❌ Failed to get health status:', error);
      return {
        status: 'unknown',
        issues: ['Failed to get health status'],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Main execution for CLI usage
async function main() {
  console.log('📊 SEO Automation Queue Monitor');
  console.log('='.repeat(40));
  
  const monitor = new QueueMonitor();
  
  // Start monitoring with 3-second intervals
  monitor.start(3000);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Received SIGINT, shutting down...');
    monitor.stop();
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Received SIGTERM, shutting down...');
    monitor.stop();
    process.exit(0);
  });
  
  // Keep the process alive
  process.stdin.resume();
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default QueueMonitor;
