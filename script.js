
// ================== CONFIG ==================
const APP_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxhh5XI70lwvQRpB4mi7239Mz0xh4EyDYXxChBVKKv3qJGSWsnokjeQl5XNpwK-J62llw/exec";

let currentEditId = null;

// ================== SETS ==================


const DEPARTMENT_DATA = {

  "OPD": {

sets: {

  "Dressing Set": [
    "Mosquito Forceps (big)",
    "Non tooth Forceps"
  ],

  "Ear Wash": [
    "Hook Explore",
    "Alligator Style Forceps",
    "Ormerod Aural"
  ],

  "Suturing Set": [
    "Needle Holder",
    "Artery Straight",
    "Artery Curved",
    "Mosquito Curved",
    "Mosquito Straight",
    "Tooth Forceps",
    "Non tooth Forceps"
  ]

},



    singleItems: [
      "Allis",
      "Mosquito Curved",
      "Artery Curved",
      "Artery Straight",
      "Mosquito Straight",
      "Needle Holder",
      "Hole Removal",
      "Hook Explore",
      "Alligator Style Forceps",
      "Ormerod Aural",
      "Mosquito Mini",
      "Scissor",
      "Hole Towel",
      "Tooth Forceps",
      "Non tooth Forceps"
    ]

  },

  "A&E": {

sets: {

  "Dressing Set": [
    "Mosquito Forceps (big)",
    "Non tooth Forceps"
  ],

  "Ear Wash": [
    "Hook Explore",
    "Alligator Style Forceps",
    "Ormerod Aural"
  ],

  "Suturing Set": [
    "Needle Holder",
    "Artery Straight",
    "Artery Curved",
    "Mosquito Curved",
    "Mosquito Straight",
    "Tooth Forceps",
    "Non tooth Forceps"
  ],

  "G - Try": [
    "Speculum",
    "Forceps",
    "Sponge Holder"
  ]

},


    singleItems: [
      "Allis",
      "Mosquito Curved",
      "Artery Curved",
      "Artery Straight",
      "Mosquito Straight",
      "Needle Holder",
      "Hole Removal",
      "Hook Explore",
      "Alligator Style Forceps",
      "Ormerod Aural",
      "Mosquito Mini",
      "Scissor",
      "Hole Towel",
      "Tooth Forceps",
      "Non tooth Forceps"
    ]

  },

  "ANC": {

    sets: {


"IUCD SET": [
  "Sponge Holder",
  "Uterine Sound",
  "Scissors Straight",
  "Forculum",
  "Speculum"
]



    
"IUCD Removal": [
  "Speculum",
  "Artery - CRV",
  "Sponge Holder"
]



    },

    singleItems: [
      "Female Metal Catheter",
      "Speculum",
      "Forceps",
      "Uterine Sound",
      "Artery Curved",
      "Sponge Holder",
      "Mosquito Mini",
      "Artery Straight",
      "Mother Drap",
      "Baby Drap"
    ]

  },

  "L.R": {

sets: {

  "Mother Drop": [
    "Mother Drap"
  ],

  "Baby Drop": [
    "Baby Drap"
  ],

  "Delivery Set": [
    "Sponge Holder",
    "Artery Straight",
    "Episiotomy Scissor",
    "Cord Cutting Scissor",
    "COS COS"
  ]

},


    singleItems: [
      "Female Metal Catheter",
      "Speculum",
      "Forceps",
      "Uterine Sound",
      "Artery Curved",
      "Sponge Holder",
      "Mosquito Mini",
      "Artery Straight",
      "Mother Drap",
      "Baby Drap",
      "Episiotomy Scissor",
      "Cord Cutting Scissor",
      "COS COS"
    ]

  },

  "DM": {

    sets: {

      "Dressing Set (DM)": [
        "Mayo Scissor",
        "Mosquito Forceps (big)",
        "Non tooth Forceps"
      ]

    },

    singleItems: [
      "Mayo Scissor",
      "Mosquito Forceps (big)",
      "Non tooth Forceps",
      "Tooth Forceps",
      "Artery Straight",
      "Artery Curved",
      "Mosquito Curved",
      "Mosquito Straight",
      "Scissor",
      "Hole Towel",
      "Needle Holder"
    ]

  }

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

function renderDepartmentItems(){

  const dept = el("department").value;
  const data = DEPARTMENT_DATA[dept];

  const grid = el("itemsGrid");

  if(!data){
    grid.innerHTML = "";
    return;
  }

  grid.innerHTML = "";

  // ===== SETS =====
  Object.keys(data.sets).forEach(setName=>{

    const items = data.sets[setName];

    grid.innerHTML += `
      <div class="accordion">

        <div class="accordion-header">
          <label>
            <input type="checkbox"
              class="set-check"
              data-set="${setName}">
            <strong>${setName}</strong>
          </label>

          <span onclick="toggleAccordion(this)">▼</span>
        </div>

        <div class="accordion-body">

          ${items.map(item=>`
            <div class="item-view">
              • ${item}
            </div>
          `).join("")}

        </div>

      </div>
    `;
  });

  // ===== SINGLE ITEMS =====
  grid.innerHTML += `
    <div class="accordion">

      <div class="accordion-header">
        <strong>Single Items</strong>
        <span onclick="toggleAccordion(this)">▼</span>
      </div>

      <div class="accordion-body">

        ${data.singleItems.map(item=>`
          <label class="single-item">
            <span>${item}</span>
            <input type="checkbox"
              class="item-check"
              data-name="${item}">
          </label>
        `).join("")}

      </div>

    </div>
  `;

  // اختيار المجموعة كاملة
  
}


// ================== COLLECT ==================

function collectItems(){

  const selected = [];

  // الأدوات الفردية
  document.querySelectorAll(".item-check:checked").forEach(cb=>{

    selected.push({
      item: cb.dataset.name,
      qty: 1
    });

  });

  // المجموعات
  document.querySelectorAll(".set-check:checked").forEach(cb=>{

    const setName = cb.dataset.set;

    selected.push({
      item: setName,
      qty: "SET"
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
      <th>Actions</th>
    </tr>
  `;

  if(!logs.length){

    table.innerHTML += `
      <tr>
        <td colspan="8">
          No records found
        </td>
      </tr>
    `;

    return;
  }

  logs.slice(-20).reverse().forEach(l=>{

    const items = (l.items || [])
      .map(x => `• ${x.item}`)
      .join("<br>");

    const status = l.setStatus || "Not Complete";

    const color =
      status === "Complete"
      ? "green"
      : "red";

    table.innerHTML += `
      <tr>

        <td>${l.staff}</td>

        <td>${l.shift}</td>

        <td>${l.department}</td>

        <td>${l.signedBy}</td>

        <td style="color:${color};font-weight:bold">
          ${status}
        </td>

        <td>${items}</td>

        <td>${l.datetime}</td>

        <td>

          <button
            style="background:#facc15;border:none;padding:6px 10px;border-radius:8px;cursor:pointer"
            onclick="editRecord('${l.id}')">
            ✏️
          </button>

          <button
            style="background:#ef4444;color:white;border:none;padding:6px 10px;border-radius:8px;cursor:pointer"
            onclick="deleteRecord('${l.id}')">
            🗑️
          </button>

        </td>

      </tr>
    `;
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

  renderDepartmentItems();

  // ✅ تحديث الأدوات حسب القسم
  el("department").addEventListener("change", renderDepartmentItems);

  el("btnSave").onclick = onSave;
  el("btnRefresh").onclick = refreshUI;

  refreshUI();
});

async function deleteRecord(id){

  if(!confirm("Delete this record?")) return;

  let logs = await loadLogs();

  logs = logs.filter(x => String(x.id) !== String(id));

  await saveLogs(logs);

  refreshUI();
}

async function editRecord(id){

  const logs = await loadLogs();

  const rec = logs.find(x => String(x.id) === String(id));

  if(!rec) return;

  currentEditId = id;

  el("editStaff").value = rec.staff;
  el("editShift").value = rec.shift;
  el("editDepartment").value = rec.department;
  el("editSignedBy").value = rec.signedBy;
  el("editStatus").value = rec.setStatus;

  el("editModal").style.display = "flex";
}

function closeModal(){
  el("editModal").style.display = "none";
}

async function saveEdit(){

  let logs = await loadLogs();

  const index = logs.findIndex(
    x => String(x.id) === String(currentEditId)
  );

  if(index === -1) return;

  logs[index].staff = el("editStaff").value;
  logs[index].shift = el("editShift").value;
  logs[index].department = el("editDepartment").value;
  logs[index].signedBy = el("editSignedBy").value;
  logs[index].setStatus = el("editStatus").value;

  await saveLogs(logs);

  closeModal();

  refreshUI();
}


function toggleAccordion(elm){

  const body = elm.parentElement.nextElementSibling;

  body.classList.toggle("show");
}
