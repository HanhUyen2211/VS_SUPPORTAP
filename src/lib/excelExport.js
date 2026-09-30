import {
  REPORT_COLUMNS,
  formatDateDisplay,
  formatPeriod,
  sanitizeFileName,
  sanitizeWorksheetName,
  toNumber,
} from './formatters';

const BORDER = {
  top: { style: 'thin', color: { argb: 'FF808080' } },
  left: { style: 'thin', color: { argb: 'FF808080' } },
  bottom: { style: 'thin', color: { argb: 'FF808080' } },
  right: { style: 'thin', color: { argb: 'FF808080' } },
};

const CENTER = { vertical: 'middle', horizontal: 'center', wrapText: true };
const RIGHT = { vertical: 'middle', horizontal: 'right', wrapText: true };
const LEFT = { vertical: 'middle', horizontal: 'left', wrapText: true };
const MONEY_FORMAT = '#,##0';
const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFC000' } };
const TITLE_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };
let excelJsModule;

async function loadExcelJS() {
  if (!excelJsModule) {
    const module = await import('exceljs/dist/exceljs.min.js');
    excelJsModule = module.default || module;
  }
  return excelJsModule;
}

function styleRange(sheet, rowStart, rowEnd, colStart, colEnd, style = {}) {
  for (let row = rowStart; row <= rowEnd; row += 1) {
    for (let col = colStart; col <= colEnd; col += 1) {
      const cell = sheet.getCell(row, col);
      Object.assign(cell, style);
    }
  }
}

function setColumns(sheet) {
  const widths = [8, 18, 16, 42, 22, 18, 24];
  widths.forEach((width, index) => {
    sheet.getColumn(index + 1).width = width;
  });
}

function addReportSheet(workbook, group, period, sheetName) {
  const sheet = workbook.addWorksheet(sheetName);
  setColumns(sheet);

  sheet.mergeCells('A1:G1');
  sheet.mergeCells('A2:G2');

  const titleCell = sheet.getCell('A1');
  titleCell.value = 'DANH SÁCH HÓA ĐƠN';
  titleCell.font = { name: 'Arial', size: 14, bold: true };
  titleCell.alignment = CENTER;
  titleCell.fill = TITLE_FILL;

  const periodCell = sheet.getCell('A2');
  periodCell.value = formatPeriod(period.fromDate, period.toDate);
  periodCell.font = { name: 'Arial', size: 12, bold: true };
  periodCell.alignment = CENTER;
  periodCell.fill = TITLE_FILL;

  sheet.getRow(1).height = 24;
  sheet.getRow(2).height = 22;

  sheet.getCell('F3').value = 'Tổng cộng';
  sheet.getCell('F3').font = { name: 'Arial', bold: true };
  sheet.getCell('F3').alignment = CENTER;
  sheet.getCell('F3').border = BORDER;

  sheet.getCell('G3').value = toNumber(group.totalPayment);
  sheet.getCell('G3').font = { name: 'Arial', bold: true };
  sheet.getCell('G3').alignment = RIGHT;
  sheet.getCell('G3').numFmt = MONEY_FORMAT;
  sheet.getCell('G3').border = BORDER;

  REPORT_COLUMNS.forEach((header, index) => {
    const cell = sheet.getCell(4, index + 1);
    cell.value = header;
    cell.font = { name: 'Arial', bold: true };
    cell.alignment = CENTER;
    cell.fill = HEADER_FILL;
    cell.border = BORDER;
  });

  group.invoices.forEach((invoice, index) => {
    const row = sheet.getRow(index + 5);
    row.values = [
      index + 1,
      invoice.invoiceNumber,
      formatDateDisplay(invoice.invoiceDate),
      invoice.sellerName,
      toNumber(invoice.totalBeforeTax),
      toNumber(invoice.totalTax),
      toNumber(invoice.totalPayment),
    ];

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.font = { name: 'Arial', size: 11 };
      cell.border = BORDER;
      cell.alignment = colNumber >= 5 ? RIGHT : colNumber === 4 ? LEFT : CENTER;
      if (colNumber >= 5) cell.numFmt = MONEY_FORMAT;
    });
  });

  const lastRow = Math.max(group.invoices.length + 4, 4);
  styleRange(sheet, 1, 2, 1, 7, { border: BORDER });
  styleRange(sheet, 3, 3, 1, 5, { border: BORDER });

  sheet.autoFilter = {
    from: 'A4',
    to: `G${lastRow}`,
  };
  sheet.views = [{ state: 'frozen', ySplit: 4 }];
  sheet.pageSetup = {
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
  };

  return sheet;
}

function makeUniqueSheetName(rawName, usedNames) {
  const base = sanitizeWorksheetName(rawName);
  let candidate = base;
  let index = 2;

  while (usedNames.has(candidate.toLowerCase())) {
    const suffix = ` ${index}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    index += 1;
  }

  usedNames.add(candidate.toLowerCase());
  return candidate;
}

async function downloadWorkbook(workbook, fileName) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function createWorkbook() {
  const ExcelJS = await loadExcelJS();
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'DS HDCN';
  workbook.created = new Date();
  workbook.modified = new Date();
  return workbook;
}

export async function exportSupplierReport(group, period) {
  const workbook = await createWorkbook();
  addReportSheet(workbook, group, period, sanitizeWorksheetName(group.sellerName));
  const fileName = `${sanitizeFileName(group.sellerName)}-${period.fromDate}-${period.toDate}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}

export async function exportAllReports(groups, period) {
  const workbook = await createWorkbook();
  const usedNames = new Set();

  groups.forEach((group) => {
    const sheetName = makeUniqueSheetName(group.sellerName, usedNames);
    addReportSheet(workbook, group, period, sheetName);
  });

  const fileName = `tong-hop-hoa-don-${period.fromDate}-${period.toDate}.xlsx`;
  await downloadWorkbook(workbook, fileName);
}
