// ============================================================
//  XML-IMPORT-MODALS.JS - XML import modal and queue UI
// ============================================================

function ensureImportModalExists() {
  if (!document.getElementById('importModal')) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal-bg" id="importModal">
        <div class="modal" style="max-width:550px;border-top:5px solid #2b6cb0;">
          <div class="modal-title">🆕 Nhà cung cấp mới (Đầu vào) <span class="modal-close" onclick="closeImportModal()">✕</span></div>
          <p style="margin-bottom:12px;color:#666;font-size:12px;">Hệ thống chưa có Nhà cung cấp này. Vui lòng bổ sung:</p>
          <div class="form-row">
            <div class="form-group" style="flex:100%"><label>Tên NCC đầy đủ</label><input type="text" id="im_fullname" readonly style="background:#f9f9f9;font-weight:bold;color:#1a3c6e;"></div>
            <div class="form-group"><label>Mã số thuế</label><input type="text" id="im_mst" readonly style="background:#f9f9f9"></div>
            <div class="form-group"><label>Tên ngắn (Gợi ý) *</label><input type="text" id="im_name"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Ngân hàng (từ XML)</label><input type="text" id="im_bank"></div>
            <div class="form-group"><label>Số tài khoản (từ XML)</label><input type="text" id="im_acc"></div>
          </div>
          <div class="form-row">
            <div class="form-group" style="flex:100%"><label>Phân loại chi phí *</label><input type="text" id="im_loai" list="loaiList" placeholder="VD: Vật Liệu, Gia Công, Máy Móc..."></div>
          </div>
          <div class="btn-row" style="margin-top:20px;justify-content:flex-end;">
            <button class="btn btn-outline" onclick="closeImportModal()">Bỏ qua file này</button>
            <button class="btn btn-primary" onclick="confirmImport()">✅ Tạo NCC & Nhập HĐ</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
  }
}

function ensureSalesModalExists() {
  if (!document.getElementById('importSalesModal')) {
    const div = document.createElement('div');
    div.innerHTML = `
      <div class="modal-bg" id="importSalesModal">
        <div class="modal" style="max-width:500px;border-top:5px solid #38a169;">
          <div class="modal-title">🆕 Khách hàng mới (Đầu ra) <span class="modal-close" onclick="closeImportSalesModal()">✕</span></div>
          <p style="margin-bottom:12px;color:#666;font-size:12px;">Hệ thống chưa có Khách hàng này. Vui lòng bổ sung:</p>
          <div class="form-row">
            <div class="form-group" style="flex:100%"><label>Tên KH đầy đủ</label><input type="text" id="ims_fullname" readonly style="background:#f9f9f9;font-weight:bold;color:#1a3c6e;"></div>
            <div class="form-group"><label>Mã số thuế</label><input type="text" id="ims_mst" readonly style="background:#f9f9f9"></div>
            <div class="form-group"><label>Tên ngắn (Gợi ý) *</label><input type="text" id="ims_name"></div>
          </div>
          <div class="form-row">
            <div class="form-group"><label>Số hợp đồng *</label><input type="text" id="ims_contract" placeholder="VD: HD-01/2026"></div>
            <div class="form-group"><label>Mã khuôn</label><input type="text" id="ims_makhuon" list="mkList"></div>
          </div>
          <div class="btn-row" style="margin-top:20px;justify-content:flex-end;">
            <button class="btn btn-outline" onclick="closeImportSalesModal()">Bỏ qua file này</button>
            <button class="btn btn-success" onclick="confirmImportSales()">✅ Tạo KH & Nhập HĐ</button>
          </div>
        </div>
      </div>`;
    document.body.appendChild(div.firstElementChild);
  }
}

function showNextInQueue() {
  if (importQueue.length === 0) { currentImportItem = null; return; }
  currentImportItem = importQueue.shift();

  if (currentImportItem.type === 'buy') {
    ensureImportModalExists();
    const cleanFullName = removeAccentsAndUpper(currentImportItem.sellerName);
    document.getElementById('im_fullname').value = cleanFullName;
    document.getElementById('im_mst').value      = currentImportItem.sellerMST;
    document.getElementById('im_name').value     = cleanFullName.split(' ').slice(0, 3).join(' ');
    
    // Nạp Ngân hàng & STK vào Modal
    if(document.getElementById('im_bank')) document.getElementById('im_bank').value = currentImportItem.sellerBank || '';
    if(document.getElementById('im_acc')) document.getElementById('im_acc').value = currentImportItem.sellerAcc || '';

    document.getElementById('importModal').classList.add('open');
  } else {
    ensureSalesModalExists();
    const cleanBuyerName = removeAccentsAndUpper(currentImportItem.buyerName);
    document.getElementById('ims_fullname').value = cleanBuyerName;
    document.getElementById('ims_mst').value      = currentImportItem.buyerMST;
    let shortName = cleanBuyerName.replace(/(CONG TY|CTY|TNHH|CO PHAN|CP|MTV|DICH VU|THUONG MAI|SAN XUAT)/gi, '').trim();
    document.getElementById('ims_name').value = shortName;
    document.getElementById('importSalesModal').classList.add('open');
  }
}
