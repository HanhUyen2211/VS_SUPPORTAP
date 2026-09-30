function getElementsByLocalName(root, tagName) {
  return Array.from(root.getElementsByTagName('*')).filter((el) => {
    return el.localName === tagName || el.nodeName === tagName;
  });
}

function isInSignatureNode(el) {
  let parent = el.parentNode;
  while (parent) {
    const name = parent.localName || parent.nodeName;
    if (name === 'DSCKS' || name === 'Signature') return true;
    parent = parent.parentNode;
  }
  return false;
}

function getTag(xml, tagName) {
  const elements = getElementsByLocalName(xml, tagName);
  for (const element of elements) {
    if (!isInSignatureNode(element) && element.textContent) {
      return element.textContent.trim();
    }
  }
  return '';
}

function getTagIn(xml, parentTag, childTag) {
  const parents = getElementsByLocalName(xml, parentTag);

  for (const parent of parents) {
    if (isInSignatureNode(parent)) continue;

    const children = getElementsByLocalName(parent, childTag);
    const directChild = children.find((el) => el.parentNode === parent) || children[0];
    if (directChild?.textContent) return directChild.textContent.trim();
  }

  return '';
}

function firstText(...values) {
  return values.find((value) => String(value || '').trim()) || '';
}

export function parseXmlNumber(value) {
  if (value === null || value === undefined) return 0;
  let text = String(value).trim();
  if (!text) return 0;

  text = text.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  const sign = text.startsWith('-') ? '-' : '';
  if (sign) text = text.slice(1);

  const dotCount = (text.match(/\./g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;

  if (dotCount && commaCount) {
    const decimalSep = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    text = text.split(thousandSep).join('').replace(decimalSep, '.');
    return parseFloat(sign + text) || 0;
  }

  const sep = dotCount ? '.' : commaCount ? ',' : '';
  if (!sep) return parseFloat(sign + text) || 0;

  const parts = text.split(sep);
  if (parts.length > 2) return parseFloat(sign + parts.join('')) || 0;

  const intPart = parts[0] || '0';
  const fracPart = parts[1] || '';
  if (fracPart.length === 3 && intPart.length <= 3) {
    return parseFloat(sign + intPart + fracPart) || 0;
  }

  return parseFloat(`${sign}${intPart}.${fracPart}`) || 0;
}

function normalizeInvoiceDate(value) {
  const text = String(value || '').trim();
  if (!text) return '';

  const isoMatch = text.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const vnMatch = text.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (vnMatch) return `${vnMatch[3]}-${vnMatch[2]}-${vnMatch[1]}`;

  const compactMatch = text.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compactMatch) return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function makeId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function parseVNInvoiceXml(xml, fileName) {
  const invoiceNumber = firstText(getTag(xml, 'SHDon'), getTag(xml, 'SHD'), getTag(xml, 'SoHD'));
  const invoiceDate = normalizeInvoiceDate(firstText(getTag(xml, 'NLap'), getTag(xml, 'NLHD')));
  const sellerName = firstText(getTagIn(xml, 'NBan', 'Ten'), getTagIn(xml, 'NBan', 'HVTNMHang'));
  const sellerTaxCode = firstText(getTagIn(xml, 'NBan', 'MST'), getTagIn(xml, 'NBan', 'MSTNBan'));

  let totalBeforeTax = parseXmlNumber(
    firstText(
      getTagIn(xml, 'TToan', 'TgTCThue'),
      getTagIn(xml, 'TToan', 'TgTCTThue'),
      getTag(xml, 'TgTCThue'),
      getTag(xml, 'TgTCTThue'),
    ),
  );
  const totalTax = parseXmlNumber(firstText(getTagIn(xml, 'TToan', 'TgTThue'), getTag(xml, 'TgTThue')));
  let totalPayment = parseXmlNumber(
    firstText(
      getTagIn(xml, 'TToan', 'TgTTTBSo'),
      getTagIn(xml, 'TToan', 'TgTToan'),
      getTag(xml, 'TgTTTBSo'),
      getTag(xml, 'TgTToan'),
    ),
  );

  if (!totalBeforeTax && totalPayment && totalTax) totalBeforeTax = totalPayment - totalTax;
  if (!totalPayment && (totalBeforeTax || totalTax)) totalPayment = totalBeforeTax + totalTax;

  if (!invoiceNumber || !sellerName || !invoiceDate || !totalPayment) {
    throw new Error('Không đọc đủ số hóa đơn, ngày lập, người bán hoặc tổng tiền');
  }

  return {
    id: makeId(),
    sourceFileName: fileName,
    invoiceNumber,
    invoiceDate,
    sellerName,
    sellerTaxCode,
    totalBeforeTax: Math.round(totalBeforeTax),
    totalTax: Math.round(totalTax),
    totalPayment: Math.round(totalPayment),
  };
}

export async function parseInvoiceXmlFile(file) {
  const text = await file.text();
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const parserError = xml.getElementsByTagName('parsererror')[0] || getElementsByLocalName(xml, 'parsererror')[0];

  if (parserError) {
    throw new Error('File XML không đúng định dạng');
  }

  return parseVNInvoiceXml(xml, file.name);
}
