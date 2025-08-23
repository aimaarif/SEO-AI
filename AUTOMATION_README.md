# SEO Automation System

A comprehensive Node.js automation system for SEO content generation using BullMQ, Redis, and PostgreSQL.

## 🏗️ Architecture

The system consists of several key components:

- **Redis**: Job queue storage and management
- **BullMQ**: Job queue processing with retry logic and exponential backoff
- **PostgreSQL**: Persistent storage for clients, keywords, and automation status
- **Express API**: REST endpoints for managing automation workflows
- **Workers**: Background job processors for content generation

## 🚀 Quick Start

### 1. Start Redis with Docker

```bash
# Start Redis container
docker-compose up -d redis

# Verify Redis is running
docker-compose ps
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Variables

Create a `.env` file in the root directory:

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Server Configuration
SERVER_URL=http://localhost:5000
CLIENT_URL=http://localhost:5173

# API Keys (optional for testing)
OPENAI_API_KEY=your-openai-api-key-here
SERP_API_KEY=your-serp-api-key-here
```

### 4. Database Setup

```bash
# Push database schema
npm run db:push
```

### 5. Start the System

```bash
# Terminal 1: Start the main server
npm run dev

# Terminal 2: Start the automation worker
npm run worker

# Terminal 3: Monitor queues (optional)
npm run queue:monitor
```

## 📊 System Components

### Queue Structure

The system uses multiple queues for different stages of the automation process:

1. **`seo-automation`**: Main orchestration queue
2. **`brief-generation`**: Content brief creation
3. **`article-generation`**: Article generation from briefs
4. **`approval-process`**: Email approval workflow
5. **`publishing`**: WordPress publishing

### Job Types

- `process-excel-row`: Main automation job for each Excel row
- `generate-brief`: Create content brief from keyword
- `generate-article`: Generate article from brief
- `send-for-approval`: Send article for client approval
- `publish-article`: Publish to WordPress

## 🔄 Automation Workflow

### 1. Excel Upload
- Client uploads Excel file with keywords
- System parses and stores rows in `client_excels` table
- Each row contains: `keyword`, `content_type?`, `target_audience?`
- Initial status: `automation: 'pending'`

### 2. Start Automation
- Client clicks "Start Automation" on dashboard OR
- **Scheduled automation runs automatically** based on configured schedules
- System starts the automation worker if not already running
- System fetches all pending rows for the **selected client only**
- Enqueues jobs in the automation queue (respects job limits for scheduled runs)
- Updates status to `automation: 'processing'`

### 3. Content Generation
- Worker processes each row sequentially
- **Only processes keywords for the selected client**
- Generates content brief using existing API
- Creates article from brief
- Sends for approval (automated for demo)

### 4. Publishing
- Auto-approves and publishes to WordPress
- Updates status to `automation: 'done'`
- Records success/failure in activities

## 📡 API Endpoints

### Automation Management

```http
# Start automation for a client
POST /api/automation/start/:clientId

# Get automation status for a client
GET /api/automation/status/:clientId

# Get overall queue status
GET /api/automation/queues/status

# Pause all queues
POST /api/automation/queues/pause

# Resume all queues
POST /api/automation/queues/resume

# Clear all queues (use with caution)
POST /api/automation/queues/clear
```

### Excel Management

```http
# Upload Excel file
POST /api/clients/:clientId/upload-excel
Body: { fileName: string, base64: string }

# Get client Excel data
GET /api/clients/:clientId/excel
```

## 🛠️ Development

### Running Workers

```bash
# Load automation worker (doesn't start automatically)
npm run worker

# Start automation worker explicitly
npm run worker:start

# Start queue monitor
npm run queue:monitor
```

### Worker Management

The automation worker now starts **only when needed**:

1. **Manual Start**: Use the "Start Automation" button in the dashboard
2. **Automatic Start**: Worker starts automatically when automation is triggered
3. **Programmatic Control**: Use the worker management API endpoints

### Schedule Management

The system includes a powerful scheduling system for automated content generation:

1. **Daily Schedules**: Run automation every X days at a specific time
2. **Weekly Schedules**: Run automation on specific days of the week
3. **Monthly Schedules**: Run automation on specific days of the month
4. **Job Limits**: Control how many jobs to process per scheduled run
5. **Pause/Resume**: Temporarily stop and restart schedules
6. **Real-time Monitoring**: Track next run times and execution history

