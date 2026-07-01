import json
import logging
import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes import router
from app.core.config import ENV_FILE_PATH, settings
from app.core.logging import configure_logging

configure_logging()
app = FastAPI(title="CourseForge AI API", version="0.1.0")

PORT = int(os.getenv("PORT", "8000"))
logger = logging.getLogger(__name__)


def _require_env(*names: str) -> str:
    for name in names:
        if os.getenv(name):
            return "Loaded"

    missing_name = names[0]
    raise RuntimeError(f"Missing environment variable: {missing_name}")


def _configured(value: str | None) -> bool:
    return bool(value and value.strip())


# def _cors_origins() -> list[str]:
#     origins = {
#         settings.frontend_url,
#         settings.frontend_url.replace("https://ocena-smart-solutions.vercel.app"),
#     }
#     return sorted(origin for origin in origins if origin)
def _cors_origins() -> list[str]:
    origins = {
        settings.frontend_url,
        "https://ocena-smart-solutions.vercel.app",
    }

    return sorted(origin for origin in origins if origin)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.middleware("http")
async def request_logging_middleware(request: Request, call_next):
    body = await request.body()
    payload = ""

    if body:
        try:
            payload = json.dumps(json.loads(body.decode("utf-8")), indent=2)
        except Exception:
            payload = body.decode("utf-8", errors="replace")

    logger.info("Request received: %s %s", request.method, request.url.path)
    if request.url.query:
        logger.info("Request query: %s", request.url.query)
    if payload:
        logger.info("Request payload: %s", payload)

    response = await call_next(request)
    logger.info("Request completed: %s %s -> %s", request.method, request.url.path, response.status_code)
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "Unhandled exception on %s %s: %s",
        request.method,
        request.url.path,
        type(exc).__name__,
    )
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


@app.on_event("startup")
async def log_startup_configuration() -> None:
    logger.info("FastAPI started on port %s", PORT)
    logger.info("Env file loaded: %s", str(ENV_FILE_PATH))
    logger.info("Gemini configured: %s", _configured(settings.gemini_api_key))
    logger.info(
        "Supabase configured: %s",
        _configured(settings.supabase_url) and _configured(settings.supabase_service_role_key),
    )
    logger.info("GEMINI_API_KEY loaded: %s", _require_env("GEMINI_API_KEY"))
    logger.info("SUPABASE_URL loaded: %s", _require_env("SUPABASE_URL"))
    logger.info("SUPABASE_SERVICE_ROLE_KEY loaded: %s", _require_env("SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_KEY"))
    logger.info("SUPABASE_ANON_KEY loaded: %s", _require_env("SUPABASE_ANON_KEY"))
    logger.info("FRONTEND_URL loaded: %s", _require_env("FRONTEND_URL"))
    logger.info("Registered FastAPI routes:")
    for route in app.routes:
        methods = ",".join(sorted(route.methods or []))
        print(route.path, route.methods)
        logger.info("%s %s", route.path, methods)


@app.get("/health")
async def healthcheck() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/detailed")
async def detailed_healthcheck() -> dict[str, bool]:
    return {
        "server_running": True,
        "gemini_configured": _configured(settings.gemini_api_key),
        "supabase_configured": _configured(settings.supabase_url)
        and _configured(settings.supabase_service_role_key),
        "cors_enabled": True,
        "environment_loaded": all(
            [
                _configured(settings.gemini_api_key),
                _configured(settings.supabase_url),
                _configured(settings.supabase_service_role_key),
            ]
        ),
    }
