interface SettingsInfo {
  restaurantName?: string;
  address?: string;
  contactNumber?: string;
  logo?: { url?: string };
  vatInfo?: { bin?: string; mushak?: string };
}

function formatValue(val: number | undefined | null, prefix = ''): string {
  if (val === undefined || val === null) return `${prefix}0`;
  return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderTable(rows: Array<Record<string, unknown>>, columns: { key: string; label: string; align?: 'left' | 'right' | 'center'; format?: (v: unknown) => string }[]): string {
  if (!rows || rows.length === 0) {
    return '<div class="empty-state">No data available for this period.</div>';
  }

  let thead = '<thead><tr>';
  for (const col of columns) {
    const align = col.align || 'left';
    thead += `<th style="text-align: ${align}; padding: 10px 14px; font-size: 11px; font-weight: 600; color: #ffffff; text-transform: uppercase; letter-spacing: 0.05em; background: #0f172a;">${col.label}</th>`;
  }
  thead += '</tr></thead>';

  let tbody = '<tbody>';
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const bgColor = i % 2 === 0 ? '#ffffff' : '#f8fafc';
    tbody += `<tr style="background: ${bgColor};">`;
    for (const col of columns) {
      const val = row[col.key];
      const display = col.format ? col.format(val) : escapeHtml(String(val ?? ''));
      const align = col.align || 'left';
      tbody += `<td style="padding: 10px 14px; font-size: 12px; color: #334155; border-bottom: 1px solid #e2e8f0; text-align: ${align};">${display}</td>`;
    }
    tbody += '</tr>';
  }
  tbody += '</tbody>';

  return `<div class="table-container"><table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">${thead}${tbody}</table></div>`;
}

function renderSectionHeader(title: string, subtitle?: string): string {
  return `
    <div class="section-header">
      <div class="section-accent"></div>
      <div class="section-content">
        <h3 class="section-title">${title}</h3>
        ${subtitle ? `<p class="section-subtitle">${subtitle}</p>` : ''}
      </div>
    </div>`;
}

function renderMetricCard(label: string, value: string, color: string, subtitle?: string): string {
  return `
    <div class="metric-card">
      <div class="metric-accent" style="background: ${color};"></div>
      <div class="metric-content">
        <p class="metric-label">${label}</p>
        <p class="metric-value" style="color: ${color};">${value}</p>
        ${subtitle ? `<p class="metric-subtitle">${subtitle}</p>` : ''}
      </div>
    </div>`;
}

