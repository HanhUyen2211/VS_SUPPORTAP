// ============================================================
//  XML-IMPORT.JS — Nhập hóa đơn từ file XML (Tự động Mua/Bán)
// ============================================================

let importQueue       = [];
let currentImportItem = null;

function removeAccentsAndUpper(str) {
  if (!str) return '';
  return str.normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd').replace(/Đ/g, 'D')
            .toUpperCase();
}

// Gắn hiệu ứng Drag & Drop
function xmlDragOver(e)    { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('drag'); }
function xmlDragLeave(e)   { e.currentTarget.classList.remove('drag'); }
function xmlDropHandler(e) { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('drag'); handleXmlFiles(e.dataTransfer.files); }

function handleXmlFiles(files) {
  Array.from(files).forEach(file => {
    if (!file || !file.name.toLowerCase().endsWith('.xml')) {
      toast('⚠️ Vui lòng chọn file XML hóa đơn');
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const xml = new DOMParser().parseFromString(e.target.result, 'text/xml');
        if (xml.getElementsByTagName('parsererror').length) {
          throw new Error('File XML không đúng định dạng');
        }

        const extracted = parseVNInvoiceRaw(xml, file.name);
        if (extracted) processExtractedData(extracted);
      } catch (ex) {
        toast(`❌ Lỗi đọc file XML: ${ex.message}`);
      }
    };
    reader.readAsText(file, 'UTF-8');
  });
}

function getElementsByLocalName(root, tagName) {
  return Array.from(root.getElementsByTagName('*')).filter(el => el.localName === tagName || el.nodeName === tagName);
}

function isInSignatureNode(el) {
  let p = el.parentNode;
  while (p) {
    const name = p.localName || p.nodeName;
    if (name === 'DSCKS' || name === 'Signature') return true;
    p = p.parentNode;
  }
  return false;
}

function getTag(xml, tagName) {
  const els = getElementsByLocalName(xml, tagName);
  for (let i = 0; i < els.length; i++) {
    if (!isInSignatureNode(els[i]) && els[i].textContent) return els[i].textContent.trim();
  }
  return '';
}

function getTagIn(xml, parentTag, childTag) {
  const parents = getElementsByLocalName(xml, parentTag);
  for (let i = 0; i < parents.length; i++) {
    if (!isInSignatureNode(parents[i])) {
      const child = getElementsByLocalName(parents[i], childTag);
      const directChild = child.find(el => el.parentNode === parents[i]) || child[0];
      if (directChild && directChild.textContent) return directChild.textContent.trim();
    }
  }
  return '';
}

function parseXmlNumber(value) {
  if (value === null || value === undefined) return 0;
  let text = String(value).trim();
  if (!text) return 0;

  text = text.replace(/\s/g, '').replace(/[^\d.,-]/g, '');
  const sign = text.startsWith('-') ? '-' : '';
  if (sign) text = text.slice(1);

  const dotCount = (text.match(/\./g) || []).length;
  const commaCount = (text.match(/,/g) || []).length;

  // XML hóa đơn có thể dùng dấu nhóm hoặc dấu thập phân.
  if (dotCount && commaCount) {
    const decimalSep = text.lastIndexOf(',') > text.lastIndexOf('.') ? ',' : '.';
    const thousandSep = decimalSep === ',' ? '.' : ',';
    text = text.split(thousandSep).join('').replace(decimalSep, '.');
    return parseFloat(sign + text) || 0;
  }

  const sep = dotCount ? '.' : (commaCount ? ',' : '');
  if (!sep) return parseFloat(sign + text) || 0;

  const parts = text.split(sep);
  if (parts.length > 2) return parseFloat(sign + parts.join('')) || 0;

  const intPart = parts[0] || '0';
  const fracPart = parts[1] || '';
  if (fracPart.length === 3 && intPart.length <= 3) {
    return parseFloat(sign + intPart + fracPart) || 0;
  }
  return parseFloat(sign + intPart + '.' + fracPart) || 0;
}

function parseVNInvoiceRaw(xml, filename) {
  const invno      = getTag(xml, 'SHDon');
  const ngaylap    = getTag(xml, 'NLap');
  
  const sellerName = getTagIn(xml, 'NBan', 'Ten');
  const sellerMST  = getTagIn(xml, 'NBan', 'MST');
  const sellerAcc  = getTagIn(xml, 'NBan', 'STKNHang') || getTagIn(xml, 'NBan', 'STK') || getTagIn(xml, 'NBan', 'SoTK') || '';
  const sellerBank = getTagIn(xml, 'NBan', 'NganHang') || getTagIn(xml, 'NBan', 'TenNganHang') || getTagIn(xml, 'NBan', 'NHang') || '';

  const buyerName  = getTagIn(xml, 'NMua', 'Ten');
  const buyerMST   = getTagIn(xml, 'NMua', 'MST');

  const tongHang   = parseXmlNumber(getTagIn(xml, 'TToan', 'TgTCThue'));
  const tongThue   = parseXmlNumber(getTagIn(xml, 'TToan', 'TgTThue'));
  const tongTT     = parseXmlNumber(getTagIn(xml, 'TToan', 'TgTTTBSo')) || parseXmlNumber(getTag(xml, 'TgTTTBSo'));

  if (!invno || (!sellerMST && !buyerMST) || (!tongHang && !tongTT)) {
    toast(`⚠️ Bỏ qua ${filename}: không đọc được đủ thông tin hóa đơn`);
    return null;
  }

  let vatRate = 0;
  if (tongHang > 0 && tongThue > 0) {
    vatRate = Math.round((tongThue / tongHang) * 100) / 100;
  }

  let duedate = '';
  if (ngaylap) {
    const m1 = ngaylap.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (m1) duedate = `${m1[1]}-${m1[2]}-${m1[3]}`;
    const m2 = ngaylap.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!duedate && m2) duedate = `${m2[3]}-${m2[2]}-${m2[1]}`;
  }
  if (!duedate) { 
    const d = new Date(); 
    duedate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; 
  }

  return { invno, duedate, sellerName, sellerMST, sellerAcc, sellerBank, buyerName, buyerMST, muahang: Math.round(tongHang || (tongTT / (1 + vatRate))), vat: vatRate, filename };
}
