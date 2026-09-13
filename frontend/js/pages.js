/* ============================================================
   PAGES — HTML rendering for each page
   ============================================================ */

/* ---- Helper: escape attribute ---- */
function escAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---- Helper: number input cell ---- */
function numCell(section, field, value, id) {
  return `<input class="num-input" type="number" step="0.01" min="0"
               value="${Number(value) || 0}"
               data-section="${section}"
               data-field="${field}"
               ${id ? `id="${id}"` : ""}
               onchange="App.onFieldChange(this)"
               oninput="App.onFieldInput(this)">`;
}

/* ---- Helper: computed value cell ---- */
function cv(v, cls = "") {
  return `<span class="computed-val ${cls}">${Calc.fmtFull(v)}</span>`;
}

/* ---- Currency options ---- */
function currencyOptions(selected) {
  const list = ["CNY", "CNH", "HKD", "USD", "EUR"];
  return list
    .map(
      (c) =>
        `<option value="${c}" ${c === selected ? "selected" : ""}>${c}</option>`,
    )
    .join("");
}

/* ============================================================
   BALANCE SHEET PAGE
   ============================================================ */
function renderBalanceSheet(period, record) {
  const b = record.balance;
  const C = Calc;

  // ---- 资产行渲染（名称可编辑 + CNY 折算）----
  const assetRows = (group, items) => {
    if (!Array.isArray(items) || items.length === 0) return "";
    return items
      .map(
        (it, idx) => `
      <tr class="asset-dynamic-row">
        <td>
          <div class="asset-name-wrap">
            <input class="asset-name-input" type="text"
                   value="${escAttr(it.name || "")}"
                   data-group="${group}" data-idx="${idx}"
                   onchange="App.onAssetNameChange(this)">
          </div>
        </td>
        <td>
          <div class="asset-amount-wrap">
            <input class="asset-amt num-input" data-group="${group}" data-idx="${idx}"
                   type="number" value="${it.amount}" onchange="App.onAssetAmountChange(this)" oninput="App.onAssetAmountInput(this)"></td>
          </div>
          <div class="cny-equiv" id="equiv_${group}_${idx}" style="display:none"></div>
        </td>
        <td>
          <select class="asset-cur currency-select" data-group="${group}" data-idx="${idx}" onchange="App.onAssetCurrencyChange(this)">
            ${currencyOptions(it.currency)}
          </select>
        </td>
        <td><button class="btn-remove-asset" title="删除该项" aria-label="删除该项" onclick="App.removeAssetItem('${group}',${idx})">✕</button></td>
      </tr>`,
      )
      .join("");
  };

  // ---- 资产/负债区块 ----
  const cashSection = `
    <section class="panel">
      <h3>流动性资产（现金及近现金）</h3>
      <div class="hint">包含银行卡、零钱、可快速变现账户，以及短期可回收的借出款。</div>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr><th>来源</th><th class="right">金额</th><th>币种</th><th></th></tr></thead>
        <tbody>
          ${assetRows("currentAssets", b.currentAssets)}
          <tr class="section-row"><td>流动资产小计</td><td class="right" id="subtotCurrentAssets">${cv(C.totalCurrentAssets(b), "pos")}</td><td></td><td></td></tr>
        </tbody>
      </table>
      </div>
      <div class="actions-row"><button class="btn-add-asset" onclick="App.addAssetItem('currentAssets')">+ 添加现金来源</button></div>
    </section>`;

  const investSection = `
    <section class="panel">
      <h3>投资性资产</h3>
      <div class="hint">按当前市值填写（股票/基金/理财/保单现金价值等），建议月末统一估值。</div>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr><th>名称</th><th class="right">金额</th><th>币种</th><th></th></tr></thead>
        <tbody>
          ${assetRows("investAssets", b.investAssets)}
          <tr class="section-row"><td>投资资产小计</td><td class="right" id="subtotInvestAssets">${cv(C.totalInvestAssets(b), "pos")}</td><td></td><td></td></tr>
        </tbody>
      </table>
      </div>
      <div class="actions-row"><button class="btn-add-asset" onclick="App.addAssetItem('investAssets')">+ 添加投资资产</button></div>
    </section>`;

  const personalSection = `
    <section class="panel">
      <h3>自用型资产</h3>
      <div class="hint">如房产、车辆、贵重物品。按当前可出售回收价估算，避免按买入价高估。</div>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr><th>名称</th><th class="right">金额</th><th>币种</th><th></th></tr></thead>
        <tbody>
          ${assetRows("personalAssets", b.personalAssets)}
          <tr class="section-row"><td>自用资产小计</td><td class="right" id="subtotPersonalAssets">${cv(C.totalPersonalAssets(b), "pos")}</td><td></td><td></td></tr>
        </tbody>
      </table>
      </div>
      <div class="actions-row"><button class="btn-add-asset" onclick="App.addAssetItem('personalAssets')">+ 添加自用资产</button></div>
    </section>`;

  const liabilitySection = `
    <section class="panel">
      <h3>负债</h3>
      <div class="hint">填写当前未偿还本金（房贷/车贷/信用卡应还等）。</div>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <thead><tr><th>名称</th><th class="right">金额</th><th>币种</th><th></th></tr></thead>
        <tbody>
          ${assetRows("liabilities", b.liabilities)}
          <tr class="section-row"><td>金融性负债小计</td><td class="right" id="subtotFinancialLiab">${cv(C.totalFinancialLiab(b), "neg")}</td><td></td><td></td></tr>
          <tr class="section-row"><td>流动性负债小计</td><td class="right" id="subtotCurrentLiab">${cv(C.totalCurrentLiab(b), "neg")}</td><td></td><td></td></tr>
        </tbody>
      </table>
      </div>
      <div class="actions-row"><button class="btn-add-asset" onclick="App.addAssetItem('liabilities')">+ 添加负债</button></div>
    </section>`;

  // ---- 合计区块（保留原 id 供 updateComputedFields 使用）----
  const liabRatio = C.totalAssets(b) > 0 ? Math.round(C.totalLiabilities(b) / C.totalAssets(b) * 100) : 0;
  const summarySection = `
    <section class="panel">
      <h3>关键指标</h3>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <tbody>
          <tr class="total-row"><td>资产合计</td><td class="right" id="totalAssetsVal">${cv(C.totalAssets(b))}</td></tr>
          <tr class="total-row"><td>负债合计</td><td class="right" id="totalLiabVal">${cv(C.totalLiabilities(b))}</td></tr>
          <tr class="net-row"><td>净资产</td><td class="right" id="netAssetsVal">${cv(C.netAssets(b), C.netAssets(b) >= 0 ? "pos" : "neg")}</td></tr>
          <tr><td>资产负债率</td><td class="right"><span class="computed-val" id="liabRatioVal">${liabRatio}%</span></td></tr>
        </tbody>
      </table>
      </div>
      <div class="hint">参考：资产负债率越低，财务缓冲通常越强；请结合收入稳定性综合判断。</div>
    </section>`;

  // ---- 双栏布局：左侧资产，右侧负债 ----
  return `
    <div class="balance-grid">
      <div class="balance-side">
        ${cashSection}
        ${investSection}
        ${personalSection}
      </div>
      <div class="balance-side">
        ${liabilitySection}
        ${summarySection}
      </div>
    </div>
  `;
}

