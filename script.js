
// ================== CONFIG ==================
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec";

let currentEditId = null;

// ================== ITEMS ==================
const ITEMS = [
"Suturing Set","Dressing Set","Ear Wash","Mosquito Forceps",
"(Dm) dreesing set ARTERY","G.TRY","TOOTH FORCEPS","MOSQUITO FORCEPS",
"SPECULUM","COS-COS","ING TRY","SPONGE-HOLDER","SCISSORS",
"HOLE REMOVEL SCISSOR","AMPO BAG NEEDLE HOLDER","MOTHER DRAPE",
"BABY DRAPE","LMA","IUCD Removal","IUCD SET","DRESSING (com)",
"BWOL","FACE MASK","HOLE TWOL","SUCTION TUBE",
"Ormerod aural Forceps","Skin Hook"
];

// ================== HELPERS ==================
function el(id){ return document.getElementById(id); }

function makeId(){
  return Date.now() + "_" + Math.random().toString(16).slice(2);
}

function nowISO(){
  return new Date().toISOString();
}

// ================== API ==================
async function apiRequest(action, payload){
  const res = await fetch(APP_SCRIPT_URL,{
    method:"POST",
    body: JSON.stringify({action,payload})
  });

  const data = await res.json();
  if(!data.ok) throw new Error("Server error");
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

// ================== ITEMS ==================
function renderItemsGrid(){
  const grid = el("itemsGrid");
  grid.innerHTML = "";

  ITEMS.forEach(name=>{
    const div = document.createElement("div");
    div.className = "item-card";

    div.innerHTML = `
      <div class="item-row">
        <label>
          <input type="checkbox" class="item-check" data-name="${name}">
          ${name}
        </label>
        <input type="number" class="qty" data-qty="${name}" placeholder="Qty">
      </div>
    `;

    grid.appendChild(div);
  });
}

// ================== BUILD ==================
function buildLog(){
  const selected = [];

  document.querySelectorAll(".item-check:checked").forEach(cb=>{
    const name = cb.dataset.name;
    const qty = document.querySelector(`[data-qty="${CSS.escape(name)}"]`).value;
    selected.push({item:name, qty});
  });

  return {
    id: makeId(),
    staff: el("staff").value,
    shift: el("shift").value,
    department: el("department").value,
    signedBy: el("signedBy").value,
    setStatus: (el("setStatus").value || "Not Complete").trim(),
    items: selected,
    datetime: new Date().toLocaleString(),
    iso: nowISO()
  };
}

// ================== TABLE ==================
function renderTable(logs){
  const table = el("recentTable");

  table.innerHTML = `
  <tr>
    <th>Staff</th>
    <th>Shift</th>
    <th>Dept</th>
    <th>Signed</th>
    <th>Status</th>
    <th>Items</th>
    <th>Date</th>
    <th>Actions</th>
  </tr>`;

  logs.slice(-10).reverse().forEach(l=>{
    const tr = document.createElement("tr");

    const items = l.items.map(x=>x.qty?`${x.item}(${x.qty})`:x.item).join(",");

    const status = l.setStatus || "Not Complete";
const color = status === "Complete" ? "green" : "red";

    tr.innerHTML = `
      <td>${l.staff}</td>
      <td>${l.shift}</td>
      <td>${l.department}</td>
      <td>${l.signedBy}</td>
      <td style="color:${color};font-weight:bold">${status}</td>
      <td>${items}</td>
      <td>${l.datetime}</td>
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
  const log = buildLog();

  const logs = await loadLogs();
  logs.push(log);

  await saveLogs(logs);

  alert("Saved");
  refreshUI();
}

// ================== DELETE ==================
async function deleteLog(id){
  if(!confirm("Delete?")) return;

  let logs = await loadLogs();
  logs = logs.filter(l=>l.id!==id);

  await saveLogs(logs);
  refreshUI();
}

// ================== EDIT ==================
async function editLog(id){
  const logs = await loadLogs();
  const log = logs.find(l=>l.id===id);

  currentEditId = id;

  el("editStaff").value = log.staff;
  el("editShift").value = log.shift;
  el("editDepartment").value = log.department;
  el("editSignedBy").value = log.signedBy;
  el("editStatus").value = log.setStatus || "Complete";

  el("editModal").style.display = "block";
}

async function saveEdit(){
  let logs = await loadLogs();

  const oldLog = logs.find(l => l.id === currentEditId);

  logs = logs.filter(l => l.id !== currentEditId);

  const newLog = {
    id: makeId(),
    staff: el("editStaff").value,
    shift: el("editShift").value,
    department: el("editDepartment").value,
    signedBy: el("editSignedBy").value,
    setStatus: (el("editStatus").value || "Not Complete").trim(),

    // ✅ يحافظ على الأدوات
    items: oldLog?.items || [],

    datetime: new Date().toLocaleString(),
    iso: nowISO()
  };

  logs.push(newLog);

  await saveLogs(logs);

  closeModal();
  refreshUI();

  alert("تم التعديل بنجاح ✅");
}
function closeModal(){
  el("editModal").style.display = "none";
}

// ================== INIT ==================
async function refreshUI(){
  const logs = await loadLogs();
  renderTable(logs);
}

document.addEventListener("DOMContentLoaded",()=>{
  renderItemsGrid();

  el("btnSave").onclick = onSave;
  el("btnRefresh").onclick = refreshUI;

  refreshUI();
});

