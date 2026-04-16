// Bidiyah Hospital - Item Tracker (Shared Google Sheet Backend)
// ------------------------------------------------------------
// 1) Put your Apps Script Web App URL (ends with /exec) below.
// 2) If APP_SCRIPT_URL is empty, app falls back to localStorage (single device).
// 3) Also supports offline queue: if saving fails, it queues locally and retries on refresh.
// ------------------------------------------------------------

const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec"; // <-- PASTE /exec URL HERE
const STORAGE_LOGS = "item_tracker_logs_v1";
const STORAGE_QUEUE = "item_tracker_queue_v1";

// Items list (edit here if you want to add/remove items)
const ITEMS = [
  "Suturing Set",
  "Dressing Set",
  "Ear Wash",
  "Mosquito Forceps",
  "(Dm) dreesing set ARTERY",
  "G.TRY",
  "TOOTH FORCEPS",
  "MOSQUITO FORCEPS",
  "SPECULUM",
  "COS-COS",
  "ING TRY",
  "SPONGE-HOLDER",
  "SCISSORS",
  "HOLE REMOVEL SCISSOR",
  "AMPO BAG NEEDLE HOLDER",
  "MOTHER DRAPE",
  "BABY DRAPE",
  "LMA",
  "I UCO REMOVEL",
  "BWOL",
  "FACE MASK",
  "HOLE TWOL",
  "SUCTION TUBE",
  "Ormerod aural Forceps",
  "Skin Hook",
];

function safeParse(json, fallback) {
  try { const v = JSON.parse(json); return v ?? fallback; } catch { return fallback; }
}