/* ============================================================
   DASHBOARD PAGE
   ============================================================ */
function renderDashboard(period, record) {
  const b = record.balance;
  const i = record.income;
  const e = record.expenses;
  const C = Calc;

  const income = C.totalIncome(i);
  const expense = C.totalExpenses(e);
  const surplus = C.monthlySurplus(i, e);
  const assets = C.totalAssets(b);
  const liabilities = C.totalLiabilities(b);
  const netAssets = C.netAssets(b);
  const savingsRate = C.savingsRate(i, e);
  const liabRatio = assets > 0 ? Math.round(liabilities / assets * 100) : 0;

  // ---- 本月洞察：最大支出项 ----
  const expenseBreakdown = [
    ["房贷/房租", e.mortgagePayment], ["物业费", e.propertyFee], ["车贷", e.carPayment],
    ["餐饮", e.food], ["交通", e.transport], ["水电煤", e.utilities], ["通讯", e.telecom],
    ["购物", e.shopping], ["娱乐", e.entertainment], ["医疗", e.medical], ["教育", e.education],
    ["保险", e.insurance], ["人情", e.gifts],
    ...(Array.isArray(e.customItems) ? e.customItems.map((it) => [it.name, C.toCNY(it.amount, it.currency)]) : []),
  ];
  const topExpense = expenseBreakdown.reduce((max, cur) => (cur[1] > max[1] ? cur : max), ["暂无支出记录", 0]);

  return `
    <div class="summary-row">
      <div class="summary-item">
        <div class="label">月收入</div>
        <div class="value pos">¥${C.fmtFull(income)}</div>
      </div>
      <div class="summary-item">
        <div class="label">月支出</div>
        <div class="value neg">¥${C.fmtFull(expense)}</div>
      </div>
      <div class="summary-item">
        <div class="label">月结余</div>
        <div class="value ${surplus >= 0 ? "pos" : "neg"}">¥${C.fmtFull(surplus)}</div>
        <div class="sub card-change" id="surplusDelta"></div>
      </div>
      <div class="summary-item">
        <div class="label">净资产</div>
        <div class="value ${netAssets >= 0 ? "pos" : "neg"}">¥${C.fmtFull(netAssets)}</div>
        <div class="sub card-change" id="netAssetsDelta"></div>
      </div>
    </div>

    <section class="insight-card">
      <h3 class="insight-title">本月洞察</h3>
      <ul class="insight-list">
        <li><span class="text-muted">储蓄率</span><span class="fw-600 ${savingsRate >= 0 ? "text-success" : "text-danger"}">${savingsRate}%</span></li>
        <li><span class="text-muted">资产负债率</span><span class="fw-600">${liabRatio}%</span></li>
        <li><span class="text-muted">最大支出项</span><span class="fw-600">${topExpense[1] > 0 ? `${topExpense[0]} · ¥${C.fmtFull(topExpense[1])}` : topExpense[0]}</span></li>
      </ul>
    </section>

    <section class="grid-3">
      <div class="panel">
        <h3>收支对比</h3>
        <div class="chart-wrap"><canvas id="chartIncomeExp"></canvas></div>
      </div>
      <div class="panel">
        <h3>支出结构</h3>
        <div class="chart-wrap"><canvas id="chartExpenseDonut"></canvas></div>
      </div>
      <div class="panel">
        <h3>资产结构</h3>
        <div class="chart-wrap"><canvas id="chartAssetAlloc"></canvas></div>
      </div>
    </section>

    <section class="panel">
      <h3>支出明细</h3>
      <div class="chart-wrap tall"><canvas id="chartExpenseDetail"></canvas></div>
    </section>

    <section class="panel">
      <h3>净资产趋势</h3>
      <div class="chart-wrap"><canvas id="chartNetAsset"></canvas></div>
    </section>
  `;
}

