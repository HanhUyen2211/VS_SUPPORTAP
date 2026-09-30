// ============================================================
//  XML-IMPORT-ACTIONS.JS - Confirm XML import records
// ============================================================

function closeImportModal() { document.getElementById('importModal').classList.remove('open'); showNextInQueue(); }

function confirmImport() {
  const shortName = document.getElementById('im_name').value.trim();
  if (!shortName) return;
  const inputLoai = document.getElementById('im_loai').value.trim() || 'Khác';
  const inputBank = document.getElementById('im_bank') ? document.getElementById('im_bank').value.trim() : (currentImportItem.sellerBank || '');
  const inputAcc = document.getElementById('im_acc') ? document.getElementById('im_acc').value.trim() : (currentImportItem.sellerAcc || '');
  
  // 1. TẠO NCC KÈM NGÂN HÀNG
  suppliers.push({ 
    id: ++nextId, name: shortName, 
    fullname: document.getElementById('im_fullname').value, 
    mst: currentImportItem.sellerMST, 
    bank: inputBank, 
    acc: inputAcc, 
    loai: inputLoai, note: 'Từ XML' 
  });
  
  // 2. PHÂN LUỒNG MÁY MÓC
  const isMachine = inputLoai.toLowerCase().includes('máy móc') || inputLoai.toLowerCase().includes('cnc');
  if (isMachine && typeof addCncPurchase === 'function') {
    addCncPurchase({
      ref: currentImportItem.invno, date: currentImportItem.duedate, ncc: shortName,
      machine: 'Máy móc (Từ XML)', muahang: currentImportItem.muahang,
      deposit: 0, periods: 1, monthlyInterest: 0, vat: currentImportItem.vat, note: 'XML Mua', paid: false
    });
  } else {
    addInvoice({ 
      invno: currentImportItem.invno, duedate: currentImportItem.duedate, 
      ncc: shortName, makhuon: '', loai: inputLoai, 
      muahang: currentImportItem.muahang, vat: currentImportItem.vat, ghichu: 'XML Mua', thanhtoan: false 
    });
  }
  
  populateNCCSelects(); populateLoaiSelects(); renderSupplierTable(); triggerAutoSave();
  
  // Hiển thị thông báo thành công tức thì
  toast(`✅ Đã thêm mới NCC "${shortName}" và lưu hóa đơn mua thành công!`);

  document.getElementById('importModal').classList.remove('open'); 
  showNextInQueue();
}

function closeImportSalesModal() { document.getElementById('importSalesModal').classList.remove('open'); showNextInQueue(); }

function confirmImportSales() {
  const shortName = document.getElementById('ims_name').value.trim();
  const contract  = document.getElementById('ims_contract').value.trim();
  if (!shortName || !contract) { alert('Vui lòng nhập Tên ngắn và Số hợp đồng'); return; }

  customers.push({ 
    id: ++nextId, name: shortName, 
    fullname: document.getElementById('ims_fullname').value,
    mst: currentImportItem.buyerMST, contract: contract, 
    molds: document.getElementById('ims_makhuon').value.trim(), note: 'Từ XML' 
  });
  
  addSalesInvoice({ 
    invno: currentImportItem.invno, duedate: currentImportItem.duedate, 
    customer: shortName, makhuon: document.getElementById('ims_makhuon').value.trim(), 
    muahang: currentImportItem.muahang, vat: currentImportItem.vat, 
    ghichu: 'XML Bán', thanhtoan: false, contract: contract, songay: 30
  });
  
  populateCustomerSelects(); renderCustomerTable(); triggerAutoSave();
  
  // Hiển thị thông báo thành công tức thì
  toast(`✅ Đã thêm mới Khách hàng "${shortName}" và tạo hóa đơn bán thành công!`);

  document.getElementById('importSalesModal').classList.remove('open'); 
  showNextInQueue();
}
