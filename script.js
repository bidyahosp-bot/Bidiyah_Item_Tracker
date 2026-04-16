```javascript
// ================== CONFIG ==================
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec";

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
    .replaceAll(">","&gt;");
}

// ================== API ==================
async function apiRequest(action, payload){
  const res = await fetch(APP_SCRIPT_URL,{
    method:"POST",
    body: JSON.stringify({action,payload})
  });

  const text = await res.text();
  const data = JSON.parse(text);

  if(!data.ok) throw new Error("Error");
  return data;
}

// ================== DATA ==================
async function loadLogs(){
  const data = await apiRequest("usage_list",{});
  return data.logs || [];
}

async function saveLogs(logs){
  await apiRequest("usage_replace_all",{logs});
}

// ================== ACTIONS ==================
async function deleteLog(id){
  if(!confirm("حذف السجل؟")) return;

  let logs = await loadLogs();
  logs = logs.filter(l=>l.id !== id);

  await saveLogs(logs);
  refreshUI();
}

async function editLog(id){
  const logs = await loadLogs();
  const log = logs.find(l=>l.id===id);

  el("staff").value = log.staff;
  el("shift").value = log.shift;
  el("department").value = log.department;
  el("signedBy").value = log.signedBy;

  logs.splice(logs.indexOf(log),1);
  await saveLogs(logs);

  alert("تم تحميل للتعديل");
}

// ================== ITEMS ==================
function renderItemsGrid(){
  const grid = el("itemsGrid");
  grid.innerHTML = "";

  ITEMS.forEach(name=>{
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

// ================== FORM ==================
function buildLog(){
  const selected = [];

  document.querySelectorAll(".item-check:checked").forEach(cb=>{
    const name = cb.dataset.name;
    const qty = document.querySelector(`[data-qty="${CSS.escape(name)}"]`).value;
    selected.push({item:name, qty: qty||""});
  });

  return {
    id: makeId(),
    staff: el("staff").value,
    shift: el("shift").value,
    department: el("department").value,
    signedBy: el("signedBy").value,
    items: selected,
    datetime: new Date().toLocaleString(),
    iso: nowISO()
  };
}

// ================== TABLE ==================
function renderRecent(logs){
  const table = el("recentTable");

  table.innerHTML = `
  <tr>
    <th>Staff</th>
    <th>Shift</th>
    <th>Dept</th>
    <th>Items</th>
    <th>Date</th>
  </tr>`;

  logs.slice(-10).reverse().forEach(l=>{
    const tr = document.createElement("tr");

    const items = l.items.map(x=>x.qty?`${x.item}(${x.qty})`:x.item).join(",");

    tr.innerHTML = `
      <td>${l.staff}</td>
      <td>${l.shift}</td>
      <td>${l.department}</td>
      <td>${items}</td>
      <td>${l.datetime}</td>
    `;

    table.appendChild(tr);
  });
}

// ================== SAVE ==================
async function onSave(){
  const log = buildLog();

  const logs = await loadLogs();
  logs.push(log);

  await saveLogs(logs);

  alert("تم الحفظ");
  refreshUI();
}

// ================== INIT ==================
async function refreshUI(){
  const logs = await loadLogs();
  renderRecent(logs);
}

document.addEventListener("DOMContentLoaded",()=>{
  renderItemsGrid();

  el("btnSave").onclick = onSave;
  el("btnRefresh").onclick = refreshUI;

  refreshUI();
});
```