/* ============================================================
   INCOME PAGE
   ============================================================ */
function renderIncomeStatement(period, record) {
  const i = record.income;
  const e = record.expenses;
  const C = Calc;
  const customIncome = Array.isArray(i.customItems) ? i.customItems : [];
  const customExpense = Array.isArray(e.customItems) ? e.customItems : [];
  const customIncomeTotal =
    typeof C.totalCustomIncome === "function"
      ? C.totalCustomIncome(i)
      : customIncome.reduce(
          (sum, it) => sum + C.toCNY(Number(it.amount) || 0, it.currency || "CNY"),
          0,
        );
  const customExpenseTotal =
    typeof C.totalCustomExp === "function"
      ? C.totalCustomExp(e)
      : customExpense.reduce(
          (sum, it) => sum + C.toCNY(Number(it.amount) || 0, it.currency || "CNY"),
          0,
        );

  const customRows = (section, items) =>
    items
      .map(
        (it, idx) => `
        <tr class="asset-dynamic-row">
          <td>
            <div class="asset-name-wrap">
              <input class="asset-name-input" type="text" value="${escAttr(it.name || "")}"
                     data-section="${section}" data-idx="${idx}" onchange="App.onCustomItemNameChange(this)">
              <select class="currency-select" data-section="${section}" data-idx="${idx}" onchange="App.onCustomItemCurrencyChange(this)">
                ${currencyOptions(it.currency || "CNY")}
              </select>
              <button class="btn-remove-asset" title="删除该项" aria-label="删除该项" onclick="App.removeCustomItem('${section}',${idx})">✕</button>
            </div>
          </td>
          <td>
            <input class="num-input" type="number" step="0.01" min="0" value="${Number(it.amount) || 0}"
                   data-section="${section}" data-idx="${idx}"
                   onchange="App.onCustomItemAmountChange(this)" oninput="App.onCustomItemAmountInput(this)">
          </td>
        </tr>`,
      )
      .join("");

  return `
    <div class="balance-grid">
      <section class="panel">
        <h3>收入端（现金流入）</h3>
        <div class="hint">填写本月实际到账金额；一次性收入可记入“其他收入”。</div>
        <div class="fin-table-wrap">
        <table class="fin-table">
          <tbody>
            <tr><td>工资</td><td class="right">${numCell("income", "salary", i.salary)}</td></tr>
            <tr><td>奖金/提成</td><td class="right">${numCell("income", "bonus", i.bonus)}</td></tr>
            <tr><td>兼职收入</td><td class="right">${numCell("income", "partTime", i.partTime)}</td></tr>
            <tr><td>租金收入</td><td class="right">${numCell("income", "rent", i.rent)}</td></tr>
            <tr><td>理财收益</td><td class="right">${numCell("income", "investReturn", i.investReturn)}</td></tr>
            <tr><td>股息分红</td><td class="right">${numCell("income", "dividends", i.dividends)}</td></tr>
            <tr><td>其他收入</td><td class="right">${numCell("income", "otherIncome", i.otherIncome)}</td></tr>
            <tr><td>红包礼金</td><td class="right">${numCell("income", "redEnvelope", i.redEnvelope)}</td></tr>
            <tr><td>二手交易</td><td class="right">${numCell("income", "secondhand", i.secondhand)}</td></tr>
            <tr><td colspan="2"><span class="text-muted">自定义收入项</span></td></tr>
            ${customRows("income", customIncome)}
            <tr class="section-row"><td>自定义收入小计</td><td class="right">${cv(customIncomeTotal, "pos")}</td></tr>
            <tr class="section-row"><td>劳动收入小计</td><td class="right" id="subtotLaborIncome">${cv(C.totalLaborIncome(i), "pos")}</td></tr>
            <tr class="section-row"><td>其他收入小计</td><td class="right" id="subtotOtherIncome">${cv(C.totalOtherIncome(i), "pos")}</td></tr>
            <tr class="total-row"><td>收入合计</td><td class="right" id="totalIncomeVal">${cv(C.totalIncome(i), "pos")}</td></tr>
          </tbody>
        </table>
        </div>
        <div class="actions-row"><button class="btn-add-asset" onclick="App.addCustomItem('income')">+ 添加自定义收入项</button></div>
      </section>

      <section class="panel">
        <h3>支出端（现金流出）</h3>
        <div class="hint">按实际支付金额填写；信用卡消费按“当月已还款金额”计入更稳妥。</div>
        <div class="fin-table-wrap">
        <table class="fin-table">
          <tbody>
            <tr><td>房贷/房租</td><td class="right">${numCell("expenses", "mortgagePayment", e.mortgagePayment)}</td></tr>
            <tr><td>物业费</td><td class="right">${numCell("expenses", "propertyFee", e.propertyFee)}</td></tr>
            <tr><td>车贷</td><td class="right">${numCell("expenses", "carPayment", e.carPayment)}</td></tr>
            <tr><td>餐饮</td><td class="right">${numCell("expenses", "food", e.food)}</td></tr>
            <tr><td>交通</td><td class="right">${numCell("expenses", "transport", e.transport)}</td></tr>
            <tr><td>水电煤</td><td class="right">${numCell("expenses", "utilities", e.utilities)}</td></tr>
            <tr><td>通讯</td><td class="right">${numCell("expenses", "telecom", e.telecom)}</td></tr>
            <tr><td>购物</td><td class="right">${numCell("expenses", "shopping", e.shopping)}</td></tr>
            <tr><td>娱乐</td><td class="right">${numCell("expenses", "entertainment", e.entertainment)}</td></tr>
            <tr><td>医疗</td><td class="right">${numCell("expenses", "medical", e.medical)}</td></tr>
            <tr><td>教育</td><td class="right">${numCell("expenses", "education", e.education)}</td></tr>
            <tr><td>保险</td><td class="right">${numCell("expenses", "insurance", e.insurance)}</td></tr>
            <tr><td>人情</td><td class="right">${numCell("expenses", "gifts", e.gifts)}</td></tr>
            <tr><td colspan="2"><span class="text-muted">自定义支出项</span></td></tr>
            ${customRows("expenses", customExpense)}
            <tr class="section-row"><td>自定义支出小计</td><td class="right">${cv(customExpenseTotal, "neg")}</td></tr>
            <tr class="section-row"><td>固定支出小计</td><td class="right" id="subtotFixedExp">${cv(C.totalFixedExp(e), "neg")}</td></tr>
            <tr class="section-row"><td>日常支出小计</td><td class="right" id="subtotDailyExp">${cv(C.totalDailyExp(e), "neg")}</td></tr>
            <tr class="section-row"><td>弹性支出小计</td><td class="right" id="subtotFlexExp">${cv(C.totalFlexExp(e), "neg")}</td></tr>
            <tr class="total-row"><td>支出合计</td><td class="right" id="totalExpensesVal">${cv(C.totalExpenses(e), "neg")}</td></tr>
            <tr class="${C.monthlySurplus(i, e) >= 0 ? "surplus-row" : "surplus-row negative"}"><td>月度结余</td><td class="right" id="monthlySurplusVal">${cv(C.monthlySurplus(i, e), C.monthlySurplus(i, e) >= 0 ? "pos" : "neg")}</td></tr>
            <tr><td>储蓄率</td><td class="right"><span class="computed-val" id="savingsRateVal">${C.savingsRate(i, e)}%</span></td></tr>
          </tbody>
        </table>
        </div>
        <div class="actions-row"><button class="btn-add-asset" onclick="App.addCustomItem('expenses')">+ 添加自定义支出项</button></div>
      </section>
    </div>

    <section class="grid-2">
      <div class="panel">
        <h3>收入明细图</h3>
        <div class="chart-wrap"><canvas id="chartIncomeDetail"></canvas></div>
      </div>
      <div class="panel">
        <h3>支出明细图</h3>
        <div class="chart-wrap"><canvas id="chartExpenseDetailIncome"></canvas></div>
      </div>
    </section>
  `;
}

