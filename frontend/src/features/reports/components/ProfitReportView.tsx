import type { ProfitReport } from '../api';

function MetricBox({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-5 py-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-0.5 text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

interface ProfitReportViewProps {
  data: ProfitReport;
}

export default function ProfitReportView({ data }: ProfitReportViewProps) {
  const profitColor = data.profit >= 0 ? 'text-green-600' : 'text-red-600';

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <div className="mb-1 text-xs font-medium uppercase tracking-wider text-slate-400">
          {data.range.from} — {data.range.to}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <MetricBox label="Total Revenue" value={`৳${data.income.totalRevenue.toLocaleString()}`} color="text-blue-600" />
          <MetricBox label="Total Orders" value={String(data.income.totalOrders)} color="text-green-600" />
          <MetricBox label="Products Sold" value={String(data.income.totalProductsSold)} color="text-green-600" />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Profit Calculation</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-blue-50 px-4 py-3">
            <span className="text-sm font-medium text-blue-700">Revenue</span>
            <span className="text-lg font-bold text-blue-700">+ ৳{data.income.totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-red-700">Expenses</span>
            <span className="text-lg font-bold text-red-700">- ৳{data.expenses.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
            <span className="text-sm font-medium text-amber-700">Salaries</span>
            <span className="text-lg font-bold text-amber-700">- ৳{data.salaries.totalSalary.toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-3">
            <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
              <span className="text-sm font-semibold text-slate-700">Net Profit</span>
              <span className={`text-xl font-bold ${profitColor}`}>
                {data.profit >= 0 ? '+' : ''}৳{data.profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
