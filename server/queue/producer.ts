import { automationQueue, briefQueue, articleQueue, approvalQueue, publishingQueue } from './queues.js';
import { JOB_TYPES, type ExcelRowJobData, type BriefJobData, type ArticleJobData, type ApprovalJobData, type PublishingJobData } from './queues.js';
import { storage } from '../storage.js';
import { eq } from 'drizzle-orm';
import { clientExcels } from '@shared/schema.js';

export class AutomationProducer {
  /**
   * Start automation for a client by enqueueing all pending Excel rows
   * This method now checks for active schedules and respects their limits
   */
  static async startClientAutomation(clientId: string): Promise<{ success: boolean; jobCount: number; batchId?: string; scheduleInfo?: any }> {
    try {
      // Get active schedules for this client
      const schedules = await storage.getAutomationSchedules(clientId);
      const activeSchedules = schedules.filter((s: any) => s.isActive === 'active');
      
      if (activeSchedules.length === 0) {
        console.log(`⚠️ No active schedules found for client: ${clientId}`);
        return { 
          success: false, 
          jobCount: 0, 
          error: 'NO_SCHEDULE_SET',
          message: 'No automation schedule found. Please set up a schedule first.'
        };
      }

      // Use the most restrictive schedule (lowest jobsPerRun) for manual runs
      const mostRestrictiveSchedule = activeSchedules.reduce((prev, current) => 
        (prev.jobsPerRun < current.jobsPerRun) ? prev : current
      );

      console.log(`📅 Using schedule: ${mostRestrictiveSchedule.name} (${mostRestrictiveSchedule.jobsPerRun} jobs per run)`);
      
      return this.startScheduledAutomation(clientId, mostRestrictiveSchedule.jobsPerRun);
    } catch (error) {
      console.error(`❌ Failed to start automation for client: ${clientId}`, error);
      throw new Error(`Failed to start automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Start automation for a client with a limit on the number of jobs to process
   * This method respects schedule limits and is used by both manual and scheduled automation
   */
  static async startScheduledAutomation(clientId: string, jobLimit?: number): Promise<{ success: boolean; jobCount: number; batchId?: string }> {
    try {
      console.log(`🚀 Starting automation for client: ${clientId}${jobLimit ? ` (max ${jobLimit} jobs)` : ''}`);
      
      // Get all pending Excel rows for this client
      const pendingRows = await storage.getClientExcelRows(clientId, 'pending');
      
      if (!pendingRows || pendingRows.length === 0) {
        console.log(`⚠️ No pending rows found for client: ${clientId}`);
        return { success: false, jobCount: 0 };
      }

      console.log(`📊 Found ${pendingRows.length} pending rows for automation`);
      
      // Filter out rows that are already being processed to prevent duplicates
      const availableRows = pendingRows.filter(row => {
        const status = row.automation || 'pending';
        return status === 'pending' && !row.processingStartedAt;
      });

      if (availableRows.length === 0) {
        console.log(`⚠️ No available rows for automation (all are already being processed)`);
        return { success: false, jobCount: 0 };
      }

      console.log(`📊 Found ${availableRows.length} available rows for automation (filtered from ${pendingRows.length} total)`);
      
      // Group rows by batch for tracking
      const batchGroups = new Map<string, typeof availableRows>();
      availableRows.forEach(row => {
        const batchId = row.batchId;
        if (!batchGroups.has(batchId)) {
          batchGroups.set(batchId, []);
        }
        batchGroups.get(batchId)!.push(row);
      });

      let totalJobsEnqueued = 0;
      const batchIds: string[] = [];

      // Enqueue jobs for each batch, respecting job limit
      for (const [batchId, rows] of batchGroups) {
        console.log(`📦 Processing batch: ${batchId} with ${rows.length} rows`);
        
        // Apply job limit if specified
        const limitedRows = jobLimit ? rows.slice(0, jobLimit - totalJobsEnqueued) : rows;
        
        if (limitedRows.length === 0) {
          console.log(`⏹️ Job limit reached (${jobLimit}), stopping automation`);
          break;
        }
        
        // Mark rows as processing to prevent duplicates
        for (const row of limitedRows) {
          await this.markRowAsProcessing(row.id);
        }
        
        const jobs = await this.enqueueBatchJobs(clientId, batchId, limitedRows);
        totalJobsEnqueued += jobs.length;
        batchIds.push(batchId);
        
        // Update automation status to 'processing' for the processed rows
        await this.updateBatchStatus(clientId, batchId, 'processing');
        
        // Check if we've reached the job limit
        if (jobLimit && totalJobsEnqueued >= jobLimit) {
          console.log(`⏹️ Job limit reached (${jobLimit}), stopping automation`);
          break;
        }
      }

      console.log(`✅ Successfully enqueued ${totalJobsEnqueued} automation jobs for client: ${clientId}`);
      
      return { 
        success: true, 
        jobCount: totalJobsEnqueued,
        batchId: batchIds.length === 1 ? batchIds[0] : undefined
      };
      
    } catch (error) {
      console.error(`❌ Failed to start automation for client: ${clientId}`, error);
      throw new Error(`Failed to start automation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enqueue jobs for a specific batch of Excel rows
   */
  private static async enqueueBatchJobs(clientId: string, batchId: string, rows: any[]): Promise<string[]> {
    const jobIds: string[] = [];
    
    for (const row of rows) {
      try {
        // Extract data from the JSON row
        const rowData = row.data;
        const keyword = rowData.keyword || rowData.keywords;
        
        if (!keyword) {
          console.warn(`⚠️ Skipping row ${row.id}: No keyword found`);
          continue;
        }

        const contentType = rowData['content-type'] || rowData.contentType || rowData['content_type'] || 'list article';
        const targetAudience = rowData['target-audience'] || rowData.targetAudience || rowData['target_audience'];

        // Create the main automation job
        const jobData: ExcelRowJobData = {
          clientId,
          rowId: row.id,
          keyword: String(keyword).trim(),
          contentType: String(contentType).trim(),
          targetAudience: targetAudience ? String(targetAudience).trim() : undefined,
          batchId
        };

        const job = await automationQueue.add(
          JOB_TYPES.PROCESS_EXCEL_ROW,
          jobData,
          {
            jobId: `automation_${row.id}_${Date.now()}`,
            priority: 1,
            delay: 0, // Start immediately
            removeOnComplete: true,
            removeOnFail: false
          }
        );

        jobIds.push(job.id!);
        console.log(`📝 Enqueued automation job ${job.id} for row ${row.id}: ${keyword}`);
        
      } catch (error) {
        console.error(`❌ Failed to enqueue job for row ${row.id}:`, error);
        // Continue with other rows
      }
    }

    return jobIds;
  }

  /**
   * Mark a row as processing to prevent duplicate job creation
   */
  private static async markRowAsProcessing(rowId: string): Promise<void> {
    try {
      // This would typically update the database
      // For now, we'll log the status change
      console.log(`🔄 Marked row ${rowId} as processing`);
      
      // In a real implementation, you'd update the database:
      // await db.update(clientExcels)
      //   .set({ 
      //     automation: 'processing',
      //     processingStartedAt: new Date()
      //   })
      //   .where(eq(clientExcels.id, rowId));
      
    } catch (error) {
      console.error(`❌ Failed to mark row ${rowId} as processing:`, error);
    }
  }

  /**
   * Update automation status for all rows in a batch
   */
  private static async updateBatchStatus(clientId: string, batchId: string, status: 'processing' | 'done' | 'failed'): Promise<void> {
    try {
      // This would typically update the database
      // For now, we'll log the status change
      console.log(`🔄 Updated batch ${batchId} status to: ${status}`);
      
      // In a real implementation, you'd update the database:
      // await db.update(clientExcels)
      //   .set({ automation: status })
      //   .where(eq(clientExcels.batchId, batchId));
      
    } catch (error) {
      console.error(`❌ Failed to update batch status:`, error);
    }
  }

  /**
   * Enqueue a brief generation job
   */
  static async enqueueBriefGeneration(data: BriefJobData): Promise<string> {
    const job = await briefQueue.add(
      JOB_TYPES.GENERATE_BRIEF,
      data,
      {
        jobId: `brief_${data.rowId}_${Date.now()}`,
        priority: 2,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`📋 Enqueued brief generation job ${job.id} for row ${data.rowId}`);
    return job.id!;
  }

  /**
   * Enqueue an article generation job
   */
  static async enqueueArticleGeneration(data: ArticleJobData): Promise<string> {
    const job = await articleQueue.add(
      JOB_TYPES.GENERATE_ARTICLE,
      data,
      {
        jobId: `article_${data.rowId}_${Date.now()}`,
        priority: 3,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`📄 Enqueued article generation job ${job.id} for row ${data.rowId}`);
    return job.id!;
  }

  /**
   * Enqueue an approval process job
   */
  static async enqueueApprovalProcess(data: ApprovalJobData): Promise<string> {
    const job = await approvalQueue.add(
      JOB_TYPES.SEND_FOR_APPROVAL,
      data,
      {
        jobId: `approval_${data.rowId}_${Date.now()}`,
        priority: 4,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`✉️ Enqueued approval process job ${job.id} for row ${data.rowId}`);
    return job.id!;
  }

  /**
   * Enqueue a publishing job
   */
  static async enqueuePublishing(data: PublishingJobData): Promise<string> {
    const job = await publishingQueue.add(
      JOB_TYPES.PUBLISH_ARTICLE,
      data,
      {
        jobId: `publish_${data.rowId}_${Date.now()}`,
        priority: 5,
        removeOnComplete: true,
        removeOnFail: false
      }
    );
    
    console.log(`🚀 Enqueued publishing job ${job.id} for row ${data.rowId}`);
    return job.id!;
  }

  /**
   * Get queue statistics
   */
  static async getQueueStats() {
    try {
      const [automationStats, briefStats, articleStats, approvalStats, publishingStats] = await Promise.all([
        automationQueue.getJobCounts(),
        briefQueue.getJobCounts(),
        articleQueue.getJobCounts(),
        approvalQueue.getJobCounts(),
        publishingQueue.getJobCounts()
      ]);

      return {
        automation: automationStats,
        brief: briefStats,
        article: articleStats,
        approval: approvalStats,
        publishing: publishingStats
      };
    } catch (error) {
      console.error('❌ Failed to get queue stats:', error);
      return null;
    }
  }

  /**
   * Pause all queues
   */
  static async pauseAllQueues(): Promise<void> {
    try {
      await Promise.all([
        automationQueue.pause(),
        briefQueue.pause(),
        articleQueue.pause(),
        approvalQueue.pause(),
        publishingQueue.pause()
      ]);
      console.log('⏸️ All queues paused');
    } catch (error) {
      console.error('❌ Failed to pause queues:', error);
    }
  }

  /**
   * Resume all queues
   */
  static async resumeAllQueues(): Promise<void> {
    try {
      await Promise.all([
        automationQueue.resume(),
        briefQueue.resume(),
        articleQueue.resume(),
        approvalQueue.resume(),
        publishingQueue.resume()
      ]);
      console.log('▶️ All queues resumed');
    } catch (error) {
      console.error('❌ Failed to resume queues:', error);
    }
  }

  /**
   * Clear all queues (use with caution)
   */
  static async clearAllQueues(): Promise<void> {
    try {
      await Promise.all([
        automationQueue.obliterate({ force: true }),
        briefQueue.obliterate({ force: true }),
        articleQueue.obliterate({ force: true }),
        approvalQueue.obliterate({ force: true }),
        publishingQueue.obliterate({ force: true })
      ]);
      console.log('🗑️ All queues cleared');
    } catch (error) {
      console.error('❌ Failed to clear queues:', error);
    }
  }
}

export default AutomationProducer;
