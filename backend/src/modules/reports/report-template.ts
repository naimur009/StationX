interface SettingsInfo {
  restaurantName?: string;
  logo?: { url?: string };
}

function formatValue(val: number | undefined | null, prefix = ''): string {
  if (val === undefined || val === null) return `${prefix}0`;
  return `${prefix}${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function renderTable(rows: Array<Record<string, unknown>>, columns: { key: string; label: string; format?: (v: unknown) => string }[]): string {
  if (!rows || rows.length === 0) {
    return '<p style="color: #64748b; font-size: 12px; text-align: center; padding: 16px;">No data available.</p>';
  }

  let thead = '<thead><tr>';
  for (const col of columns) {
    thead += `<th style="text-align: left; padding: 8px 12px; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 2px solid #e2e8f0; background: #f8fafc;">${col.label}</th>`;
  }
  thead += '</tr></thead>';

  let tbody = '<tbody>';
  for (const row of rows) {
    tbody += '<tr>';
    for (const col of columns) {
      const val = row[col.key];
      const display = col.format ? col.format(val) : String(val ?? '');
      tbody += `<td style="padding: 8px 12px; font-size: 12px; color: #334155; border-bottom: 1px solid #f1f5f9;">${display}</td>`;
    }
    tbody += '</tr>';
  }
  tbody += '</tbody>';

  return `<table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">${thead}${tbody}</table>`;
}

