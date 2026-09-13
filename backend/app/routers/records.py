from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth import require_auth
from app.database import get_db
from app.models import AssetItem, CustomItem, Record, Settings
from app.routers.settings import _to_schema as settings_to_schema
from app.schemas import (
    AssetItemSchema,
    BalanceSchema,
    CashflowSchema,
    CustomItemSchema,
    ExpensesSchema,
    ExportSchema,
    IncomeSchema,
    RecordSchema,
    SettingsSchema,
)

router = APIRouter(prefix="/api", tags=["records"], dependencies=[Depends(require_auth)])

# Mirrors the frontend's DEFAULT_CURRENT_ASSETS / DEFAULT_INVEST_ASSETS / DEFAULT_LIABILITIES
# so a freshly-created period starts pre-populated the same way the old localStorage version did.
DEFAULT_CURRENT_ASSETS = [
    ("ca_bank", "银行卡", "CNY"),
    ("ca_wechat", "微信钱包", "CNY"),
    ("ca_alipay", "支付宝余额", "CNY"),
    ("ca_securities", "证券账户(A股)", "CNY"),
    ("ca_futu", "富途(港/美股)", "HKD"),
    ("ca_loan_out", "借出款（应收）", "CNY"),
]
DEFAULT_INVEST_ASSETS = [
    ("inv_stocks", "股票（市值）", "CNY"),
    ("inv_funds", "基金（市值）", "CNY"),
    ("inv_bankwm", "银行理财", "CNY"),
    ("inv_insurance", "储蓄型保险金价值", "CNY"),
]
DEFAULT_LIABILITIES = [
    ("liab_mortgage", "房贷", "CNY"),
    ("liab_car", "车贷", "CNY"),
    ("liab_consumer", "消费贷", "CNY"),
    ("liab_credit", "信用卡", "CNY"),
    ("liab_personal", "人情借款", "CNY"),
    ("liab_payables", "应付费用", "CNY"),
]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_or_404(db: Session, period: str) -> Record:
    record = db.scalar(select(Record).where(Record.period == period))
    if record is None:
        raise HTTPException(status_code=404, detail="记录不存在")
    return record


def _create_default_record(db: Session, period: str) -> Record:
    record = Record(period=period)
    db.add(record)
    db.flush()  # assign record.id

    order = 0
    for group_name, defaults in (
        ("currentAssets", DEFAULT_CURRENT_ASSETS),
        ("investAssets", DEFAULT_INVEST_ASSETS),
        ("liabilities", DEFAULT_LIABILITIES),
    ):
        for key, name, currency in defaults:
            db.add(
                AssetItem(
                    record_id=record.id,
                    group_name=group_name,
                    item_key=key,
                    name=name,
                    amount=0,
                    currency=currency,
                    sort_order=order,
                )
            )
            order += 1

    db.commit()
    db.refresh(record)
    return record


def _record_to_schema(record: Record) -> RecordSchema:
    def items_for(group_name: str) -> list[AssetItemSchema]:
        return [
            AssetItemSchema(id=i.item_key, name=i.name, amount=i.amount, currency=i.currency)
            for i in record.asset_items
            if i.group_name == group_name
        ]

    def custom_for(section: str) -> list[CustomItemSchema]:
        return [
            CustomItemSchema(id=i.item_key, name=i.name, amount=i.amount, currency=i.currency)
            for i in record.custom_items
            if i.section == section
        ]

    return RecordSchema(
        balance=BalanceSchema(
            currentAssets=items_for("currentAssets"),
            investAssets=items_for("investAssets"),
            personalAssets=items_for("personalAssets"),
            liabilities=items_for("liabilities"),
        ),
        income=IncomeSchema(
            salary=record.income_salary,
            bonus=record.income_bonus,
            partTime=record.income_part_time,
            rent=record.income_rent,
            investReturn=record.income_invest_return,
            dividends=record.income_dividends,
            otherIncome=record.income_other,
            redEnvelope=record.income_red_envelope,
            secondhand=record.income_secondhand,
            customItems=custom_for("income"),
        ),
        expenses=ExpensesSchema(
            mortgagePayment=record.exp_mortgage_payment,
            propertyFee=record.exp_property_fee,
            carPayment=record.exp_car_payment,
            food=record.exp_food,
            transport=record.exp_transport,
            utilities=record.exp_utilities,
            telecom=record.exp_telecom,
            shopping=record.exp_shopping,
            entertainment=record.exp_entertainment,
            medical=record.exp_medical,
            education=record.exp_education,
            insurance=record.exp_insurance,
            gifts=record.exp_gifts,
            customItems=custom_for("expenses"),
        ),
        cashflow=CashflowSchema(
            openingBalance=record.cf_opening_balance,
            salaryIn=record.cf_salary_in,
            rentIn=record.cf_rent_in,
            otherIn=record.cf_other_in,
            dailyOut=record.cf_daily_out,
            fixedOut=record.cf_fixed_out,
            stockBuy=record.cf_stock_buy,
            stockSell=record.cf_stock_sell,
            wmBuy=record.cf_wm_buy,
            wmRedeem=record.cf_wm_redeem,
            newLoan=record.cf_new_loan,
            loanRepay=record.cf_loan_repay,
        ),
        notes=record.notes,
        createdAt=record.created_at,
        updatedAt=record.updated_at,
    )


