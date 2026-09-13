/* ============================================================
   CALC — Financial calculation functions (updated for new asset arrays)
   ============================================================ */

const Calc = (() => {
  // ---------- Helper ----------
  function n(v) {
    return Number(v) || 0;
  }

  // ---------- 汇率换算 ----------
  function toCNY(amount, currency) {
    const amt = n(amount);
    if (!currency || currency === "CNY") return amt;
    const rates =
      (typeof Store !== "undefined" && Store.getSettings().exchangeRates) || {};
    return amt * (n(rates[currency]) || 1);
  }

  // ---------- 数组求和（带汇率） ----------
  function itemSum(arr) {
    if (!Array.isArray(arr)) return 0;
    return arr.reduce(
      (sum, item) => sum + toCNY(item.amount, item.currency),
      0,
    );
  }

  // ---------- 资产合计 ----------
  function totalCurrentAssets(b) {
    return itemSum(b.currentAssets);
  }
  function totalInvestAssets(b) {
    return itemSum(b.investAssets);
  }
  function totalPersonalAssets(b) {
    return itemSum(b.personalAssets);
  }
  function totalAssets(b) {
    return (
      totalCurrentAssets(b) + totalInvestAssets(b) + totalPersonalAssets(b)
    );
  }

  // ---------- 负债、净资产 ----------
  function liabilitiesArrayTotal(b) {
    if (!Array.isArray(b.liabilities)) return 0;
    return b.liabilities.reduce(
      (sum, item) => sum + toCNY(item.amount, item.currency),
      0,
    );
  }

  function totalFinancialLiab(b) {
    if (Array.isArray(b.liabilities)) {
      // First 3 default items are treated as "financial liabilities".
      return (b.liabilities || [])
        .slice(0, 3)
        .reduce((sum, item) => sum + toCNY(item.amount, item.currency), 0);
    }
    return n(b.mortgageBalance) + n(b.carLoanBalance) + n(b.consumerLoan);
  }
  function totalCurrentLiab(b) {
    if (Array.isArray(b.liabilities)) {
      return (b.liabilities || [])
        .slice(3)
        .reduce((sum, item) => sum + toCNY(item.amount, item.currency), 0);
    }
    return n(b.creditCard) + n(b.personalDebt) + n(b.payables);
  }
  function totalLiabilities(b) {
    if (Array.isArray(b.liabilities)) return liabilitiesArrayTotal(b);
    return totalFinancialLiab(b) + totalCurrentLiab(b);
  }
  function netAssets(b) {
    return totalAssets(b) - totalLiabilities(b);
  }

  // ---------- 收入 ----------
  function totalLaborIncome(i) {
    return n(i.salary) + n(i.bonus) + n(i.partTime);
  }
  function totalOtherIncome(i) {
    return (
      n(i.rent) +
      n(i.investReturn) +
      n(i.dividends) +
      n(i.otherIncome) +
      n(i.redEnvelope) +
      n(i.secondhand)
    );
  }
  function totalCustomIncome(i) {
    if (!Array.isArray(i.customItems)) return 0;
    return i.customItems.reduce(
      (sum, item) => sum + toCNY(item.amount, item.currency),
      0,
    );
  }
  function totalIncome(i) {
    return totalLaborIncome(i) + totalOtherIncome(i) + totalCustomIncome(i);
  }

  // ---------- 支出 ----------
  function totalFixedExp(e) {
    return n(e.mortgagePayment) + n(e.propertyFee) + n(e.carPayment);
  }
  function totalDailyExp(e) {
    return n(e.food) + n(e.transport) + n(e.utilities) + n(e.telecom);
  }
  function totalFlexExp(e) {
    return (
      n(e.shopping) +
      n(e.entertainment) +
      n(e.medical) +
      n(e.education) +
      n(e.insurance) +
      n(e.gifts)
    );
  }
  function totalCustomExp(e) {
    if (!Array.isArray(e.customItems)) return 0;
    return e.customItems.reduce(
      (sum, item) => sum + toCNY(item.amount, item.currency),
      0,
    );
  }
  function totalExpenses(e) {
    return totalFixedExp(e) + totalDailyExp(e) + totalFlexExp(e) + totalCustomExp(e);
  }

  // ---------- 其他财务指标 ----------
  function monthlySurplus(i, e) {
    return totalIncome(i) - totalExpenses(e);
  }
  function savingsRate(i, e) {
    const inc = totalIncome(i);
    if (inc <= 0) return 0;
    return Math.round((monthlySurplus(i, e) / inc) * 100);
  }

  // ---------- 现金流 ----------
  function operatingNetCF(cf) {
    return (
      n(cf.salaryIn) +
      n(cf.rentIn) +
      n(cf.otherIn) -
      n(cf.dailyOut) -
      n(cf.fixedOut)
    );
  }
  function investingNetCF(cf) {
    return -n(cf.stockBuy) + n(cf.stockSell) - n(cf.wmBuy) + n(cf.wmRedeem);
  }
  function financingNetCF(cf) {
    return n(cf.newLoan) - n(cf.loanRepay);
  }
  function netCashFlow(cf) {
    return operatingNetCF(cf) + investingNetCF(cf) + financingNetCF(cf);
  }
  function closingBalance(cf) {
    return n(cf.openingBalance) + netCashFlow(cf);
  }

  // ---------- 格式化 ----------
  function fmt(v, alwaysSign = false) {
    const num = Number(v) || 0;
    const abs = Math.abs(num);
    let s;
    if (abs >= 10000) {
      s = (abs / 10000).toFixed(2) + " 万";
    } else {
      s = abs.toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
    const sign = num < 0 ? "-" : alwaysSign && num > 0 ? "+" : "";
    return sign + s;
  }

  function fmtFull(v) {
    const num = Number(v) || 0;
    return num.toLocaleString("zh-CN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

  // ---------- Export ----------
  return {
    toCNY,
    totalCurrentAssets,
    totalInvestAssets,
    totalPersonalAssets,
    totalAssets,
    totalFinancialLiab,
    totalCurrentLiab,
    totalLiabilities,
    netAssets,
    totalLaborIncome,
    totalOtherIncome,
    totalIncome,
    totalCustomIncome,
    totalFixedExp,
    totalDailyExp,
    totalFlexExp,
    totalExpenses,
    totalCustomExp,
    monthlySurplus,
    savingsRate,
    operatingNetCF,
    investingNetCF,
    financingNetCF,
    netCashFlow,
    closingBalance,
    fmt,
    fmtFull,
  };
})();
