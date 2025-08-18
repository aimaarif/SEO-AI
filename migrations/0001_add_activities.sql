-- Create activities table for recent activity feed
CREATE TABLE IF NOT EXISTS activities (
  id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL,
  title text NOT NULL,
  description text,
  project_id varchar REFERENCES projects(id),
  client_id varchar REFERENCES clients(id),
  keyword_id varchar REFERENCES keywords(id),
  content_brief_id varchar REFERENCES content_briefs(id),
  article_id varchar REFERENCES articles(id),
  metadata jsonb,
  created_at timestamp DEFAULT now() NOT NULL
);

-- Performance index for latest-first queries
CREATE INDEX IF NOT EXISTS idx_activities_created_at ON activities (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_project_id_created_at ON activities (project_id, created_at DESC);

