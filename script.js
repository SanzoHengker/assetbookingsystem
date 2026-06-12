const firebaseConfig = {
  apiKey: "AIzaSyDsVRGwt04SKCQ-RVI7ll3i6lCCzNZS8WU",
  authDomain: "bookingwoi-8fcf2.firebaseapp.com",
  projectId: "bookingwoi-8fcf2",
  storageBucket: "bookingwoi-8fcf2.firebasestorage.app",
  messagingSenderId: "1012040923968",
  appId: "1:1012040923968:web:ecc6a2604a19904db698a5"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const systemDocRef = db.collection("system_database").doc("asset_booking_data");

let bookings = []; 
let inboxAdmin = []; 
let history = []; 
let adminLoggedIn = false;
let accessOpen = true;

let accessoryStock = { 'HDMI': 5, 'MOUSE': 5, 'CHARGER LAPTOP': 5, 'POWER PLUG LCD': 9 };

function populateTimeDropdowns() {
    const startSelect = document.getElementById('startTime');
    const endSelect = document.getElementById('endTime');
    startSelect.innerHTML = '';
    endSelect.innerHTML = '';

    let times = [];
    for (let hour = 8; hour < 24; hour++) {
        for (let min of ['00', '30']) {
            let displayHour = hour % 12 === 0 ? 12 : hour % 12;
            let ampm = hour >= 12 ? 'PM' : 'AM';
            times.push({
                value: `${hour.toString().padStart(2, '0')}:${min}`,
                label: `${displayHour}:${min} ${ampm}`
            });
        }
    }
    times.push({ value: "24:00", label: "12:00 AM" });

    times.forEach(t => {
        if(t.value !== "24:00") {
            let optStart = document.createElement('option');
            optStart.value = t.label;
            optStart.innerText = t.label;
            startSelect.appendChild(optStart);
        }
        if(t.value !== "08:00") {
            let optEnd = document.createElement('option');
            optEnd.value = t.label;
            optEnd.innerText = t.label;
            endSelect.appendChild(optEnd);
        }
    });
}
populateTimeDropdowns();

function generateRef() { return 'REF' + Date.now() + '-' + Math.floor(Math.random() * 10000); }
function openLoginModal() { document.getElementById('loginModal').style.display = 'flex'; }
function closeLoginModal() { document.getElementById('loginModal').style.display = 'none'; }

function openInboxModal() {
    const c = document.getElementById('inboxContent');
    c.innerHTML = inboxAdmin.length === 0 ? '<p>Tidak ada laporan.</p>' : inboxAdmin.map(i => `<p><b>${i.ref}</b> - ${i.name} (${i.date}) : ${i.notes}</p>`).join('');
    document.getElementById('adminInboxModal').style.display = 'flex';
}

function closeInboxModal() { document.getElementById('adminInboxModal').style.display = 'none'; }
function closeHistoryModal() { document.getElementById('adminHistoryModal').style.display = 'none'; }

function adminLogin() {
    const u = document.getElementById('adminUsername').value.trim();
    const p = document.getElementById('adminPassword').value.trim();
    if(u === 'Admin JPA' && p === 'adminjpapis01') {
        adminLoggedIn = true;
        closeLoginModal();
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('inboxBtn').style.display = 'block';
        document.getElementById('adminPageBtn').style.display = 'block';
        alert('Login Berjaya!');
    } else {
        alert('Username atau Password salah!');
    }
}

function toggleAccess() {
    accessOpen = !accessOpen;
    document.getElementById('accessStatus').innerText = "Akses Sekarang: " + (accessOpen ? "Dibuka" : "Ditutup");
    saveDataToFirebase();
}

function showPage(id) {
    ['homePage', 'bookingPage', 'returnPage', 'adminPage'].forEach(p => document.getElementById(p).style.display = 'none');
    updateTable();
    document.getElementById(id).style.display = 'block';
}

function updateTable() {
    ['bookingTable1', 'bookingTable2'].forEach(tid => {
        const tb = document.getElementById(tid).querySelector('tbody');
        tb.innerHTML = '';
        bookings.forEach(b => {
            const tr = document.createElement('tr');
            const timeDisplay = (b.startTime && b.endTime) ? `<br><small>(${b.startTime} - ${b.endTime})</small>` : '';
            tr.innerHTML = `<td>${b.ref}</td><td>${b.name}</td><td>${b.date}${timeDisplay}</td><td>${b.purpose}</td><td>${b.laptop}</td><td>${b.lcd}</td><td>${b.accessory.join(', ')}</td>`;
            tb.appendChild(tr);
        });
    });
    updateDropdowns();
}

function updateDropdowns() {
    const laptopsBooked = bookings.filter(b => b.laptop !== 'NONE').map(b => b.laptop);
    const lcdBooked = bookings.filter(b => b.lcd !== 'NONE').map(b => b.lcd);
    
    accessoryStock = { 'HDMI': 5, 'MOUSE': 5, 'CHARGER LAPTOP': 5, 'POWER PLUG LCD': 9 };
    
    bookings.forEach(b => { b.accessory.forEach(a => { if(a !== 'NONE' && accessoryStock[a] !== undefined) accessoryStock[a]--; }); });
    
    const laptopOptions = document.getElementById('laptop').options;
    for(let i = 0; i < laptopOptions.length; i++) { laptopOptions[i].disabled = laptopsBooked.includes(laptopOptions[i].value); }
    const lcdOptions = document.getElementById('lcd').options;
    for(let i = 0; i < lcdOptions.length; i++) { lcdOptions[i].disabled = lcdBooked.includes(lcdOptions[i].value); }
    
    const accessoryCheckboxes = document.querySelectorAll('#accessoryOptions input[type="checkbox"]');
    let selected = Array.from(accessoryCheckboxes).filter(c => c.checked && c.value !== 'NONE');
    let noneCheckbox = Array.from(accessoryCheckboxes).find(c => c.value === 'NONE');
    
    accessoryCheckboxes.forEach(c => {
        if(c.value !== 'NONE') {
            c.disabled = accessoryStock[c.value] <= 0 || noneCheckbox.checked;
            
            let elementId = "stock_" + c.value.replace(/ /g, "_");
            let badge = document.getElementById(elementId);
            if(badge) {
                if(accessoryStock[c.value] <= 0) {
                    badge.innerText = "(HABIS)";
                    badge.className = "stock-empty";
                } else {
                    badge.innerText = `(Baki: ${accessoryStock[c.value]})`;
                    badge.className = "stock-badge";
                }
            }
        }
    });
    noneCheckbox.disabled = selected.length > 0;
}

const accessoryCheckboxes = document.querySelectorAll('#accessoryOptions input[type="checkbox"]');
accessoryCheckboxes.forEach(cb => cb.addEventListener('change', function() {
    let selected = Array.from(accessoryCheckboxes).filter(c => c.checked && c.value !== 'NONE');
    let noneCheckbox = Array.from(accessoryCheckboxes).find(c => c.value === 'NONE');
    if(selected.length > 0) { noneCheckbox.disabled = true; }
    else { noneCheckbox.disabled = false; }
    if(noneCheckbox.checked) { accessoryCheckboxes.forEach(c => { if(c.value !== 'NONE') c.disabled = true; }); }
    else { accessoryCheckboxes.forEach(c => { if(c.value !== 'NONE') c.disabled = false; }); }
}));

// REAL-TIME SNAPSHOT
systemDocRef.onSnapshot((doc) => {
    if (doc.exists) {
        const data = doc.data();
        bookings = data.bookings || [];
        inboxAdmin = data.inboxAdmin || [];
        history = data.history || [];
        accessOpen = data.accessOpen !== undefined ? data.accessOpen : true;
        
        document.getElementById('accessStatus').innerText = "Akses Sekarang: " + (accessOpen ? "Dibuka" : "Ditutup");
        updateTable();
    }
});

function saveDataToFirebase() {
    systemDocRef.set({
        bookings: bookings,
        inboxAdmin: inboxAdmin,
        history: history,
        accessOpen: accessOpen
    }).catch(err => console.error("Gagal update data ke Firebase: ", err));
}

function clearAllData() {
    const confirm1 = confirm("Padam semua rekod?");
    if (confirm1) {
        const confirm2 = confirm("Klik OK untuk padam semua.");
        if (confirm2) {
            bookings = [];
            inboxAdmin = [];
            history = [];
            saveDataToFirebase();
            alert("Rekod dipadam!");
            showPage('homePage');
        }
    }
}

// PEMINJAMAN
document.getElementById('bookingForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if(!accessOpen) { alert('Akses Peminjaman ditutup'); return; }
    const name = document.getElementById('name').value.trim();
    const date = document.getElementById('date').value;
    const startTime = document.getElementById('startTime').value;
    const endTime = document.getElementById('endTime').value;
    const purpose = document.getElementById('purpose').value.trim();
    const laptop = document.getElementById('laptop').value;
    const lcd = document.getElementById('lcd').value;
    
    let accessory = Array.from(accessoryCheckboxes).filter(c => c.checked).map(c => c.value);
    if([laptop, lcd].every(a => 'NONE' === a) && accessory.length === 0) { alert('Sila pilih sekurang-kurangnya satu aset.'); return; }
    
    const ref = generateRef();
    bookings.push({ref, name, date, startTime, endTime, purpose, laptop, lcd, accessory});
    alert('Peminjaman berjaya! Reference Code: ' + ref);
    this.reset();
    populateTimeDropdowns(); 
    accessoryCheckboxes.forEach(c => c.disabled = false);
    updateTable();
    saveDataToFirebase();
});