def _apply_schema_to_record(db: Session, record: Record, payload: RecordSchema) -> None:
    i, e, cf = payload.income, payload.expenses, payload.cashflow

    record.income_salary = i.salary
    record.income_bonus = i.bonus
    record.income_part_time = i.partTime
    record.income_rent = i.rent
    record.income_invest_return = i.investReturn
    record.income_dividends = i.dividends
    record.income_other = i.otherIncome
    record.income_red_envelope = i.redEnvelope
    record.income_secondhand = i.secondhand

    record.exp_mortgage_payment = e.mortgagePayment
    record.exp_property_fee = e.propertyFee
    record.exp_car_payment = e.carPayment
    record.exp_food = e.food
    record.exp_transport = e.transport
    record.exp_utilities = e.utilities
    record.exp_telecom = e.telecom
    record.exp_shopping = e.shopping
    record.exp_entertainment = e.entertainment
    record.exp_medical = e.medical
    record.exp_education = e.education
    record.exp_insurance = e.insurance
    record.exp_gifts = e.gifts

    record.cf_opening_balance = cf.openingBalance
    record.cf_salary_in = cf.salaryIn
    record.cf_rent_in = cf.rentIn
    record.cf_other_in = cf.otherIn
    record.cf_daily_out = cf.dailyOut
    record.cf_fixed_out = cf.fixedOut
    record.cf_stock_buy = cf.stockBuy
    record.cf_stock_sell = cf.stockSell
    record.cf_wm_buy = cf.wmBuy
    record.cf_wm_redeem = cf.wmRedeem
    record.cf_new_loan = cf.newLoan
    record.cf_loan_repay = cf.loanRepay

    record.notes = payload.notes
    record.updated_at = _now()
    if not record.created_at:
        record.created_at = record.updated_at

    # Replace variable-length collections wholesale — simplest correct way to
    # keep them in sync with whatever array shape the frontend just sent.
    for existing in list(record.asset_items):
        db.delete(existing)
    for existing in list(record.custom_items):
        db.delete(existing)
    db.flush()

    order = 0
    for group_name, items in (
        ("currentAssets", payload.balance.currentAssets),
        ("investAssets", payload.balance.investAssets),
        ("personalAssets", payload.balance.personalAssets),
        ("liabilities", payload.balance.liabilities),
    ):
        for item in items:
            db.add(
                AssetItem(
                    record_id=record.id,
                    group_name=group_name,
                    item_key=item.id,
                    name=item.name,
                    amount=item.amount,
                    currency=item.currency,
                    sort_order=order,
                )
            )
            order += 1

    order = 0
    for section, items in (("income", i.customItems), ("expenses", e.customItems)):
        for item in items:
            db.add(
                CustomItem(
                    record_id=record.id,
                    section=section,
                    item_key=item.id,
                    name=item.name,
                    amount=item.amount,
                    currency=item.currency,
                    sort_order=order,
                )
            )
            order += 1


@router.get("/records")
def list_periods(db: Session = Depends(get_db)) -> list[str]:
    periods = db.scalars(select(Record.period).order_by(Record.period)).all()
    return list(periods)


@router.get("/records/{period}", response_model=RecordSchema)
def get_record(period: str, db: Session = Depends(get_db)):
    record = db.scalar(select(Record).where(Record.period == period))
    if record is None:
        record = _create_default_record(db, period)
    return _record_to_schema(record)


@router.put("/records/{period}", response_model=RecordSchema)
def upsert_record(period: str, payload: RecordSchema, db: Session = Depends(get_db)):
    record = db.scalar(select(Record).where(Record.period == period))
    if record is None:
        record = Record(period=period, created_at=payload.createdAt or _now())
        db.add(record)
        db.flush()
    _apply_schema_to_record(db, record, payload)
    db.commit()
    db.refresh(record)
    return _record_to_schema(record)


@router.delete("/records/{period}")
def delete_record(period: str, db: Session = Depends(get_db)):
    record = _get_or_404(db, period)
    db.delete(record)
    db.commit()
    return {"deleted": period}


@router.get("/export", response_model=ExportSchema)
def export_data(db: Session = Depends(get_db)):
    records = db.scalars(select(Record)).all()
    return ExportSchema(
        settings=settings_to_schema(db.get(Settings, 1)),
        records={r.period: _record_to_schema(r) for r in records},
    )


@router.post("/import")
def import_data(payload: ExportSchema, db: Session = Depends(get_db)):
    s = db.get(Settings, 1)
    s.family_name = payload.settings.familyName
    s.rate_cnh = payload.settings.exchangeRates.CNH
    s.rate_hkd = payload.settings.exchangeRates.HKD
    s.rate_usd = payload.settings.exchangeRates.USD
    s.rate_eur = payload.settings.exchangeRates.EUR
    s.rates_updated_at = payload.settings.ratesUpdatedAt

    db.execute(Record.__table__.delete())
    db.flush()

    for period, record_payload in payload.records.items():
        record = Record(period=period, created_at=record_payload.createdAt or _now())
        db.add(record)
        db.flush()
        _apply_schema_to_record(db, record, record_payload)

    db.commit()
    return {"imported": len(payload.records)}
