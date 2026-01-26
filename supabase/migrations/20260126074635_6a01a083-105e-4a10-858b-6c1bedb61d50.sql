-- Fix overly permissive INSERT policies for notifications and audit_logs

-- Drop the overly permissive policies
DROP POLICY IF EXISTS "Authenticated users can create notifications" ON public.notifications;
DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;

-- Create more restrictive INSERT policies

-- Notifications: Users can only create notifications for others if they are teachers/admins
-- Or the system can create notifications (via service role)
CREATE POLICY "Teachers and admins can create notifications" ON public.notifications
  FOR INSERT TO authenticated 
  WITH CHECK (
    public.has_role(auth.uid(), 'teacher') 
    OR public.is_admin_or_above(auth.uid())
  );

-- Audit logs: Only admins can insert audit logs directly
-- (In practice, this would be done via triggers or service role)
CREATE POLICY "Admins can insert audit logs" ON public.audit_logs
  FOR INSERT TO authenticated 
  WITH CHECK (public.is_admin_or_above(auth.uid()));