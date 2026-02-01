-- Add email_domain column to campuses table
ALTER TABLE public.campuses ADD COLUMN email_domain text;

-- Add comment for documentation
COMMENT ON COLUMN public.campuses.email_domain IS 'Email domain for generating user logins, e.g. itway.dolyna.ua';