from pathlib import Path

from pydantic_settings import BaseSettings


ENV_FILE = Path(__file__).resolve().parent.parent / ".env"


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/quote_comparison"
    AZURE_STORAGE_CONNECTION_STRING: str = ""
    AZURE_STORAGE_CONTAINER: str = "quote-documents"
    AZURE_OPENAI_ENDPOINT: str = ""
    AZURE_OPENAI_API_KEY: str = ""
    AZURE_OPENAI_DEPLOYMENT: str = "gpt-4o"
    AZURE_OPENAI_API_VERSION: str = "2025-01-01-preview"
    AZURE_CONTENT_UNDERSTANDING_ENDPOINT: str = ""
    AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID: str = "insuranceQuoteExtractor"
    APP_ENV: str = "development"
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,http://127.0.0.1:3000,https://localhost:5173"

    model_config = {"env_file": str(ENV_FILE), "extra": "ignore"}


settings = Settings()
