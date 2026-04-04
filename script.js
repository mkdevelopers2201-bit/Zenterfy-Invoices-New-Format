// --- Configuration ---
const INITIAL_ROWS = 10;
const TAX_OPTIONS = [0, 5, 12, 18, 28];

const state = {
    items: []
};

// --- Number to Words ---
function numberToWords(amount) {
    const words = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
    const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    
    function convert(n) {
        if (n < 20) return words[n];
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + words[n % 10] : "");
        if (n < 1000) return words[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convert(n % 100) : "");
        if (n < 100000) return convert(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convert(n % 1000) : "");
        if (n < 10000000) return convert(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "");
        return "";
    }
    
    let num = Math.floor(amount);
    if (num === 0) return "Zero Rupees Only";
    return convert(num) + " Rupees Only";
}

// --- Logic ---
function initRows() {
    state.items = [];
    const body = document.getElementById('items-body');
    body.innerHTML = '';
    for (let i = 0; i < INITIAL_ROWS; i++) {
        addRow();
    }
}

function addRow() {
    const body = document.getElementById('items-body');
    const index = state.items.length;
    const item = { sr: index + 1, particulars: '', hsn: '', qty: 0, rate: 0, tax: 18, amount: 0, cgst: 0, sgst: 0, total: 0 };
    state.items.push(item);

    const tr = document.createElement('tr');
    tr.className = 'border-b border-black h-8';
    tr.innerHTML = `
        <td class="border-r border-black text-center p-1">${item.sr}</td>
        <td class="border-r border-black p-1"><input class="w-full outline-none p-val" data-idx="${index}"></td>
        <td class="border-r border-black p-1"><input class="w-full outline-none text-center hsn-val" data-idx="${index}"></td>
        <td class="border-r border-black p-1"><input type="number" class="w-full outline-none text-center qty-val" data-idx="${index}"></td>
        <td class="border-r border-black p-1"><input type="number" class="w-full outline-none text-right rate-val" data-idx="${index}"></td>
        <td class="border-r border-black p-1 text-right amt-cell">0.00</td>
        <td class="border-r border-black p-1">
            <select class="w-full bg-transparent tax-val" data-idx="${index}">
                ${TAX_OPTIONS.map(t => `<option value="${t}" ${t === 0 ? 'selected' : ''}>${t}%</option>`).join('')}
            </select>
        </td>
        <td class="border-r border-black p-1 text-right cgst-cell">0.00</td>
        <td class="border-r border-black p-1 text-right sgst-cell">0.00</td>
        <td class="p-1 text-right font-bold total-cell">0.00</td>
    `;
    body.appendChild(tr);
    attachListeners(tr, index);
}

function attachListeners(row, idx) {
    row.querySelectorAll('input, select').forEach(el => {
        el.addEventListener('input', (e) => {
            const val = e.target.value;
            if (el.classList.contains('qty-val')) state.items[idx].qty = parseFloat(val) || 0;
            if (el.classList.contains('rate-val')) state.items[idx].rate = parseFloat(val) || 0;
            if (el.classList.contains('tax-val')) state.items[idx].tax = parseFloat(val) || 0;
            updateCalculations(idx);
        });
    });
}

function updateCalculations(idx) {
    const item = state.items[idx];
    const amount = item.qty * item.rate;
    const taxAmt = (amount * item.tax) / 100;
    
    item.amount = amount;
    item.cgst = taxAmt / 2;
    item.sgst = taxAmt / 2;
    item.total = amount + taxAmt;

    const row = document.getElementById('items-body').children[idx];
    row.querySelector('.amt-cell').textContent = amount.toFixed(2);
    row.querySelector('.cgst-cell').textContent = item.cgst.toFixed(2);
    row.querySelector('.sgst-cell').textContent = item.sgst.toFixed(2);
    row.querySelector('.total-cell').textContent = item.total.toFixed(2);

    calculateGrandTotal();
}

function calculateGrandTotal() {
    let tQty = 0, tAmt = 0, tCgst = 0, tSgst = 0, tTotal = 0;

    state.items.forEach(item => {
        tQty += item.qty;
        tAmt += item.amount;
        tCgst += item.cgst;
        tSgst += item.sgst;
        tTotal += item.total;
    });

    const grandFinal = Math.round(tTotal);
    const roundOff = grandFinal - tTotal;

    document.getElementById('total-qty').textContent = tQty;
    document.getElementById('sub-total').textContent = tAmt.toFixed(2);
    document.getElementById('total-cgst').textContent = tCgst.toFixed(2);
    document.getElementById('total-sgst').textContent = tSgst.toFixed(2);
    document.getElementById('table-grand-total').textContent = tTotal.toFixed(2);
    
    document.getElementById('round-off-value').textContent = roundOff.toFixed(2);
    document.getElementById('grand-total').textContent = grandFinal.toFixed(2);
    document.getElementById('grand-total-words').textContent = numberToWords(grandFinal);
}

// --- Events ---
document.getElementById('add-row-btn').onclick = addRow;
document.getElementById('print-btn').onclick = () => window.print();
document.getElementById('reset-btn').onclick = initRows;

// Launch
initRows();