function renderSalesReport(data: Record<string, unknown>): string {
  const summary = data.summary as Record<string, number> | undefined;
  const byPaymentMethod = data.byPaymentMethod as Record<string, { count: number; revenue: number }> | undefined;
  const dailyBreakdown = data.dailyBreakdown as Array<Record<string, unknown>> | undefined;
  const byProduct = data.byProduct as Array<Record<string, unknown>> | undefined;
  const byCategory = data.byCategory as Array<Record<string, unknown>> | undefined;
  const range = data.range as { from: string; to: string } | undefined;

  let html = `
    <div class="report-title-section">
      <h2 class="report-title">Sales Report</h2>
      <div class="report-period">
        <span class="period-icon">&#128197;</span>
        <span class="period-text">${range?.from || 'N/A'} — ${range?.to || 'N/A'}</span>
      </div>
    </div>

    ${renderSectionHeader('Executive Summary', 'Key performance metrics for the selected period')}

    <div class="metrics-grid">
      ${renderMetricCard('Total Revenue', formatValue(summary?.totalRevenue, '৳'), '#0f172a')}
      ${renderMetricCard('Total Orders', String(summary?.totalOrders ?? 0), '#334155')}
      ${renderMetricCard('Products Sold', String(summary?.totalProductsSold ?? 0), '#334155')}
      ${renderMetricCard('Avg Order Value', formatValue(summary?.averageOrderValue, '৳'), '#475569')}
      ${renderMetricCard('Total VAT', formatValue(summary?.totalTaxAmount, '৳'), '#475569')}
      ${renderMetricCard('Discount', `${formatValue(summary?.totalDiscountAmount, '৳')} (${summary?.discountPercentage ?? 0}%)`, '#64748b')}
    </div>`;

  if (byProduct && byProduct.length > 0) {
    html += `
      ${renderSectionHeader('Product Performance', 'Top-selling products by revenue')}
      ${renderTable(byProduct, [
        { key: 'name', label: 'Product' },
        { key: 'category', label: 'Category' },
        { key: 'unitsSold', label: 'Units Sold', align: 'right' },
        { key: 'orderCount', label: 'Orders', align: 'right' },
        { key: 'income', label: 'Revenue', align: 'right', format: (v) => formatValue(v as number, '৳') },
        { key: 'percentageOfTotal', label: 'Share', align: 'right', format: (v) => `${v ?? 0}%` },
      ])}`;
  }

  if (byCategory && byCategory.length > 0) {
    const totalRev = summary?.totalRevenue ?? 0;
    const enrichedCategories = byCategory.map((c: Record<string, unknown>) => ({
      ...c,
      percentage: totalRev > 0 ? Math.round((Number(c.income) / totalRev) * 1000) / 10 : 0,
    }));
    html += `
      ${renderSectionHeader('Category Breakdown', 'Revenue distribution by product category')}
      ${renderTable(enrichedCategories, [
        { key: 'category', label: 'Category' },
        { key: 'unitsSold', label: 'Units Sold', align: 'right' },
        { key: 'income', label: 'Revenue', align: 'right', format: (v) => formatValue(v as number, '৳') },
        { key: 'percentage', label: 'Share', align: 'right', format: (v) => `${v ?? 0}%` },
      ])}`;
  }

  if (byPaymentMethod) {
    const methodEntries = Object.entries(byPaymentMethod).map(([method, val]) => ({
      method: method.charAt(0).toUpperCase() + method.slice(1),
      count: val.count,
      revenue: val.revenue,
    }));
    html += `
      ${renderSectionHeader('Payment Methods', 'Transaction breakdown by payment type')}
      ${renderTable(methodEntries, [
        { key: 'method', label: 'Payment Method' },
        { key: 'count', label: 'Transactions', align: 'right' },
        { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatValue(v as number, '৳') },
      ])}`;
  }

  if (dailyBreakdown && dailyBreakdown.length > 0) {
    html += `
      ${renderSectionHeader('Daily Trend', 'Day-by-day sales performance')}
      ${renderTable(dailyBreakdown, [
        { key: 'date', label: 'Date' },
        { key: 'orders', label: 'Orders', align: 'right' },
        { key: 'revenue', label: 'Revenue', align: 'right', format: (v) => formatValue(v as number, '৳') },
      ])}`;
  }

  return html;
}

