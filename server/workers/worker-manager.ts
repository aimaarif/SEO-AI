import AutomationWorker from './automation-worker.js';

export class WorkerManager {
  private static instance: WorkerManager;
  private workers: Map<string, AutomationWorker> = new Map();
  private isRunning = false;

  private constructor() {}

  static getInstance(): WorkerManager {
    if (!WorkerManager.instance) {
      WorkerManager.instance = new WorkerManager();
    }
    return WorkerManager.instance;
  }

  /**
   * Start the automation worker
   */
  async startAutomationWorker(): Promise<{ success: boolean; message: string }> {
    try {
      if (this.isRunning) {
        return { 
          success: false, 
          message: 'Automation worker is already running' 
        };
      }

      console.log('🚀 Starting automation worker...');
      const worker = new AutomationWorker();
      worker.start();
      
      this.workers.set('automation', worker);
      this.isRunning = true;

      console.log('✅ Automation worker started successfully');
      return { 
        success: true, 
        message: 'Automation worker started successfully' 
      };
    } catch (error) {
      console.error('❌ Failed to start automation worker:', error);
      return { 
        success: false, 
        message: `Failed to start automation worker: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Stop the automation worker
   */
  async stopAutomationWorker(): Promise<{ success: boolean; message: string }> {
    try {
      const worker = this.workers.get('automation');
      if (!worker) {
        return { 
          success: false, 
          message: 'Automation worker is not running' 
        };
      }

      console.log('🛑 Stopping automation worker...');
      await worker.stop();
      this.workers.delete('automation');
      this.isRunning = false;

      console.log('✅ Automation worker stopped successfully');
      return { 
        success: true, 
        message: 'Automation worker stopped successfully' 
      };
    } catch (error) {
      console.error('❌ Failed to stop automation worker:', error);
      return { 
        success: false, 
        message: `Failed to stop automation worker: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  /**
   * Check if automation worker is running
   */
  isAutomationWorkerRunning(): boolean {
    const worker = this.workers.get('automation');
    return worker ? worker.isWorkerRunning() : false;
  }

  /**
   * Get worker status
   */
  getWorkerStatus(): { automation: boolean; isRunning: boolean } {
    return {
      automation: this.isAutomationWorkerRunning(),
      isRunning: this.isRunning
    };
  }

  /**
   * Stop all workers (cleanup)
   */
  async stopAllWorkers(): Promise<void> {
    console.log('🛑 Stopping all workers...');
    
    for (const [name, worker] of this.workers) {
      try {
        await worker.stop();
        console.log(`✅ Stopped ${name} worker`);
      } catch (error) {
        console.error(`❌ Failed to stop ${name} worker:`, error);
      }
    }
    
    this.workers.clear();
    this.isRunning = false;
    console.log('✅ All workers stopped');
  }
}

export default WorkerManager;
