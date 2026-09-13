from pydantic import BaseModel, Field


class AssetItemSchema(BaseModel):
    id: str
    name: str = ""
    amount: float = 0
    currency: str = "CNY"


class CustomItemSchema(BaseModel):
    id: str
    name: str = ""
    amount: float = 0
    currency: str = "CNY"


class BalanceSchema(BaseModel):
    currentAssets: list[AssetItemSchema] = Field(default_factory=list)
    investAssets: list[AssetItemSchema] = Field(default_factory=list)
    personalAssets: list[AssetItemSchema] = Field(default_factory=list)
    liabilities: list[AssetItemSchema] = Field(default_factory=list)


class IncomeSchema(BaseModel):
    salary: float = 0
    bonus: float = 0
    partTime: float = 0
    rent: float = 0
    investReturn: float = 0
    dividends: float = 0
    otherIncome: float = 0
    redEnvelope: float = 0
    secondhand: float = 0
    customItems: list[CustomItemSchema] = Field(default_factory=list)


class ExpensesSchema(BaseModel):
    mortgagePayment: float = 0
    propertyFee: float = 0
    carPayment: float = 0
    food: float = 0
    transport: float = 0
    utilities: float = 0
    telecom: float = 0
    shopping: float = 0
    entertainment: float = 0
    medical: float = 0
    education: float = 0
    insurance: float = 0
    gifts: float = 0
    customItems: list[CustomItemSchema] = Field(default_factory=list)


class CashflowSchema(BaseModel):
    openingBalance: float = 0
    salaryIn: float = 0
    rentIn: float = 0
    otherIn: float = 0
    dailyOut: float = 0
    fixedOut: float = 0
    stockBuy: float = 0
    stockSell: float = 0
    wmBuy: float = 0
    wmRedeem: float = 0
    newLoan: float = 0
    loanRepay: float = 0


class RecordSchema(BaseModel):
    balance: BalanceSchema = Field(default_factory=BalanceSchema)
    income: IncomeSchema = Field(default_factory=IncomeSchema)
    expenses: ExpensesSchema = Field(default_factory=ExpensesSchema)
    cashflow: CashflowSchema = Field(default_factory=CashflowSchema)
    notes: str = ""
    createdAt: str = ""
    updatedAt: str = ""


class ExchangeRatesSchema(BaseModel):
    CNH: float = 1.0
    HKD: float = 0.923
    USD: float = 7.25
    EUR: float = 7.87


class SettingsSchema(BaseModel):
    familyName: str = "我的家庭"
    exchangeRates: ExchangeRatesSchema = Field(default_factory=ExchangeRatesSchema)
    ratesUpdatedAt: str = ""


class LoginRequest(BaseModel):
    password: str


class ExportSchema(BaseModel):
    settings: SettingsSchema
    records: dict[str, RecordSchema]
