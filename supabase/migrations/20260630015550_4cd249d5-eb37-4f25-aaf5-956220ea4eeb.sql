ALTER TYPE public.order_event_type ADD VALUE IF NOT EXISTS 'payment_initiated';
ALTER TYPE public.order_event_type ADD VALUE IF NOT EXISTS 'payment_succeeded';
ALTER TYPE public.order_event_type ADD VALUE IF NOT EXISTS 'payment_failed';
ALTER TYPE public.order_event_type ADD VALUE IF NOT EXISTS 'payment_refunded';