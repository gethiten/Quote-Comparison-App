"""Azure Blob Storage integration for uploading quote documents."""
import uuid

from app.config import settings


def upload_to_blob(filename: str, data: bytes, content_type: str) -> str:
    """Upload a file to Azure Blob Storage and return the URL.

    Returns a local placeholder URL when Azure connection string is not configured."""
    conn = settings.AZURE_STORAGE_CONNECTION_STRING
    container = settings.AZURE_STORAGE_CONTAINER

    if not conn or conn == "your_connection_string_here":
        # Local dev — return placeholder
        return f"/local-uploads/{uuid.uuid4()}/{filename}"

    from azure.storage.blob import BlobServiceClient, ContentSettings

    blob_service = BlobServiceClient.from_connection_string(conn)
    container_client = blob_service.get_container_client(container)

    # Ensure container exists
    try:
        container_client.get_container_properties()
    except Exception:
        container_client.create_container()

    blob_name = f"quotes/{uuid.uuid4()}/{filename}"
    blob_client = container_client.get_blob_client(blob_name)
    blob_client.upload_blob(
        data,
        overwrite=True,
        content_settings=ContentSettings(content_type=content_type),
    )
    return blob_client.url
