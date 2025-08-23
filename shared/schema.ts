import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  settings: jsonb("settings"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const clients = pgTable("clients", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  brandName: text("brand_name").notNull(),
  email: text("email"),
  tagline: text("tagline"),
  mission: text("mission"),
  vision: text("vision"),
  coreValues: jsonb("core_values"),
  brandPurpose: text("brand_purpose"),
  usp: text("usp"),
  logo: text("logo"),
  colorPalette: jsonb("color_palette"),
  typography: jsonb("typography"),
  brandImagery: jsonb("brand_imagery"),
  videoAudioBranding: jsonb("video_audio_branding"),
  brandVoice: text("brand_voice"),
  tone: text("tone"),
  messagingPillars: jsonb("messaging_pillars"),
  elevatorPitch: text("elevator_pitch"),
  targetAudience: jsonb("target_audience"),
  demographics: jsonb("demographics"),
  locations: jsonb("locations"),
  marketPositioning: text("market_positioning"),
  competitorAnalysis: jsonb("competitor_analysis"),
  customerJourney: jsonb("customer_journey"),
  website: text("website"),
  socialMediaProfiles: jsonb("social_media_profiles"),
  coreKeywordSilos: jsonb("core_keyword_silos"),
  contentStrategy: text("content_strategy"),
  seoStrategy: text("seo_strategy"),
  adCopy: jsonb("ad_copy"),
  socialCalendar: jsonb("social_calendar"),
  emailTemplates: jsonb("email_templates"),
  brandGuidelines: text("brand_guidelines"),
  // WordPress connection fields
  wpSiteUrl: text("wp_site_url"),
  // Application Password fields
  wpUsername: text("wp_username"),
  wpAppPassword: text("wp_app_password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// New table: per-row JSON from uploaded Excel files for a client
export const clientExcels = pgTable("client_excels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  batchId: text("batch_id").notNull(),
  originalFileName: text("original_file_name"),
  rowIndex: integer("row_index").notNull(),
  data: jsonb("data").notNull(),
  automation: text("automation").notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const keywords = pgTable("keywords", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull().references(() => projects.id),
  clientId: varchar("client_id").references(() => clients.id),
  keyword: text("keyword").notNull(),
  searchVolume: integer("search_volume"),
  difficulty: integer("difficulty"),
  status: text("status").notNull().default("pending"), // pending, researched, content_created, published
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contentBriefs = pgTable("content_briefs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keywordId: varchar("keyword_id").notNull().references(() => keywords.id),
  clientId: varchar("client_id").references(() => clients.id),
  title: text("title").notNull(),
  outline: jsonb("outline"),
  targetAudience: text("target_audience"),
  tone: text("tone"),
  wordCount: integer("word_count"),
  status: text("status").notNull().default("draft"), // draft, approved, rejected
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const articles = pgTable("articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  contentBriefId: varchar("content_brief_id").notNull().references(() => contentBriefs.id),
  clientId: varchar("client_id").references(() => clients.id),
  title: text("title").notNull(),
  content: text("content").notNull(),
  seoScore: integer("seo_score"),
  status: text("status").notNull().default("draft"), // draft, review, approved, published
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const distributions = pgTable("distributions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id),
  clientId: varchar("client_id").references(() => clients.id),
  platform: text("platform").notNull(), // wordpress, twitter, linkedin, etc.
  platformId: text("platform_id"), // external platform post ID
  status: text("status").notNull().default("pending"), // pending, published, failed
  publishedAt: timestamp("published_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Recent activities feed
export const activities = pgTable("activities", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  // keyword_researched | brief_generated | article_generated | article_sent_for_approval | article_approved | article_published
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description"),
  projectId: varchar("project_id").references(() => projects.id),
  clientId: varchar("client_id").references(() => clients.id),
  keywordId: varchar("keyword_id").references(() => keywords.id),
  contentBriefId: varchar("content_brief_id").references(() => contentBriefs.id),
  articleId: varchar("article_id").references(() => articles.id),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  articleId: varchar("article_id").notNull().references(() => articles.id),
  author: text("author").notNull(),
  initials: text("initials").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").references(() => clients.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  reportType: text("report_type").notNull(), // daily, weekly, monthly
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  keywordsResearched: integer("keywords_researched").default(0),
  briefsCreated: integer("briefs_created").default(0),
  articlesWritten: integer("articles_written").default(0),
  articlesApproved: integer("articles_approved").default(0),
  articlesPublished: integer("articles_published").default(0),
  distributionPlatforms: jsonb("distribution_platforms"),
  performanceMetrics: jsonb("performance_metrics"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  clients: many(clients),
  reports: many(reports),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  user: one(users, { fields: [clients.userId], references: [users.id] }),
  keywords: many(keywords),
  contentBriefs: many(contentBriefs),
  articles: many(articles),
  distributions: many(distributions),
  reports: many(reports),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  keywords: many(keywords),
}));

export const keywordsRelations = relations(keywords, ({ one, many }) => ({
  project: one(projects, { fields: [keywords.projectId], references: [projects.id] }),
  client: one(clients, { fields: [keywords.clientId], references: [clients.id] }),
  contentBriefs: many(contentBriefs),
}));

export const contentBriefsRelations = relations(contentBriefs, ({ one, many }) => ({
  keyword: one(keywords, { fields: [contentBriefs.keywordId], references: [keywords.id] }),
  client: one(clients, { fields: [contentBriefs.clientId], references: [clients.id] }),
  articles: many(articles),
}));

export const articlesRelations = relations(articles, ({ one, many }) => ({
  contentBrief: one(contentBriefs, { fields: [articles.contentBriefId], references: [contentBriefs.id] }),
  client: one(clients, { fields: [articles.clientId], references: [clients.id] }),
  distributions: many(distributions),
  comments: many(comments),
}));

export const distributionsRelations = relations(distributions, ({ one }) => ({
  article: one(articles, { fields: [distributions.articleId], references: [articles.id] }),
  client: one(clients, { fields: [distributions.clientId], references: [clients.id] }),
}));

export const activitiesRelations = relations(activities, ({ one }) => ({
  project: one(projects, { fields: [activities.projectId], references: [projects.id] }),
  client: one(clients, { fields: [activities.clientId], references: [clients.id] }),
  keyword: one(keywords, { fields: [activities.keywordId], references: [keywords.id] }),
  contentBrief: one(contentBriefs, { fields: [activities.contentBriefId], references: [contentBriefs.id] }),
  article: one(articles, { fields: [activities.articleId], references: [articles.id] }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  article: one(articles, { fields: [comments.articleId], references: [articles.id] }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
  user: one(users, { fields: [reports.userId], references: [users.id] }),
  client: one(clients, { fields: [reports.clientId], references: [clients.id] }),
}));

// Insert and Select schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertKeywordSchema = createInsertSchema(keywords).omit({
  id: true,
  createdAt: true,
});

export const insertContentBriefSchema = createInsertSchema(contentBriefs).omit({
  id: true,
  createdAt: true,
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDistributionSchema = createInsertSchema(distributions).omit({
  id: true,
  createdAt: true,
});

export const insertActivitySchema = createInsertSchema(activities).omit({
  id: true,
  createdAt: true,
});

export const insertCommentSchema = createInsertSchema(comments).omit({
  id: true,
  createdAt: true,
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true,
  createdAt: true,
});

export const insertClientExcelSchema = createInsertSchema(clientExcels).omit({
  id: true,
  createdAt: true,
});

// Automation schedules table
export const automationSchedules = pgTable("automation_schedules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: varchar("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  description: text("description"),
  frequency: text("frequency").notNull(), // daily, weekly, monthly
  interval: integer("interval").notNull().default(1), // every X days/weeks/months
  jobsPerRun: integer("jobs_per_run").notNull().default(1), // how many jobs to process per run
  startTime: text("start_time").notNull().default("09:00"), // HH:MM format
  daysOfWeek: jsonb("days_of_week"), // [1,2,3,4,5,6,7] for weekly, null for daily/monthly
  dayOfMonth: integer("day_of_month"), // 1-31 for monthly, null for daily/weekly
  isActive: text("is_active").notNull().default("active"), // active, paused, deleted
  lastRunAt: timestamp("last_run_at"),
  nextRunAt: timestamp("next_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const automationSchedulesRelations = relations(automationSchedules, ({ one }) => ({
  client: one(clients, { fields: [automationSchedules.clientId], references: [clients.id] }),
}));

export const insertAutomationScheduleSchema = createInsertSchema(automationSchedules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastRunAt: true,
  nextRunAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywords.$inferSelect;

export type InsertContentBrief = z.infer<typeof insertContentBriefSchema>;
export type ContentBrief = typeof contentBriefs.$inferSelect;

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

export type InsertDistribution = z.infer<typeof insertDistributionSchema>;
export type Distribution = typeof distributions.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertReport = z.infer<typeof insertReportSchema>;
export type Report = typeof reports.$inferSelect;

export type InsertClientExcel = z.infer<typeof insertClientExcelSchema>;
export type ClientExcel = typeof clientExcels.$inferSelect;

export type InsertAutomationSchedule = z.infer<typeof insertAutomationScheduleSchema>;
export type AutomationSchedule = typeof automationSchedules.$inferSelect;
