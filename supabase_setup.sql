-- Create a table for food cravings
CREATE TABLE food_cravings (
  id BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  text TEXT NOT NULL,
  recommendation TEXT
);

-- Enable Row Level Security (RLS)
ALTER TABLE food_cravings ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows anonymous read access
CREATE POLICY "Allow anonymous read access"
  ON food_cravings
  FOR SELECT
  TO anon
  USING (true);

-- Create a policy that allows anonymous insert access
CREATE POLICY "Allow anonymous insert access"
  ON food_cravings
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Create a policy that allows anonymous update access
CREATE POLICY "Allow anonymous update access"
  ON food_cravings
  FOR UPDATE
  TO anon
  USING (true);

-- Create a users table that references the auth.users table
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  preferences JSONB DEFAULT '{}'::jsonb
);

-- Create a secure RLS policy for the users table
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view and update only their own data
CREATE POLICY "Users can view their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- Allow authenticated users to insert their own data
CREATE POLICY "Users can insert their own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Allow the trigger function to insert data without RLS restrictions
CREATE POLICY "Allow trigger function to insert user data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (TRUE);

-- Create a trigger to automatically update the updated_at field
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id, 
    NEW.email,
    NEW.raw_user_meta_data->>'full_name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create a user profile when a new user signs up
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Create a table for storing user food preferences
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  cuisine_type TEXT,
  dietary_restriction TEXT,
  spice_level INTEGER,
  price_range INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on user_preferences
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies for user_preferences
CREATE POLICY "Users can view their own preferences" 
  ON public.user_preferences 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" 
  ON public.user_preferences 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" 
  ON public.user_preferences 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences" 
  ON public.user_preferences 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Create a table for storing user saved restaurants
CREATE TABLE IF NOT EXISTS public.saved_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  restaurant_id TEXT NOT NULL,
  restaurant_name TEXT NOT NULL,
  restaurant_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on saved_restaurants
ALTER TABLE public.saved_restaurants ENABLE ROW LEVEL SECURITY;

-- Create policies for saved_restaurants
CREATE POLICY "Users can view their own saved restaurants" 
  ON public.saved_restaurants 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own saved restaurants" 
  ON public.saved_restaurants 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved restaurants" 
  ON public.saved_restaurants 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add a unique constraint to prevent duplicate saved restaurants
ALTER TABLE public.saved_restaurants 
  ADD CONSTRAINT unique_user_restaurant 
  UNIQUE (user_id, restaurant_id);

-- Update the food_cravings table to link to users
ALTER TABLE public.food_cravings 
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES public.users(id) ON DELETE SET NULL;

-- Update RLS policies for food_cravings to respect user ownership
CREATE POLICY "Users can view their own cravings" 
  ON public.food_cravings 
  FOR SELECT 
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own cravings" 
  ON public.food_cravings 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL); 