function nowISO() {
  return new Date().toISOString();
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

async function apiRequest(action, payload) {
  if (!APP_SCRIPT_URL) throw new Error("APP_SCRIPT_URL is not set");

  const res = await fetch(APP_SCRIPT_URL, {
    method: "POST",
    // no headers to reduce CORS preflight risk
    body: JSON.stringify({ action, payload }),
  });

  const text = await res.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}

  if (!res.ok || !data || data.ok !== true) {
    const msg = (data && data.error) ? data.error : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ---------- Data layer ----------
async function loadLogs() {
  if (APP_SCRIPT_URL) {
    const data = await apiRequest("usage_list", {});
    return Array.isArray(data.logs) ? data.logs : [];
  }
  return safeParse(localStorage.getItem(STORAGE_LOGS), []);
}

async function saveLogsReplaceAll(logs) {
  if (APP_SCRIPT_URL) {
    await apiRequest("usage_replace_all", { logs });
    return;
  }
  localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
}

// Offline queue for append (safer than replace-all)
function getQueue() {
  return safeParse(localStorage.getItem(STORAGE_QUEUE), []);
}
function setQueue(q) {
  localStorage.setItem(STORAGE_QUEUE, JSON.stringify(q));
}

async function tryFlushQueue() {
  if (!APP_SCRIPT_URL) return;
  const q = getQueue();
  if (!q.length) return;

  const keep = [];
  for (const entry of q) {
    try {
      await apiRequest("usage_append", { log: entry });
    } catch (e) {
      keep.push(entry); // keep remaining if failed
    }
  }
  setQueue(keep);
}

// ---------- UI helpers ----------
function el(id) { return document.getElementById(id); }

function renderItemsGrid() {
  const grid = el("itemsGrid");
  if (!grid) return;

  grid.innerHTML = "";
  ITEMS.forEach((name) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-row">
        <label class="item-name">
          <input type="checkbox" class="item-check" data-name="${escapeHtml(name)}" />
          <span>${escapeHtml(name)}</span>
        </label>
        <input type="number" class="qty" min="0" placeholder="Qty" data-qty="${escapeHtml(name)}" />
      </div>
    `;
    grid.appendChild(card);
  });
}

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buildLogFromForm() {
  const staff = (el("staff")?.value || "").trim();
  const shift = (el("shift")?.value || "").trim();
  const department = (el("department")?.value || "").trim();
  const signedBy = (el("signedBy")?.value || "").trim();

  if (!staff) throw new Error("Please enter Staff No & Name.");

  const selected = [];
  document.querySelectorAll(".item-check:checked").forEach((cb) => {
    const name = cb.getAttribute("data-name") || "";
    const qtyInput = document.querySelector(`input[data-qty="${CSS.escape(name)}"]`);
    const qty = qtyInput ? String(qtyInput.value || "").trim() : "";
    selected.push({ item: name, qty: qty ? Number(qty) : "" });
  });

  if (selected.length === 0) throw new Error("Please select at least one item.");

  return {
    id: makeId(),
    staff,
    shift,
    department,
    signedBy,
    items: selected,
    datetime: new Date().toLocaleString(),
    iso: nowISO(),
  };
}

function resetForm() {
  if (el("staff")) el("staff").value = "";
  if (el("shift")) el("shift").value = "Morning";
  if (el("department")) el("department").value = "OPD";
  if (el("signedBy")) el("signedBy").value = "Sender";
  document.querySelectorAll(".item-check").forEach((cb) => (cb.checked = false));
  document.querySelectorAll("input[data-qty]").forEach((i) => (i.value = ""));
}

function renderRecentTable(logs) {
  const table = el("recentTable");
  if (!table) return;

  table.innerHTML = `
    <tr>
      <th>Staff</th>
      <th>Shift</th>
      <th>Department</th>
      <th>Signed By</th>
      <th>Items</th>
      <th>Date & Time</th>
      <th>Actions</th>
    </tr>
  `;

  const recent = [...logs].sort((a,b) => String(b.iso||"").localeCompare(String(a.iso||""))).slice(0, 10);
  recent.forEach((l) => {
    const tr = document.createElement("tr");
    const items = (l.items || []).map(x => x.qty !== "" && x.qty !== null && x.qty !== undefined
      ? `${x.item} (${x.qty})`
      : `${x.item}`
    ).join(", ");
    tr.innerHTML = `
      <td>${escapeHtml(l.staff||"")}</td>
      <td>${escapeHtml(l.shift||"")}</td>
      <td>${escapeHtml(l.department||"")}</td>
      <td>${escapeHtml(l.signedBy||"")}</td>
      <td style="text-align:left">${escapeHtml(items)}</td>
      <td>${escapeHtml(l.datetime||"")}</td>
       <td>
      <button onclick="editLog('${l.id}')">✏️</button>
      <button onclick="deleteLog('${l.id}')">🗑️</button>
    </td>
    `;
    table.appendChild(tr);
  });
}
// ---------- ACTIONS ----------

async function deleteLog(id) {
  if (!confirm("هل تريد حذف هذا السجل؟")) return;

  let logs = await loadLogs();
  logs = logs.filter(l => l.id !== id);

  await saveLogsReplaceAll(logs);
  await refreshUI();
}

async function editLog(id) {
  const logs = await loadLogs();
  const log = logs.find(l => l.id === id);

  if (!log) return alert("Record not found");

  document.getElementById("staff").value = log.staff;
  document.getElementById("shift").value = log.shift;
  document.getElementById("department").value = log.department;
  document.getElementById("signedBy").value = log.signedBy;

  const newLogs = logs.filter(l => l.id !== id);
  await saveLogsReplaceAll(newLogs);

  alert("تم تحميل البيانات للتعديل، قم بالحفظ مرة أخرى");
}
function renderLogTable(logs) {
  const table = el("logTable");
  if (!table) return;

  table.innerHTML = `
    <tr>
      <th>Staff</th>
      <th>Shift</th>
      <th>Department</th>
      <th>Signed By</th>
      <th>Items</th>
      <th>Date & Time</th>
      <th>Actions</th>
    </tr>
  `;
   
  // تعبئة الفورم
  document.getElementById("staff").value = log.staff;
  document.getElementById("shift").value = log.shift;
  document.getElementById("department").value = log.department;
  document.getElementById("signedBy").value = log.signedBy;

  // حذف القديم
  const newLogs = logs.filter(l => l.id !== id);
  await saveLogsReplaceAll(newLogs);

  alert("تم تحميل البيانات للتعديل، قم بالحفظ مرة أخرى");
}
  // Filters
  const dept = (el("filterDept")?.value || "").trim();
  const shift = (el("filterShift")?.value || "").trim();
  const staffQ = (el("filterStaff")?.value || "").trim().toLowerCase();

  const filtered = logs.filter((l) => {
    if (dept && String(l.department||"") !== dept) return false;
    if (shift && String(l.shift||"") !== shift) return false;
    if (staffQ && !String(l.staff||"").toLowerCase().includes(staffQ)) return false;
    return true;
  });

  const sorted = [...filtered].sort((a,b) => String(b.iso||"").localeCompare(String(a.iso||"")));

  sorted.forEach((l) => {
    const tr = document.createElement("tr");
    const items = (l.items || []).map(x => x.qty !== "" && x.qty !== null && x.qty !== undefined
      ? `${x.item} (${x.qty})`
      : `${x.item}`
    ).join(", ");
    tr.innerHTML = `
      <td>${escapeHtml(l.staff||"")}</td>
      <td>${escapeHtml(l.shift||"")}</td>
      <td>${escapeHtml(l.department||"")}</td>
      <td>${escapeHtml(l.signedBy||"")}</td>
      <td style="text-align:left">${escapeHtml(items)}</td>
      <td>${escapeHtml(l.datetime||"")}</td>
      <td>
  <button onclick="editLog('${l.id}')">✏️</button>
  <button onclick="deleteLog('${l.id}')">🗑️</button>
</td>
    `;
    table.appendChild(tr);
  });
}

function fillDeptFilter(logs) {
  const sel = el("filterDept");
  if (!sel) return;
  const depts = Array.from(new Set(logs.map(l => String(l.department||"")).filter(Boolean))).sort();
  sel.innerHTML = '<option value="">All</option>' + depts.map(d => `<option value="${escapeHtml(d)}">${escapeHtml(d)}</option>`).join("");
}

function exportCSV(logs) {
  if (!logs.length) { alert("No records to export."); return; }
  const header = ["Staff","Shift","Department","Signed By","Items","Date & Time"];
  const rows = logs
    .sort((a,b) => String(b.iso||"").localeCompare(String(a.iso||"")))
    .map(l => {
      const items = (l.items || []).map(x => x.qty !== "" && x.qty !== null && x.qty !== undefined
        ? `${x.item} (${x.qty})`
        : `${x.item}`
      ).join("; ");
      return [l.staff||"", l.shift||"", l.department||"", l.signedBy||"", items, l.datetime||""];
    });

  const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replaceAll('"','""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "usage_log.csv";
  link.click();
}

// ---------- Boot ----------
let STATE = { logs: [] };

async function refreshUI() {
  await tryFlushQueue();
  const logs = await loadLogs();
  STATE.logs = Array.isArray(logs) ? logs : [];

  // Register page
  renderRecentTable(STATE.logs);

  // Log page
  fillDeptFilter(STATE.logs);
  renderLogTable(STATE.logs);
}

async function onSave() {
  try {
    const log = buildLogFromForm();

    // Prefer append to backend for safety (no overwriting)
    if (APP_SCRIPT_URL) {
      try {
        await apiRequest("usage_append", { log });
      } catch (e) {
        // queue offline
        const q = getQueue();
        q.push(log);
        setQueue(q);
        alert("Saved locally (offline). It will sync automatically when the network is back.");
        resetForm();
        await refreshUI();
        return;
      }
    } else {
      const logs = await loadLogs();
      logs.push(log);
      await saveLogsReplaceAll(logs);
    }

    alert("Usage recorded successfully!");
    resetForm();
    await refreshUI();
  } catch (e) {
    alert(e.message || String(e));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Build items UI
  renderItemsGrid();

  // Buttons
  el("btnSave")?.addEventListener("click", onSave);
  el("btnReset")?.addEventListener("click", resetForm);
  el("btnRefresh")?.addEventListener("click", refreshUI);

  // Log page actions
  el("btnPrint")?.addEventListener("click", () => window.print());
  el("btnExportCSV")?.addEventListener("click", () => exportCSV(STATE.logs));

  // Filters live update
  el("filterDept")?.addEventListener("change", () => renderLogTable(STATE.logs));
  el("filterShift")?.addEventListener("change", () => renderLogTable(STATE.logs));
  el("filterStaff")?.addEventListener("input", () => renderLogTable(STATE.logs));

  refreshUI().catch((e) => alert(`Load failed: ${e.message || e}`));
});
