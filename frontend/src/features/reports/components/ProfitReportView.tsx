import { DataTable, type Column } from '@/components/shared/DataTable';
import type { ProfitReport, CategoryExpenseEntry, SalaryEmployeeEntry } from '../api';

interface ProfitReportViewProps {
  data: ProfitReport;
}

export default function ProfitReportView({ data }: ProfitReportViewProps) {
  const profitColor = data.profit >= 0 ? 'text-green-600' : 'text-red-600';

  const expenseColumns: Column<CategoryExpenseEntry>[] = [
    { key: 'category', label: 'Category' },
    { key: 'count', label: 'Count' },
    { key: 'total', label: 'Total', render: (item) => `৳${item.total.toLocaleString()}` },
  ];

  const salaryColumns: Column<SalaryEmployeeEntry>[] = [
    { key: 'employeeName', label: 'Employee' },
    { key: 'baseSalary', label: 'Base Salary', render: (item) => `৳${item.baseSalary.toLocaleString()}` },
    { key: 'status', label: 'Status', className: 'capitalize' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Revenue</p>
          <p className="text-2xl font-bold text-blue-600">৳{data.income.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Orders</p>
          <p className="text-2xl font-bold text-green-600">{data.income.totalOrders}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Products Sold</p>
          <p className="text-2xl font-bold text-green-600">{data.income.totalProductsSold}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">৳{data.expenses.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Expense Entries</p>
          <p className="text-2xl font-bold text-yellow-600">{data.expenses.totalEntries}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total Salary</p>
          <p className="text-2xl font-bold text-yellow-600">৳{data.salaries.totalSalary.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Salary Records</p>
          <p className="text-2xl font-bold text-slate-600">{data.salaries.totalRecords}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-5 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Net Profit</p>
        <p className={`text-3xl font-bold ${profitColor}`}>
          {data.profit >= 0 ? '+' : ''}৳{data.profit.toLocaleString()}
        </p>
      </div>

      <div className="space-y-4">
        {data.expenses.byCategory.length > 0 && (
          <div>
            <h3 className="mb-3 text-base font-bold text-slate-800">Expenses by Category</h3>
            <DataTable
              columns={expenseColumns}
              data={data.expenses.byCategory}
              keyExtractor={(item) => item.category}
              emptyMessage="No expense data for this period."
            />
          </div>
        )}

        {data.salaries.byEmployee.length > 0 && (
          <div>
            <h3 className="mb-3 text-base font-bold text-slate-800">Salary Breakdown</h3>
            <DataTable
              columns={salaryColumns}
              data={data.salaries.byEmployee}
              keyExtractor={(item) => item.employeeName}
              emptyMessage="No salary data for this period."
            />
          </div>
        )}
      </div>
    </div>
  );
}
