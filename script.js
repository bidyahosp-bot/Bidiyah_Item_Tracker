
// ================== CONFIG ==================
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec";

let currentEditId = null;

// ================== SETS ==================
const SETS = {
  "IUCD SET": ["Forceps","Sponge Holder","Scissor Straight","Uterine Sound","Speculum"],
  "Suturing Set": ["Needle Holder","Artery Forceps","Mayo Scissor","Non tooth Forceps","Tooth Forceps","Mosquito Forceps (small)","Mosquito Forceps (big)"],
  "IUCD Removal": ["Speculum","Sponge Holder","Artery Forceps"],
  "Dressing Set (DM)": ["Mayo Scissor","Mosquito Forceps (big)","Non tooth Forceps"],
  "Dressing Set": ["Mosquito Forceps (big)","Non tooth Forceps"],
  "Delivery Set": ["Sponge Holder","Cord Cutting Scissor","Straight Artery Forceps","Episiotomy Scissor"]
};

// ================== HELPERS ==================
function el(id){ return document.getElementById(id); }

// ================== API ==================
async function apiRequest(action, payload){
  const res = await fetch(APP_SCRIPT_URL,{
    method:"POST",
    body: JSON.stringify({action,payload})
  });
  return await res.json();
}

async function loadLogs(){
  const data = await apiRequest("usage_list",{});
  return data.logs || [];
}

async function saveLogs(logs){
  await apiRequest("usage_replace_all",{logs});
}

// ================== RENDER SETS ==================
function renderGroupedItems(){
  const grid = el("itemsGrid");
  if(!grid) return;

  grid.innerHTML = "";

  Object.keys(SETS).forEach(setName => {

    const div = document.createElement("div");
    div.className = "set-box";

    div.innerHTML = `
      <div class="set-header">
        <input type="checkbox" class="set-check" data-set="${setName}">
        <strong>${setName}</strong>
      </div>
      <div class="set-items">
        ${SETS[setName].map(item => `
          <label>
            <label>
  <span>${item}</span>
  <input type="checkbox" class="item-check" data-name="${item}" data-set="${setName}">
</label>
          </label>
        `).join("")}
      </div>
    `;

    grid.appendChild(div);
  });

  // اختيار المجموعة
  document.querySelectorAll(".set-check").forEach(cb=>{
    cb.addEventListener("change",()=>{
      const set = cb.dataset.set;
      document.querySelectorAll(`.item-check[data-set="${set}"]`)
        .forEach(i=> i.checked = cb.checked);
    });
  });
}

// ================== COLLECT ==================
function collectItems(){
  const selected = [];

  document.querySelectorAll(".item-check:checked").forEach(cb=>{
    selected.push({
      item: cb.dataset.name,
      qty: 1
    });
  });

  return selected;
}

// ================== BUILD ==================
function buildLog(){
  return {
    id: Date.now(),
    staff: el("staff").value,
    shift: el("shift").value,
    department: el("department").value,
    signedBy: el("signedBy").value,
    setStatus: el("setStatus").value,
    items: collectItems(),
    datetime: new Date().toLocaleString()
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
  </tr>`;

  logs.slice(-10).reverse().forEach(l=>{
    const items = (l.items||[]).map(x=>x.item).join(",");

    const status = l.setStatus || "Not Complete";
    const color = status === "Complete" ? "green" : "red";

    table.innerHTML += `
    <tr>
      <td>${l.staff}</td>
      <td>${l.shift}</td>
      <td>${l.department}</td>
      <td>${l.signedBy}</td>
      <td style="color:${color}">${status}</td>
      <td>${items}</td>
      <td>${l.datetime}</td>
    </tr>`;
  });
}

// ================== SAVE ==================
async function onSave(){
  const logs = await loadLogs();
  logs.push(buildLog());
  await saveLogs(logs);
  refreshUI();
}

// ================== INIT ==================
async function refreshUI(){
  const logs = await loadLogs();
  renderTable(logs);
}

document.addEventListener("DOMContentLoaded",()=>{
  renderGroupedItems(); // ✅ هذا المهم

  el("btnSave").onclick = onSave;
  el("btnRefresh").onclick = refreshUI;

  refreshUI();
});

