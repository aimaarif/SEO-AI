import { storage } from '../storage.js';
import { AutomationProducer } from '../queue/producer.js';
import { WorkerManager } from '../workers/worker-manager.js';

export class AutomationScheduler {
  private static instance: AutomationScheduler;
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;

  private constructor() {}

  static getInstance(): AutomationScheduler {
    if (!AutomationScheduler.instance) {
      AutomationScheduler.instance = new AutomationScheduler();
    }
    return AutomationScheduler.instance;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      console.log('⚠️ Scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('🚀 Automation Scheduler started');
    
    // Check for scheduled jobs every minute
    this.intervalId = setInterval(() => {
      this.checkScheduledJobs().catch(console.error);
    }, 60000); // 1 minute
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      console.log('⚠️ Scheduler is not running');
      return;
    }

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
    console.log('🛑 Automation Scheduler stopped');
  }

  /**
   * Check if scheduler is running
   */
  isSchedulerRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Check for scheduled jobs that need to run
   */
  private async checkScheduledJobs(): Promise<void> {
    try {
      const activeSchedules = await storage.getActiveSchedules();
      const now = new Date();

      // Find all schedules that should run now
      const schedulesToRun = activeSchedules.filter(schedule => this.shouldRunSchedule(schedule, now));
      
      if (schedulesToRun.length === 0) {
        return;
      }

      console.log(`🕐 Found ${schedulesToRun.length} schedules to execute at ${now.toLocaleTimeString()}`);

      // Execute all schedules concurrently to avoid blocking
      const executionPromises = schedulesToRun.map(schedule => 
        this.executeSchedule(schedule).catch(error => {
          console.error(`❌ Failed to execute schedule ${schedule.name} for client ${schedule.clientId}:`, error);
          return null; // Continue with other schedules even if one fails
        })
      );

      // Wait for all schedules to complete
      const results = await Promise.allSettled(executionPromises);
      
      const successful = results.filter(result => result.status === 'fulfilled').length;
      const failed = results.filter(result => result.status === 'rejected').length;
      
      if (successful > 0 || failed > 0) {
        console.log(`📊 Schedule execution summary: ${successful} successful, ${failed} failed`);
      }

    } catch (error) {
      console.error('❌ Error checking scheduled jobs:', error);
    }
  }

  /**
   * Determine if a schedule should run now
   */
  private shouldRunSchedule(schedule: any, now: Date): boolean {
    if (!schedule.nextRunAt) {
      return false;
    }

    const nextRun = new Date(schedule.nextRunAt);
    return now >= nextRun;
  }

  /**
   * Execute a scheduled automation
   */
  private async executeSchedule(schedule: any): Promise<void> {
    const startTime = Date.now();
    try {
      console.log(`🔄 [${schedule.clientId}] Executing scheduled automation: ${schedule.name} (${schedule.jobsPerRun} jobs)`);

      // Start the worker if not running
      const workerManager = WorkerManager.getInstance();
      await workerManager.startAutomationWorker();

      // Start automation with job limit
      const result = await AutomationProducer.startScheduledAutomation(
        schedule.clientId, 
        schedule.jobsPerRun
      );

      const executionTime = Date.now() - startTime;

      if (result.success) {
        console.log(`✅ [${schedule.clientId}] Scheduled automation completed: ${result.jobCount} jobs enqueued in ${executionTime}ms`);
        
        // Update last run time
        await storage.updateScheduleLastRun(schedule.id, new Date());
        
        // Calculate and update next run time
        const nextRunAt = this.calculateNextRunTime(schedule);
        await storage.updateScheduleNextRun(schedule.id, nextRunAt);
        
        // Record activity
        await storage.createActivity({
          type: 'scheduled_automation_executed',
          title: `Scheduled automation executed: ${schedule.name}`,
          description: `Processed ${result.jobCount} jobs as scheduled for client ${schedule.clientId}`,
          clientId: schedule.clientId,
          metadata: {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            jobCount: result.jobCount,
            nextRunAt: nextRunAt.toISOString(),
            executionTimeMs: executionTime
          }
        } as any);

      } else {
        console.log(`⚠️ [${schedule.clientId}] No pending jobs for scheduled automation: ${schedule.name}`);
        
        // Still update the schedule timing even if no jobs were processed
        const nextRunAt = this.calculateNextRunTime(schedule);
        await storage.updateScheduleNextRun(schedule.id, nextRunAt);
        
        // Record activity for no jobs found
        await storage.createActivity({
          type: 'scheduled_automation_no_jobs',
          title: `No jobs found for scheduled automation: ${schedule.name}`,
          description: `No pending jobs found for client ${schedule.clientId}`,
          clientId: schedule.clientId,
          metadata: {
            scheduleId: schedule.id,
            scheduleName: schedule.name,
            nextRunAt: nextRunAt.toISOString()
          }
        } as any);
      }

    } catch (error) {
      const executionTime = Date.now() - startTime;
      console.error(`❌ [${schedule.clientId}] Failed to execute scheduled automation ${schedule.name} after ${executionTime}ms:`, error);
      
      // Record failure activity
      await storage.createActivity({
        type: 'scheduled_automation_failed',
        title: `Scheduled automation failed: ${schedule.name}`,
        description: `Failed to execute scheduled automation for client ${schedule.clientId}`,
        clientId: schedule.clientId,
        metadata: {
          scheduleId: schedule.id,
          scheduleName: schedule.name,
          error: error instanceof Error ? error.message : 'Unknown error',
          executionTimeMs: executionTime
        }
      } as any);
      
      // Re-throw the error so it can be caught by the caller
      throw error;
    }
  }

