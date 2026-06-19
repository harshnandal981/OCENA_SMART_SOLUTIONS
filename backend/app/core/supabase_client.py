from supabase import Client, create_client

from app.core.config import settings

supabase: Client | None = None

if settings.supabase_url and settings.supabase_service_role_key:
    supabase = create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
