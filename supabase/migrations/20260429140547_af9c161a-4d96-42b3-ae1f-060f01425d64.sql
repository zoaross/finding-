CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY,
  username TEXT,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  language TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can create own profile" ON public.profiles;
CREATE POLICY "Users can create own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.needs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'matching',
  is_archived BOOLEAN NOT NULL DEFAULT false,
  parsed_intent JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_needs_user_id_created_at ON public.needs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_needs_active_created_at ON public.needs(is_archived, created_at DESC);

ALTER TABLE public.needs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can view active needs and own needs" ON public.needs;
CREATE POLICY "Authenticated users can view active needs and own needs"
ON public.needs
FOR SELECT
TO authenticated
USING (is_archived = false OR auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own needs" ON public.needs;
CREATE POLICY "Users can create own needs"
ON public.needs
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own needs" ON public.needs;
CREATE POLICY "Users can update own needs"
ON public.needs
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_needs_updated_at ON public.needs;
CREATE TRIGGER update_needs_updated_at
BEFORE UPDATE ON public.needs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id TEXT UNIQUE,
  participant_one_id UUID NOT NULL,
  participant_two_id UUID,
  partner_name TEXT,
  match_tag TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_matches_participant_one ON public.matches(participant_one_id);
CREATE INDEX IF NOT EXISTS idx_matches_participant_two ON public.matches(participant_two_id);

ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own matches" ON public.matches;
CREATE POLICY "Users can view own matches"
ON public.matches
FOR SELECT
TO authenticated
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

DROP POLICY IF EXISTS "Users can create own matches" ON public.matches;
CREATE POLICY "Users can create own matches"
ON public.matches
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = participant_one_id);

DROP POLICY IF EXISTS "Users can update own matches" ON public.matches;
CREATE POLICY "Users can update own matches"
ON public.matches
FOR UPDATE
TO authenticated
USING (auth.uid() = participant_one_id OR auth.uid() = participant_two_id)
WITH CHECK (auth.uid() = participant_one_id OR auth.uid() = participant_two_id);

DROP TRIGGER IF EXISTS update_matches_updated_at ON public.matches;
CREATE TRIGGER update_matches_updated_at
BEFORE UPDATE ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_messages_match_created_at ON public.messages(match_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_messages_sender_id ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view messages in own matches" ON public.messages;
CREATE POLICY "Users can view messages in own matches"
ON public.messages
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.participant_one_id = auth.uid() OR m.participant_two_id = auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can send messages in own matches" ON public.messages;
CREATE POLICY "Users can send messages in own matches"
ON public.messages
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = sender_id
  AND EXISTS (
    SELECT 1 FROM public.matches m
    WHERE m.id = messages.match_id
      AND (m.participant_one_id = auth.uid() OR m.participant_two_id = auth.uid())
  )
);

CREATE TABLE IF NOT EXISTS public.conversation_ratings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rater_id UUID NOT NULL,
  conversation_id TEXT NOT NULL,
  partner_name TEXT,
  match_tag TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (rater_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_conversation_ratings_rater ON public.conversation_ratings(rater_id, created_at DESC);

ALTER TABLE public.conversation_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own conversation ratings" ON public.conversation_ratings;
CREATE POLICY "Users can view own conversation ratings"
ON public.conversation_ratings
FOR SELECT
TO authenticated
USING (auth.uid() = rater_id);

DROP POLICY IF EXISTS "Users can create own conversation ratings" ON public.conversation_ratings;
CREATE POLICY "Users can create own conversation ratings"
ON public.conversation_ratings
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = rater_id);

DROP POLICY IF EXISTS "Users can update own conversation ratings" ON public.conversation_ratings;
CREATE POLICY "Users can update own conversation ratings"
ON public.conversation_ratings
FOR UPDATE
TO authenticated
USING (auth.uid() = rater_id)
WITH CHECK (auth.uid() = rater_id);

DROP TRIGGER IF EXISTS update_conversation_ratings_updated_at ON public.conversation_ratings;
CREATE TRIGGER update_conversation_ratings_updated_at
BEFORE UPDATE ON public.conversation_ratings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects
FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);