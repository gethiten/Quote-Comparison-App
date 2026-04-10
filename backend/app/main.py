"""FastAPI application entry point."""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import accounts, ai_analysis, carriers, comparisons, properties, quotes
from app.config import settings
from app.database import Base, engine

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Quote Comparison Tool API",
        description="Commercial property insurance quote comparison — backend API",
        version="2.0.0",
    )

    # CORS
    origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Register routers
    app.include_router(accounts.router, prefix="/api")
    app.include_router(properties.router, prefix="/api")
    app.include_router(carriers.router, prefix="/api")
    app.include_router(quotes.router, prefix="/api")
    app.include_router(comparisons.router, prefix="/api")
    app.include_router(ai_analysis.router, prefix="/api")

    @app.on_event("startup")
    def on_startup():
        logger.info("Creating database tables...")
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created.")

    @app.get("/api/health")
    def health():
        return {"status": "ok", "version": "2.0.0"}

    return app


app = create_app()