  /**
   * Calculate the next run time for a schedule
   * All times are calculated in UTC to avoid timezone issues
   */
  private calculateNextRunTime(schedule: any): Date {
    const now = new Date();
    const [hours, minutes] = schedule.startTime.split(':').map(Number);
    
    // Create a UTC date for today at the specified time
    let nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));

    // If the time has already passed today, move to the next occurrence
    if (nextRun <= now) {
      switch (schedule.frequency) {
        case 'daily':
          nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + schedule.interval, hours, minutes, 0, 0));
          break;
          
        case 'weekly':
          if (schedule.daysOfWeek && Array.isArray(schedule.daysOfWeek)) {
            // Find the next occurrence based on days of week
            const currentDay = now.getUTCDay(); // 0 = Sunday, 1 = Monday, etc.
            const sortedDays = [...schedule.daysOfWeek].sort((a, b) => a - b);
            
            let nextDay = sortedDays.find(day => day > currentDay);
            if (!nextDay) {
              // If no day found this week, take the first day of next week
              nextDay = sortedDays[0];
              const daysToAdd = 7 - currentDay + nextDay;
              nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, hours, minutes, 0, 0));
            } else {
              const daysToAdd = nextDay - currentDay;
              nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, hours, minutes, 0, 0));
            }
          } else {
            const daysToAdd = 7 * schedule.interval;
            nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, hours, minutes, 0, 0));
          }
          break;
          
        case 'monthly':
          if (schedule.dayOfMonth) {
            nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), schedule.dayOfMonth, hours, minutes, 0, 0));
            // If this month's date has passed, move to next month
            if (nextRun <= now) {
              nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + schedule.interval, schedule.dayOfMonth, hours, minutes, 0, 0));
            }
          } else {
            nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + schedule.interval, now.getUTCDate(), hours, minutes, 0, 0));
          }
          break;
          
        default:
          // Default to daily
          const daysToAdd = schedule.interval;
          nextRun = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysToAdd, hours, minutes, 0, 0));
      }
    }

    return nextRun;
  }

  /**
   * Create a new schedule and calculate its first run time
   */
  async createSchedule(scheduleData: any): Promise<any> {
    try {
      // Calculate the next run time
      const nextRunAt = this.calculateNextRunTime(scheduleData);
      
      const schedule = await storage.createAutomationSchedule({
        ...scheduleData,
        nextRunAt
      });

      console.log(`✅ Created automation schedule: ${schedule.name} - Next run: ${nextRunAt}`);

      return schedule;
    } catch (error) {
      console.error('❌ Failed to create automation schedule:', error);
      throw error;
    }
  }

  /**
   * Update a schedule and recalculate its next run time
   */
  async updateSchedule(id: string, updateData: any): Promise<any> {
    try {
      const currentSchedule = await storage.getAutomationSchedule(id);
      if (!currentSchedule) {
        throw new Error('Schedule not found');
      }

      // Merge current data with updates
      const mergedData = { ...currentSchedule, ...updateData };
      
      // Recalculate next run time
      const nextRunAt = this.calculateNextRunTime(mergedData);
      
      const schedule = await storage.updateAutomationSchedule(id, {
        ...updateData,
        nextRunAt
      });

      console.log(`✅ Updated automation schedule: ${schedule.name} - Next run: ${nextRunAt}`);

      return schedule;
    } catch (error) {
      console.error('❌ Failed to update automation schedule:', error);
      throw error;
    }
  }

  /**
   * Delete a schedule
   */
  async deleteSchedule(id: string): Promise<void> {
    try {
      await storage.deleteAutomationSchedule(id);
      console.log(`✅ Deleted automation schedule: ${id}`);
    } catch (error) {
      console.error('❌ Failed to delete automation schedule:', error);
      throw error;
    }
  }

  /**
   * Pause a schedule
   */
  async pauseSchedule(id: string): Promise<any> {
    try {
      const schedule = await storage.updateAutomationSchedule(id, { isActive: 'paused' });
      console.log(`⏸️ Paused automation schedule: ${schedule.name}`);
      return schedule;
    } catch (error) {
      console.error('❌ Failed to pause automation schedule:', error);
      throw error;
    }
  }

  /**
   * Resume a schedule
   */
  async resumeSchedule(id: string): Promise<any> {
    try {
      const currentSchedule = await storage.getAutomationSchedule(id);
      if (!currentSchedule) {
        throw new Error('Schedule not found');
      }

      // Recalculate next run time when resuming
      const nextRunAt = this.calculateNextRunTime(currentSchedule);
      
      const schedule = await storage.updateAutomationSchedule(id, { 
        isActive: 'active',
        nextRunAt
      });

      console.log(`▶️ Resumed automation schedule: ${schedule.name} - Next run: ${nextRunAt}`);
      return schedule;
    } catch (error) {
      console.error('❌ Failed to resume automation schedule:', error);
      throw error;
    }
  }
}

export default AutomationScheduler;
