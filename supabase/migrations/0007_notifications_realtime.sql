-- Enable Supabase Realtime on aurzo_core.notifications so every Aurzo
-- app's notification bell lights up the moment a new notification lands —
-- no polling, no refresh.
alter publication supabase_realtime add table aurzo_core.notifications;
