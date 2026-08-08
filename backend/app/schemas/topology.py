from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from app.models.enums import LocationType

class ZoneResponse(BaseModel):
    id: UUID
    code: str
    name: str
    description: Optional[str] = None

    model_config = {"from_attributes": True}

class LocationResponse(BaseModel):
    id: UUID
    zone_id: UUID
    code: str
    type: LocationType

    model_config = {"from_attributes": True}