/* ============================================================
   CASH FLOW PAGE
   ============================================================ */
function renderCashFlow(period, record) {
  const cf = record.cashflow;
  const C = Calc;
  return `
    <section class="panel">
      <h3>现金流量表</h3>
      <div class="fin-table-wrap">
      <table class="fin-table">
        <tbody>
          <tr><td>期初余额</td><td class="right">${numCell("cashflow", "openingBalance", cf.openingBalance, "cfOpeningBalance")}</td></tr>
          <tr><td>工资流入</td><td class="right">${numCell("cashflow", "salaryIn", cf.salaryIn)}</td></tr>
          <tr><td>租金流入</td><td class="right">${numCell("cashflow", "rentIn", cf.rentIn)}</td></tr>
          <tr><td>其他流入</td><td class="right">${numCell("cashflow", "otherIn", cf.otherIn)}</td></tr>
          <tr><td>日常流出</td><td class="right">${numCell("cashflow", "dailyOut", cf.dailyOut)}</td></tr>
          <tr><td>固定流出</td><td class="right">${numCell("cashflow", "fixedOut", cf.fixedOut)}</td></tr>
          <tr><td>股票买入</td><td class="right">${numCell("cashflow", "stockBuy", cf.stockBuy)}</td></tr>
          <tr><td>股票卖出</td><td class="right">${numCell("cashflow", "stockSell", cf.stockSell)}</td></tr>
          <tr><td>理财买入</td><td class="right">${numCell("cashflow", "wmBuy", cf.wmBuy)}</td></tr>
          <tr><td>理财赎回</td><td class="right">${numCell("cashflow", "wmRedeem", cf.wmRedeem)}</td></tr>
          <tr><td>新增借款</td><td class="right">${numCell("cashflow", "newLoan", cf.newLoan)}</td></tr>
          <tr><td>还本付息</td><td class="right">${numCell("cashflow", "loanRepay", cf.loanRepay)}</td></tr>
          <tr class="section-row"><td>经营活动净现金流</td><td class="right" id="cfOpNet">${cv(C.operatingNetCF(cf), C.operatingNetCF(cf) >= 0 ? "pos" : "neg")}</td></tr>
          <tr class="section-row"><td>投资活动净现金流</td><td class="right" id="cfInvNet">${cv(C.investingNetCF(cf), C.investingNetCF(cf) >= 0 ? "pos" : "neg")}</td></tr>
          <tr class="section-row"><td>筹资活动净现金流</td><td class="right" id="cfFinNet">${cv(C.financingNetCF(cf), C.financingNetCF(cf) >= 0 ? "pos" : "neg")}</td></tr>
          <tr class="total-row"><td>净现金流</td><td class="right" id="cfNetCF">${cv(C.netCashFlow(cf), C.netCashFlow(cf) >= 0 ? "pos" : "neg")}</td></tr>
          <tr class="net-row"><td>期末余额</td><td class="right" id="cfClosing">${cv(C.closingBalance(cf), C.closingBalance(cf) >= 0 ? "pos" : "neg")}</td></tr>
        </tbody>
      </table>
      </div>
      <div class="actions-row">
        <button class="btn btn-secondary btn-sm" onclick="App.autoFillCFOpening()">自动填入上月期末余额</button>
      </div>
    </section>
  `;
}

