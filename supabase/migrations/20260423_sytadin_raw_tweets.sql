CREATE TABLE IF NOT EXISTS public.sytadin_raw_tweets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tweet_id text NOT NULL UNIQUE,
  content text NOT NULL,
  tweet_created_at timestamptz NOT NULL,
  scraped_at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'sytadin',
  source_url text
);

CREATE INDEX IF NOT EXISTS idx_sytadin_raw_tweets_created_at
  ON public.sytadin_raw_tweets (tweet_created_at DESC);

ALTER TABLE public.sytadin_raw_tweets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read raw sytadin tweets" ON public.sytadin_raw_tweets
  FOR SELECT USING (true);

CREATE POLICY "Allow service insert raw sytadin tweets" ON public.sytadin_raw_tweets
  FOR INSERT WITH CHECK (true);
