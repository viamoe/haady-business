-- Create product_ratings table for rating and review system
CREATE TABLE IF NOT EXISTS public.product_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(product_id, user_id) -- One rating per user per product
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_ratings_product_id ON public.product_ratings(product_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_user_id ON public.product_ratings(user_id);
CREATE INDEX IF NOT EXISTS idx_product_ratings_rating ON public.product_ratings(rating);
CREATE INDEX IF NOT EXISTS idx_product_ratings_created_at ON public.product_ratings(created_at DESC);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_product_ratings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_product_ratings_updated_at
  BEFORE UPDATE ON public.product_ratings
  FOR EACH ROW
  EXECUTE FUNCTION update_product_ratings_updated_at();

-- Create function to calculate average rating and total ratings for a product
CREATE OR REPLACE FUNCTION get_product_rating_stats(product_uuid UUID)
RETURNS TABLE (
  average_rating NUMERIC,
  total_ratings BIGINT,
  rating_distribution JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0)::NUMERIC as average_rating,
    COUNT(*)::BIGINT as total_ratings,
    jsonb_build_object(
      '5', COUNT(*) FILTER (WHERE rating = 5),
      '4', COUNT(*) FILTER (WHERE rating = 4),
      '3', COUNT(*) FILTER (WHERE rating = 3),
      '2', COUNT(*) FILTER (WHERE rating = 2),
      '1', COUNT(*) FILTER (WHERE rating = 1)
    ) as rating_distribution
  FROM public.product_ratings
  WHERE product_id = product_uuid;
END;
$$ LANGUAGE plpgsql;

-- Enable RLS
ALTER TABLE public.product_ratings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view all ratings
CREATE POLICY "Anyone can view product ratings"
  ON public.product_ratings
  FOR SELECT
  USING (true);

-- Users can insert their own ratings
CREATE POLICY "Users can create their own ratings"
  ON public.product_ratings
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own ratings
CREATE POLICY "Users can update their own ratings"
  ON public.product_ratings
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own ratings
CREATE POLICY "Users can delete their own ratings"
  ON public.product_ratings
  FOR DELETE
  USING (auth.uid() = user_id);

-- Store owners can view ratings for their products
CREATE POLICY "Store owners can view ratings for their products"
  ON public.product_ratings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_ratings.product_id
      AND p.store_id IN (
        SELECT store_id FROM public.store_connections
        WHERE user_id = auth.uid()
      )
    )
  );

