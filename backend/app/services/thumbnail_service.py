import base64
import traceback
import uuid
from urllib.parse import quote_plus

import httpx

from app.core.config import settings
from app.core.supabase_client import supabase


class ThumbnailService:
    async def generate_course_thumbnail_url(
        self,
        *,
        topic: str,
        title: str,
        audience: str,
    ) -> str | None:
        if not settings.gemini_api_key:
            return None

        image_asset = await self._try_generate_with_gemini(
            topic=topic,
            title=title,
            audience=audience,
        )
        if image_asset is not None:
            public_url = self._upload_to_supabase_storage(
                content=image_asset["bytes"],
                mime_type=image_asset["mime_type"],
                topic=topic,
            )
            if public_url:
                return public_url

        unsplash_url = await self._try_unsplash_thumbnail(
            topic=topic,
            title=title,
            audience=audience,
        )
        if unsplash_url:
            return unsplash_url

        return self._build_placeholder_url(topic)

    async def _try_generate_with_gemini(
        self,
        *,
        topic: str,
        title: str,
        audience: str,
    ) -> dict[str, bytes | str] | None:
        prompt = f"""
Create a modern educational course thumbnail.
Subject: {topic}
Course title: {title}
Audience: {audience}

Style requirements:
- clean editorial composition
- landscape thumbnail
- academic but modern
- no watermarks
- no readable text
- visually suitable for an online learning platform
""".strip()

        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "responseModalities": ["TEXT", "IMAGE"],
            },
        }

        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{settings.gemini_image_model}:generateContent?key={settings.gemini_api_key}"
        )
        response = None

        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(url, json=payload)
            if response.status_code >= 400:
                return None

            data = response.json()
            parts = data["candidates"][0]["content"]["parts"]
            for part in parts:
                inline_data = part.get("inlineData") or part.get("inline_data")
                if not inline_data:
                    continue
                mime_type = inline_data.get("mimeType") or inline_data.get("mime_type") or "image/png"
                encoded = inline_data.get("data")
                if not encoded:
                    continue
                return {
                    "bytes": base64.b64decode(encoded),
                    "mime_type": mime_type,
                }
        except Exception:
            print("[THUMBNAIL ERROR]")
            print(f"Prompt: {prompt}")
            print(f"Response: {response.text if response is not None else None}")
            print(traceback.format_exc())
            return None

        return None

    def _upload_to_supabase_storage(
        self,
        *,
        content: bytes,
        mime_type: str,
        topic: str,
    ) -> str | None:
        if supabase is None:
            return None

        file_extension = "png" if "png" in mime_type else "jpg"
        file_path = f"{quote_plus(topic.lower())}-{uuid.uuid4().hex}.{file_extension}"

        try:
            supabase.storage.from_(settings.supabase_storage_bucket).upload(
                file_path,
                content,
                {"content-type": mime_type, "upsert": "true"},
            )
            return supabase.storage.from_(settings.supabase_storage_bucket).get_public_url(file_path)
        except Exception:
            print("[SUPABASE STORAGE ERROR]")
            print(f"Bucket: {settings.supabase_storage_bucket}")
            print(f"Path: {file_path}")
            print(f"Mime type: {mime_type}")
            print(traceback.format_exc())
            return None

    async def _try_unsplash_thumbnail(
        self,
        *,
        topic: str,
        title: str,
        audience: str,
    ) -> str | None:
        if not settings.unsplash_access_key:
            return None

        query = f"{topic} education learning course illustration {audience} {title}"
        response = None
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    "https://api.unsplash.com/search/photos",
                    params={
                        "query": query,
                        "orientation": "landscape",
                        "per_page": 1,
                        "content_filter": "high",
                    },
                    headers={
                        "Authorization": f"Client-ID {settings.unsplash_access_key}",
                    },
                )
            if response.status_code >= 400:
                return None
            data = response.json()
            results = data.get("results", [])
            if not results:
                return None
            return results[0].get("urls", {}).get("regular")
        except Exception:
            print("[UNSPLASH ERROR]")
            print(f"Query: {query}")
            print(f"Response: {response.text if response is not None else None}")
            print(traceback.format_exc())
            return None

    def _build_placeholder_url(self, topic: str) -> str:
        return f"https://placehold.co/1200x675/0f172a/e2e8f0?text={quote_plus(topic)}"


thumbnail_service = ThumbnailService()
