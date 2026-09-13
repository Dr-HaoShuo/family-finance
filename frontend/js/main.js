/* ============================================================
   MAIN — Application controller, routing, event handling
   ============================================================ */

const App = (() => {
  let currentPeriod = '';
  let currentPage = 'dashboard';
  let ppYear = new Date().getFullYear();
  let saveStatusClearTimer = null;

  const PAGE_TITLES = {
    dashboard: '总览',
    balance: '资产负债表',
    income: '利润表',
    cashflow: '现金流量表',
    settings: '设置',
  };

  /* ---- Toast ---- */
  function toast(msg, type = 'success') {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type} show`;
    setTimeout(() => el.classList.remove('show'), 2800);
  }

  /* ---- Save status ---- */
  function onSaveStatusChange(status, message) {
    const el = document.getElementById('saveStatus');
    if (!el) return;
    clearTimeout(saveStatusClearTimer);
    if (status === 'saving') {
      el.textContent = '保存中…';
    } else if (status === 'saved') {
      el.textContent = '✓ 已自动保存';
      saveStatusClearTimer = setTimeout(() => { el.textContent = ''; }, 2000);
    } else if (status === 'error') {
      el.textContent = '⚠ 保存失败';
      toast('保存失败: ' + (message || ''), 'error');
    }
  }

  /* ---- Period ---- */
  function getCurrentPeriod() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }

  async function setPeriod(p) {
    currentPeriod = p;
    const [y, m] = p.split('-');
    const displayText = document.getElementById('periodDisplayText');
    if (displayText) displayText.textContent = `${y}年${m}月`;
    document.getElementById('periodBadge').textContent = `${y}年${m}月`;
    await Store.ensureRecordLoaded(p);
    renderCurrentPage();
  }

  /* ---- Period Picker Popup ---- */
  function togglePeriodPicker() {
    const popup = document.getElementById('periodPickerPopup');
    if (!popup) return;
    if (popup.style.display === 'none' || popup.style.display === '') {
      ppYear = parseInt(currentPeriod.split('-')[0]) || new Date().getFullYear();
      renderPeriodPickerPopup();
      popup.style.display = 'block';
    } else {
      popup.style.display = 'none';
    }
  }

  function renderPeriodPickerPopup() {
    const yearEl = document.getElementById('ppYear');
    if (yearEl) yearEl.textContent = ppYear;
    const monthsEl = document.getElementById('ppMonths');
    if (!monthsEl) return;
    const curYear  = parseInt(currentPeriod.split('-')[0]);
    const curMonth = parseInt(currentPeriod.split('-')[1]);
    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    monthsEl.innerHTML = monthNames.map((name, i) => {
      const mm = String(i + 1).padStart(2, '0');
      const isActive = curYear === ppYear && curMonth === (i + 1);
      return `<button class="pp-month-btn${isActive ? ' active' : ''}" onclick="App.selectPeriodFromPicker(${ppYear},'${mm}')">${name}</button>`;
    }).join('');
  }

  function ppChangeYear(delta) {
    ppYear += delta;
    renderPeriodPickerPopup();
  }

  function selectPeriodFromPicker(year, mm) {
    const p = `${year}-${mm}`;
    setPeriod(p);
    const popup = document.getElementById('periodPickerPopup');
    if (popup) popup.style.display = 'none';
  }

  /* ---- Navigation ---- */
  function navigateTo(page) {
    if (page === currentPage) return;
    currentPage = page;

    document.querySelectorAll('.nav-item').forEach(el => {
      el.classList.toggle('active', el.dataset.page === page);
    });
    document.querySelectorAll('.page').forEach(el => {
      el.classList.toggle('active', el.id === `page-${page}`);
    });

    document.getElementById('pageTitle').textContent = PAGE_TITLES[page] || page;
    renderCurrentPage();
  }

  function renderCurrentPage() {
    const record = Store.getRecord(currentPeriod);
    const container = document.getElementById(`page-${currentPage}`);
    if (!container || !record) return;

    switch (currentPage) {
      case 'dashboard':
        container.innerHTML = renderDashboard(currentPeriod, record);
        requestAnimationFrame(() => renderDashboardCharts(record));
        break;
      case 'balance':
        container.innerHTML = renderBalanceSheet(currentPeriod, record);
        updateBalanceEquivs();
        break;
      case 'income':
        container.innerHTML = renderIncomeStatement(currentPeriod, record);
        requestAnimationFrame(() => {
          Charts.renderIncomeDetail(record);
          Charts.renderExpenseDetailIncome(record);
        });
        break;
      case 'cashflow':
        container.innerHTML = renderCashFlow(currentPeriod, record);
        break;
      case 'settings':
        container.innerHTML = renderSettings(currentPeriod);
        break;
    }
  }

  async function renderDashboardCharts(record) {
    Charts.renderExpenseDonut(record);
    Charts.renderIncomeExpenseBar(record);
    Charts.renderAssetAlloc(record);
    Charts.renderExpenseDetail(record);

    const prev = Store.getPrevPeriod(currentPeriod);
    if (Store.hasPeriod(prev)) {
      const prevRecord = await Store.ensureRecordLoaded(prev);
      renderDeltaPill('netAssetsDelta', Calc.netAssets(record.balance), Calc.netAssets(prevRecord.balance));
      renderDeltaPill('surplusDelta', Calc.monthlySurplus(record.income, record.expenses), Calc.monthlySurplus(prevRecord.income, prevRecord.expenses));
    }

    const periods = Store.getAllPeriods();
    if (periods.length >= 2) {
      await Promise.all(periods.map(p => Store.ensureRecordLoaded(p)));
      Charts.renderNetAssetTrend(periods, periods.reduce((acc, p) => {
        acc[p] = Store.getRecord(p);
        return acc;
      }, {}));
    }
  }

  /* ---- Month-over-month delta pill (dashboard summary cards) ---- */
  function renderDeltaPill(id, current, prev) {
    const el = document.getElementById(id);
    if (!el || currentPage !== 'dashboard') return;
    const diff = current - prev;
    if (diff === 0) {
      el.textContent = '与上月持平';
      el.className = 'sub card-change';
      return;
    }
    const dir = diff > 0 ? 'up' : 'down';
    const arrow = diff > 0 ? '↑' : '↓';
    const pctText = prev !== 0 ? `${Math.abs(diff / prev * 100).toFixed(1)}%` : `${Calc.fmtFull(Math.abs(diff))} 元`;
    el.className = `sub card-change ${dir}`;
    el.textContent = `${arrow} ${pctText} 较上月`;
  }

  /* ---- Auto-update computed fields without full re-render ---- */
  function updateComputedFields() {
    const record = Store.getRecord(currentPeriod);
    if (!record) return;
    const b = record.balance;
    const i = record.income;
    const e = record.expenses;
    const cf = record.cashflow;
    const C = Calc;

    const set = (id, val, autoClass) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.textContent = C.fmtFull(val);
      if (autoClass !== undefined) {
        el.className = `computed-val ${val >= 0 ? 'pos' : 'neg'}`;
      }
    };

    if (currentPage === 'balance') {
      set('subtotCurrentAssets',  C.totalCurrentAssets(b),  true);
      set('subtotInvestAssets',   C.totalInvestAssets(b),   true);
      set('subtotPersonalAssets', C.totalPersonalAssets(b), true);
      set('totalAssetsVal', C.totalAssets(b));
      set('subtotFinancialLiab',  C.totalFinancialLiab(b),  true);
      set('subtotCurrentLiab',    C.totalCurrentLiab(b),    true);
      set('totalLiabVal', C.totalLiabilities(b));
      set('netAssetsVal', C.netAssets(b), true);
      const ratioEl = document.getElementById('liabRatioVal');
      if (ratioEl) {
        const ta = C.totalAssets(b);
        ratioEl.textContent = ta > 0 ? Math.round(C.totalLiabilities(b) / ta * 100) + '%' : '0%';
      }
    }

    if (currentPage === 'income') {
      set('subtotLaborIncome', C.totalLaborIncome(i), true);
      set('subtotOtherIncome', C.totalOtherIncome(i), true);
      set('totalIncomeVal', C.totalIncome(i));
      set('subtotFixedExp', C.totalFixedExp(e), true);
      set('subtotDailyExp', C.totalDailyExp(e), true);
      set('subtotFlexExp',  C.totalFlexExp(e),  true);
      set('totalExpensesVal', C.totalExpenses(e));
      const surplus = C.monthlySurplus(i, e);
      set('monthlySurplusVal', surplus, true);
      const srEl = document.getElementById('savingsRateVal');
      if (srEl) srEl.textContent = C.savingsRate(i, e) + '%';
    }

    if (currentPage === 'cashflow') {
      const opNet  = C.operatingNetCF(cf);
      const invNet = C.investingNetCF(cf);
      const finNet = C.financingNetCF(cf);
      const netCF  = C.netCashFlow(cf);
      const closing = C.closingBalance(cf);
      set('cfOpNet',  opNet,  true);
      set('cfInvNet', invNet, true);
      set('cfFinNet', finNet, true);
      set('cfNetCF',  netCF,  true);
      set('cfClosing', closing, true);
    }
  }

  /* ---- Update CNY equiv displays for foreign-currency assets ---- */
  function updateBalanceEquivs() {
    if (currentPage !== 'balance') return;
    const record = Store.getRecord(currentPeriod);
    if (!record) return;
    const b = record.balance;
    const C = Calc;
    ['currentAssets', 'investAssets', 'personalAssets'].forEach(group => {
      const items = b[group] || [];
      items.forEach((item, idx) => {
        const el = document.getElementById(`equiv_${group}_${idx}`);
        if (!el) return;
        const amt = Number(item.amount) || 0;
        if (item.currency !== 'CNY' && amt > 0) {
          el.textContent = `≈ ¥${C.fmtFull(C.toCNY(amt, item.currency))}`;
          el.style.display = '';
        } else {
          el.style.display = 'none';
        }
      });
    });
  }

  /* ---- Static field change handlers ---- */
  function onFieldChange(input) {
    const section = input.dataset.section;
    const field   = input.dataset.field;
    const value   = parseFloat(input.value) || 0;
    Store.updateField(currentPeriod, section, field, value);
    updateComputedFields();
    input.classList.add('changed');
    setTimeout(() => input.classList.remove('changed'), 800);
  }

  function onFieldInput(input) {
    const section = input.dataset.section;
    const field   = input.dataset.field;
    const value   = parseFloat(input.value) || 0;
    Store.updateField(currentPeriod, section, field, value);
    updateComputedFields();
  }

  function onNotesChange(textarea) {
    Store.updateNotes(currentPeriod, textarea.value);
  }

  /* ---- Dynamic asset handlers ---- */
  function onAssetAmountChange(input) {
    const { group, idx } = input.dataset;
    const value = parseFloat(input.value) || 0;
    Store.updateAssetItem(currentPeriod, group, parseInt(idx), 'amount', value);
    updateComputedFields();
    updateBalanceEquivs();
    input.classList.add('changed');
    setTimeout(() => input.classList.remove('changed'), 800);
  }

  function onAssetAmountInput(input) {
    const { group, idx } = input.dataset;
    const value = parseFloat(input.value) || 0;
    Store.updateAssetItem(currentPeriod, group, parseInt(idx), 'amount', value);
    updateComputedFields();
    updateBalanceEquivs();
  }

  function onAssetCurrencyChange(select) {
    const { group, idx } = select.dataset;
    Store.updateAssetItem(currentPeriod, group, parseInt(idx), 'currency', select.value);
    updateComputedFields();
    updateBalanceEquivs();
  }

  function onAssetNameChange(input) {
    const { group, idx } = input.dataset;
    Store.updateAssetItem(currentPeriod, group, parseInt(idx), 'name', input.value);
  }

  /* ---- Dynamic income/expense custom item handlers ---- */
  function onCustomItemNameChange(input) {
    const { section, idx } = input.dataset;
    Store.updateCustomItem(currentPeriod, section, parseInt(idx), 'name', input.value);
  }

  function onCustomItemAmountChange(input) {
    const { section, idx } = input.dataset;
    const value = parseFloat(input.value) || 0;
    Store.updateCustomItem(currentPeriod, section, parseInt(idx), 'amount', value);
    updateComputedFields();
    input.classList.add('changed');
    setTimeout(() => input.classList.remove('changed'), 800);
  }

  function onCustomItemAmountInput(input) {
    const { section, idx } = input.dataset;
    const value = parseFloat(input.value) || 0;
    Store.updateCustomItem(currentPeriod, section, parseInt(idx), 'amount', value);
    updateComputedFields();
  }

  function onCustomItemCurrencyChange(select) {
    const { section, idx } = select.dataset;
    Store.updateCustomItem(currentPeriod, section, parseInt(idx), 'currency', select.value);
    updateComputedFields();
  }

  function addCustomItem(section) {
    const defaults = {
      income: '其他收入项',
      expenses: '其他支出项',
    };
    Store.addCustomItem(currentPeriod, section, {
      id: 'custom_' + Date.now(),
      name: defaults[section] || '自定义项',
      amount: 0,
      currency: 'CNY',
    });
    renderCurrentPage();
  }

  function removeCustomItem(section, idx) {
    Store.removeCustomItem(currentPeriod, section, idx);
    renderCurrentPage();
  }

  function addAssetItem(group) {
    const defaultNames = {
      currentAssets:  '现金账户',
      investAssets:   '投资资产',
      personalAssets: '自用性资产',
      liabilities: '负债项目',
    };
    Store.addAssetItem(currentPeriod, group, {
      id: 'custom_' + Date.now(),
      name: defaultNames[group] || '资产',
      amount: 0,
      currency: 'CNY',
    });
    renderCurrentPage();
  }

  function removeAssetItem(group, idx) {
    Store.removeAssetItem(currentPeriod, group, idx);
    renderCurrentPage();
  }

  /* ---- Copy last month balance ---- */
  async function copyLastMonthBalance() {
    const prev = Store.getPrevPeriod(currentPeriod);
    if (!Store.hasPeriod(prev)) {
      toast('上月暂无数据', 'warning');
      return;
    }
    if (!confirm(`确定要将 ${prev} 的资产负债数据复制到本月吗？\n（仅复制资产负债表数据，收支和现金流不受影响）`)) return;
    await Store.ensureRecordLoaded(prev);
    Store.copyBalanceFrom(prev, currentPeriod);
    if (currentPage === 'balance' || currentPage === 'dashboard') renderCurrentPage();
    toast('已复制上月资产负债表数据');
  }

  /* ---- Auto-fill opening balance ---- */
  async function autoFillCFOpening() {
    const prev = Store.getPrevPeriod(currentPeriod);
    if (!Store.hasPeriod(prev)) {
      toast('上月暂无现金流数据', 'warning');
      return;
    }
    const prevRecord  = await Store.ensureRecordLoaded(prev);
    const prevClosing = Calc.closingBalance(prevRecord.cashflow);
    Store.updateField(currentPeriod, 'cashflow', 'openingBalance', prevClosing);
    const input = document.getElementById('cfOpeningBalance');
    if (input) {
      input.value = prevClosing;
      input.classList.add('changed');
      setTimeout(() => input.classList.remove('changed'), 800);
    }
    updateComputedFields();
    toast(`已自动填入上月期末余额 ${Calc.fmtFull(prevClosing)} 元`);
  }

  /* ---- Settings ---- */
  function saveSettings() {
    const data = {
      familyName: document.getElementById('settingFamilyName')?.value || '',
      exchangeRates: Store.getSettings().exchangeRates,
    };
    Store.saveSettings(data);
    document.getElementById('familyNameDisplay').textContent = data.familyName || '我的家庭';
    toast('设置已保存');
  }

  async function refreshExchangeRates(silent = false) {
    try {
      // Public endpoint, no API key required.
      // It returns rates where 1 CNY = X target currency.
      const res = await fetch('https://open.er-api.com/v6/latest/CNY');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rates = data?.rates || {};

      // App expects "1 unit foreign currency = ? CNY", so invert.
      const hkdToCny = rates.HKD ? 1 / Number(rates.HKD) : null;
      const usdToCny = rates.USD ? 1 / Number(rates.USD) : null;
      const eurToCny = rates.EUR ? 1 / Number(rates.EUR) : null;

      if (!hkdToCny || !usdToCny || !eurToCny) {
        throw new Error('返回数据不完整');
      }

      const patch = {
        exchangeRates: {
          CNH: 1.0,
          HKD: Number(hkdToCny.toFixed(4)),
          USD: Number(usdToCny.toFixed(4)),
          EUR: Number(eurToCny.toFixed(4)),
        },
        ratesUpdatedAt: data.time_last_update_utc || new Date().toISOString(),
      };

      Store.saveSettings(patch);

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = String(val);
      };
      setVal('rate_CNH', patch.exchangeRates.CNH);
      setVal('rate_HKD', patch.exchangeRates.HKD);
      setVal('rate_USD', patch.exchangeRates.USD);
      setVal('rate_EUR', patch.exchangeRates.EUR);
      const updatedAtEl = document.getElementById('ratesUpdatedAt');
      if (updatedAtEl) updatedAtEl.textContent = patch.ratesUpdatedAt;

      if (!silent) {
        toast(`汇率已更新（日期：${data.time_last_update_utc || '最新'}）`);
      }
      return true;
    } catch (err) {
      if (!silent) {
        toast('汇率更新失败：' + err.message, 'error');
      } else {
        console.warn('自动更新汇率失败：', err);
      }
      return false;
    }
  }

  async function autoRefreshExchangeRatesIfNeeded() {
    const today = new Date().toISOString().slice(0, 10);
    const key = 'family_finance_rates_last_auto_update';
    const last = localStorage.getItem(key);
    if (last === today) return;
    const ok = await refreshExchangeRates(true);
    if (ok) localStorage.setItem(key, today);
  }

  /* ---- Data management ---- */
  async function exportData() {
    try {
      const json = await Store.exportJSON();
      const blob = new Blob([json], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `家庭财务数据_${new Date().toLocaleDateString('zh-CN').replace(/\//g,'-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast('数据已导出');
    } catch (err) {
      toast('导出失败: ' + err.message, 'error');
    }
  }

  function importData() {
    const input = document.createElement('input');
    input.type   = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await Store.importJSON(ev.target.result);
          toast('数据导入成功，正在刷新页面...');
          setTimeout(() => location.reload(), 1000);
        } catch (err) {
          toast('导入失败: ' + err.message, 'error');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  async function clearAllData() {
    if (!confirm('确定要清空所有财务数据吗？此操作不可撤销！\n\n建议先导出备份。')) return;
    if (!confirm('再次确认：将删除所有历史月份数据！')) return;
    try {
      await Store.importJSON(JSON.stringify({
        settings: { familyName: '我的家庭', exchangeRates: { CNH: 1.0, HKD: 0.923, USD: 7.25, EUR: 7.87 }, ratesUpdatedAt: '' },
        records: {},
      }));
      toast('已清空所有数据，正在刷新...', 'warning');
      setTimeout(() => location.reload(), 1000);
    } catch (err) {
      toast('清空失败: ' + err.message, 'error');
    }
  }

  async function deleteRecord(period) {
    const [y, m] = period.split('-');
    if (!confirm(`确定要删除 ${y}年${m}月 的财务记录吗？`)) return;
    await Store.deleteRecord(period);
    if (period === currentPeriod) await Store.ensureRecordLoaded(currentPeriod);
    renderCurrentPage();
    toast(`已删除 ${y}年${m}月 记录`);
  }

  async function navigateToPeriod(period) {
    await setPeriod(period);
    navigateTo('dashboard');
  }

  function printPage() { window.print(); }

  /* ---- Auth ---- */
  async function checkAuth() {
    try {
      const { authenticated } = await Api.get('/me');
      return authenticated;
    } catch (err) {
      return false;
    }
  }

  function showLoginScreen(errorMsg) {
    document.getElementById('app').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    const errEl = document.getElementById('loginError');
    if (errEl) errEl.textContent = errorMsg || '';
    document.getElementById('loginPassword')?.focus();
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const input = document.getElementById('loginPassword');
    const password = input?.value || '';
    if (!password) return;
    try {
      await Api.post('/login', { password });
      document.getElementById('loginScreen').style.display = 'none';
      document.getElementById('app').style.display = '';
      await startApp();
    } catch (err) {
      showLoginScreen(err.message || '登录失败');
    }
  }

  async function logout() {
    await Api.post('/logout');
    location.reload();
  }

  /* ---- Init ---- */
  async function startApp() {
    Store.setSaveStatusCallback(onSaveStatusChange);
    await Store.init();

    currentPeriod = getCurrentPeriod();

    const [y, m] = currentPeriod.split('-');
    const displayText = document.getElementById('periodDisplayText');
    if (displayText) displayText.textContent = `${y}年${m}月`;
    document.getElementById('periodBadge').textContent = `${y}年${m}月`;

    const settings = Store.getSettings();
    document.getElementById('familyNameDisplay').textContent = settings.familyName || '我的家庭';

    await Store.ensureRecordLoaded(currentPeriod);
    renderCurrentPage();
    autoRefreshExchangeRatesIfNeeded();
  }

  async function init() {
    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(el.dataset.page);
      });
    });

    document.getElementById('btnCopyLast').addEventListener('click', copyLastMonthBalance);
    document.getElementById('loginForm').addEventListener('submit', handleLoginSubmit);

    // Close period picker when clicking outside
    document.addEventListener('click', (e) => {
      const popup = document.getElementById('periodPickerPopup');
      const btn   = document.getElementById('periodDisplayBtn');
      if (popup && popup.style.display === 'block') {
        if (!popup.contains(e.target) && !btn?.contains(e.target)) {
          popup.style.display = 'none';
        }
      }
    });

    const authenticated = await checkAuth();
    if (!authenticated) {
      showLoginScreen();
      return;
    }
    document.getElementById('app').style.display = '';
    await startApp();
  }

  return {
    init,
    navigateTo,
    navigateToPeriod,
    onFieldChange,
    onFieldInput,
    onNotesChange,
    onAssetAmountChange,
    onAssetAmountInput,
    onAssetCurrencyChange,
    onAssetNameChange,
    onCustomItemNameChange,
    onCustomItemAmountChange,
    onCustomItemAmountInput,
    onCustomItemCurrencyChange,
    addCustomItem,
    removeCustomItem,
    addAssetItem,
    removeAssetItem,
    togglePeriodPicker,
    ppChangeYear,
    selectPeriodFromPicker,
    copyLastMonthBalance,
    autoFillCFOpening,
    saveSettings,
    refreshExchangeRates,
    autoRefreshExchangeRatesIfNeeded,
    exportData,
    importData,
    clearAllData,
    deleteRecord,
    printPage,
    logout,
    toast,
  };
})();

// Expose App for inline handlers declared in index.html.
window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
