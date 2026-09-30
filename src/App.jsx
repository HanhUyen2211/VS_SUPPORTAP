import { useMemo, useState } from 'react';
import { AlertCircle, Download, FileSpreadsheet, Trash2 } from 'lucide-react';
import Dropzone from './components/Dropzone';
import SupplierReport from './components/SupplierReport';
import { parseInvoiceXmlFile } from './lib/invoiceParser';
import { exportAllReports, exportSupplierReport } from './lib/excelExport';
import { getInvoiceKey, groupInvoicesBySeller, formatMoney } from './lib/formatters';

export default function App() {
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [invoices, setInvoices] = useState([]);
  const [errors, setErrors] = useState([]);
  const [notice, setNotice] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [exporting, setExporting] = useState('');

  const groups = useMemo(() => groupInvoicesBySeller(invoices), [invoices]);
  const totalPayment = useMemo(() => invoices.reduce((sum, invoice) => sum + invoice.totalPayment, 0), [invoices]);
  const canExport = Boolean(fromDate && toDate && invoices.length);

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) return;

    setNotice('');
    setErrors([]);
    setIsProcessing(true);

    const xmlFiles = files.filter((file) => file.name.toLowerCase().endsWith('.xml'));
    const nextErrors = files
      .filter((file) => !file.name.toLowerCase().endsWith('.xml'))
      .map((file) => `${file.name}: không phải file XML`);

    const results = await Promise.all(
      xmlFiles.map(async (file) => {
        try {
          return { invoice: await parseInvoiceXmlFile(file) };
        } catch (error) {
          return { error: `${file.name}: ${error.message}` };
        }
      }),
    );

    const parsedInvoices = [];
    results.forEach((result) => {
      if (result.invoice) parsedInvoices.push(result.invoice);
      if (result.error) nextErrors.push(result.error);
    });

    const existingKeys = new Set(invoices.map(getInvoiceKey));
    const uploadKeys = new Set();
    const uniqueInvoices = [];
    let duplicateCount = 0;

    parsedInvoices.forEach((invoice) => {
      const key = getInvoiceKey(invoice);
      if (existingKeys.has(key) || uploadKeys.has(key)) {
        duplicateCount += 1;
        return;
      }
      uploadKeys.add(key);
      uniqueInvoices.push(invoice);
    });

    if (uniqueInvoices.length) {
      setInvoices((current) => [...current, ...uniqueInvoices]);
    }

    setErrors(nextErrors);
    setNotice(
      [
        uniqueInvoices.length ? `Đã nhập ${uniqueInvoices.length} hóa đơn` : '',
        duplicateCount ? `bỏ qua ${duplicateCount} hóa đơn trùng` : '',
      ]
        .filter(Boolean)
        .join(', '),
    );
    setIsProcessing(false);
  }

  async function handleExportAll() {
    if (!canExport) return;
    setExporting('all');
    try {
      await exportAllReports(groups, { fromDate, toDate });
    } finally {
      setExporting('');
    }
  }

  async function handleExportGroup(group) {
    if (!canExport) return;
    setExporting(group.key);
    try {
      await exportSupplierReport(group, { fromDate, toDate });
    } finally {
      setExporting('');
    }
  }

  function removeGroup(groupKey) {
    setInvoices((current) => current.filter((invoice) => {
      const key = `${invoice.sellerTaxCode || 'NO-MST'}|${invoice.sellerName || 'Không rõ NCC'}`;
      return key !== groupKey;
    }));
  }

  function clearAll() {
    setInvoices([]);
    setErrors([]);
    setNotice('');
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <header className="bg-primary text-white">
        <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-lg font-bold tracking-normal">DS HDCN</h1>
            <p className="mt-1 text-sm text-white/75">Tổng hợp hóa đơn XML</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleExportAll}
              disabled={!canExport || exporting === 'all'}
              className="inline-flex h-10 items-center justify-center gap-2 bg-success px-4 text-sm font-semibold text-white transition hover:bg-[#348b69] disabled:cursor-not-allowed disabled:bg-white/25"
            >
              <Download className="h-4 w-4" />
              {exporting === 'all' ? 'Đang tải...' : 'Tải toàn bộ file Excel'}
            </button>
            <button
              type="button"
              onClick={clearAll}
              disabled={!invoices.length}
              className="inline-flex h-10 items-center justify-center gap-2 border border-white/35 px-4 text-sm font-semibold text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Trash2 className="h-4 w-4" />
              Xóa dữ liệu
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1440px] px-5 py-6">
        <section className="border border-slate-200 bg-white">
          <div className="grid gap-5 p-4 lg:grid-cols-[360px_1fr]">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Từ ngày</span>
                <input
                  type="date"
                  required
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                  className="h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-900"
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Đến ngày</span>
                <input
                  type="date"
                  required
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                  className="h-11 w-full border border-slate-300 bg-white px-3 text-sm text-slate-900"
                />
              </label>
            </div>

            <Dropzone
              isDragging={isDragging}
              isProcessing={isProcessing}
              onDragChange={setIsDragging}
              onFiles={handleFiles}
            />
          </div>

          <div className="grid border-t border-slate-200 md:grid-cols-3">
            <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r">
              <div className="text-xs font-semibold uppercase text-slate-500">Hóa đơn</div>
              <div className="mt-1 text-xl font-bold text-primary">{invoices.length}</div>
            </div>
            <div className="border-b border-slate-200 px-4 py-3 md:border-b-0 md:border-r">
              <div className="text-xs font-semibold uppercase text-slate-500">Nhà cung cấp</div>
              <div className="mt-1 text-xl font-bold text-primary">{groups.length}</div>
            </div>
            <div className="px-4 py-3">
              <div className="text-xs font-semibold uppercase text-slate-500">Tổng thanh toán</div>
              <div className="mt-1 text-xl font-bold text-primary">{formatMoney(totalPayment)}</div>
            </div>
          </div>
        </section>

        {notice ? (
          <div className="mt-4 border border-[#41A67E]/40 bg-[#eef8f4] px-4 py-3 text-sm font-medium text-[#256d52]">
            {notice}
          </div>
        ) : null}

        {errors.length ? (
          <div className="mt-4 border border-danger/30 bg-[#fff1f2] px-4 py-3 text-sm text-danger">
            <div className="mb-2 flex items-center gap-2 font-bold">
              <AlertCircle className="h-4 w-4" />
              Lỗi đọc XML
            </div>
            <ul className="space-y-1">
              {errors.map((error) => (
                <li key={error}>{error}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {!invoices.length ? (
          <section className="mt-6 flex min-h-[280px] items-center justify-center border border-slate-200 bg-white px-4 text-center">
            <div>
              <FileSpreadsheet className="mx-auto h-11 w-11 text-navy" strokeWidth={1.6} />
              <div className="mt-3 text-sm font-semibold text-slate-700">Chưa có hóa đơn</div>
            </div>
          </section>
        ) : (
          <div className="mt-6 space-y-5">
            {groups.map((group) => (
              <SupplierReport
                key={group.key}
                group={group}
                fromDate={fromDate}
                toDate={toDate}
                exportDisabled={!canExport}
                exporting={exporting === group.key}
                onExport={handleExportGroup}
                onRemove={removeGroup}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
