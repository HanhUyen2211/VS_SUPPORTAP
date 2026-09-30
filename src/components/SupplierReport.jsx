import { Download, Trash2 } from 'lucide-react';
import { REPORT_COLUMNS, formatDateDisplay, formatMoney, formatPeriod } from '../lib/formatters';

export default function SupplierReport({
  group,
  fromDate,
  toDate,
  exportDisabled,
  exporting,
  onExport,
  onRemove,
}) {
  return (
    <section className="border border-slate-200 bg-white">
      <div className="flex flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold uppercase text-primary">{group.sellerName}</h2>
          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
            <span>{group.invoices.length} hóa đơn</span>
            {group.sellerTaxCode ? <span>MST: {group.sellerTaxCode}</span> : null}
            <span>{formatMoney(group.totalPayment)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onExport(group)}
            disabled={exportDisabled || exporting}
            className="inline-flex h-9 items-center justify-center gap-2 bg-success px-3 text-sm font-semibold text-white transition hover:bg-[#348b69] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            <Download className="h-4 w-4" />
            {exporting ? 'Đang tải...' : 'Tải Excel báo cáo này'}
          </button>
          <button
            type="button"
            onClick={() => onRemove(group.key)}
            className="inline-flex h-9 items-center justify-center gap-2 border border-danger px-3 text-sm font-semibold text-danger transition hover:bg-[#fff1f2]"
          >
            <Trash2 className="h-4 w-4" />
            Xóa bảng
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-[1120px] w-full text-sm">
          <thead>
            <tr>
              <th colSpan={7} className="border border-slate-300 bg-white px-3 py-3 text-center text-base font-bold">
                DANH SÁCH HÓA ĐƠN
              </th>
            </tr>
            <tr>
              <th colSpan={7} className="border border-slate-300 bg-white px-3 py-2 text-center font-bold">
                {formatPeriod(fromDate, toDate)}
              </th>
            </tr>
            <tr>
              <td colSpan={5} className="border border-slate-300 bg-white px-3 py-2" />
              <td className="border border-slate-300 bg-white px-3 py-2 text-center font-bold">Tổng cộng</td>
              <td className="border border-slate-300 bg-white px-3 py-2 text-right font-bold">
                {formatMoney(group.totalPayment)}
              </td>
            </tr>
            <tr className="bg-tableYellow">
              {REPORT_COLUMNS.map((column) => (
                <th key={column} className="border border-slate-700 px-3 py-2 text-center font-bold text-slate-950">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {group.invoices.map((invoice, index) => (
              <tr key={invoice.id} className="odd:bg-white even:bg-slate-50">
                <td className="border border-slate-300 px-3 py-2 text-center">{index + 1}</td>
                <td className="border border-slate-300 px-3 py-2 text-center font-medium">{invoice.invoiceNumber}</td>
                <td className="border border-slate-300 px-3 py-2 text-center">{formatDateDisplay(invoice.invoiceDate)}</td>
                <td className="border border-slate-300 px-3 py-2">{invoice.sellerName}</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatMoney(invoice.totalBeforeTax)}</td>
                <td className="border border-slate-300 px-3 py-2 text-right">{formatMoney(invoice.totalTax)}</td>
                <td className="border border-slate-300 px-3 py-2 text-right font-semibold">
                  {formatMoney(invoice.totalPayment)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