// PEMULANGAN
document.getElementById('returnForm').addEventListener('submit', function(e) {
    e.preventDefault();
    if(!accessOpen) { alert('Akses Pemulangan ditutup'); return; }
    const ref = document.getElementById('refCode').value.trim();
    const returnDate = document.getElementById('returnDate').value;
    const status = document.getElementById('status').value;
    const notes = document.getElementById('notes').value.trim();
    const index = bookings.findIndex(b => b.ref === ref);
    if(index === -1) { alert('Reference code tidak ditemui!'); return; }
    if(status === 'incomplete' && notes === '') { alert('Sila isi keterangan jika barang TIDAK lengkap'); return; }
    let b = bookings[index];
    history.push({ref: b.ref, name: b.name, date: b.date, startTime: b.startTime || '', endTime: b.endTime || '', purpose: b.purpose, laptop: b.laptop, lcd: b.lcd, accessory: b.accessory, status: status, notes: notes, timestamp: Date.now()});
    if(status === 'incomplete') { inboxAdmin.push({ref: b.ref, name: b.name, date: b.date, notes: notes}); if(adminLoggedIn) alert('Barang dikembalikan'); }
    else { if(adminLoggedIn) alert('Barang berjaya dikembalikan lengkap'); }
    bookings.splice(index, 1);
    this.reset();
    updateTable();
    saveDataToFirebase();
});

