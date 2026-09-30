// ============================================================
//  XML-IMPORT-PROCESS.JS - Route parsed invoice data
// ============================================================

function processExtractedData(data) {
  if (data.sellerMST === MY_COMPANY.mst) {
    data.type = 'sell';
    let matchedCus = customers.find(c => 
      (c.mst && data.buyerMST && c.mst === data.buyerMST) || 
      (c.name && data.buyerName && data.buyerName.toLowerCase().includes(c.name.toLowerCase()))
    );
    
    if (matchedCus) {
      addSalesInvoice({
        invno: data.invno, duedate: data.duedate, customer: matchedCus.name,
        makhuon: matchedCus.molds || '', muahang: data.muahang, vat: data.vat,
        ghichu: 'Import XML Bán', thanhtoan: false, contract: matchedCus.contract || '', songay: matchedCus.pay_days || 30
      });
    } else {
      importQueue.push(data);
      if (!currentImportItem) showNextInQueue();
    }
  } 
  else {
    data.type = 'buy';
    let matchedSupp = suppliers.find(s => 
      (s.mst && data.sellerMST && s.mst === data.sellerMST) || 
      (s.name && data.sellerName && data.sellerName.toLowerCase().includes(s.name.toLowerCase()))
    );

    if (matchedSupp) {
      // 1. CẬP NHẬT NGÂN HÀNG CHO NCC NẾU TRỐNG
      let updated = false;
      if (!matchedSupp.bank && data.sellerBank) { matchedSupp.bank = data.sellerBank; updated = true; }
      if (!matchedSupp.acc && data.sellerAcc)   { matchedSupp.acc = data.sellerAcc; updated = true; }
      if (updated) {
        if(typeof renderSupplierTable === 'function') renderSupplierTable();
        triggerAutoSave();
        toast(`🏦 Đã cập nhật Ngân hàng/STK cho ${matchedSupp.name}`);
      }

      // 2. PHÂN LUỒNG MÁY MÓC -> CNC
      const loai = matchedSupp.loai || 'Khác';
      const isMachine = loai.toLowerCase().includes('máy móc') || loai.toLowerCase().includes('cnc');

      if (isMachine && typeof addCncPurchase === 'function') {
        addCncPurchase({
          ref: data.invno, date: data.duedate, ncc: matchedSupp.name,
          machine: 'Máy móc (Từ XML)', muahang: data.muahang,
          deposit: 0, periods: 1, monthlyInterest: 0, vat: data.vat, note: 'XML Mua', paid: false
        });
        toast(`🏭 Đã nhập công nợ Máy Móc CNC: ${data.invno}`);
      } else {
        addInvoice({
          invno: data.invno, duedate: data.duedate, ncc: matchedSupp.name,
          makhuon: matchedSupp.makhuon || '', loai: loai,
          muahang: data.muahang, vat: data.vat, ghichu: 'XML Mua', thanhtoan: false
        });
      }
    } else {
      importQueue.push(data);
      if (!currentImportItem) showNextInQueue();
    }
  }
}