function renderSalesReport(data: Record<string, unknown>): string {
  const summary = data.summary as Record<string, number> | undefined;
  const byPaymentMethod = data.byPaymentMethod as Record<string, { count: number; revenue: number }> | undefined;
  const dailyBreakdown = data.dailyBreakdown as Array<Record<string, unknown>> | undefined;
  const range = data.range as { from: string; to: string } | undefined;

  let html = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Sales Report</h2>
    <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">${range?.from || 'N/A'} — ${range?.to || 'N/A'}</p>

    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Total Revenue</p>
        <p style="font-size: 20px; font-weight: 700; color: #2563eb; margin: 0;">${formatValue(summary?.totalRevenue, '৳')}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Total Orders</p>
        <p style="font-size: 20px; font-weight: 700; color: #16a34a; margin: 0;">${summary?.totalOrders ?? 0}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Avg Order Value</p>
        <p style="font-size: 20px; font-weight: 700; color: #64748b; margin: 0;">${formatValue(summary?.averageOrderValue, '৳')}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Products Sold</p>
        <p style="font-size: 20px; font-weight: 700; color: #16a34a; margin: 0;">${summary?.totalProductsSold ?? 0}</p>
      </div>
    </div>`;

  if (byPaymentMethod) {
    const methodEntries = Object.entries(byPaymentMethod).map(([method, val]) => ({
      method,
      count: val.count,
      revenue: val.revenue,
    }));
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Payment Method</h3>';
    html += renderTable(methodEntries, [
      { key: 'method', label: 'Method' },
      { key: 'count', label: 'Orders' },
      { key: 'revenue', label: 'Revenue', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  if (dailyBreakdown && dailyBreakdown.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Daily Trend</h3>';
    html += renderTable(dailyBreakdown, [
      { key: 'date', label: 'Date' },
      { key: 'orders', label: 'Orders' },
      { key: 'revenue', label: 'Revenue', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  return html;
}

function renderIncomeReport(data: Record<string, unknown>): string {
  const summary = data.summary as Record<string, number | string> | undefined;
  const byProduct = data.byProduct as Array<Record<string, unknown>> | undefined;
  const byCategory = data.byCategory as Array<Record<string, unknown>> | undefined;
  const range = data.range as { from: string; to: string } | undefined;

  let html = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Income Report</h2>
    <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">${range?.from || 'N/A'} — ${range?.to || 'N/A'}</p>

    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Total Income</p>
        <p style="font-size: 20px; font-weight: 700; color: #4f46e5; margin: 0;">${formatValue(summary?.totalIncome as number, '৳')}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Products Sold</p>
        <p style="font-size: 20px; font-weight: 700; color: #2563eb; margin: 0;">${summary?.totalProductsSold ?? 0}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Unique Products</p>
        <p style="font-size: 20px; font-weight: 700; color: #64748b; margin: 0;">${summary?.uniqueProductsSold ?? 0}</p>
      </div>
    </div>`;

  if (byProduct && byProduct.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Product</h3>';
    html += renderTable(byProduct, [
      { key: 'name', label: 'Product' },
      { key: 'category', label: 'Category' },
      { key: 'unitsSold', label: 'Units Sold' },
      { key: 'income', label: 'Income', format: (v) => formatValue(v as number, '৳') },
      { key: 'percentageOfTotal', label: '% of Total', format: (v) => `${v ?? 0}%` },
    ]);
  }

  if (byCategory && byCategory.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Category</h3>';
    html += renderTable(byCategory, [
      { key: 'category', label: 'Category' },
      { key: 'unitsSold', label: 'Units Sold' },
      { key: 'income', label: 'Income', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  return html;
}

function renderExpenseReport(data: Record<string, unknown>): string {
  const summary = data.summary as Record<string, number> | undefined;
  const byCategory = data.byCategory as Array<Record<string, unknown>> | undefined;
  const byVendor = data.byVendor as Array<Record<string, unknown>> | undefined;
  const byPaymentMethod = data.byPaymentMethod as Record<string, { count: number; total: number }> | undefined;
  const dailyBreakdown = data.dailyBreakdown as Array<Record<string, unknown>> | undefined;
  const range = data.range as { from: string; to: string } | undefined;

  let html = `
    <h2 style="font-size: 18px; font-weight: 700; color: #0f172a; margin: 0 0 4px 0;">Expense Report</h2>
    <p style="font-size: 12px; color: #64748b; margin: 0 0 16px 0;">${range?.from || 'N/A'} — ${range?.to || 'N/A'}</p>

    <div style="display: flex; gap: 16px; margin-bottom: 24px; flex-wrap: wrap;">
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Total Expenses</p>
        <p style="font-size: 20px; font-weight: 700; color: #dc2626; margin: 0;">${formatValue(summary?.totalExpenses, '৳')}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Entries</p>
        <p style="font-size: 20px; font-weight: 700; color: #d97706; margin: 0;">${summary?.totalEntries ?? 0}</p>
      </div>
      <div style="flex: 1; min-width: 120px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px 16px;">
        <p style="font-size: 11px; color: #64748b; margin: 0 0 4px 0;">Avg Expense</p>
        <p style="font-size: 20px; font-weight: 700; color: #64748b; margin: 0;">${formatValue(summary?.averageExpense, '৳')}</p>
      </div>
    </div>`;

  if (byCategory && byCategory.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Category</h3>';
    html += renderTable(byCategory, [
      { key: 'category', label: 'Category' },
      { key: 'count', label: 'Count' },
      { key: 'total', label: 'Total', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  if (byVendor && byVendor.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Vendor</h3>';
    html += renderTable(byVendor, [
      { key: 'vendorName', label: 'Vendor' },
      { key: 'count', label: 'Count' },
      { key: 'total', label: 'Total', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  if (byPaymentMethod) {
    const methodEntries = Object.entries(byPaymentMethod).map(([method, val]) => ({
      method,
      count: val.count,
      total: val.total,
    }));
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">By Payment Method</h3>';
    html += renderTable(methodEntries, [
      { key: 'method', label: 'Method' },
      { key: 'count', label: 'Count' },
      { key: 'total', label: 'Total', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  if (dailyBreakdown && dailyBreakdown.length > 0) {
    html += '<h3 style="font-size: 14px; font-weight: 600; color: #0f172a; margin: 0 0 8px 0;">Daily Trend</h3>';
    html += renderTable(dailyBreakdown, [
      { key: 'date', label: 'Date' },
      { key: 'count', label: 'Count' },
      { key: 'total', label: 'Total', format: (v) => formatValue(v as number, '৳') },
    ]);
  }

  return html;
}

export function renderReportToHtml(
  type: string,
  data: Record<string, unknown>,
  settings: SettingsInfo
): string {
  const reportRenderers: Record<string, (d: Record<string, unknown>) => string> = {
    sales: renderSalesReport,
    income: renderIncomeReport,
    expense: renderExpenseReport,
  };

  const renderer = reportRenderers[type];
  const bodyContent = renderer ? renderer(data) : '<p>Unknown report type.</p>';

  const logoHtml = settings.logo?.url
    ? `<img src="${settings.logo.url}" alt="Logo" style="height: 40px; width: auto;" />`
    : '';

  const now = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    @page {
      size: landscape;
      margin: 12mm;
    }
    * { box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 13px;
      color: #0f172a;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .report-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding-bottom: 16px;
      margin-bottom: 24px;
      border-bottom: 2px solid #e2e8f0;
    }
    .report-footer {
      margin-top: 32px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="report-header">
    <div>
      ${logoHtml}
    </div>
    <div style="text-align: right;">
      <p style="font-size: 16px; font-weight: 700; color: #0f172a; margin: 0;">
        ${settings.restaurantName || 'Report'}
      </p>
    </div>
  </div>

  ${bodyContent}

  <div class="report-footer">
    Generated on ${now}
  </div>
</body>
</html>`;
}
