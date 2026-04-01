// --- Supabase Configuration ---
const supabaseUrl = 'https://zicpxxyoyavgmvephgus.supabase.co';
const supabaseKey = 'sb_publishable_biL3uHaWg4H8cp6n-93TXg_UiW5utzu';

// --- Utility: Number to Words ---
function numberToWords(num) {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    let n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) + 'Only ' : 'Only ';
    return str.trim();
}

// --- Constants ---
const TAX_OPTIONS = [0, 5, 18, 20, 40];
const INITIAL_ROW_COUNT = 10;

// --- State ---
let currentInvoice = {
    id: '',
    billTo: '',
    billNumber: '',
    gstinNumber: '',
    dated: '',
    address: '',
    purchaseOrder: '',
    items: []
};

let register = [];
try {
    register = JSON.parse(localStorage.getItem('invoice_register')) || [];
} catch (e) {
    console.error('Failed to load register from localStorage', e);
    register = [];
}
let deleteId = null;

// --- DOM Elements Cache ---
const elements = {};

function getElements() {
    const ids = [
        'items-body', 'billTo', 'gstinNumber', 'address', 'billNumber', 'dated', 'purchaseOrder',
        'total-qty', 'total-cgst', 'total-sgst', 'sub-total', 'round-off-row', 'round-off-value',
        'grand-total', 'grand-total-words', 'hsn-summary-container', 'hsn-summary-body',
        'hsn-total-cgst', 'hsn-total-sgst', 'hsn-total-tax', 'register-modal', 'register-content',
        'delete-modal', 'add-row-btn', 'print-btn', 'save-btn',
        'reset-btn', 'show-register-btn', 'close-register-btn', 'cancel-delete-btn', 'confirm-delete-btn'
    ];
    ids.forEach(id => {
        elements[id] = document.getElementById(id);
    });
}

// --- Functions ---

function createInitialItems() {
    currentInvoice.items = Array.from({ length: INITIAL_ROW_COUNT }, (_, i) => ({
        id: Math.random().toString(36).substr(2, 9),
        srNo: i + 1,
        particulars: '',
        hsn: '',
        qty: 1,
        rate: 0,
        taxRate: 0,
        cgstRate: 0,
        sgstRate: 0,
        amount: 0
    }));
}

function renderItems() {
    if (!elements['items-body']) return;
    elements['items-body'].innerHTML = '';
    currentInvoice.items.forEach((item, index) => {
        const tr = document.createElement('tr');
        tr.className = 'border-b border-black h-8';
        tr.innerHTML = `
            <td class="border-r border-black text-center p-1">${item.srNo}</td>
            <td class="border-r border-black p-1">
                <input class="w-full outline-none particulars-input" value="${item.particulars}" data-index="${index}">
            </td>
            <td class="border-r border-black p-1">
                <input class="w-full outline-none text-center hsn-input" value="${item.hsn}" data-index="${index}">
            </td>
            <td class="border-r border-black p-1">
                <input type="number" class="w-full outline-none text-center qty-input" value="${item.qty || ''}" data-index="${index}">
            </td>
            <td class="border-r border-black p-1">
                <input type="number" class="w-full outline-none text-right rate-input" value="${item.rate || ''}" data-index="${index}">
            </td>
            <td class="border-r border-black p-1">
                <select class="w-full outline-none bg-transparent appearance-none text-center tax-input" data-index="${index}">
                    ${TAX_OPTIONS.map(opt => `<option value="${opt}" ${item.taxRate == opt ? 'selected' : ''}>${opt}%</option>`).join('')}
                </select>
            </td>
            <td class="border-r border-black p-1 text-right cgst-cell">${item.cgstRate.toFixed(2)}</td>
            <td class="border-r border-black p-1 text-right sgst-cell">${item.sgstRate.toFixed(2)}</td>
            <td class="p-1 text-right font-medium amount-cell">${item.amount.toFixed(2)}</td>
        `;
        elements['items-body'].appendChild(tr);
    });
    attachItemListeners();
    calculateTotals();
}