/* ============================================================
   HISTORY (period management) — used on the Settings page
   ============================================================ */
function renderHistoryList(currentPeriod) {
  const periods = Store.getAllPeriods().slice().sort().reverse();
  if (periods.length === 0) {
    return `<div class="hint">暂无历史账期</div>`;
  }
  const items = periods
    .map((p) => {
      const [y, m] = p.split("-");
      const isCurrent = p === currentPeriod;
      return `
      <div class="history-item">
        <div>
          <span class="history-period">${y}年${m}月</span>
          ${isCurrent ? '<span class="tag tag-primary" style="margin-left:8px">当前账期</span>' : ""}
        </div>
        <div class="history-actions">
          <button class="btn btn-secondary btn-sm" onclick="App.navigateToPeriod('${p}')">查看</button>
          ${isCurrent ? "" : `<button class="btn btn-danger btn-sm" onclick="App.deleteRecord('${p}')">删除</button>`}
        </div>
      </div>`;
    })
    .join("");
  return `<div class="history-list">${items}</div>`;
}

/* ============================================================
   SETTINGS PAGE
   ============================================================ */
function renderSettings(currentPeriod) {
  const settings = Store.getSettings();

  return `
    <section class="settings-section">
      <h3>基础设置</h3>
      <div class="settings-row">
        <div class="settings-col">
          <label class="settings-label">家庭名称</label>
          <input id="settingFamilyName" class="settings-input" type="text" value="${escAttr(settings.familyName)}">
        </div>
      </div>
      <div class="actions-row">
        <button class="btn btn-primary" onclick="App.saveSettings()">保存设置</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>汇率设置（折算为 CNY）</h3>
      <div class="rate-grid">
        <div class="rate-item">
          <label class="settings-label">CNH</label>
          <input id="rate_CNH" class="settings-input" type="number" step="0.0001" value="${Number(settings.exchangeRates?.CNH ?? 1)}">
        </div>
        <div class="rate-item">
          <label class="settings-label">HKD</label>
          <input id="rate_HKD" class="settings-input" type="number" step="0.0001" value="${Number(settings.exchangeRates?.HKD ?? 0.923)}">
        </div>
        <div class="rate-item">
          <label class="settings-label">USD</label>
          <input id="rate_USD" class="settings-input" type="number" step="0.0001" value="${Number(settings.exchangeRates?.USD ?? 7.25)}">
        </div>
        <div class="rate-item">
          <label class="settings-label">EUR</label>
          <input id="rate_EUR" class="settings-input" type="number" step="0.0001" value="${Number(settings.exchangeRates?.EUR ?? 7.87)}">
        </div>
      </div>
      <div class="settings-desc">最后自动更新时间：<span id="ratesUpdatedAt">${escAttr(settings.ratesUpdatedAt || "暂无")}</span></div>
    </section>

    <section class="settings-section">
      <h3>历史账期</h3>
      ${renderHistoryList(currentPeriod)}
    </section>

    <section class="settings-section">
      <h3>数据管理</h3>
      <div class="data-actions">
        <button class="btn btn-secondary" onclick="App.exportData()">导出数据</button>
        <button class="btn btn-secondary" onclick="App.importData()">导入数据</button>
        <button class="btn btn-secondary" onclick="App.printPage()">打印当前页面</button>
        <button class="btn btn-danger" onclick="App.clearAllData()">清空全部数据</button>
      </div>
    </section>

    <section class="settings-section">
      <h3>账户</h3>
      <div class="actions-row">
        <button class="btn btn-secondary" onclick="App.logout()">退出登录</button>
      </div>
    </section>
  `;
}
