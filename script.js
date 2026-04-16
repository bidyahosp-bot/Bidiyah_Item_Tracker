```javascript
// ================== CONFIG ==================
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec";

const STORAGE_LOGS = "item_tracker_logs_v1";
const STORAGE_QUEUE = "item_tracker_queue_v1";

// ================== ITEMS ==================
const ITEMS = [
  "Suturing Set","Dressing Set","Ear Wash","Mosquito Forceps",
  "(Dm) dreesing set ARTERY","G.TRY","TOOTH FORCEPS","MOSQUITO FORCEPS",
  "SPECULUM","COS-COS","ING TRY","SPONGE-HOLDER","SCISSORS",
  "HOLE REMOVEL SCISSOR","AMPO BAG NEEDLE HOLDER","MOTHER DRAPE",
  "BABY DRAPE","LMA","I UCO REMOVEL","BWOL","FACE MASK",
  "HOLE TWOL","SUCTION TUBE","Ormerod aural Forceps","Skin Hook",
];

// ================== HELPERS ==================
function el(id){ return document.getElementById(id); }

function safeParse(json, fallback){
  try { return JSON.parse(json) ?? fallback; } catch { return fallback; }
}

function makeId(){
  return Date.now() + "_" + Math.random().toString(16).slice(2);
}

function nowISO(){
  return new Date().toISOString();
}

function escapeHtml(str){
  return String(str)
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}

// ================== API ==================
async function apiRequest(action, payload){
  const res = await fetch(APP_SCRIPT_URL,{
    method:"POST",
    body: JSON.stringify({action,payload})
  });

  const text = await res.text();
  let data;
  try{ data = JSON.parse(text);}catch{}

  if(!res.ok || !data || data.ok !== true){
    throw new Error("Server error");
  }
  return data;
}

// ================== DATA ==================
async function loadLogs(){
  if(APP_SCRIPT_URL){
    const data = await apiRequest("usage_list",{});
    return data.logs || [];
  }
  return safeParse(localStorage.getItem(STORAGE_LOGS),[]);
}

async function saveLogsReplaceAll(logs){
  if(APP_SCRIPT_URL){
    await apiRequest("usage_replace_all",{logs});
    return;
  }
  localStorage.setItem(STORAGE_LOGS, JSON.stringify(logs));
}

// ================== ACTIONS ==================
async function deleteLog(id){
  if(!confirm("هل تريد حذف السجل؟")) return;

  let logs = await loadLogs();
  logs = logs.filter(l => l.id !== id);

  await saveLogsReplaceAll(logs);
  await refreshUI();
}

async function editLog(id){
  const logs = await loadLogs();
  const log = logs.find(l => l.id === id);

  if(!log) return;

  el("staff").value = log.staff;
  el("shift").value = log.shift;
  el("department").value = log.department;
  el("signedBy").value = log.signedBy;

  // حذف القديم
  const newLogs = logs.filter(l => l.id !== id);
  await saveLogsReplaceAll(newLogs);

  alert("تم تحميل البيانات للتعديل - اضغط حفظ");
}

// ================== FORM ==================
function buildLogFromForm(){
  const staff = el("staff").value.trim();
  if(!staff) throw new Error("Enter staff");

  const selected = [];

  document.querySelectorAll(".item-check:checked").forEach(cb=>{
    const name = cb.dataset.name;
    const qty = document.querySelector(`[data-qty="${CSS.escape(name)}"]`).value;
    selected.push({item:name, qty: qty?Number(qty):""});
  });

  if(selected.length === 0) throw new Error("اختر عنصر واحد على الأقل");

  return {
    id: makeId(),
    staff,
    shift: el("shift").value,
    department: el("department").value,
    signedBy: el("signedBy").value,
    items: selected,
    datetime: new Date().toLocaleString(),
    iso: nowISO()
  };
}

function resetForm(){
  el("staff").value="";
  el("shift").value="Morning";
  el("department").value="OPD";
  el("signedBy").value="Sender";

  document.querySelectorAll(".item-check").forEach(i=>i.checked=false);
  document.querySelectorAll("[data-qty]").forEach(i=>i.value="");
}
function renderItemsGrid() {
  const grid = el("itemsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  ITEMS.forEach((name) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <label>
        <input type="checkbox" class="item-check" data-name="${name}">
        ${name}
      </label>
      <input type="number" data-qty="${name}" placeholder="Qty">
    `;

    grid.appendChild(div);
  });
}
// ================== TABLE ==================

function renderLogTable(logs){
  const table = el("logTable");
  if(!table) return;

  table.innerHTML = `
  <tr>
    <th>Staff</th>
    <th>Shift</th>
    <th>Department</th>
    <th>Signed By</th>
    <th>Items</th>
    <th>Date</th>
    <th>Actions</th>
  </tr>`;

  logs.sort((a,b)=> b.iso.localeCompare(a.iso));

  logs.forEach(l=>{
    const tr = document.createElement("tr");

    const items = l.items.map(x=> x.qty? `${x.item} (${x.qty})`:x.item).join(", ");

    tr.innerHTML = `
    <td>${escapeHtml(l.staff)}</td>
    <td>${escapeHtml(l.shift)}</td>
    <td>${escapeHtml(l.department)}</td>
    <td>${escapeHtml(l.signedBy)}</td>
    <td>${escapeHtml(items)}</td>
    <td>${escapeHtml(l.datetime)}</td>
    <td>
      <button onclick="editLog('${l.id}')">✏️</button>
      <button onclick="deleteLog('${l.id}')">🗑️</button>
    </td>
    `;

    table.appendChild(tr);
  });
}

// ================== SAVE ==================
async function onSave(){
  try{
    const log = buildLogFromForm();

    const logs = await loadLogs();
    logs.push(log);

    await saveLogsReplaceAll(logs);

    alert("تم الحفظ");
    resetForm();
    refreshUI();

  }catch(e){
    alert(e.message);
  }
}

// ================== INIT ==================
async function refreshUI(){
  const logs = await loadLogs();
  renderLogTable(logs);
}

document.addEventListener("DOMContentLoaded",()=>{

  renderItemsGrid();
  
  el("btnSave")?.addEventListener("click", onSave);
  el("btnReset")?.addEventListener("click", resetForm);
  el("btnRefresh")?.addEventListener("click", refreshUI);

  refreshUI();
});
```
