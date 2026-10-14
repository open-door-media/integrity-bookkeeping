// Integrity Bookkeeping — Supabase data layer
// Loaded by app.html via <script src="db.js">
// Depends on window.supabase (Supabase CDN UMD loaded first)

const _DEFAULT_SB_URL = 'https://qhuqdflthjwkpajfrwxr.supabase.co';
const _DEFAULT_SB_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFodXFkZmx0aGp3a3BhamZyd3hyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwNzM3MTAsImV4cCI6MjA5OTY0OTcxMH0.onSwAqrhZyi2pBZONjIR5dIzxgP89395QiQMSqPRGJk';

const DB = (() => {
  let _sb = null; // Supabase client instance

  // ── Init ──────────────────────────────────────────────────────────────────
  function init(url, key) {
    _sb = window.supabase.createClient(url, key);
  }

  // Auto-initialize with built-in credentials
  function _autoInit() {
    if (!_sb) init(_DEFAULT_SB_URL, _DEFAULT_SB_KEY);
  }

  const _sessionId = (typeof crypto !== 'undefined' && crypto.randomUUID)
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

  let _realtimeChannel = null;
  let _presenceChannel = null;
  let _presenceUserName = '';

  function isReady() { _autoInit(); return !!_sb; }

  function _check() {
    _autoInit();
    if (!_sb) throw new Error('Supabase not configured. Enter credentials in Settings → Cloud Sync.');
  }

  // ── Mapping helpers ───────────────────────────────────────────────────────

  function clientToRow(c) {
    return {
      id: c.id,
      num: c.num || '',
      name: c.name || '',
      address: c.address || '',
      contact: c.contact || '',
      phone: c.phone || '',
      email: c.email || '',
      contact2: c.contact2 || '',
      phone2: c.phone2 || '',
      email2: c.email2 || '',
      contact3: c.contact3 || '',
      phone3: c.phone3 || '',
      email3: c.email3 || '',
      has_contact2: !!c.hasContact2,
      has_contact3: !!c.hasContact3,
      bill_to: c.billTo || '',
      bill_addr1: c.billAddr1 || '',
      bill_addr2: c.billAddr2 || '',
      bill_city: c.billCity || '',
      bill_state: c.billState || '',
      bill_zip: c.billZip || '',
      bill_phone: c.billPhone || '',
      bill_email: c.billEmail || '',
      payable_to: c.payableTo || '',
      payable_addr1: c.payableAddr1 || '',
      payable_addr2: c.payableAddr2 || '',
      payable_city: c.payableCity || '',
      payable_state: c.payableState || '',
      payable_zip: c.payableZip || '',
      payable_phone: c.payablePhone || '',
      payable_email: c.payableEmail || '',
      payable_same_billing_addr: !!c.payableSameBillingAddr,
      start_date: c.startDate || '',
      notes: c.notes || '',
      // entry_details (garage codes, keybox, key color…) is only sent once the column exists or has a value,
      // so every other client save keeps working until the column has been added in Supabase
      ...((c.entryDetails || c._hasEntryCol) ? { entry_details: c.entryDetails || '' } : {}),
      status: c.status || 'agreement',
      flat_rate: c.flatRate || 0,
      flat_rate_inv_status: c.flatRateInvStatus || 'uninvoiced',
      has_dumpster: !!c.hasDumpster,
      dumpster_est: c.dumpsterEst || 0,
      dumpster_actual: c.dumpsterActual ?? null,
      dumpster_savings_route: c.dumpsterSavingsRoute || 'mine',
      dumpster_route: c.dumpsterRoute || null,
      dumpster_inv_status: c.dumpsterInvStatus || 'uninvoiced',
      consignment_active: !!c.consignmentActive,
      consignment_rate: c.consignmentRate || 25,
      has_consignment: !!c.hasConsignment,
      has_cons_fee: !!c.hasConsFee,
      has_buyout_credit: !!c.hasBuyoutCredit,
      consignment_fee: c.consignmentFee || 0,
      consignment_fee_mode: c.consignmentFeeMode || 'combined',
      consignment_fee_inv_status: c.consignmentFeeInvStatus || 'uninvoiced',
      consignment_type: c.consignmentType || 'fee',
      buyout_amount: c.buyoutAmount || 0,
      buyout_mode: c.buyoutMode || 'combined',
      buyout_inv_status: c.buyoutInvStatus || 'uninvoiced',
      job_mode: c.jobMode || 'cleanout',
      dp_paid: !!c.dpPaid,
      dp_date: c.dpDate || null,
      dp_check: c.dpCheck || '',
      dp_formula: c.dpFormula || { flatPct: 50, dumpsterPct: 100 },
      labor_employees: c.laborEmployees || [],
      labor_dates: c.laborDates || [],
      labor_excluded: c.laborExcluded || [],
      labor_initialized: !!c.laborInitialized,
      mileage_dates: c.mileageDates || [],
      mileage_rate: c.mileageRate ?? null,
      archived: c.status === 'archived',
    };
  }

  function rowToClient(row) {
    return {
      id: row.id,
      num: row.num,
      name: row.name,
      address: row.address,
      contact: row.contact,
      phone: row.phone,
      email: row.email,
      contact2: row.contact2,
      phone2: row.phone2,
      email2: row.email2,
      contact3: row.contact3,
      phone3: row.phone3,
      email3: row.email3,
      hasContact2: row.has_contact2,
      hasContact3: row.has_contact3,
      billTo: row.bill_to,
      billAddr1: row.bill_addr1,
      billAddr2: row.bill_addr2,
      billCity: row.bill_city,
      billState: row.bill_state,
      billZip: row.bill_zip,
      billPhone: row.bill_phone,
      billEmail: row.bill_email,
      payableTo: row.payable_to,
      payableAddr1: row.payable_addr1,
      payableAddr2: row.payable_addr2,
      payableCity: row.payable_city,
      payableState: row.payable_state,
      payableZip: row.payable_zip,
      payablePhone: row.payable_phone,
      payableEmail: row.payable_email,
      payableSameBillingAddr: row.payable_same_billing_addr,
      startDate: row.start_date,
      notes: row.notes,
      entryDetails: row.entry_details || '',
      _hasEntryCol: 'entry_details' in row,
      status: row.status,
      flatRate: row.flat_rate,
      flatRateInvStatus: row.flat_rate_inv_status,
      hasDumpster: row.has_dumpster,
      dumpsterEst: row.dumpster_est,
      dumpsterActual: row.dumpster_actual,
      dumpsterSavingsRoute: row.dumpster_savings_route,
      dumpsterRoute: row.dumpster_route,
      dumpsterInvStatus: row.dumpster_inv_status,
      consignmentActive: row.consignment_active,
      consignmentRate: row.consignment_rate,
      hasConsignment: row.has_consignment,
      hasConsFee: row.has_cons_fee,
      hasBuyoutCredit: row.has_buyout_credit,
      consignmentFee: row.consignment_fee,
      consignmentFeeMode: row.consignment_fee_mode,
      consignmentFeeInvStatus: row.consignment_fee_inv_status,
      consignmentType: row.consignment_type,
      buyoutAmount: row.buyout_amount,
      buyoutMode: row.buyout_mode,
      buyoutInvStatus: row.buyout_inv_status,
      jobMode: row.job_mode,
      dpPaid: row.dp_paid,
      dpDate: row.dp_date,
      dpCheck: row.dp_check,
      dpFormula: row.dp_formula || { flatPct: 50, dumpsterPct: 100 },
      laborEmployees: row.labor_employees || [],
      laborDates: row.labor_dates || [],
      laborExcluded: row.labor_excluded || [],
      laborInitialized: row.labor_initialized,
      mileageDates: row.mileage_dates || [],
      mileageRate: row.mileage_rate ?? undefined,
      // Sub-arrays populated later from join tables
      fees: [],
      costAdjustments: [],
      privateSales: [],
      dpChecks: [],
      laborHours: {},
      mileageMiles: {},
      statements: [],
      invoices: [],
      sales: [],
    };
  }

  function feeToRow(clientId, f) {
    return {
      id: f.id,
      client_id: clientId,
      name: f.name || '',
      amount: f.amount || 0,
      actual_amount: f.actualAmount ?? null,
      type: f.type || 'profit',
      dp_included: !!f.dpIncluded,
      dp_pct: f.dpPct ?? 100,
      routed: f.routed || 'client',
      savings_route: f.savingsRoute || 'mine',
      inv_status: f.invStatus || 'uninvoiced',
    };
  }

  function rowToFee(row) {
    return {
      id: row.id,
      name: row.name,
      amount: row.amount,
      actualAmount: row.actual_amount,
      type: row.type,
      dpIncluded: row.dp_included,
      dpPct: row.dp_pct,
      routed: row.routed,
      savingsRoute: row.savings_route,
      invStatus: row.inv_status,
    };
  }

  function adjToRow(clientId, a) {
    return {
      id: a.id,
      client_id: clientId,
      name: a.name || '',
      amount: a.amount || 0,
      actual_amount: a.actualAmount ?? null,
      type: a.type || 'profit',
      routed: a.routed || 'client',
      savings_route: a.savingsRoute ?? null,
      inv_status: a.invStatus || 'uninvoiced',
    };
  }

  function rowToAdj(row) {
    return {
      id: row.id,
      name: row.name,
      amount: row.amount,
      actualAmount: row.actual_amount,
      type: row.type,
      routed: row.routed,
      savingsRoute: row.savings_route,
      invStatus: row.inv_status,
    };
  }

  function saleToRow(clientId, s) {
    return {
      id: s.id,
      client_id: clientId,
      item_name: s.itemName || '',
      name: s.name || '',
      date: s.date || '',
      price: s.price || 0,
      client_pct: s.clientPct ?? 50,
      kevin_bought: !!s.kevinBought,
      check_status: s.checkStatus || 'pending',
      updated_at: s.updatedAt ?? null,
    };
  }

  function rowToSale(row) {
    return {
      id: row.id,
      itemName: row.item_name,
      name: row.name,
      date: row.date,
      price: row.price,
      clientPct: row.client_pct,
      kevinBought: row.kevin_bought,
      checkStatus: row.check_status,
      updatedAt: row.updated_at,
    };
  }

  function outsourcedSaleToRow(clientId, s) {
    return {
      id: s.id,
      client_id: clientId,
      name: s.name || '',
      date: s.date || '',
      gross: s.gross || 0,
      client_pct: s.clientPct ?? 50,
      kevin_commission_pct: s.kevinCommissionPct || 0,
      kevin_commission: s.kevinCommission || 0,
      updated_at: s.updatedAt ?? null,
    };
  }

  function rowToOutsourcedSale(row) {
    return {
      id: row.id,
      name: row.name,
      date: row.date,
      gross: row.gross,
      clientPct: row.client_pct,
      kevinSold: false,
      kevinCommissionPct: row.kevin_commission_pct,
      kevinCommission: row.kevin_commission,
      updatedAt: row.updated_at,
    };
  }

  function dpCheckToRow(clientId, ck) {
    return {
      id: ck.id,
      client_id: clientId,
      status: ck.status || 'pending',
      date: ck.date || '',
      ref: ck.ref || '',
      amount: ck.amount || 0,
      notes: ck.notes || '',
      img: ck.img ?? null,
    };
  }

  function rowToDpCheck(row) {
    return {
      id: row.id,
      status: row.status,
      date: row.date,
      ref: row.ref,
      amount: row.amount,
      notes: row.notes,
      img: row.img,
    };
  }

  function paymentToRow(p) {
    return {
      id: p.id || undefined,
      client_id: p.clientId,
      context: p.context,
      ref_id: p.refId ?? null,
      method: p.method || 'check',
      status: p.status || 'pending',
      date: p.date || '',
      amount: p.amount || 0,
      ref: p.ref || '',
      notes: p.notes || '',
      card_fee_pct: p.cardFeePct ?? null,
      card_fee_mode: p.cardFeeMode ?? null,
      card_bill_timing: p.cardBillTiming ?? null,
      card_gross_amount: p.cardGrossAmount ?? null,
      card_actual_received: p.cardActualReceived ?? null,
      card_fee_delta: p.cardFeeDelta ?? null,
      card_flat_fee: p.cardFlatFee ?? null,
      card_gross_mode: p.cardGrossMode ?? null,
    };
  }

  function rowToPayment(row) {
    return {
      id: row.id,
      clientId: row.client_id,
      context: row.context,
      refId: row.ref_id,
      method: row.method || 'check',
      status: row.status,
      date: row.date,
      amount: Number(row.amount) || 0,
      ref: row.ref,
      notes: row.notes,
      cardFeePct: row.card_fee_pct != null ? Number(row.card_fee_pct) : null,
      cardFeeMode: row.card_fee_mode,
      cardBillTiming: row.card_bill_timing,
      cardGrossAmount: row.card_gross_amount != null ? Number(row.card_gross_amount) : null,
      cardActualReceived: row.card_actual_received != null ? Number(row.card_actual_received) : null,
      cardFeeDelta: row.card_fee_delta != null ? Number(row.card_fee_delta) : null,
      cardFlatFee: row.card_flat_fee != null ? Number(row.card_flat_fee) : null,
      cardGrossMode: row.card_gross_mode ?? null,
    };
  }

  function taskToRow(t) {
    return {
      id: t.id,
      list_id: t.listId ?? null,
      client_id: t.clientId ?? null,
      text: t.text || '',
      due: t.due ?? null,
      done: !!t.done,
      updated_at: t.updatedAt ?? null,
    };
  }

  function rowToTask(row) {
    return {
      id: row.id,
      listId: row.list_id ?? null,
      clientId: row.client_id,
      text: row.text,
      due: row.due,
      done: row.done,
      updatedAt: row.updated_at,
    };
  }

  function taskListToRow(l) {
    return {
      id: l.id,
      name: l.name || '',
      client_id: l.clientId ?? null,
      created_at: l.createdAt ?? Date.now(),
    };
  }

  function rowToTaskList(row) {
    return {
      id: row.id,
      name: row.name,
      clientId: row.client_id ?? null,
      createdAt: row.created_at,
    };
  }

  function empToRow(e) {
    return {
      id: e.id,
      name: e.name || '',
      rate: e.rate ?? null,
      is_owner: !!e.isOwner,
      active: e.active !== false,
      phone: e.phone || '',
      notes: e.notes || '',
    };
  }

  function rowToEmp(row) {
    return {
      id: row.id,
      name: row.name,
      rate: row.rate,
      isOwner: row.is_owner,
      active: row.active,
      phone: row.phone,
      notes: row.notes,
    };
  }

  function invoiceToRow(inv) {
    return {
      id: inv.id,
      client_id: inv.clientId,
      num: inv.num || '',
      year: inv.year ?? null,
      status: inv.status || 'unpaid',
      total: inv.total || 0,
      notes: inv.notes || '',
      created_at: inv.createdAt || '',
      paid_date: inv.paidDate ?? null,
      check_num: inv.checkNum ?? null,
      due_date: inv.dueDate ?? null,
      lines: inv.lines || [],
      snapshot: {
        billToName:  inv.billToName,
        billToAddr1: inv.billToAddr1,
        billToAddr2: inv.billToAddr2,
        billToCsz:   inv.billToCsz,
        billToPhone: inv.billToPhone,
        billToEmail: inv.billToEmail,
        fromName:    inv.fromName,
        fromAddr1:   inv.fromAddr1,
        fromAddr2:   inv.fromAddr2,
        fromCsz:     inv.fromCsz,
        fromPhone:   inv.fromPhone,
        subtitle:    inv.subtitle,
        date:        inv.date,
        dueDate:     inv.dueDate,
        dueHidden:   inv.dueHidden,
        footer:      inv.footer,
        seq:         inv.seq,
        subtotal:    inv.subtotal,
        credits:     inv.credits,
      },
    };
  }

  function rowToInvoice(row) {
    return {
      id: row.id,
      clientId: row.client_id,
      num: row.num,
      year: row.year,
      status: row.status,
      total: row.total,
      notes: row.notes,
      createdAt: row.created_at,
      paidDate: row.paid_date,
      checkNum: row.check_num,
      dueDate: row.due_date,
      lines: row.lines || [],
      checks: row.checks || [],
      ...(row.snapshot || {}),
    };
  }

  function stmtToRow(clientId, st) {
    return {
      id: st.id,
      client_id: clientId,
      status: st.status || 'draft',
      paid_date: st.paidDate ?? null,
      check_num: st.checkNum ?? null,
      lines: st.lines || [],
      created_at: st.createdAt || '',
      num: st.num || '',
      date: st.date || '',
      seq: st.seq ?? null,
      total: st.total ?? 0,
      check_doc_id: st.checkDocId ?? null,
      footer: st.footer ?? '',
      header: {
        subtitle: st.subtitle||'',
        billName: st.billName||'',
        billAddr1: st.billAddr1||'',
        billAddr2: st.billAddr2||'',
        billCsz: st.billCsz||'',
        billPhone: st.billPhone||'',
        fromName: st.fromName||'',
        fromAddr1: st.fromAddr1||'',
        fromAddr2: st.fromAddr2||'',
        fromCsz: st.fromCsz||'',
        fromPhone: st.fromPhone||'',
      },
    };
  }

  function rowToStmt(row) {
    const h = row.header || {};
    return {
      id: row.id,
      status: row.status,
      paidDate: row.paid_date,
      checkNum: row.check_num,
      lines: row.lines || [],
      createdAt: row.created_at,
      num: row.num,
      date: row.date,
      seq: row.seq,
      total: row.total,
      checks: row.checks || [],
      checkDocId: row.check_doc_id,
      footer: row.footer ?? '',
      subtitle: h.subtitle||'',
      billName: h.billName||'',
      billAddr1: h.billAddr1||'',
      billAddr2: h.billAddr2||'',
      billCsz: h.billCsz||'',
      billPhone: h.billPhone||'',
      fromName: h.fromName||'',
      fromAddr1: h.fromAddr1||'',
      fromAddr2: h.fromAddr2||'',
      fromCsz: h.fromCsz||'',
      fromPhone: h.fromPhone||'',
    };
  }

  function docToRow(doc) {
    return {
      id: doc.id,
      name: doc.name || '',
      stored_name: doc.storedName || '',
      client_id: doc.clientId ?? null,
      created_at: doc.createdAt || '',
      type: doc.type || '',
    };
  }

  function rowToDoc(row) {
    return {
      id: row.id,
      name: row.name,
      storedName: row.stored_name,
      clientId: row.client_id,
      createdAt: row.created_at,
      type: row.type,
    };
  }

  function entryToRow(e) {
    return {
      id: e.id,
      description: e.desc || '',
      amount: e.amount || 0,
      dir: e.dir || 'in',
      status: e.status || 'deposited',
      date: e.date || '',
      ref: e.ref || '',
      client_id: e.clientId ?? null,
      notes: e.notes || '',
    };
  }

  function rowToEntry(row) {
    return {
      id: row.id,
      desc: row.description,
      amount: row.amount,
      dir: row.dir,
      status: row.status,
      date: row.date,
      ref: row.ref,
      clientId: row.client_id,
      notes: row.notes,
    };
  }

  function settingsToRow(s, meta) {
    return {
      id: 1,
      dp_flat_pct: s.dpFlatPct ?? 50,
      cons_rate: s.consRate ?? 25,
      mileage_rate: s.mileageRate ?? 0.67,
      card_fee_pct: s.cardFeePct ?? 3.0,
      stmt_fmt: s.stmtFmt || 'itemized',
      biz_name: s.bizName || '',
      invoice_contact: s.invoiceContact || '',
      invoice_address: s.invoiceAddress || '',
      invoice_address2: s.invoiceAddress2 || '',
      invoice_city: s.invoiceCity || '',
      invoice_state: s.invoiceState || '',
      invoice_zip: s.invoiceZip || '',
      invoice_phone: s.invoicePhone || '',
      invoice_prefix: s.invoicePrefix || '',
      invoice_sep: s.invoiceSep || '-',
      invoice_start_seq: s.invoiceStartSeq ?? 1,
      invoice_due_days: s.invoiceDueDays ?? 14,
      invoice_footer: s.invoiceFooter || '',
      logo_path: s.logoPath || '',
      stmt_footer: s.stmtFooter || '',
      invoice_save_path: s.invoiceSavePath || '',
      stmt_save_path: s.stmtSavePath || '',
      shortcuts: s.shortcuts || {},
      next_cn: meta?.nextCN ?? 1,
      next_emp_id: meta?.nextEmpId ?? 2,
      next_task_id: meta?.nextTaskId ?? 1,
    };
  }

  function rowToSettings(row) {
    return {
      settings: {
        dpFlatPct: row.dp_flat_pct,
        consRate: row.cons_rate,
        mileageRate: row.mileage_rate,
        cardFeePct: row.card_fee_pct ?? 3.0,
        stmtFmt: row.stmt_fmt,
        bizName: row.biz_name,
        invoiceContact: row.invoice_contact,
        invoiceAddress: row.invoice_address,
        invoiceAddress2: row.invoice_address2,
        invoiceCity: row.invoice_city,
        invoiceState: row.invoice_state,
        invoiceZip: row.invoice_zip,
        invoicePhone: row.invoice_phone,
        invoicePrefix: row.invoice_prefix,
        invoiceSep: row.invoice_sep,
        invoiceStartSeq: row.invoice_start_seq,
        invoiceDueDays: row.invoice_due_days,
        invoiceFooter: row.invoice_footer,
        logoPath: row.logo_path,
        stmtFooter: row.stmt_footer,
        invoiceSavePath: row.invoice_save_path,
        stmtSavePath: row.stmt_save_path,
        shortcuts: row.shortcuts || {},
      },
      nextCN: row.next_cn,
      nextEmpId: row.next_emp_id,
      nextTaskId: row.next_task_id,
    };
  }

  // ── Load all (assembles S from Supabase) ──────────────────────────────────
  async function loadAll() {
    _check();
    const [
      { data: settingsRow, error: se },
      { data: clientRows, error: ce },
      { data: feeRows },
      { data: adjRows },
      { data: saleRows },
      { data: outsourcedSaleRows, error: ose },
      { data: paymentRows, error: pe },
      { data: laborRows },
      { data: mileageRows },
      { data: empRows },
      { data: taskRows },
      { data: taskListRows },
      { data: invoiceRows },
      { data: stmtRows },
      { data: docRows },
      { data: entryRows },
      { data: accountsRow },
    ] = await Promise.all([
      _sb.from('settings').select('*').eq('id', 1).single(),
      _sb.from('clients').select('*').eq('archived', false).order('num'),
      _sb.from('fees').select('*'),
      _sb.from('cost_adjustments').select('*'),
      _sb.from('private_sales').select('*'),
      _sb.from('outsourced_sales').select('*'),
      _sb.from('payments').select('*'),
      _sb.from('labor_entries').select('*'),
      _sb.from('mileage_entries').select('*'),
      _sb.from('employees').select('*').order('id'),
      _sb.from('tasks').select('*').order('id'),
      _sb.from('task_lists').select('*').order('created_at'),
      _sb.from('invoices').select('*').order('created_at'),
      _sb.from('statements').select('*'),
      _sb.from('documents').select('*').order('created_at'),
      _sb.from('manual_entries').select('*').order('date'),
      _sb.from('accounts').select('*').eq('id', 1).single(),
    ]);

    if (se || ce) throw new Error((se || ce).message);
    if (ose) console.error('outsourced_sales load failed:', ose.message);
    if (pe) console.error('payments load failed (check RLS policy):', pe.message);

    // Build laborHours map: { snapId: { date: { reg, cons } } }
    function buildLaborHours(rows) {
      const h = {};
      (rows || []).forEach(r => {
        if (!h[r.snap_id]) h[r.snap_id] = {};
        h[r.snap_id][r.date] = { reg: r.reg, cons: r.cons };
      });
      return h;
    }

    // Build mileageMiles map: { date: miles }
    function buildMileageMiles(rows) {
      const m = {};
      (rows || []).forEach(r => { m[r.date] = r.miles; });
      return m;
    }

    const allPayments = (paymentRows || []).map(rowToPayment);

    const clients = (clientRows || []).map(row => {
      const cid = row.id;
      const c = rowToClient(row);
      c.fees = (feeRows || []).filter(r => r.client_id === cid).map(rowToFee);
      c.costAdjustments = (adjRows || []).filter(r => r.client_id === cid).map(rowToAdj);
      c.privateSales = (saleRows || []).filter(r => r.client_id === cid).map(rowToSale);
      c.sales = (outsourcedSaleRows || []).filter(r => r.client_id === cid).map(rowToOutsourcedSale);
      c.dpChecks = allPayments.filter(p => p.clientId === cid && p.context === 'dp');
      c.laborHours = buildLaborHours((laborRows || []).filter(r => r.client_id === cid));
      c.mileageMiles = buildMileageMiles((mileageRows || []).filter(r => r.client_id === cid));
      c.statements = (stmtRows || []).filter(r => r.client_id === cid).map(rowToStmt);
      return c;
    });

    // Attach inv/stmt payments after clients and invoices are built
    const invoices = (invoiceRows || []).map(rowToInvoice);
    invoices.forEach(inv => {
      inv.checks = allPayments.filter(p => p.context === 'inv' && p.refId === inv.id);
    });
    clients.forEach(c => {
      (c.statements || []).forEach(st => {
        st.checks = allPayments.filter(p => p.context === 'stmt' && p.refId === st.id);
      });
    });

    const { settings, nextCN, nextEmpId, nextTaskId } = settingsRow
      ? rowToSettings(settingsRow)
      : { settings: {}, nextCN: 1, nextEmpId: 2, nextTaskId: 1 };

    return {
      clients,
      employees: (empRows || []).map(rowToEmp),
      tasks: (taskRows || []).map(rowToTask),
      taskLists: (taskListRows || []).map(rowToTaskList),
      invoices,
      documents: (docRows || []).map(rowToDoc),
      accounts: {
        bankBalance: accountsRow?.bank_balance ?? 0,
        bankBalanceDate: accountsRow?.bank_balance_date ?? '',
        manualEntries: (entryRows || []).map(rowToEntry),
        nextManualId: (Math.max(0, ...(entryRows || []).map(r => r.id)) + 1),
      },
      settings,
      nextCN,
      nextEmpId,
      nextTaskId,
    };
  }

  // ── Check whether Supabase has any data ───────────────────────────────────
  async function isEmpty() {
    _check();
    const { count } = await _sb.from('clients').select('id', { count: 'exact', head: true });
    return (count || 0) === 0;
  }

  // ── Clients ───────────────────────────────────────────────────────────────
  const _clientWriteAt = {};
  let _lastClientErr = '';
  function wroteClientRecently(id, ms = 10000) {
    return Date.now() - (_clientWriteAt[id] || 0) < ms;
  }
  async function upsertClient(c) {
    if (!_sb) return;
    _clientWriteAt[c.id] = Date.now();
    const { error } = await _sb.from('clients').upsert(clientToRow(c));
    if (error) {
      console.error('upsertClient:', error.message);
      // Don't fail silently — an unsaved client (e.g. status) reverts on the next reload
      if (error.message !== _lastClientErr && typeof alert === 'function') {
        _lastClientErr = error.message;
        alert('A client change could NOT be saved to the database and will be lost on reload.\n\nError: ' + error.message);
      }
    }
  }

  async function deleteClient(id) {
    if (!_sb) return;
    const { error } = await _sb.from('clients').delete().eq('id', id);
    if (error) console.error('deleteClient:', error.message);
  }

  // ── Fees ─────────────────────────────────────────────────────────────────
  async function upsertFee(clientId, fee) {
    if (!_sb) return;
    const { error } = await _sb.from('fees').upsert(feeToRow(clientId, fee));
    if (error) console.error('upsertFee:', error.message);
  }

  async function deleteFee(id) {
    if (!_sb) return;
    const { error } = await _sb.from('fees').delete().eq('id', id);
    if (error) console.error('deleteFee:', error.message);
  }

  // ── Cost Adjustments ─────────────────────────────────────────────────────
  async function upsertAdj(clientId, adj) {
    if (!_sb) return;
    const { error } = await _sb.from('cost_adjustments').upsert(adjToRow(clientId, adj));
    if (error) console.error('upsertAdj:', error.message);
  }

  async function deleteAdj(id) {
    if (!_sb) return;
    const { error } = await _sb.from('cost_adjustments').delete().eq('id', id);
    if (error) console.error('deleteAdj:', error.message);
  }

  // ── Private Sales ─────────────────────────────────────────────────────────
  async function upsertSale(clientId, sale) {
    if (!_sb) return;
    const { error } = await _sb.from('private_sales').upsert(saleToRow(clientId, sale));
    if (error) console.error('upsertSale:', error.message);
  }

  async function deleteSale(id) {
    if (!_sb) return;
    const { error } = await _sb.from('private_sales').delete().eq('id', id);
    if (error) console.error('deleteSale:', error.message);
  }

  // ── Outsourced Sales ──────────────────────────────────────────────────────
  async function upsertOutsourcedSale(clientId, sale) {
    if (!_sb) return;
    const { error } = await _sb.from('outsourced_sales').upsert(outsourcedSaleToRow(clientId, sale));
    if (error) console.error('upsertOutsourcedSale:', error.message);
  }

  async function deleteOutsourcedSale(id) {
    if (!_sb) return;
    const { error } = await _sb.from('outsourced_sales').delete().eq('id', id);
    if (error) console.error('deleteOutsourcedSale:', error.message);
  }

  // ── DP Checks ────────────────────────────────────────────────────────────
  async function upsertDpCheck(clientId, ck) {
    if (!_sb) return;
    const { error } = await _sb.from('dp_checks').upsert(dpCheckToRow(clientId, ck));
    if (error) console.error('upsertDpCheck:', error.message);
  }

  async function deleteDpCheck(id) {
    if (!_sb) return;
    const { error } = await _sb.from('dp_checks').delete().eq('id', id);
    if (error) console.error('deleteDpCheck:', error.message);
  }

  // ── Payments ─────────────────────────────────────────────────────────────
  async function upsertPayment(p) {
    if (!_sb) return null;
    const row = paymentToRow(p);
    if (!row.id) delete row.id;
    const { data, error } = await _sb.from('payments').upsert(row).select('id').single();
    if (error) { console.error('upsertPayment:', error.message); p._saveError = error.message; return null; }
    delete p._saveError;
    if (data?.id && !p.id) p.id = data.id;
    return p.id;
  }

  async function deletePayment(id) {
    if (!_sb) return;
    const { error } = await _sb.from('payments').delete().eq('id', id);
    if (error) console.error('deletePayment:', error.message);
  }

  // ── Labor ────────────────────────────────────────────────────────────────
  async function upsertLaborEntry(clientId, snapId, date, reg, cons) {
    if (!_sb) return;
    const { error } = await _sb.from('labor_entries').upsert({ client_id: clientId, snap_id: snapId, date, reg, cons });
    if (error) console.error('upsertLaborEntry:', error.message);
  }

  async function deleteLaborEntriesForClient(clientId) {
    if (!_sb) return;
    await _sb.from('labor_entries').delete().eq('client_id', clientId);
  }

  // ── Mileage ──────────────────────────────────────────────────────────────
  async function upsertMileageEntry(clientId, date, miles) {
    if (!_sb) return;
    const { error } = await _sb.from('mileage_entries').upsert({ client_id: clientId, date, miles });
    if (error) console.error('upsertMileageEntry:', error.message);
  }

  // ── Employees ────────────────────────────────────────────────────────────
  async function upsertEmployee(emp) {
    if (!_sb) return;
    const { error } = await _sb.from('employees').upsert(empToRow(emp));
    if (error) console.error('upsertEmployee:', error.message);
  }

  async function deleteEmployee(id) {
    if (!_sb) return;
    const { error } = await _sb.from('employees').delete().eq('id', id);
    if (error) console.error('deleteEmployee:', error.message);
  }

  // ── Tasks ────────────────────────────────────────────────────────────────
  async function upsertTask(task) {
    if (!_sb) return;
    const { error } = await _sb.from('tasks').upsert(taskToRow(task));
    if (error) console.error('upsertTask:', error.message);
  }

  async function deleteTask(id) {
    if (!_sb) return;
    const { error } = await _sb.from('tasks').delete().eq('id', id);
    if (error) console.error('deleteTask:', error.message);
  }

  // ── Task Lists ────────────────────────────────────────────────────────────
  async function upsertTaskList(list) {
    if (!_sb) return;
    const { error } = await _sb.from('task_lists').upsert(taskListToRow(list));
    if (error) console.error('upsertTaskList:', error.message);
  }

  async function deleteTaskList(id) {
    if (!_sb) return;
    const { error } = await _sb.from('task_lists').delete().eq('id', id);
    if (error) console.error('deleteTaskList:', error.message);
  }

  // ── Invoices ─────────────────────────────────────────────────────────────
  async function upsertInvoice(inv) {
    if (!_sb) return;
    const { error } = await _sb.from('invoices').upsert(invoiceToRow(inv));
    if (error) console.error('upsertInvoice:', error.message);
  }

  async function deleteInvoice(id) {
    if (!_sb) return;
    const { error } = await _sb.from('invoices').delete().eq('id', id);
    if (error) console.error('deleteInvoice:', error.message);
  }

  // ── Statements ───────────────────────────────────────────────────────────
  async function upsertStatement(clientId, stmt) {
    if (!_sb) return;
    const { error } = await _sb.from('statements').upsert(stmtToRow(clientId, stmt));
    if (error) console.error('upsertStatement:', error.message);
  }

  async function deleteStatement(id) {
    if (!_sb) return;
    const { error } = await _sb.from('statements').delete().eq('id', id);
    if (error) console.error('deleteStatement:', error.message);
  }

  // ── Documents ────────────────────────────────────────────────────────────
  async function upsertDocument(doc) {
    if (!_sb) return;
    const { error } = await _sb.from('documents').upsert(docToRow(doc));
    if (error) console.error('upsertDocument:', error.message);
  }

  async function deleteDocument(id) {
    if (!_sb) return;
    const { error } = await _sb.from('documents').delete().eq('id', id);
    if (error) console.error('deleteDocument:', error.message);
  }

  // ── Manual Entries (Accounts) ─────────────────────────────────────────────
  async function upsertManualEntry(entry) {
    if (!_sb) return;
    const { error } = await _sb.from('manual_entries').upsert(entryToRow(entry));
    if (error) console.error('upsertManualEntry:', error.message);
  }

  async function deleteManualEntry(id) {
    if (!_sb) return;
    const { error } = await _sb.from('manual_entries').delete().eq('id', id);
    if (error) console.error('deleteManualEntry:', error.message);
  }

  async function saveAccounts(bankBalance, bankBalanceDate) {
    if (!_sb) return;
    const { error } = await _sb.from('accounts').upsert({ id: 1, bank_balance: bankBalance, bank_balance_date: bankBalanceDate });
    if (error) console.error('saveAccounts:', error.message);
  }

  // ── Settings ─────────────────────────────────────────────────────────────
  async function saveSettings(settings, meta) {
    if (!_sb) return;
    const { error } = await _sb.from('settings').upsert(settingsToRow(settings, meta));
    if (error) console.error('saveSettings:', error.message);
  }

  // ── Bulk import (migration from local JSON) ───────────────────────────────
  async function importFromState(S) {
    _check();
    const show = msg => { const el = document.getElementById('sb_import_status'); if (el) el.textContent = msg; };

    show('Importing settings…');
    await saveSettings(S.settings, { nextCN: S.nextCN, nextEmpId: S.nextEmpId, nextTaskId: S.nextTaskId });
    if (accountsRow_) {
      await saveAccounts(S.accounts.bankBalance, S.accounts.bankBalanceDate);
    } else {
      await _sb.from('accounts').upsert({ id: 1, bank_balance: S.accounts?.bankBalance || 0, bank_balance_date: S.accounts?.bankBalanceDate || '' });
    }

    show('Importing employees…');
    for (const e of (S.employees || [])) await upsertEmployee(e);

    show('Importing clients…');
    for (const c of (S.clients || [])) {
      await upsertClient(c);
      for (const f of (c.fees || [])) await upsertFee(c.id, f);
      for (const a of (c.costAdjustments || [])) await upsertAdj(c.id, a);
      for (const s of (c.privateSales || [])) await upsertSale(c.id, s);
      for (const ck of (c.dpChecks || [])) await upsertPayment({ ...ck, clientId: c.id, context: 'dp', method: ck.method || 'check', refId: null });
      for (const st of (c.statements || [])) {
        await upsertStatement(c.id, st);
        for (const ck of (st.checks || [])) await upsertPayment({ ...ck, clientId: c.id, context: 'stmt', method: ck.method || 'check', refId: st.id });
      }
      // Labor hours
      for (const [snapId, dates] of Object.entries(c.laborHours || {})) {
        for (const [date, val] of Object.entries(dates || {})) {
          const reg = +(val?.reg ?? val ?? 0);
          const cons = +(val?.cons ?? 0);
          await upsertLaborEntry(c.id, snapId, date, reg, cons);
        }
      }
      // Mileage
      for (const [date, miles] of Object.entries(c.mileageMiles || {})) {
        await upsertMileageEntry(c.id, date, +miles || 0);
      }
    }

    show('Importing tasks…');
    for (const t of (S.tasks || [])) await upsertTask(t);

    show('Importing invoices…');
    for (const inv of (S.invoices || [])) await upsertInvoice(inv);

    show('Importing documents…');
    for (const doc of (S.documents || [])) await upsertDocument(doc);

    show('Importing account entries…');
    for (const e of (S.accounts?.manualEntries || [])) await upsertManualEntry(e);

    show('Done!');
  }

  // Placeholder to avoid ReferenceError inside importFromState
  let accountsRow_ = null;

  // ── Realtime ──────────────────────────────────────────────────────────────
  function subscribeToChanges(onEvent) {
    _autoInit(); if (!_sb) return;
    if (_realtimeChannel) { try { _sb.removeChannel(_realtimeChannel); } catch(_){} _realtimeChannel = null; }
    const tables = ['clients','employees','tasks','task_lists','invoices','statements',
      'fees','cost_adjustments','private_sales','outsourced_sales','payments',
      'labor_entries','mileage_entries','documents','manual_entries','settings','accounts'];
    _realtimeChannel = _sb.channel('db-changes');
    tables.forEach(t => {
      _realtimeChannel.on('postgres_changes', { event: '*', schema: 'public', table: t },
        p => onEvent(t, p.eventType, p.new, p.old));
    });
    _realtimeChannel.subscribe();
  }

  function startPresence(userName, onSync) {
    _autoInit(); if (!_sb) return;
    _presenceUserName = userName || 'User';
    if (_presenceChannel) { try { _sb.removeChannel(_presenceChannel); } catch(_){} _presenceChannel = null; }
    _presenceChannel = _sb.channel('user-presence', { config: { presence: { key: _sessionId } } });
    _presenceChannel
      .on('presence', { event: 'sync' }, () => onSync(_presenceChannel.presenceState()))
      .on('presence', { event: 'leave' }, () => onSync(_presenceChannel.presenceState()))
      .subscribe(async status => {
        if (status === 'SUBSCRIBED') {
          await _presenceChannel.track({ userName: _presenceUserName, clientId: null, sessionId: _sessionId });
        }
      });
  }

  function updatePresence(clientId) {
    if (!_presenceChannel) return;
    _presenceChannel.track({ userName: _presenceUserName, clientId: clientId ?? null, sessionId: _sessionId }).catch(() => {});
  }

  function fromRowForTable(table, row) {
    if (!row || !Object.keys(row).length) return null;
    switch(table) {
      case 'clients':        return rowToClient(row);
      case 'employees':      return rowToEmp(row);
      case 'tasks':          return rowToTask(row);
      case 'task_lists':     return rowToTaskList(row);
      case 'invoices':       return rowToInvoice(row);
      case 'statements':     return rowToStmt(row);
      case 'fees':           return Object.assign(rowToFee(row), { _clientId: row.client_id });
      case 'cost_adjustments': return Object.assign(rowToAdj(row), { _clientId: row.client_id });
      case 'private_sales':    return Object.assign(rowToSale(row), { _clientId: row.client_id });
      case 'outsourced_sales': return Object.assign(rowToOutsourcedSale(row), { _clientId: row.client_id });
      case 'dp_checks':      return Object.assign(rowToDpCheck(row), { _clientId: row.client_id });
      case 'payments':       return rowToPayment(row);
      case 'labor_entries':  return { clientId: row.client_id, snapId: row.snap_id, date: row.date, reg: row.reg, cons: row.cons };
      case 'mileage_entries': return { clientId: row.client_id, date: row.date, miles: row.miles };
      case 'documents':      return rowToDoc(row);
      case 'manual_entries': return rowToEntry(row);
      case 'settings':       return rowToSettings(row);
      case 'accounts':       return { bankBalance: row.bank_balance, bankBalanceDate: row.bank_balance_date };
      default:               return row;
    }
  }

  // ── Leads (own table; independent of everything above) ───────────────────
  function rowToLead(row) {
    return {
      id: row.id,
      name: row.name || '',
      address: row.address || '',
      phone: row.phone || '',
      email: row.email || '',
      nextTask: row.next_task || '',
      notes: row.notes || '',
      active: row.active !== false,
      status: row.status || 'lead',
      clientId: row.client_id ?? null,
    };
  }
  function leadToRow(l) {
    return {
      id: l.id,
      name: l.name || '',
      address: l.address || '',
      phone: l.phone || '',
      email: l.email || '',
      next_task: l.nextTask || '',
      notes: l.notes || '',
      active: l.active !== false,
      status: l.status || 'lead',
      client_id: l.clientId ?? null,
      updated_at: new Date().toISOString(),
    };
  }
  // Failure here must never affect the rest of the app: log and return an empty list.
  async function loadLeads() {
    _autoInit(); if (!_sb) return [];
    const { data, error } = await _sb.from('leads').select('*').eq('archived', false).order('id');
    if (error) { console.warn('loadLeads:', error.message); return []; }
    return (data || []).map(rowToLead);
  }
  // Unlike the older upserts, these THROW so callers (conversion) can stop on failure.
  async function upsertLead(l) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('leads').upsert(leadToRow(l));
    if (error) throw new Error(error.message);
  }
  async function deleteLead(id) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('leads').delete().eq('id', id);
    if (error) throw new Error(error.message);
  }
  // Used by lead conversion to confirm a row was really written before the lead is removed.
  async function rowExists(table, id) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { data, error } = await _sb.from(table).select('id').eq('id', id).limit(1);
    if (error) throw new Error(error.message);
    return (data || []).length === 1;
  }
  // Own channel, so leads can never interfere with the main realtime subscription.
  let _leadsChannel = null;
  function subscribeToLeads(onEvent) {
    _autoInit(); if (!_sb) return;
    if (_leadsChannel) { try { _sb.removeChannel(_leadsChannel); } catch(_){} _leadsChannel = null; }
    _leadsChannel = _sb.channel('leads-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' },
        p => onEvent(p.eventType, p.new, p.old))
      .subscribe();
  }

  // ── Daily mileage log (written by the mobile app; the desktop only reads it) ──
  function _parseAllocs(v) {
    return Array.isArray(v) ? v.map(a => ({ clientId: String(a.clientId), miles: Number(a.miles) || 0 })) : [];
  }
  function rowToMileageDay(row) {
    return {
      date: String(row.date),
      odometerStart: row.odometer_start != null ? Number(row.odometer_start) : null,
      odometerEnd: row.odometer_end != null ? Number(row.odometer_end) : null,
      totalMiles: Number(row.total_miles) || 0,
      status: row.status === 'submitted' ? 'submitted' : 'draft',
      tripActive: row.trip_active === true,
      allocations: _parseAllocs(row.allocations),
      submittedAllocations: _parseAllocs(row.submitted_allocations),
      generalPurpose: String(row.general_purpose ?? ''),
    };
  }
  // Failure (e.g. migration not run yet) must never affect the rest of the app: return null so the page can say so.
  async function loadMileageDays() {
    _autoInit(); if (!_sb) return null;
    const { data, error } = await _sb.from('mileage_days').select('*').order('date', { ascending: false });
    if (error) { console.warn('loadMileageDays:', error.message); return null; }
    return (data || []).map(rowToMileageDay);
  }
  // Writes below THROW on failure so a half-finished submit is never reported as saved.
  // They mirror what the mobile app's submit does (same tables, same shapes).
  async function upsertMileageEntryStrict(clientId, date, miles) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('mileage_entries').upsert({ client_id: clientId, date, miles });
    if (error) throw new Error(error.message);
  }
  async function replaceGeneralMileage(date, miles, purpose) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const del = await _sb.from('general_mileage').delete().eq('date', date);
    if (del.error) throw new Error(del.error.message);
    if (miles > 0) {
      const ins = await _sb.from('general_mileage').insert({
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
        date, miles, purpose, updated_at: new Date().toISOString(),
      });
      if (ins.error) throw new Error(ins.error.message);
    }
  }
  async function saveMileageDay(d) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('mileage_days').upsert({
      date: d.date,
      odometer_start: d.odometerStart,
      odometer_end: d.odometerEnd,
      total_miles: d.totalMiles,
      status: d.status,
      trip_active: false,
      allocations: d.allocations,
      submitted_allocations: d.submittedAllocations,
      general_purpose: d.generalPurpose,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }
  async function deleteMileageDay(date) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('mileage_days').delete().eq('date', date);
    if (error) throw new Error(error.message);
  }
  // ── Daily labor log (written by the mobile app; same approach as mileage above) ──
  function _parseHourAllocs(v) {
    return Array.isArray(v) ? v.map(a => ({ clientId: String(a.clientId), hours: Number(a.hours) || 0 })) : [];
  }
  function rowToLaborDay(row) {
    return {
      date: String(row.date),
      employeeId: String(row.employee_id),
      hours: Number(row.hours) || 0,
      status: row.status === 'submitted' ? 'submitted' : 'draft',
      allocations: _parseHourAllocs(row.allocations),
      submittedAllocations: _parseHourAllocs(row.submitted_allocations),
      generalPurpose: String(row.general_purpose ?? ''),
    };
  }
  // Returns null on failure (e.g. migration not run) so the page can say so without affecting the app.
  async function loadLaborDays() {
    _autoInit(); if (!_sb) return null;
    const { data, error } = await _sb.from('labor_days').select('*').order('date', { ascending: false });
    if (error) { console.warn('loadLaborDays:', error.message); return null; }
    return (data || []).map(rowToLaborDay);
  }
  async function upsertLaborEntryStrict(clientId, snapId, date, reg, cons) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('labor_entries').upsert({ client_id: clientId, snap_id: String(snapId), date, reg, cons });
    if (error) throw new Error(error.message);
  }
  async function replaceGeneralLabor(date, employeeId, hours, rate, purpose) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const del = await _sb.from('general_labor').delete().eq('date', date).eq('employee_id', employeeId);
    if (del.error) throw new Error(del.error.message);
    if (hours > 0) {
      const ins = await _sb.from('general_labor').insert({
        id: Date.now() * 1000 + Math.floor(Math.random() * 1000),
        date, employee_id: employeeId, hours, rate, purpose, updated_at: new Date().toISOString(),
      });
      if (ins.error) throw new Error(ins.error.message);
    }
  }
  async function saveLaborDay(d) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('labor_days').upsert({
      date: d.date,
      employee_id: d.employeeId,
      hours: d.hours,
      status: d.status,
      allocations: d.allocations,
      submitted_allocations: d.submittedAllocations,
      general_purpose: d.generalPurpose,
      submitted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (error) throw new Error(error.message);
  }
  async function deleteLaborDay(date, employeeId) {
    _autoInit(); if (!_sb) throw new Error('Not connected');
    const { error } = await _sb.from('labor_days').delete().eq('date', date).eq('employee_id', employeeId);
    if (error) throw new Error(error.message);
  }
  let _laborLogChannel = null;
  function subscribeToLaborLog(onEvent) {
    _autoInit(); if (!_sb) return;
    if (_laborLogChannel) { try { _sb.removeChannel(_laborLogChannel); } catch(_){} _laborLogChannel = null; }
    _laborLogChannel = _sb.channel('labor-log-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'labor_days' }, () => onEvent())
      .subscribe();
  }

  // Own channel, same reasoning as leads.
  let _mileageLogChannel = null;
  function subscribeToMileageLog(onEvent) {
    _autoInit(); if (!_sb) return;
    if (_mileageLogChannel) { try { _sb.removeChannel(_mileageLogChannel); } catch(_){} _mileageLogChannel = null; }
    _mileageLogChannel = _sb.channel('mileage-log-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mileage_days' }, () => onEvent())
      .subscribe();
  }

  return {
    loadLaborDays,
    subscribeToLaborLog,
    upsertLaborEntryStrict,
    replaceGeneralLabor,
    saveLaborDay,
    deleteLaborDay,
    loadMileageDays,
    subscribeToMileageLog,
    upsertMileageEntryStrict,
    replaceGeneralMileage,
    saveMileageDay,
    deleteMileageDay,
    rowToLead,
    loadLeads,
    upsertLead,
    deleteLead,
    rowExists,
    subscribeToLeads,
    wroteClientRecently,
    init,
    isReady,
    loadAll,
    isEmpty,
    importFromState,
    upsertClient,
    deleteClient,
    upsertFee,
    deleteFee,
    upsertAdj,
    deleteAdj,
    upsertSale,
    deleteSale,
    upsertOutsourcedSale,
    deleteOutsourcedSale,
    upsertDpCheck,
    deleteDpCheck,
    upsertPayment,
    deletePayment,
    upsertLaborEntry,
    deleteLaborEntriesForClient,
    upsertMileageEntry,
    upsertEmployee,
    deleteEmployee,
    upsertTask,
    deleteTask,
    upsertTaskList,
    deleteTaskList,
    upsertInvoice,
    deleteInvoice,
    upsertStatement,
    deleteStatement,
    upsertDocument,
    deleteDocument,
    upsertManualEntry,
    deleteManualEntry,
    saveAccounts,
    saveSettings,
    subscribeToChanges,
    startPresence,
    updatePresence,
    fromRowForTable,
    sessionId: _sessionId,
  };
})();
