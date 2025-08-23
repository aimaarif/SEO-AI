import { 
  type User, 
  type InsertUser,
  type Project,
  type InsertProject,
  type Keyword,
  type InsertKeyword,
  type ContentBrief,
  type InsertContentBrief,
  type Article,
  type InsertArticle,
  type Distribution,
  type InsertDistribution,
  type Comment,
  type InsertComment,
  type Activity,
  type InsertActivity,
  type Client,
  type InsertClient,
  users,
  projects,
  clients,
  keywords,
  contentBriefs,
  articles,
  distributions,
  comments,
  activities,
  clientExcels,
  automationSchedules
} from "../shared/schema.js";
import { db } from "./db";
import { eq, and, desc } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  // Client methods
  getClients(): Promise<Client[]>;
  getClient(id: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: string, client: Partial<InsertClient>): Promise<Client>;
  deleteClient(id: string): Promise<void>;

  // Project methods
  getProjects(userId: string): Promise<Project[]>;
  getProject(id: string): Promise<Project | undefined>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: string, project: Partial<InsertProject>): Promise<Project>;
  deleteProject(id: string): Promise<void>;

  // Keyword methods
  getKeywords(projectId: string): Promise<Keyword[]>;
  getKeyword(id: string): Promise<Keyword | undefined>;
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  updateKeyword(id: string, keyword: Partial<InsertKeyword>): Promise<Keyword>;
  deleteKeyword(id: string): Promise<void>;

  // Content Brief methods
  getContentBriefs(keywordId?: string): Promise<ContentBrief[]>;
  getContentBrief(id: string): Promise<ContentBrief | undefined>;
  createContentBrief(brief: InsertContentBrief): Promise<ContentBrief>;
  updateContentBrief(id: string, brief: Partial<InsertContentBrief>): Promise<ContentBrief>;
  deleteContentBrief(id: string): Promise<void>;

  // Article methods
  getArticles(contentBriefId?: string): Promise<Article[]>;
  getArticle(id: string): Promise<Article | undefined>;
  createArticle(article: InsertArticle): Promise<Article>;
  updateArticle(id: string, article: Partial<InsertArticle>): Promise<Article>;
  deleteArticle(id: string): Promise<void>;

  // Distribution methods
  getDistributions(articleId?: string): Promise<Distribution[]>;
  getDistribution(id: string): Promise<Distribution | undefined>;
  createDistribution(distribution: InsertDistribution): Promise<Distribution>;
  updateDistribution(id: string, distribution: Partial<InsertDistribution>): Promise<Distribution>;
  deleteDistribution(id: string): Promise<void>;

  // Comment methods
  getComments(articleId: string): Promise<Comment[]>;
  getComment(id: string): Promise<Comment | undefined>;
  createComment(comment: InsertComment): Promise<Comment>;
  updateComment(id: string, comment: Partial<InsertComment>): Promise<Comment>;
  deleteComment(id: string): Promise<void>;

  // Activity methods
  getActivities(options?: { projectId?: string; limit?: number }): Promise<Activity[]>;
  createActivity(activity: InsertActivity): Promise<Activity>;

  // Client Excel methods
  getClientExcelRows(clientId: string, status?: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  // User methods
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // Client methods
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients).orderBy(desc(clients.createdAt));
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: string, updateData: Partial<InsertClient>): Promise<Client> {
    const [client] = await db.update(clients)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(clients.id, id))
      .returning();
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  // Project methods
  async getProjects(userId: string): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.userId, userId)).orderBy(desc(projects.createdAt));
  }

  async getProject(id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values(insertProject).returning();
    return project;
  }

  async updateProject(id: string, updateData: Partial<InsertProject>): Promise<Project> {
    const [project] = await db.update(projects)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(projects.id, id))
      .returning();
    return project;
  }

  async deleteProject(id: string): Promise<void> {
    await db.delete(projects).where(eq(projects.id, id));
  }

  // Keyword methods
  async getKeywords(projectId: string): Promise<Keyword[]> {
    return await db.select().from(keywords).where(eq(keywords.projectId, projectId)).orderBy(desc(keywords.createdAt));
  }

  async getKeyword(id: string): Promise<Keyword | undefined> {
    const [keyword] = await db.select().from(keywords).where(eq(keywords.id, id));
    return keyword || undefined;
  }

  async createKeyword(insertKeyword: InsertKeyword): Promise<Keyword> {
    const [keyword] = await db.insert(keywords).values(insertKeyword).returning();
    return keyword;
  }

  async updateKeyword(id: string, updateData: Partial<InsertKeyword>): Promise<Keyword> {
    const [keyword] = await db.update(keywords)
      .set(updateData)
      .where(eq(keywords.id, id))
      .returning();
    return keyword;
  }

  async deleteKeyword(id: string): Promise<void> {
    await db.delete(keywords).where(eq(keywords.id, id));
  }

  // Content Brief methods
  async getContentBriefs(keywordId?: string): Promise<ContentBrief[]> {
    const query = db.select().from(contentBriefs);
    if (keywordId) {
      return await query.where(eq(contentBriefs.keywordId, keywordId)).orderBy(desc(contentBriefs.createdAt));
    }
    return await query.orderBy(desc(contentBriefs.createdAt));
  }

  async getContentBrief(id: string): Promise<ContentBrief | undefined> {
    const [brief] = await db.select().from(contentBriefs).where(eq(contentBriefs.id, id));
    return brief || undefined;
  }

  async createContentBrief(insertBrief: InsertContentBrief): Promise<ContentBrief> {
    const [brief] = await db.insert(contentBriefs).values(insertBrief).returning();
    return brief;
  }

  async updateContentBrief(id: string, updateData: Partial<InsertContentBrief>): Promise<ContentBrief> {
    const [brief] = await db.update(contentBriefs)
      .set(updateData)
      .where(eq(contentBriefs.id, id))
      .returning();
    return brief;
  }

  async deleteContentBrief(id: string): Promise<void> {
    await db.delete(contentBriefs).where(eq(contentBriefs.id, id));
  }

  // Article methods
  async getArticles(contentBriefId?: string): Promise<Article[]> {
    const query = db.select().from(articles);
    if (contentBriefId) {
      return await query.where(eq(articles.contentBriefId, contentBriefId)).orderBy(desc(articles.createdAt));
    }
    return await query.orderBy(desc(articles.createdAt));
  }

  async getArticle(id: string): Promise<Article | undefined> {
    const [article] = await db.select().from(articles).where(eq(articles.id, id));
    return article || undefined;
  }

  async createArticle(insertArticle: InsertArticle): Promise<Article> {
    const [article] = await db.insert(articles).values(insertArticle).returning();
    return article;
  }

  async updateArticle(id: string, updateData: Partial<InsertArticle>): Promise<Article> {
    const [article] = await db.update(articles)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(articles.id, id))
      .returning();
    return article;
  }

  async deleteArticle(id: string): Promise<void> {
    await db.delete(articles).where(eq(articles.id, id));
  }

  // Distribution methods
  async getDistributions(articleId?: string): Promise<Distribution[]> {
    const query = db.select().from(distributions);
    if (articleId) {
      return await query.where(eq(distributions.articleId, articleId)).orderBy(desc(distributions.createdAt));
    }
    return await query.orderBy(desc(distributions.createdAt));
  }

  async getDistribution(id: string): Promise<Distribution | undefined> {
    const [distribution] = await db.select().from(distributions).where(eq(distributions.id, id));
    return distribution || undefined;
  }

  async createDistribution(insertDistribution: InsertDistribution): Promise<Distribution> {
    const [distribution] = await db.insert(distributions).values(insertDistribution).returning();
    return distribution;
  }

  async updateDistribution(id: string, updateData: Partial<InsertDistribution>): Promise<Distribution> {
    const [distribution] = await db.update(distributions)
      .set(updateData)
      .where(eq(distributions.id, id))
      .returning();
    return distribution;
  }

  async deleteDistribution(id: string): Promise<void> {
    await db.delete(distributions).where(eq(distributions.id, id));
  }

  // Comment methods
  async getComments(articleId: string): Promise<Comment[]> {
    return await db.select().from(comments).where(eq(comments.articleId, articleId)).orderBy(desc(comments.createdAt));
  }

  async getComment(id: string): Promise<Comment | undefined> {
    const [comment] = await db.select().from(comments).where(eq(comments.id, id));
    return comment || undefined;
  }

  async createComment(insertComment: InsertComment): Promise<Comment> {
    const [comment] = await db.insert(comments).values(insertComment).returning();
    console.log('Comment created in database:', comment);
    console.log('Comment timestamp from DB:', comment.createdAt);
    return comment;
  }

  async updateComment(id: string, updateData: Partial<InsertComment>): Promise<Comment> {
    const [comment] = await db.update(comments)
      .set(updateData)
      .where(eq(comments.id, id))
      .returning();
    return comment;
  }

  async deleteComment(id: string): Promise<void> {
    await db.delete(comments).where(eq(comments.id, id));
  }

  // Activity methods
  async getActivities(options?: { projectId?: string; limit?: number }): Promise<Activity[]> {
    const limit = options?.limit ?? 10;
    if (options?.projectId) {
      return await db
        .select()
        .from(activities)
        .where(eq(activities.projectId, options.projectId))
        .orderBy(desc(activities.createdAt))
        .limit(limit);
    }
    return await db
      .select()
      .from(activities)
      .orderBy(desc(activities.createdAt))
      .limit(limit);
  }

  async createActivity(insertActivity: InsertActivity): Promise<Activity> {
    const [activity] = await db.insert(activities).values(insertActivity).returning();
    return activity;
  }

  // Client Excel methods
  async getClientExcelRows(clientId: string, status?: string): Promise<any[]> {
    const query = db.select().from(clientExcels).where(eq(clientExcels.clientId, clientId));
    
    if (status) {
      return await query.where(eq(clientExcels.automation, status)).orderBy(clientExcels.createdAt);
    }
    
    return await query.orderBy(clientExcels.createdAt);
  }

  async hasPendingJobs(clientId: string): Promise<boolean> {
    const [result] = await db.select({ count: sql`count(*)` })
      .from(clientExcels)
      .where(and(
        eq(clientExcels.clientId, clientId),
        eq(clientExcels.automation, 'pending')
      ));
    
    return (result?.count as number) > 0;
  }

  // Automation Schedule methods
  async getAutomationSchedules(clientId?: string): Promise<any[]> {
    const query = db.select().from(automationSchedules);
    
    if (clientId) {
      return await query.where(eq(automationSchedules.clientId, clientId)).orderBy(automationSchedules.createdAt);
    }
    
    return await query.orderBy(automationSchedules.createdAt);
  }

  async getActiveSchedules(): Promise<any[]> {
    return await db.select()
      .from(automationSchedules)
      .where(eq(automationSchedules.isActive, 'active'))
      .orderBy(automationSchedules.nextRunAt);
  }

  async getAutomationSchedule(id: string): Promise<any | undefined> {
    const [schedule] = await db.select().from(automationSchedules).where(eq(automationSchedules.id, id));
    return schedule || undefined;
  }

  async createAutomationSchedule(insertSchedule: any): Promise<any> {
    const [schedule] = await db.insert(automationSchedules).values(insertSchedule).returning();
    return schedule;
  }

  async updateAutomationSchedule(id: string, updateData: any): Promise<any> {
    const [schedule] = await db.update(automationSchedules)
      .set({ ...updateData, updatedAt: new Date() })
      .where(eq(automationSchedules.id, id))
      .returning();
    return schedule;
  }

  async deleteAutomationSchedule(id: string): Promise<void> {
    await db.delete(automationSchedules).where(eq(automationSchedules.id, id));
  }

  async getActiveSchedules(): Promise<any[]> {
    return await db.select()
      .from(automationSchedules)
      .where(eq(automationSchedules.isActive, 'active'))
      .orderBy(automationSchedules.nextRunAt);
  }

  async updateScheduleNextRun(id: string, nextRunAt: Date): Promise<void> {
    await db.update(automationSchedules)
      .set({ nextRunAt, updatedAt: new Date() })
      .where(eq(automationSchedules.id, id));
  }

  async updateScheduleLastRun(id: string, lastRunAt: Date): Promise<void> {
    await db.update(automationSchedules)
      .set({ lastRunAt, updatedAt: new Date() })
      .where(eq(automationSchedules.id, id));
  }
}

export const storage = new DatabaseStorage();
