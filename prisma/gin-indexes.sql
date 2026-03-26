-- PostgreSQL GIN indexes for full-text search
-- Run after prisma db push: psql $DATABASE_URL -f prisma/gin-indexes.sql

-- Forum threads: search by title + content
CREATE INDEX IF NOT EXISTS idx_forum_thread_fts
  ON "ForumThread"
  USING GIN (to_tsvector('simple', title || ' ' || content));

-- Forum replies: search by content
CREATE INDEX IF NOT EXISTS idx_forum_reply_fts
  ON "ForumReply"
  USING GIN (to_tsvector('simple', content));

-- Wiki articles: search by title + content
CREATE INDEX IF NOT EXISTS idx_wiki_article_fts
  ON "WikiArticle"
  USING GIN (to_tsvector('simple', title || ' ' || content));

-- Vendor reviews: search by vendor name + comment
CREATE INDEX IF NOT EXISTS idx_vendor_review_fts
  ON "VendorReview"
  USING GIN (to_tsvector('simple', "vendorName" || ' ' || COALESCE(comment, ''));

-- ─── Performance Indexes (PROMPT 18) ────────────────────────

-- Company: GIN trigram index for fuzzy name search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_company_name_trgm
  ON "Company"
  USING GIN (name gin_trgm_ops);

-- Company: full-text search on name + description
CREATE INDEX IF NOT EXISTS idx_company_name_fts
  ON "Company"
  USING GIN (to_tsvector('simple', name || ' ' || COALESCE(description, '')));

-- Tender: full-text search on title + institution
CREATE INDEX IF NOT EXISTS idx_tender_fts
  ON "Tender"
  USING GIN (to_tsvector('simple', title || ' ' || institution || ' ' || COALESCE(description, '')));

-- Tender: partial index for active tenders (most queried)
CREATE INDEX IF NOT EXISTS idx_tender_active
  ON "Tender" (deadline DESC)
  WHERE status IN ('BASVURU_ACIK', 'YAKLASAN');

-- CachedData: provider + expiry for cache cleanup
CREATE INDEX IF NOT EXISTS idx_cached_data_provider_expires
  ON "CachedData" (provider, "expiresAt");

-- AuditLog: userId + createdAt for user activity queries
CREATE INDEX IF NOT EXISTS idx_audit_log_user_created
  ON "AuditLog" ("userId", "createdAt" DESC);

-- Notification: userId + isRead for unread count
CREATE INDEX IF NOT EXISTS idx_notification_user_unread
  ON "Notification" ("userId", "isRead")
  WHERE "isRead" = false;

-- Bid: userId + createdAt for user's bid history
CREATE INDEX IF NOT EXISTS idx_bid_user_created
  ON "Bid" ("userId", "createdAt" DESC);