document.getElementById('status').addEventListener('change', function() {
    document.getElementById('notes').disabled = this.value === 'complete';
});

function checkReference() {
    const ref = document.getElementById('adminRefCheck').value.trim();
    let rec = bookings.find(b => b.ref === ref);
    let hist = history.find(h => h.ref === ref && (Date.now() - h.timestamp <= 60 * 24 * 60 * 60 * 1000));
    if(rec) {
        const timeStr = (rec.startTime && rec.endTime) ? `<br><b>Masa:</b> ${rec.startTime} - ${rec.endTime}` : '';
        document.getElementById('refDetails').innerHTML = `<b>Reference:</b> ${rec.ref}<br><b>Nama:</b> ${rec.name}<br><b>Tarikh:</b> ${rec.date}${timeStr}<br><b>Tujuan:</b> ${rec.purpose}<br><b>Laptop:</b> ${rec.laptop}<br><b>LCD:</b> ${rec.lcd}<br><b>Aksesori:</b> ${rec.accessory.join(', ')}<br><b>Status:</b> Sedang Dipinjam`;
    }
    else if(hist) {
        const timeStr = (hist.startTime && hist.endTime) ? `<br><b>Masa:</b> ${hist.startTime} - ${hist.endTime}` : '';
        document.getElementById('refDetails').innerHTML = `<b>Reference:</b> ${hist.ref}<br><b>Nama:</b> ${hist.name}<br><b>Tarikh Peminjaman:</b> ${hist.date}${timeStr}<br><b>Tujuan:</b> ${hist.purpose}<br><b>Laptop:</b> ${hist.laptop}<br><b>LCD:</b> ${hist.lcd}<br><b>Aksesori:</b> ${hist.accessory.join(', ')}<br><b>Status:</b> ${hist.status}<br><b>Keterangan:</b> ${hist.notes}`;
    }
    else { document.getElementById('refDetails').innerText = "Reference tidak ditemui atau lebih 60 hari."; }
}

function showHistory() {
    const recent = history.filter(h => Date.now() - h.timestamp <= 60 * 24 * 60 * 60 * 1000);
    document.getElementById('historyContent').innerHTML = recent.length === 0 
        ? '<p>Tidak ada rekod.</p>' 
        : recent.map(h => `<div class="report-item"><b>${h.name}</b> (${h.ref}) <br> <span style="color: ${h.status === 'complete' ? '#00ff00' : '#ff4500'}">Status: ${h.status.toUpperCase()}</span></div>`).join('');
    document.getElementById('adminHistoryModal').style.display = 'flex';
}

