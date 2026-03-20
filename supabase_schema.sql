-- Create the brokers table for lead rotation
CREATE TABLE IF NOT EXISTS public.brokers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_assigned_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.brokers ENABLE ROW LEVEL SECURITY;

-- Create policies (Adjust as needed for your specific security requirements)
-- Policy to allow authenticated users to read and update brokers
CREATE POLICY "Allow authenticated users to read brokers"
ON public.brokers FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to insert brokers"
ON public.brokers FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Allow authenticated users to update brokers"
ON public.brokers FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated users to delete brokers"
ON public.brokers FOR DELETE
TO authenticated
USING (true);

-- Also allow public access for SELECT and UPDATE if your rotation happens on the client side without auth
-- WARNING: In a production environment, you should use a more secure approach (e.g., Supabase Edge Functions)
CREATE POLICY "Allow public read-only access to brokers"
ON public.brokers FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "Allow public update to update last_assigned_at"
ON public.brokers FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);