function renderProfitReport(data: Record<string, unknown>): string {
  const income = data.income as Record<string, number> | undefined;
  const expenses = data.expenses as Record<string, unknown> | undefined;
  const salaries = data.salaries as Record<string, unknown> | undefined;
  const profit = data.profit as number | undefined;
  const range = data.range as { from: string; to: string } | undefined;
  const expenseCategories = (expenses?.byCategory as Array<Record<string, unknown>> | undefined) || [];
  const salaryEmployees = (salaries?.byEmployee as Array<Record<string, unknown>> | undefined) || [];

  const profitColor = '#0f172a';
  const profitLabel = profit !== undefined && profit >= 0 ? 'Net Profit' : 'Net Loss';
  const miscCategories =
    ((income as Record<string, unknown> | undefined)?.byMiscCategory as Array<Record<string, unknown>> | undefined) || [];
  const totalMiscIncome = income?.totalMiscIncome ?? 0;

  let html = `
    <div class="report-title-section">
      <h2 class="report-title">Profit Report</h2>
      <div class="report-period">
        <span class="period-icon">&#128197;</span>
        <span class="period-text">${range?.from || 'N/A'} — ${range?.to || 'N/A'}</span>
      </div>
    </div>

    ${renderSectionHeader('Income Summary', 'Revenue from completed and paid orders')}

    <div class="metrics-grid">
      ${renderMetricCard('Total Revenue', formatValue(income?.totalRevenue, '৳'), '#0f172a')}
      ${renderMetricCard('Total Orders', String(income?.totalOrders ?? 0), '#334155')}
      ${renderMetricCard('Products Sold', String(income?.totalProductsSold ?? 0), '#334155')}
    </div>`;

  if (totalMiscIncome > 0) {
    html += `
      ${renderSectionHeader('Other Income', 'Non-order miscellaneous income for the period')}
      <div class="metrics-grid">
        ${renderMetricCard('Other Income', formatValue(totalMiscIncome, '৳'), '#334155')}
        ${renderMetricCard('Misc Entries', String(income?.miscEntries ?? 0), '#64748b')}
      </div>`;
    if (miscCategories.length > 0) {
      html += renderTable(miscCategories, [
        { key: 'category', label: 'Category' },
        { key: 'count', label: 'Entries', align: 'right' },
        { key: 'total', label: 'Amount', align: 'right', format: (v) => formatValue(v as number, '৳') },
      ]);
    }
  }

  html += `
    ${renderSectionHeader('Expenses', 'Operational costs for the period')}

    <div class="metrics-grid">
      ${renderMetricCard('Total Expenses', formatValue(expenses?.totalExpenses as number, '৳'), '#475569')}
      ${renderMetricCard('Expense Entries', String(expenses?.totalEntries ?? 0), '#64748b')}
    </div>`;

  if (expenseCategories.length > 0) {
    html += `
      ${renderSectionHeader('Expense Categories', 'Cost breakdown by category')}
      ${renderTable(expenseCategories, [
        { key: 'category', label: 'Category' },
        { key: 'count', label: 'Entries', align: 'right' },
        { key: 'total', label: 'Amount', align: 'right', format: (v) => formatValue(v as number, '৳') },
      ])}`;
  }

  html += `
    ${renderSectionHeader('Salaries', 'Employee compensation for the period')}

    <div class="metrics-grid">
      ${renderMetricCard('Total Paid', formatValue(salaries?.totalPaid as number, '৳'), '#64748b')}
      ${renderMetricCard('Salary Records', String(salaries?.totalRecords ?? 0), '#64748b')}
    </div>`;

  if (salaryEmployees.length > 0) {
    html += `
      ${renderTable(salaryEmployees, [
        { key: 'employeeName', label: 'Employee' },
        { key: 'totalPaid', label: 'Salary Paid', align: 'right', format: (v) => formatValue(v as number, '৳') },
        { key: 'status', label: 'Status' },
      ])}`;
  }

  html += `
    ${renderSectionHeader('Profit Analysis', 'Net income after expenses and salaries')}

    <div class="profit-summary">
      <div class="profit-card" style="border-left: 4px solid ${profitColor};">
        <div class="profit-label">${profitLabel}</div>
        <div class="profit-value" style="color: ${profitColor};">${formatValue(profit, '৳')}</div>
        <div class="profit-breakdown">
          <span>Revenue: ${formatValue(income?.totalRevenue, '৳')}</span>
          <span class="profit-plus">+ Other Income: ${formatValue(totalMiscIncome, '৳')}</span>
          <span class="profit-minus">- Expenses: ${formatValue(expenses?.totalExpenses as number, '৳')}</span>
          <span class="profit-minus">- Salaries Paid: ${formatValue(salaries?.totalPaid as number, '৳')}</span>
        </div>
      </div>
    </div>`;

  return html;
}

