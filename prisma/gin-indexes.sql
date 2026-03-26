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
  USING GIN (to_tsvector('simple', "vendorName" || ' ' || COALESCE(comment, '')));