function attachItemListeners() {
    document.querySelectorAll('.particulars-input').forEach(input => {
        input.oninput = (e) => updateItem(e.target.dataset.index, 'particulars', e.target.value);
        input.onkeydown = (e) => {
            if (e.key === 'Backspace' && e.target.value === '' && currentInvoice.items.length > 1) {
                deleteItem(e.target.dataset.index);
            }
        };
    });
    document.querySelectorAll('.hsn-input').forEach(input => {
        input.oninput = (e) => updateItem(e.target.dataset.index, 'hsn', e.target.value);
    });
    document.querySelectorAll('.qty-input').forEach(input => {
        input.oninput = (e) => updateItem(e.target.dataset.index, 'qty', e.target.value);
    });
    document.querySelectorAll('.rate-input').forEach(input => {
        input.oninput = (e) => updateItem(e.target.dataset.index, 'rate', e.target.value);
    });
    document.querySelectorAll('.tax-input').forEach(input => {
        input.onchange = (e) => updateItem(e.target.dataset.index, 'taxRate', e.target.value);
    });
}

function updateItem(index, field, value) {
    const item = currentInvoice.items[index];
    if (!item) return;
    item[field] = value;

    if (field === 'rate' || field === 'qty' || field === 'taxRate') {
        const rate = Number(item.rate) || 0;
        const qty = Number(item.qty) || 0;
        const taxRate = Number(item.taxRate) || 0;

        const baseAmount = rate * qty;
        item.amount = baseAmount;
        item.cgstRate = (baseAmount * (taxRate / 2)) / 100;
        item.sgstRate = (baseAmount * (taxRate / 2)) / 100;

        // Update cells directly for performance
        const row = elements['items-body'].children[index];
        if (row) {
            row.querySelector('.cgst-cell').textContent = item.cgstRate.toFixed(2);
            row.querySelector('.sgst-cell').textContent = item.sgstRate.toFixed(2);
            row.querySelector('.amount-cell').textContent = item.amount.toFixed(2);
        }
    }
    calculateTotals();
}

function deleteItem(index) {
    currentInvoice.items.splice(index, 1);
    currentInvoice.items.forEach((item, i) => item.srNo = i + 1);
    renderItems();
}

function calculateTotals() {
    const subTotal = currentInvoice.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const cgstTotal = currentInvoice.items.reduce((sum, item) => sum + (item.cgstRate || 0), 0);
    const sgstTotal = currentInvoice.items.reduce((sum, item) => sum + (item.sgstRate || 0), 0);
    const totalQty = currentInvoice.items.reduce((sum, item) => sum + (Number(item.qty) || 0), 0);
    const total = subTotal + cgstTotal + sgstTotal;
    
    let grandTotal = total;
    let roundOffValue = 0;

    grandTotal = Math.round(total);
    roundOffValue = grandTotal - total;

    // Update UI
    if (elements['total-qty']) elements['total-qty'].textContent = totalQty;
    if (elements['total-cgst']) elements['total-cgst'].textContent = cgstTotal.toFixed(2);
    if (elements['total-sgst']) elements['total-sgst'].textContent = sgstTotal.toFixed(2);
    if (elements['sub-total']) elements['sub-total'].textContent = subTotal.toFixed(2);

    if (elements['round-off-row']) {
        elements['round-off-row'].classList.remove('hidden');
        if (elements['round-off-value']) elements['round-off-value'].textContent = roundOffValue.toFixed(2);
    }

    if (elements['grand-total']) elements['grand-total'].textContent = grandTotal.toFixed(2);
    if (elements['grand-total-words']) elements['grand-total-words'].textContent = numberToWords(Math.round(grandTotal));

    // HSN Summary
    const hsnSummaryMap = new Map();
    currentInvoice.items.forEach(item => {
        if (item.hsn && (item.amount > 0 || item.cgstRate > 0 || item.sgstRate > 0)) {
            const current = hsnSummaryMap.get(item.hsn) || { cgst: 0, sgst: 0, total: 0 };
            current.cgst += item.cgstRate;
            current.sgst += item.sgstRate;
            current.total += item.cgstRate + item.sgstRate;
            hsnSummaryMap.set(item.hsn, current);
        }
    });

    if (hsnSummaryMap.size > 0) {
        if (elements['hsn-summary-container']) elements['hsn-summary-container'].classList.remove('hidden');
        if (elements['hsn-summary-body']) {
            elements['hsn-summary-body'].innerHTML = '';
            let hsnCgst = 0, hsnSgst = 0, hsnTotal = 0;
            hsnSummaryMap.forEach((values, hsn) => {
                const tr = document.createElement('tr');
                tr.className = 'border-b border-black last:border-b-0';
                tr.innerHTML = `
                    <td class="border-r border-black p-1 text-center">${hsn}</td>
                    <td class="border-r border-black p-1 text-right">${values.cgst.toFixed(2)}</td>
                    <td class="border-r border-black p-1 text-right">${values.sgst.toFixed(2)}</td>
                    <td class="p-1 text-right">${values.total.toFixed(2)}</td>
                `;
                elements['hsn-summary-body'].appendChild(tr);
                hsnCgst += values.cgst;
                hsnSgst += values.sgst;
                hsnTotal += values.total;
            });
            if (elements['hsn-total-cgst']) elements['hsn-total-cgst'].textContent = hsnCgst.toFixed(2);
            if (elements['hsn-total-sgst']) elements['hsn-total-sgst'].textContent = hsnSgst.toFixed(2);
            if (elements['hsn-total-tax']) elements['hsn-total-tax'].textContent = hsnTotal.toFixed(2);
        }
    } else {
        if (elements['hsn-summary-container']) elements['hsn-summary-container'].classList.add('hidden');
    }
}

