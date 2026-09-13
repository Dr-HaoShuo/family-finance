from datetime import datetime, timezone

from sqlalchemy import Float, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class Record(Base):
    __tablename__ = "records"

    id: Mapped[int] = mapped_column(primary_key=True)
    period: Mapped[str] = mapped_column(String(7), unique=True, index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[str] = mapped_column(String(40), default=_now)
    updated_at: Mapped[str] = mapped_column(String(40), default=_now)

    # ---- income (flat, fixed shape) ----
    income_salary: Mapped[float] = mapped_column(Float, default=0)
    income_bonus: Mapped[float] = mapped_column(Float, default=0)
    income_part_time: Mapped[float] = mapped_column(Float, default=0)
    income_rent: Mapped[float] = mapped_column(Float, default=0)
    income_invest_return: Mapped[float] = mapped_column(Float, default=0)
    income_dividends: Mapped[float] = mapped_column(Float, default=0)
    income_other: Mapped[float] = mapped_column(Float, default=0)
    income_red_envelope: Mapped[float] = mapped_column(Float, default=0)
    income_secondhand: Mapped[float] = mapped_column(Float, default=0)

    # ---- expenses (flat, fixed shape) ----
    exp_mortgage_payment: Mapped[float] = mapped_column(Float, default=0)
    exp_property_fee: Mapped[float] = mapped_column(Float, default=0)
    exp_car_payment: Mapped[float] = mapped_column(Float, default=0)
    exp_food: Mapped[float] = mapped_column(Float, default=0)
    exp_transport: Mapped[float] = mapped_column(Float, default=0)
    exp_utilities: Mapped[float] = mapped_column(Float, default=0)
    exp_telecom: Mapped[float] = mapped_column(Float, default=0)
    exp_shopping: Mapped[float] = mapped_column(Float, default=0)
    exp_entertainment: Mapped[float] = mapped_column(Float, default=0)
    exp_medical: Mapped[float] = mapped_column(Float, default=0)
    exp_education: Mapped[float] = mapped_column(Float, default=0)
    exp_insurance: Mapped[float] = mapped_column(Float, default=0)
    exp_gifts: Mapped[float] = mapped_column(Float, default=0)

    # ---- cashflow (flat, fixed shape) ----
    cf_opening_balance: Mapped[float] = mapped_column(Float, default=0)
    cf_salary_in: Mapped[float] = mapped_column(Float, default=0)
    cf_rent_in: Mapped[float] = mapped_column(Float, default=0)
    cf_other_in: Mapped[float] = mapped_column(Float, default=0)
    cf_daily_out: Mapped[float] = mapped_column(Float, default=0)
    cf_fixed_out: Mapped[float] = mapped_column(Float, default=0)
    cf_stock_buy: Mapped[float] = mapped_column(Float, default=0)
    cf_stock_sell: Mapped[float] = mapped_column(Float, default=0)
    cf_wm_buy: Mapped[float] = mapped_column(Float, default=0)
    cf_wm_redeem: Mapped[float] = mapped_column(Float, default=0)
    cf_new_loan: Mapped[float] = mapped_column(Float, default=0)
    cf_loan_repay: Mapped[float] = mapped_column(Float, default=0)

    asset_items: Mapped[list["AssetItem"]] = relationship(
        back_populates="record", cascade="all, delete-orphan", order_by="AssetItem.sort_order"
    )
    custom_items: Mapped[list["CustomItem"]] = relationship(
        back_populates="record", cascade="all, delete-orphan", order_by="CustomItem.sort_order"
    )


class AssetItem(Base):
    __tablename__ = "asset_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    group_name: Mapped[str] = mapped_column(String(20))  # currentAssets/investAssets/personalAssets/liabilities
    item_key: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(10), default="CNY")
    sort_order: Mapped[int] = mapped_column(default=0)

    record: Mapped["Record"] = relationship(back_populates="asset_items")


class CustomItem(Base):
    __tablename__ = "custom_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    record_id: Mapped[int] = mapped_column(ForeignKey("records.id", ondelete="CASCADE"))
    section: Mapped[str] = mapped_column(String(10))  # income/expenses
    item_key: Mapped[str] = mapped_column(String(60))
    name: Mapped[str] = mapped_column(String(120))
    amount: Mapped[float] = mapped_column(Float, default=0)
    currency: Mapped[str] = mapped_column(String(10), default="CNY")
    sort_order: Mapped[int] = mapped_column(default=0)

    record: Mapped["Record"] = relationship(back_populates="custom_items")


class Settings(Base):
    __tablename__ = "settings"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    family_name: Mapped[str] = mapped_column(String(120), default="我的家庭")
    rate_cnh: Mapped[float] = mapped_column(Float, default=1.0)
    rate_hkd: Mapped[float] = mapped_column(Float, default=0.923)
    rate_usd: Mapped[float] = mapped_column(Float, default=7.25)
    rate_eur: Mapped[float] = mapped_column(Float, default=7.87)
    rates_updated_at: Mapped[str] = mapped_column(String(40), default="")
