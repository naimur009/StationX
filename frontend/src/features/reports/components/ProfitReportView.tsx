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
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Profit Calculation</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-indigo-50 px-4 py-3">
            <span className="text-sm font-medium text-indigo-700">Revenue</span>
            <span className="text-lg font-bold text-indigo-700">+ ৳{data.income.totalRevenue.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-green-50 px-4 py-3">
            <span className="text-sm font-medium text-green-700">Other Income</span>
            <span className="text-lg font-bold text-green-700">+ ৳{data.income.totalMiscIncome.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-3">
            <span className="text-sm font-medium text-red-700">Expenses</span>
            <span className="text-lg font-bold text-red-700">- ৳{data.expenses.totalExpenses.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-amber-50 px-4 py-3">
            <span className="text-sm font-medium text-amber-700">Salaries Paid</span>
            <span className="text-lg font-bold text-amber-700">- ৳{data.salaries.totalPaid.toLocaleString()}</span>
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