async function handleSave() {
    

    // Data prepare karein Supabase table ke hisaab se
    const invoiceData = {
        bill_to: currentInvoice.billTo,
        bill_number: currentInvoice.billNumber,
        gstin_number: currentInvoice.gstinNumber,
        dated: currentInvoice.dated,
        address: currentInvoice.address,
        purchase_order: currentInvoice.purchaseOrder,
        items: currentInvoice.items, // JSONB column
        grand_total: parseFloat(elements['grand-total'].textContent)
    };

    try {
        const response = await fetch(`${supabaseUrl}/rest/v1/invoices`, {
            method: 'POST',
            headers: {
                'apikey': supabaseKey,
                'Authorization': `Bearer ${supabaseKey}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify(invoiceData)
        });

        if (response.ok) {
            alert('Invoice successfully saved to Supabase!');
            
            // Local register mein bhi update karlein backup ke liye 
            const newInvoice = { ...currentInvoice, id: Math.random().toString(36).substr(2, 9), createdAt: Date.now() };
            register.push(newInvoice);
            localStorage.setItem('invoice_register', JSON.stringify(register));

            // Bill number increment logic 
            const currentBillNum = parseInt(currentInvoice.billNumber);
            if (!isNaN(currentBillNum)) {
                const nextBillNum = (currentBillNum + 1).toString().padStart(currentInvoice.billNumber.length, '0');
                resetForm();
                if (elements['billNumber']) elements['billNumber'].value = nextBillNum;
                currentInvoice.billNumber = nextBillNum;
            } else {
                resetForm();
            }
        } else {
            const errorData = await response.json();
            console.error('Supabase Error:', errorData);
            alert('Failed to save: ' + errorData.message);
        }
    } catch (err) {
        console.error('Network Error:', err);
        alert('Connection error. Please check internet.');
    } finally {
        elements['save-btn'].innerText = originalBtnText;
        elements['save-btn'].disabled = false;
    }
}

function resetForm() {
    currentInvoice = {
        id: '',
        billTo: '',
        billNumber: '',
        gstinNumber: '',
        dated: '',
        address: '',
        purchaseOrder: '',
        items: []
    };
    const fields = ['billTo', 'gstinNumber', 'address', 'billNumber', 'dated', 'purchaseOrder'];
    fields.forEach(f => {
        if (elements[f]) elements[f].value = '';
    });
    createInitialItems();
    renderItems();
}

function handleAddRow() {
    currentInvoice.items.push({
        id: Math.random().toString(36).substr(2, 9),
        srNo: currentInvoice.items.length + 1,
        particulars: '',
        hsn: '',
        qty: 1,
        rate: 0,
        taxRate: 0,
        cgstRate: 0,
        sgstRate: 0,
        amount: 0
    });
    renderItems();
}

function showRegister() {
    if (elements['register-modal']) elements['register-modal'].classList.remove('hidden');
    renderRegister();
}

function renderRegister() {
    if (!elements['register-content']) return;
    if (register.length === 0) {
        elements['register-content'].innerHTML = `
            <div class="text-center py-12 text-gray-400">
                <p class="text-lg">No invoices saved in register yet.</p>
                <p class="text-sm">Create an invoice and click save to see it here.</p>
            </div>
        `;
        return;
    }

    let html = `
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="text-gray-500 text-sm uppercase tracking-wider border-b">
                    <th class="pb-4 font-semibold">Bill #</th>
                    <th class="pb-4 font-semibold">Customer</th>
                    <th class="pb-4 font-semibold">Date</th>
                    <th class="pb-4 font-semibold text-right">Amount</th>
                    <th class="pb-4 font-semibold text-center">Actions</th>
                </tr>
            </thead>
            <tbody class="divide-y">
    `;

    register.forEach(inv => {
        const subTotal = inv.items.reduce((sum, item) => sum + (item.amount || 0), 0);
        const cgstTotal = inv.items.reduce((sum, item) => sum + (item.cgstRate || 0), 0);
        const sgstTotal = inv.items.reduce((sum, item) => sum + (item.sgstRate || 0), 0);
        const total = subTotal + cgstTotal + sgstTotal;
        const grandTotal = Math.round(total);

        html += `
            <tr class="hover:bg-gray-50 transition-colors group">
                <td class="py-4 font-mono font-bold text-blue-600">${inv.billNumber}</td>
                <td class="py-4">
                    <div class="font-medium text-gray-900">${inv.billTo || 'N/A'}</div>
                    <div class="text-xs text-gray-500">${inv.gstinNumber}</div>
                </td>
                <td class="py-4 text-sm text-gray-600">${inv.dated}</td>
                <td class="py-4 text-right font-bold text-gray-900">₹${grandTotal.toFixed(2)}</td>
                <td class="py-4">
                    <div class="flex justify-center gap-2">
                        <button onclick="editInvoice('${inv.id}')" class="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button onclick="printInvoiceFromRegister('${inv.id}')" class="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors" title="Print">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                        <button onclick="confirmDelete('${inv.id}')" class="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });

    html += '</tbody></table>';
    elements['register-content'].innerHTML = html;
}

window.editInvoice = (id) => {
    const inv = register.find(i => i.id === id);
    if (inv) {
        currentInvoice = JSON.parse(JSON.stringify(inv));
        const fields = ['billTo', 'gstinNumber', 'address', 'billNumber', 'dated', 'purchaseOrder'];
        fields.forEach(f => {
            if (elements[f]) elements[f].value = currentInvoice[f] || '';
        });
        renderItems();
        if (elements['register-modal']) elements['register-modal'].classList.add('hidden');
    }
};

window.printInvoiceFromRegister = (id) => {
    window.editInvoice(id);
    setTimeout(() => window.print(), 100);
};

window.confirmDelete = (id) => {
    deleteId = id;
    if (elements['delete-modal']) elements['delete-modal'].classList.remove('hidden');
};

function handleDelete() {
    if (deleteId) {
        register = register.filter(inv => inv.id !== deleteId);
        localStorage.setItem('invoice_register', JSON.stringify(register));
        deleteId = null;
        if (elements['delete-modal']) elements['delete-modal'].classList.add('hidden');
        renderRegister();
    }
}

// --- Initialization ---

function init() {
    console.log('Invoice App Initializing...');
    getElements();
    
    // Attach Input Listeners
    const fields = ['billTo', 'gstinNumber', 'address', 'billNumber', 'dated', 'purchaseOrder'];
    fields.forEach(f => {
        if (elements[f]) {
            elements[f].addEventListener('input', (e) => {
                currentInvoice[f] = e.target.value;
            });
        }
    });

    // Attach Button Listeners
    if (elements['add-row-btn']) elements['add-row-btn'].addEventListener('click', handleAddRow);
    if (elements['print-btn']) elements['print-btn'].addEventListener('click', () => window.print());
    if (elements['save-btn']) elements['save-btn'].addEventListener('click', handleSave);
    if (elements['reset-btn']) elements['reset-btn'].addEventListener('click', resetForm);
    if (elements['show-register-btn']) elements['show-register-btn'].addEventListener('click', showRegister);
    if (elements['close-register-btn']) elements['close-register-btn'].addEventListener('click', () => elements['register-modal'].classList.add('hidden'));
    if (elements['cancel-delete-btn']) elements['cancel-delete-btn'].addEventListener('click', () => elements['delete-modal'].classList.add('hidden'));
    if (elements['confirm-delete-btn']) elements['confirm-delete-btn'].addEventListener('click', handleDelete);

    // Keyboard Shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toLowerCase() === 's') {
            e.preventDefault();
            if (elements['register-modal']) {
                if (elements['register-modal'].classList.contains('hidden')) {
                    showRegister();
                } else {
                    elements['register-modal'].classList.add('hidden');
                }
            }
        }
    });

    createInitialItems();
    renderItems();
    console.log('Invoice App Initialized.');
}

// Run init when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
