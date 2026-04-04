body {
    font-family: 'Poppins', sans-serif;
    -webkit-print-color-adjust: exact;
}

@media print {
    @page { margin: 5mm; }
    body { background: white; padding: 0; }
    .print\:hidden { display: none !important; }
    #invoice-container { box-shadow: none; border: none; width: 100%; display: flex; align-items: center; justify-content: center;}
    input, textarea, select { border: none !important; background: transparent !important; }
}

/* Hide arrows from number inputs */
input::-webkit-outer-spin-button, input::-webkit-inner-spin-button {
    -webkit-appearance: none; margin: 0;
}
input[type=number] { -moz-appearance: textfield; }
