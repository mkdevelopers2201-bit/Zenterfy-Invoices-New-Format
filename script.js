// --- Supabase Setup ---
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const SUPABASE_URL = "https://uxhualclugoipshiilsu.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4aHVhbGNsdWdvaXBzaGlpbHN1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU5OTM4MDksImV4cCI6MjA5MTU2OTgwOX0.3L1hJyeinykZty-VKWs1zrACGg-aAUkiOE7_9cuV7VU";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// --- Configuration ---
const INITIAL_ROWS = 10;
const TAX_OPTIONS = [0, 5, 12, 18, 28];

const state = {
    items: []
};

document.getElementById('save-btn').onclick = async () => {
    const dataToInsert = {
        // Invoice details
        invoice_number: document.getElementById('billNumber').value,
        date: document.getElementById('dated').value,
        customer: document.getElementById('billTo').value,

        // First item (basic version)
        item_name: state.items[0]?.particulars || "",
        hsn_code: state.items[0]?.hsn || "",
        rate: state.items[0]?.rate || 0,
        qty: state.items[0]?.qty || 0,
        amount: state.items[0]?.amount || 0,

        // Discount (abhi static)
        discount_percent: 0,
        discounted_amount: 0,

        // GST
        gst_percent: state.items[0]?.tax || 0,
        gst_amount: (state.items[0]?.cgst || 0) + (state.items[0]?.sgst || 0),

        cgst: state.items[0]?.cgst || 0,
        sgst: state.items[0]?.sgst || 0,

        // Final total
        net_bill: parseFloat(document.getElementById('grand-total').textContent) || 0,

        // Extra fields
        status: "Pending",
        gst_enabled: true,
        payments: []
    };

    const { data, error } = await supabase
        .from('sales_entries')
        .insert([dataToInsert]);

    if (error) {
        console.error("Error saving:", error);
        alert("Error saving invoice");
    } else {
        console.log("Saved:", data);
        alert("Invoice saved successfully");
    }
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
