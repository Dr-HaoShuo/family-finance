/* ============================================================
   CHARTS — Chart.js chart management
   ============================================================ */

const Charts = (() => {
  const instances = {};

  const PALETTE = ['#C9A545','#27A870','#D4453A','#D97706','#8B65C9','#0891B2','#A0522D','#6B8E5A'];

  if (typeof Chart !== 'undefined') {
    Chart.defaults.font.family = "'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.color = '#6B6E82';
    Chart.defaults.borderColor = '#EDE8DF';
    Chart.defaults.plugins.tooltip.backgroundColor = '#1C1F2E';
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.titleFont = { family: "'Noto Serif SC','STSong','SimSun',serif", size: 12, weight: '600' };
    Chart.defaults.plugins.tooltip.bodyFont = { family: "'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif", size: 12 };
  }

  function destroy(key) {
    if (instances[key]) {
      instances[key].destroy();
      delete instances[key];
    }
  }

  function getCtx(id) {
    const el = document.getElementById(id);
    return el ? el.getContext('2d') : null;
  }

  /* Expense breakdown donut */
  function renderExpenseDonut(record) {
    const e = record.expenses;
    const C = Calc;
    const data = [
      { label: '固定支出', value: C.totalFixedExp(e), color: '#D4453A' },
      { label: '日常支出', value: C.totalDailyExp(e), color: '#C9A545' },
      { label: '弹性支出', value: C.totalFlexExp(e), color: '#8B65C9' },
    ].filter(d => d.value > 0);

    destroy('chartExpenseDonut');
    const ctx = getCtx('chartExpenseDonut');
    if (!ctx) return;

    instances.chartExpenseDonut = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: "'Noto Sans SC','PingFang SC','Microsoft YaHei',sans-serif", size: 12 }, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
      },
    });
  }

  /* Expense detail breakdown */
  function renderExpenseDetail(record) {
    const e = record.expenses;
    const baseLabels = [
      '房贷/房租','物业费','车贷',
      '餐饮','交通','水电煤','通讯',
      '购物','娱乐','医疗','教育','保险','人情',
    ];
    const baseValues = [
      e.mortgagePayment, e.propertyFee, e.carPayment,
      e.food, e.transport, e.utilities, e.telecom,
      e.shopping, e.entertainment, e.medical, e.education, e.insurance, e.gifts,
    ];
    const customItems = Array.isArray(e.customItems) ? e.customItems : [];
    const customLabels = customItems.map((it, idx) => it.name || `自定义支出${idx + 1}`);
    const customValues = customItems.map((it) => Calc.toCNY(it.amount, it.currency));
    const labels = [...baseLabels, ...customLabels];
    const values = [...baseValues, ...customValues];
    const baseColors = [
      '#D4453A','#C9A545','#D97706',
      '#E8B84B','#6B8E5A','#0891B2','#2EA8C9',
      '#8B65C9','#C06090','#27A870','#5A82B4','#7B6CB4','#A0522D',
    ];
    const customColors = customItems.map((_, idx) => PALETTE[idx % PALETTE.length]);

    destroy('chartExpenseDetail');
    const ctx = getCtx('chartExpenseDetail');
    if (!ctx) return;

    instances.chartExpenseDetail = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '金额（元）',
          data: values,
          backgroundColor: [...baseColors, ...customColors],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v,
              font: { size: 11 },
            },
          },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  /* Expense detail for Income Statement page (separate canvas ID) */
  function renderExpenseDetailIncome(record) {
    const e = record.expenses;
    const baseLabels = [
      '房贷/房租','物业费','车贷',
      '餐饮','交通','水电煤','通讯',
      '购物','娱乐','医疗','教育','保险','人情',
    ];
    const baseValues = [
      e.mortgagePayment, e.propertyFee, e.carPayment,
      e.food, e.transport, e.utilities, e.telecom,
      e.shopping, e.entertainment, e.medical, e.education, e.insurance, e.gifts,
    ];
    const customItems = Array.isArray(e.customItems) ? e.customItems : [];
    const customLabels = customItems.map((it, idx) => it.name || `自定义支出${idx + 1}`);
    const customValues = customItems.map((it) => Calc.toCNY(it.amount, it.currency));
    const labels = [...baseLabels, ...customLabels];
    const values = [...baseValues, ...customValues];
    const baseColors = [
      '#D4453A','#C9A545','#D97706',
      '#E8B84B','#6B8E5A','#0891B2','#2EA8C9',
      '#8B65C9','#C06090','#27A870','#5A82B4','#7B6CB4','#A0522D',
    ];
    const customColors = customItems.map((_, idx) => PALETTE[idx % PALETTE.length]);

    destroy('chartExpenseDetailIncome');
    const ctx = getCtx('chartExpenseDetailIncome');
    if (!ctx) return;

    instances.chartExpenseDetailIncome = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '金额（元）',
          data: values,
          backgroundColor: [...baseColors, ...customColors],
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `${Calc.fmtFull(ctx.raw)} 元` } },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v, font: { size: 11 } },
          },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  /* Income vs Expense bar */
  function renderIncomeExpenseBar(record) {
    const inc = Calc.totalIncome(record.income);
    const exp = Calc.totalExpenses(record.expenses);
    const sur = inc - exp;

    destroy('chartIncomeExp');
    const ctx = getCtx('chartIncomeExp');
    if (!ctx) return;

    instances.chartIncomeExp = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['月度收入', '月度支出', '月度结余'],
        datasets: [{
          data: [inc, exp, sur],
          backgroundColor: [
            '#27A870',
            '#D4453A',
            sur >= 0 ? '#C9A545' : '#D97706',
          ],
          borderRadius: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v,
              font: { size: 11 },
            },
          },
          x: { ticks: { font: { size: 12 } } },
        },
      },
    });
  }

  /* Net asset trend line */
  function renderNetAssetTrend(periods, records) {
    const labels = [...periods].reverse();
    const data = labels.map(p => {
      const r = records[p];
      if (!r) return 0;
      return Calc.netAssets(r.balance);
    });

    destroy('chartNetAsset');
    const ctx = getCtx('chartNetAsset');
    if (!ctx) return;

    instances.chartNetAsset = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.map(p => {
          const [y, m] = p.split('-');
          return `${y}/${m}`;
        }),
        datasets: [{
          label: '净资产（元）',
          data,
          fill: true,
          backgroundColor: 'rgba(201,165,69,0.08)',
          borderColor: '#C9A545',
          borderWidth: 2.5,
          tension: 0.35,
          pointBackgroundColor: '#C9A545',
          pointRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `净资产: ${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
        scales: {
          y: {
            ticks: {
              callback: v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v,
              font: { size: 11 },
            },
          },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  /* Income breakdown bar */
  function renderIncomeDetail(record) {
    const i = record.income;
    const baseLabels = ['工资','奖金/提成','兼职','租金','理财收益','股息','其他','红包','二手'];
    const baseValues = [i.salary,i.bonus,i.partTime,i.rent,i.investReturn,i.dividends,i.otherIncome,i.redEnvelope,i.secondhand];
    const customItems = Array.isArray(i.customItems) ? i.customItems : [];
    const customLabels = customItems.map((it, idx) => it.name || `自定义收入${idx + 1}`);
    const customValues = customItems.map((it) => Calc.toCNY(it.amount, it.currency));
    const labels = [...baseLabels, ...customLabels];
    const values = [...baseValues, ...customValues];

    destroy('chartIncomeDetail');
    const ctx = getCtx('chartIncomeDetail');
    if (!ctx) return;

    instances.chartIncomeDetail = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: '收入（元）',
          data: values,
          backgroundColor: labels.map((_, idx) =>
            idx < baseLabels.length ? '#27A870' : PALETTE[idx % PALETTE.length]
          ),
          borderRadius: 4,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: v => v >= 10000 ? (v/10000).toFixed(1)+'万' : v,
              font: { size: 11 },
            },
          },
          x: { ticks: { font: { size: 11 } } },
        },
      },
    });
  }

  /* Asset allocation */
  function renderAssetAlloc(record) {
    const b = record.balance;
    const C = Calc;
    const data = [
      { label: '流动性资产', value: C.totalCurrentAssets(b), color: '#27A870' },
      { label: '投资性资产', value: C.totalInvestAssets(b), color: '#C9A545' },
      { label: '自用性资产', value: C.totalPersonalAssets(b), color: '#8B65C9' },
    ].filter(d => d.value > 0);

    destroy('chartAssetAlloc');
    const ctx = getCtx('chartAssetAlloc');
    if (!ctx) return;

    instances.chartAssetAlloc = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: data.map(d => d.label),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color),
          borderWidth: 2,
          borderColor: '#fff',
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { size: 12 }, padding: 12 },
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.label}: ${Calc.fmtFull(ctx.raw)} 元`,
            },
          },
        },
      },
    });
  }

  return {
    renderExpenseDonut, renderExpenseDetail, renderExpenseDetailIncome, renderIncomeExpenseBar,
    renderNetAssetTrend, renderIncomeDetail, renderAssetAlloc,
    destroy,
  };
})();