**Schedule Features:**
- **Frequency**: Daily, weekly, or monthly
- **Interval**: Every X days/weeks/months
- **Time Control**: Specific start time (HH:MM format)
- **Day Selection**: For weekly schedules, choose specific days
- **Date Selection**: For monthly schedules, choose specific dates
- **Job Limits**: Maximum jobs to process per run
- **Status Tracking**: Active, paused, or deleted states

**Worker Management Endpoints:**
```bash
# Start worker
POST /api/automation/worker/start

# Stop worker  
POST /api/automation/worker/stop

# Check worker status
GET /api/automation/worker/status
```

**Schedule Management Endpoints:**
```bash
# Get schedules for a client
GET /api/automation/schedules/:clientId

# Create new schedule
POST /api/automation/schedules

# Update schedule
PUT /api/automation/schedules/:id

# Delete schedule
DELETE /api/automation/schedules/:id

# Pause schedule
POST /api/automation/schedules/:id/pause

# Resume schedule
POST /api/automation/schedules/:id/resume

# Scheduler management
GET /api/automation/scheduler/status
POST /api/automation/scheduler/start
POST /api/automation/scheduler/stop
```

### Queue Monitoring

The queue monitor provides real-time insights:

- Job counts by status (waiting, active, completed, failed)
- Redis connection status
- Memory usage statistics
- Failed job details with retry options

### Error Handling

- **Retry Logic**: Failed jobs are retried with exponential backoff
- **Status Tracking**: Each row tracks automation progress
- **Activity Logging**: All actions are recorded for audit trails
- **Graceful Degradation**: System continues processing other jobs if one fails

## 🔧 Configuration

### Worker Configuration

```typescript
const WORKER_CONFIG = {
  concurrency: 1,        // Process one job at a time
  removeOnComplete: 100,  // Keep last 100 completed jobs
  removeOnFail: 50,       // Keep last 50 failed jobs
};
```

### Queue Configuration

```typescript
// Main automation queue
automationQueue: {
  attempts: 3,           // Retry failed jobs 3 times
  backoff: {
    type: 'exponential',
    delay: 2000,         // Start with 2 seconds
  },
  delay: 1000,           // 1 second between jobs
}
```

## 📈 Monitoring & Debugging

### Queue Statistics

```bash
# Get real-time queue status
curl http://localhost:5000/api/automation/queues/status

# Monitor specific client automation
curl http://localhost:5000/api/automation/status/{clientId}
```

### Logs

The system provides detailed logging:

- 🚀 Job enqueuing
- 🔄 Job processing
- ✅ Job completion
- ❌ Job failures
- ⚠️ Warnings and stalls

### Health Checks

```bash
# System health endpoint (via monitor)
npm run queue:monitor
```

## 🚨 Troubleshooting

### Common Issues

1. **Redis Connection Failed**
   - Ensure Redis container is running: `docker-compose ps`
   - Check Redis logs: `docker-compose logs redis`

2. **Jobs Not Processing**
   - Verify worker is running: `npm run worker`
   - Check queue status: `GET /api/automation/queues/status`

3. **Database Errors**
   - Ensure schema is up to date: `npm run db:push`
   - Check database connection in `server/db.ts`

4. **API Failures**
   - Verify environment variables are set
   - Check API key configurations

### Debug Mode

Enable verbose logging by setting:

```env
NODE_ENV=development
DEBUG=automation:*
```

## 🔒 Security Considerations

- **API Keys**: Store sensitive keys in environment variables
- **Database**: Use parameterized queries (already implemented)
- **Rate Limiting**: Consider adding rate limiting for production
- **Authentication**: Implement proper auth for production use

## 📚 Dependencies

### Core Dependencies
- `bullmq`: Job queue management
- `ioredis`: Redis client
- `express`: Web framework
- `drizzle-orm`: Database ORM
- `postgres`: PostgreSQL client

### Development Dependencies
- `typescript`: Type safety
- `tsx`: TypeScript execution
- `@types/node`: Node.js types

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
# Example Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

### Environment Variables

```env
# Production Redis
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# Production URLs
SERVER_URL=https://your-api-domain.com
CLIENT_URL=https://your-frontend-domain.com

# API Keys
OPENAI_API_KEY=your-production-openai-key
SERP_API_KEY=your-production-serp-key
```

### Scaling

- **Workers**: Run multiple worker instances for higher throughput
- **Redis**: Use Redis Cluster for high availability
- **Database**: Implement connection pooling and read replicas

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:

1. Check the troubleshooting section
2. Review the logs for error details
3. Check Redis and database connectivity
4. Verify environment variable configuration

---

**Happy Automating! 🚀**
