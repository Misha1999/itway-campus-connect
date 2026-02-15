
-- Table for schedule deletion approval requests
CREATE TABLE public.schedule_deletion_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requested_by UUID NOT NULL,
  reviewed_by UUID,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reason TEXT NOT NULL,
  review_comment TEXT,
  event_ids UUID[] NOT NULL,
  event_snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.schedule_deletion_requests ENABLE ROW LEVEL SECURITY;

-- Campus admins can create requests
CREATE POLICY "Campus admins can create deletion requests"
  ON public.schedule_deletion_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    requested_by = auth.uid() AND
    is_admin_or_above(auth.uid()) AND
    NOT is_admin_network(auth.uid())
  );

-- Requesters can view their own requests
CREATE POLICY "Users can view own deletion requests"
  ON public.schedule_deletion_requests
  FOR SELECT
  TO authenticated
  USING (requested_by = auth.uid());

-- Network admins can view all requests
CREATE POLICY "Network admins can view all deletion requests"
  ON public.schedule_deletion_requests
  FOR SELECT
  TO authenticated
  USING (is_admin_network(auth.uid()));

-- Network admins can update (approve/reject) requests
CREATE POLICY "Network admins can review deletion requests"
  ON public.schedule_deletion_requests
  FOR UPDATE
  TO authenticated
  USING (is_admin_network(auth.uid()));
