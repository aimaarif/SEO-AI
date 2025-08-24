import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { GlassCard } from '@/components/ui/glass-card';
import { 
  Clock, 
  Calendar, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Plus,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { 
  getAutomationSchedules, 
  createAutomationSchedule, 
  updateAutomationSchedule, 
  deleteAutomationSchedule, 
  pauseAutomationSchedule, 
  resumeAutomationSchedule 
} from '@/lib/api';

interface Schedule {
  id: string;
  name: string;
  description?: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  interval: number;
  jobsPerRun: number;
  startTime: string;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  isActive: 'active' | 'paused' | 'deleted';
  lastRunAt?: string;
  nextRunAt?: string;
  createdAt: string;
  timezone?: string;
}

interface ScheduleManagerProps {
  clientId: string;
  clientName: string;
}

export function ScheduleManager({ clientId, clientName }: ScheduleManagerProps) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<Schedule | null>(null);
  // Add timezone to formData
  const [formData, setFormData] = useState({
      name: '',
      description: '',
      frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
      interval: 1,
      jobsPerRun: 1,
      startTime: '09:00',
      daysOfWeek: [] as number[],
      dayOfMonth: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Get user's timezone
  });
  useEffect(() => {
    loadSchedules();
  }, [clientId]);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const result = await getAutomationSchedules(clientId);
      setSchedules(result.schedules);
    } catch (error) {
      console.error('Failed to load schedules:', error);
    } finally {
      setLoading(false);
    }
  };

  // Utility function to convert local time to UTC for storage
  const convertLocalTimeToUTC = (localTime: string): string => {
    const [hours, minutes] = localTime.split(':').map(Number);
    const now = new Date();
    const localDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
    
    // Convert to UTC time string (HH:MM format)
    const utcHours = localDate.getUTCHours().toString().padStart(2, '0');
    const utcMinutes = localDate.getUTCMinutes().toString().padStart(2, '0');
    return `${utcHours}:${utcMinutes}`;
  };

  // Utility function to convert UTC time back to local time for display
  const convertUTCToLocalTime = (utcTime: string): string => {
    const [hours, minutes] = utcTime.split(':').map(Number);
    const now = new Date();
    const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hours, minutes, 0, 0));
    
    // Convert UTC to local time string (HH:MM format)
    const localHours = utcDate.getHours().toString().padStart(2, '0');
    const localMinutes = utcDate.getMinutes().toString().padStart(2, '0');
    return `${localHours}:${localMinutes}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Convert local start time to UTC for storage
      const utcStartTime = convertLocalTimeToUTC(formData.startTime);
      
      const scheduleData = {
        ...formData,
        startTime: utcStartTime, // Store UTC time
        clientId,
        daysOfWeek: formData.frequency === 'weekly' ? formData.daysOfWeek : undefined,
        dayOfMonth: formData.frequency === 'monthly' ? formData.dayOfMonth : undefined,
        timezone: formData.timezone
      };

      if (editingSchedule) {
        await updateAutomationSchedule(editingSchedule.id, scheduleData);
      } else {
        await createAutomationSchedule(scheduleData);
      }

      setShowForm(false);
      setEditingSchedule(null);
      resetForm();
      loadSchedules();
    } catch (error) {
      console.error('Failed to save schedule:', error);
      alert('Failed to save schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    setLoading(true);
    try {
      await deleteAutomationSchedule(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Failed to delete schedule:', error);
      alert('Failed to delete schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async (scheduleId: string) => {
    setLoading(true);
    try {
      await pauseAutomationSchedule(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Failed to pause schedule:', error);
      alert('Failed to pause schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResume = async (scheduleId: string) => {
    setLoading(true);
    try {
      await resumeAutomationSchedule(scheduleId);
      loadSchedules();
    } catch (error) {
      console.error('Failed to resume schedule:', error);
      alert('Failed to resume schedule. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (schedule: Schedule) => {
    setEditingSchedule(schedule);
    setFormData({
      name: schedule.name,
      description: schedule.description || '',
      frequency: schedule.frequency,
      interval: schedule.interval,
      jobsPerRun: schedule.jobsPerRun,
      startTime: convertUTCToLocalTime(schedule.startTime), // Convert UTC to local time for editing
      daysOfWeek: schedule.daysOfWeek || [],
      dayOfMonth: schedule.dayOfMonth || 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      frequency: 'daily' as 'daily' | 'weekly' | 'monthly',
      interval: 1,
      jobsPerRun: 1,
      startTime: '09:00',
      daysOfWeek: [],
      dayOfMonth: 1,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    });
  };

  const formatNextRun = (nextRunAt: string) => {
    const date = new Date(nextRunAt);
    // Convert UTC time to local timezone for display
    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getFrequencyText = (schedule: Schedule) => {
    switch (schedule.frequency) {
      case 'daily':
        return `Every ${schedule.interval} day(s)`;
      case 'weekly':
        if (schedule.daysOfWeek && schedule.daysOfWeek.length > 0) {
          const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const dayNames = schedule.daysOfWeek.map(day => days[day - 1]).join(', ');
          return `Every ${schedule.interval} week(s) on ${dayNames}`;
        }
        return `Every ${schedule.interval} week(s)`;
      case 'monthly':
        return `Every ${schedule.interval} month(s) on day ${schedule.dayOfMonth}`;
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Automation Schedules</h2>
          <p className="text-muted-foreground">Manage automated content generation for {clientName}</p>
        </div>
        <Button 
          onClick={() => setShowForm(true)}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Schedule
        </Button>
      </div>

      {showForm && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
        >
          <GlassCard className="p-6">
            <h3 className="text-lg font-semibold mb-4">
              {editingSchedule ? 'Edit Schedule' : 'Create New Schedule'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Schedule Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Daily Content Generation"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Optional description"
                  />
                </div>

                <div>
                  <Label htmlFor="frequency">Frequency</Label>
                  <Select
                    value={formData.frequency}
                    onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
                      setFormData({ ...formData, frequency: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="interval">Interval</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={formData.interval}
                    onChange={(e) => setFormData({ ...formData, interval: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="jobsPerRun">Jobs Per Run</Label>
                  <Input
                    id="jobsPerRun"
                    type="number"
                    min="1"
                    value={formData.jobsPerRun}
                    onChange={(e) => setFormData({ ...formData, jobsPerRun: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="startTime">Start Time (Local Timezone)</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    required
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Times are stored in UTC and converted to your local timezone for display
                  </p>
                </div>

                <div>
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={formData.timezone}
                    onValueChange={(value) => setFormData({ ...formData, timezone: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Intl.supportedValuesOf('timeZone').map((tz) => (
                        <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    💡 Your local timezone is automatically detected
                  </p>
                </div>

                {formData.frequency === 'weekly' && (
                  <div className="md:col-span-2">
                    <Label>Days of Week</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                        <Button
                          key={day}
                          type="button"
                          variant={formData.daysOfWeek.includes(index + 1) ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const dayNumber = index + 1;
                            const newDays = formData.daysOfWeek.includes(dayNumber)
                              ? formData.daysOfWeek.filter(d => d !== dayNumber)
                              : [...formData.daysOfWeek, dayNumber];
                            setFormData({ ...formData, daysOfWeek: newDays });
                          }}
                        >
                          {day}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                {formData.frequency === 'monthly' && (
                  <div>
                    <Label htmlFor="dayOfMonth">Day of Month</Label>
                    <Input
                      id="dayOfMonth"
                      type="number"
                      min="1"
                      max="31"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    editingSchedule ? 'Update Schedule' : 'Create Schedule'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingSchedule(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </GlassCard>
        </motion.div>
      )}

      {loading && !showForm ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : schedules.length === 0 ? (
        <GlassCard className="p-8 text-center border-2 border-dashed border-yellow-300 bg-yellow-50/10">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
          <h3 className="text-lg font-semibold mb-2 text-yellow-800">No automation schedule set</h3>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">
            You need to set up an automation schedule before you can start content generation. 
            The schedule will control when and how many keywords are processed automatically.
          </p>
          <div className="space-y-2">
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Your First Schedule
            </Button>
            <div className="text-xs text-yellow-700">
              💡 <strong>Tip:</strong> Set a daily schedule to process 5-10 keywords per day for consistent content generation
            </div>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4">
          {schedules.map((schedule) => (
            <motion.div
              key={schedule.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <GlassCard className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold">{schedule.name}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        schedule.isActive === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {schedule.isActive === 'active' ? 'Active' : 'Paused'}
                      </span>
                    </div>
                    
                    {schedule.description && (
                      <p className="text-muted-foreground mb-3">{schedule.description}</p>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Frequency:</span>
                        <p className="text-muted-foreground">{getFrequencyText(schedule)}</p>
                      </div>
                      <div>
                        <span className="font-medium">Jobs per run:</span>
                        <p className="text-muted-foreground">{schedule.jobsPerRun}</p>
                      </div>
                      <div>
                        <span className="font-medium">Start time:</span>
                        <p className="text-muted-foreground">
                          {convertUTCToLocalTime(schedule.startTime)} (Local Time)
                        </p>
                      </div>
                    </div>

                    {schedule.nextRunAt && (
                      <div className="mt-3 text-sm">
                        <span className="font-medium">Next run:</span>
                        <p className="text-muted-foreground">{formatNextRun(schedule.nextRunAt)}</p>
                      </div>
                    )}

                    {schedule.lastRunAt && (
                      <div className="mt-1 text-sm">
                        <span className="font-medium">Last run:</span>
                        <p className="text-muted-foreground">{formatNextRun(schedule.lastRunAt)}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2 ml-4">
                    {schedule.isActive === 'active' ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handlePause(schedule.id)}
                        disabled={loading}
                      >
                        <Pause className="w-4 h-4" />
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleResume(schedule.id)}
                        disabled={loading}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(schedule)}
                      disabled={loading}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(schedule.id)}
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