function generatePrintTemplate(dataList, titleSubtitle) {
    let tableRows = dataList.map((h, index) => {
        return `
            <tr>
                <td>${index + 1}</td>
                <td><b>${h.name}</b><br><small>${h.ref}</small></td>
                <td>${h.date}<br><small>(${h.startTime} - ${h.endTime})</small></td>
                <td>${h.purpose}</td>
                <td>${h.laptop}</td>
                <td>${h.lcd}</td>
                <td>${h.accessory.join(', ')}</td>
                <td class="${h.status}">${h.status === 'complete' ? 'LENGKAP' : 'TIDAK LENGKAP'}</td>
                <td>${h.notes || '-'}</td>
            </tr>
        `;
    }).join('');

    return `
        <html>
        <head>
            <title>Laporan Pemulangan Aset</title>
            <style>
                body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 20px; line-height: 1.4; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 3px double #333; padding-bottom: 10px; }
                .header h1 { margin: 0; font-size: 24px; color: #111; text-transform: uppercase; }
                .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
                .meta-info { margin-bottom: 15px; font-size: 13px; font-weight: bold; display: flex; justify-content: space-between; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
                th, td { border: 1px solid #666; padding: 10px; text-align: center; }
                th { background-color: #f2f2f2; font-weight: bold; text-transform: uppercase; }
                tr:nth-child(even) { background-color: #fafafa; }
                .complete { color: green; font-weight: bold; }
                .incomplete { color: red; font-weight: bold; }
                .footer { margin-top: 5px; text-align: right; font-size: 11px; color: #777; position: fixed; bottom: 20px; right: 20px; }
                @media print { button { display: none; } body { padding: 0; } }
                .print-btn { background-color: #008CBA; color: white; padding: 10px 20px; border: none; border-radius: 5px; font-size: 14px; cursor: pointer; font-weight: bold; margin-bottom: 20px; }
            </style>
        </head>
        <body>
            <button class="print-btn" onclick="window.print()">🖨️ Cetak / Simpan PDF</button>
            <div class="header">
                <h1>Laporan Rasmi Pemulangan Aset JPA PIS</h1>
                <p>${titleSubtitle}</p>
            </div>
            <div class="meta-info">
                <span>Tarikh Laporan Dijana: ${new Date().toLocaleDateString('ms-MY')}</span>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Bil</th>
                        <th>Nama Peminjam & Ref Code</th>
                        <th>Tarikh & Masa</th>
                        <th>Tujuan</th>
                        <th>Laptop</th>
                        <th>LCD</th>
                        <th>Aksesori</th>
                        <th>Status Pemulangan</th>
                        <th>Keterangan Tambahan</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
            <div class="footer">Automatically generated file</div>
        </body>
        </html>
    `;
}

function printFullReport() {
    const recent = history.filter(h => Date.now() - h.timestamp <= 60 * 24 * 60 * 60 * 1000);
    if(recent.length === 0) { alert("Tiada rekod data pemulangan untuk dicetak!"); return; }

    const reportWindow = window.open('', '_blank');
    reportWindow.document.write(generatePrintTemplate(recent, "Rekod Keseluruhan Sistem Peminjaman"));
    reportWindow.document.close();
}

function printFilteredReport() {
    const startInput = document.getElementById('filterStartDate').value;
    const endInput = document.getElementById('filterEndDate').value;

    if(!startInput || !endInput) {
        alert("Sila pilih Tarikh Mula dan Tarikh Tamat terlebih dahulu!");
        return;
    }

    const startDate = new Date(startInput);
    startDate.setHours(0,0,0,0);
    const endDate = new Date(endInput);
    endDate.setHours(23,59,59,999);

    if(startDate > endDate) {
        alert("Tarikh Mula tidak boleh melebihi Tarikh Tamat!");
        return;
    }

    const filtered = history.filter(h => {
        const recordDate = new Date(h.date);
        return recordDate >= startDate && recordDate <= endDate;
    });

    if(filtered.length === 0) {
        alert(`Tiada rekod pemulangan ditemui dari tarikh ${new Date(startInput).toLocaleDateString('ms-MY')} hingga ${new Date(endInput).toLocaleDateString('ms-MY')}.`);
        return;
    }

    const reportWindow = window.open('', '_blank');
    const subtitle = `Rekod Tapis Mengikut Tarikh: Peminjaman Dari ${new Date(startInput).toLocaleDateString('ms-MY')} Hingga ${new Date(endInput).toLocaleDateString('ms-MY')}`;
    reportWindow.document.write(generatePrintTemplate(filtered, subtitle));
    reportWindow.document.close();
}