export function renderReportToHtml(
  type: string,
  data: Record<string, unknown>,
  settings: SettingsInfo
): string {
  const reportRenderers: Record<string, (d: Record<string, unknown>) => string> = {
    sales: renderSalesReport,
    profit: renderProfitReport,
  };

  const renderer = reportRenderers[type];
  const bodyContent = renderer ? renderer(data) : '<p>Unknown report type.</p>';

  const logoHtml = settings.logo?.url
    ? `<img src="${escapeHtml(settings.logo.url)}" alt="Logo" class="header-logo" />`
    : '';

  const now = new Date();
  const generatedDate = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const generatedTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const reportTitle = type === 'sales' ? 'Sales Report' : 'Profit Report';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(settings.restaurantName || 'Restaurant')} - ${reportTitle}</title>
  <style>
    @page {
      size: A4 landscape;
      margin: 15mm;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #1e293b;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    .page-wrapper {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    /* Header Styles */
    .report-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      padding-bottom: 20px;
      margin-bottom: 24px;
      border-bottom: 3px solid #0f172a;
      position: relative;
    }

    .report-header::after {
      content: '';
      position: absolute;
      bottom: -3px;
      left: 0;
      width: 120px;
      height: 3px;
      background: #334155;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .header-logo {
      height: 56px;
      width: auto;
      object-fit: contain;
    }

    .header-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .restaurant-name {
      font-size: 22px;
      font-weight: 700;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .restaurant-details {
      font-size: 11px;
      color: #64748b;
      line-height: 1.4;
    }

    .header-right {
      text-align: right;
    }

    .report-badge {
      display: inline-block;
      background: #0f172a;
      color: #ffffff;
      padding: 6px 16px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .header-meta {
      font-size: 11px;
      color: #64748b;
    }

    .header-meta span {
      display: block;
    }

    /* Title Section */
    .report-title-section {
      margin-bottom: 24px;
    }

    .report-title {
      font-size: 24px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }

    .report-period {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
      color: #64748b;
    }

    .period-icon {
      font-size: 14px;
    }

    .period-text {
      font-weight: 500;
    }

    /* Section Headers */
    .section-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 28px 0 16px 0;
    }

    .section-accent {
      width: 4px;
      height: 24px;
      background: linear-gradient(180deg, #334155 0%, #0f172a 100%);
      border-radius: 2px;
    }

    .section-content {
      flex: 1;
    }

    .section-title {
      font-size: 15px;
      font-weight: 600;
      color: #0f172a;
      margin: 0;
    }

    .section-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0 0;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .metric-card {
      display: flex;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }

    .metric-accent {
      width: 4px;
      flex-shrink: 0;
    }

    .metric-content {
      flex: 1;
      padding: 14px 16px;
    }

    .metric-label {
      font-size: 11px;
      font-weight: 500;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      margin: 0 0 4px 0;
    }

    .metric-value {
      font-size: 20px;
      font-weight: 700;
      margin: 0;
      line-height: 1.2;
    }

    .metric-subtitle {
      font-size: 10px;
      color: #94a3b8;
      margin: 4px 0 0 0;
    }

    /* Table Styles */
    .table-container {
      margin-bottom: 24px;
    }

    .empty-state {
      text-align: center;
      padding: 32px 24px;
      color: #94a3b8;
      font-size: 13px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
    }

    /* Profit Summary */
    .profit-summary {
      margin-top: 8px;
    }

    .profit-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 24px;
    }

    .profit-label {
      font-size: 12px;
      font-weight: 600;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }

    .profit-value {
      font-size: 32px;
      font-weight: 700;
      margin-bottom: 16px;
      line-height: 1.2;
    }

    .profit-breakdown {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 12px;
      color: #64748b;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
    }

    .profit-plus {
      color: #0f172a;
      font-weight: 600;
    }

    .profit-minus {
      color: #475569;
    }

    /* Footer */
    .report-footer {
      margin-top: auto;
      padding-top: 20px;
      border-top: 2px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }

    .footer-left {
      font-size: 10px;
      color: #94a3b8;
    }

    .footer-left p {
      margin: 0 0 2px 0;
    }

    .footer-right {
      text-align: right;
      font-size: 10px;
      color: #94a3b8;
    }

    .footer-right p {
      margin: 0 0 2px 0;
    }

    .footer-confidential {
      font-weight: 600;
      color: #64748b;
    }

    /* Print Styles */
    @media print {
      body {
        font-size: 12px;
      }

      .page-wrapper {
        min-height: auto;
      }

      .report-header {
        page-break-inside: avoid;
      }

      .section-header {
        page-break-after: avoid;
      }

      .metric-card {
        break-inside: avoid;
      }

      .table-container {
        page-break-inside: auto;
      }

      tr {
        page-break-inside: avoid;
      }

      thead {
        display: table-header-group;
      }
    }
  </style>
</head>
<body>
  <div class="page-wrapper">
    <header class="report-header">
      <div class="header-left">
        ${logoHtml}
        <div class="header-info">
          <h1 class="restaurant-name">${escapeHtml(settings.restaurantName || 'Restaurant')}</h1>
          <div class="restaurant-details">
            ${settings.address ? `<span>${escapeHtml(settings.address)}</span>` : ''}
            ${settings.contactNumber ? `<span>Phone: ${escapeHtml(settings.contactNumber)}</span>` : ''}
            ${settings.vatInfo?.bin ? `<span>BIN: ${escapeHtml(settings.vatInfo.bin)}</span>` : ''}
            ${settings.vatInfo?.mushak ? `<span>Mushak: ${escapeHtml(settings.vatInfo.mushak)}</span>` : ''}
          </div>
        </div>
      </div>
      <div class="header-right">
        <div class="report-badge">${reportTitle}</div>
        <div class="header-meta">
          <span>Generated: ${generatedDate}</span>
          <span>Time: ${generatedTime}</span>
        </div>
      </div>
    </header>

    <main class="report-body">
      ${bodyContent}
    </main>

    <footer class="report-footer">
      <div class="footer-left">
        <p class="footer-confidential">CONFIDENTIAL - For Internal Use Only</p>
        <p>This report is generated automatically and is intended for authorized personnel only.</p>
      </div>
      <div class="footer-right">
        <p>${escapeHtml(settings.restaurantName || 'Restaurant')}</p>
        <p>Report Type: ${reportTitle}</p>
      </div>
    </footer>
  </div>
</body>
</html>`;
}
