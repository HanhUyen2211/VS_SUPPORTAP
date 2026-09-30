export const APP_COLORS = {
  primary: '#030164',
  navy: '#363199',
  success: '#41A67E',
  danger: '#E63946',
  tableYellow: '#FFC000',
};

export const REPORT_COLUMNS = [
  'STT',
  'Số hóa đơn',
  'Ngày lập',
  'Tên người bán',
  'Tổng tiền chưa thuế',
  'Tổng tiền thuế',
  'Tổng tiền thanh toán',
];

export function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function formatMoney(value) {
  return new Intl.NumberFormat('vi-VN', {
    maximumFractionDigits: 0,
  }).format(Math.round(toNumber(value)));
}

export function formatDateDisplay(value) {
  if (!value) return '';
  const text = String(value).trim();
  const isoMatch = text.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;

  const vnMatch = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (vnMatch) return `${vnMatch[1]}/${vnMatch[2]}/${vnMatch[3]}`;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return new Intl.DateTimeFormat('vi-VN').format(date);
}

export function formatPeriod(fromDate, toDate) {
  const fromText = formatDateDisplay(fromDate) || '...';
  const toText = formatDateDisplay(toDate) || '...';
  return `Từ ngày ${fromText} đến ngày ${toText}`;
}

export function getInvoiceKey(invoice) {
  return [
    invoice.sellerTaxCode || invoice.sellerName,
    invoice.invoiceNumber,
    invoice.invoiceDate,
    Math.round(toNumber(invoice.totalPayment)),
  ].join('|');
}

export function getSellerKey(invoice) {
  return `${invoice.sellerTaxCode || 'NO-MST'}|${invoice.sellerName || 'Không rõ NCC'}`;
}

export function groupInvoicesBySeller(invoices) {
  const map = new Map();

  invoices.forEach((invoice) => {
    const key = getSellerKey(invoice);
    if (!map.has(key)) {
      map.set(key, {
        key,
        sellerName: invoice.sellerName || 'Không rõ người bán',
        sellerTaxCode: invoice.sellerTaxCode || '',
        invoices: [],
        totalBeforeTax: 0,
        totalTax: 0,
        totalPayment: 0,
      });
    }

    const group = map.get(key);
    group.invoices.push(invoice);
    group.totalBeforeTax += toNumber(invoice.totalBeforeTax);
    group.totalTax += toNumber(invoice.totalTax);
    group.totalPayment += toNumber(invoice.totalPayment);
  });

  return Array.from(map.values())
    .map((group) => ({
      ...group,
      invoices: [...group.invoices].sort((a, b) => {
        const dateCompare = String(a.invoiceDate).localeCompare(String(b.invoiceDate));
        if (dateCompare !== 0) return dateCompare;
        return String(a.invoiceNumber).localeCompare(String(b.invoiceNumber), 'vi');
      }),
    }))
    .sort((a, b) => a.sellerName.localeCompare(b.sellerName, 'vi'));
}

export function sanitizeFileName(value) {
  return String(value || 'bao-cao')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .replace(/[<>:"/\\|?*\u0000-\u001F]/g, ' ')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90) || 'bao-cao';
}

export function sanitizeWorksheetName(value, fallback = 'Bao cao') {
  const cleaned = String(value || fallback)
    .replace(/[:\\/?*\[\]]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return (cleaned || fallback).slice(0, 31);
}
