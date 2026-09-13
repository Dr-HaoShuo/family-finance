from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.database import get_db
from app.models import Settings
from app.schemas import SettingsSchema

router = APIRouter(prefix="/settings", tags=["settings"], dependencies=[Depends(require_auth)])


def _to_schema(s: Settings) -> SettingsSchema:
    return SettingsSchema(
        familyName=s.family_name,
        exchangeRates={
            "CNH": s.rate_cnh,
            "HKD": s.rate_hkd,
            "USD": s.rate_usd,
            "EUR": s.rate_eur,
        },
        ratesUpdatedAt=s.rates_updated_at,
    )


@router.get("", response_model=SettingsSchema)
def get_settings(db: Session = Depends(get_db)):
    return _to_schema(db.get(Settings, 1))


@router.put("", response_model=SettingsSchema)
def update_settings(payload: SettingsSchema, db: Session = Depends(get_db)):
    s = db.get(Settings, 1)
    s.family_name = payload.familyName
    s.rate_cnh = payload.exchangeRates.CNH
    s.rate_hkd = payload.exchangeRates.HKD
    s.rate_usd = payload.exchangeRates.USD
    s.rate_eur = payload.exchangeRates.EUR
    s.rates_updated_at = payload.ratesUpdatedAt
    db.commit()
    return _to_schema(s)
