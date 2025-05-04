// Main application script for OL Invoicing

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the application
  initApp();
  
  // Setup event listeners
  setupEventListeners();
  
  // Set today's date as default for date fields
  setDefaultDates();
  
  // Calculate initial totals
  calculateTotals();
  
  // Check for and restore any unsaved draft
  checkForUnsavedDraft();
});

// Initialize the application
function initApp() {
  console.log('OL Invoicing app initialized');
  
  // Check if we're online and update UI accordingly
  updateOnlineStatus();
  
  // Initialize the dark/light mode based on user preference
  initTheme();
  
  // Setup additional functionality
  setupLogoHandling();
  setupClientHandling();
  setupTaxHandling();
  
  // Set up error handling for uncaught exceptions
  window.addEventListener('error', function(event) {
    console.error('Global error caught:', event.error);
    window.utils.showNotification('An error occurred. Your data has been saved.', 'warning');
    // Force an autosave when an error occurs
    saveFormDraft();
    return false;
  });
}

// Set up all event listeners
function setupEventListeners() {
  // Setup additional PDF buttons
  setupPDFButtons();
  
  // Setup install app button
  setupInstallAppButton();
  
  // Navigation with save prompt if needed
  document.querySelectorAll('.sidebar-menu li').forEach(item => {
    item.addEventListener('click', function(e) {
      const sectionId = this.getAttribute('data-section');
      const currentSection = document.querySelector('.sidebar-menu li.active').getAttribute('data-section');
      
      // If we're leaving the invoice section and have unsaved changes
      if (currentSection === 'create-invoice' && sectionId !== 'create-invoice' && hasUnsavedChanges()) {
        e.preventDefault();
        if (confirm('You have unsaved changes. Do you want to save your draft before leaving?')) {
          saveFormDraft();
        }
      }
      
      showSection(sectionId);
      
      // Update active state in sidebar
      document.querySelectorAll('.sidebar-menu li').forEach(li => {
        li.classList.remove('active');
      });
      this.classList.add('active');
    });
  });
  
  // Item handling
  document.getElementById('add-item').addEventListener('click', function() {
    addItemRow();
    // Autosave after adding item
    debouncedSaveFormDraft();
  });
  document.getElementById('items-body').addEventListener('click', function(e) {
    if (e.target.classList.contains('remove-item') || e.target.parentElement.classList.contains('remove-item')) {
      removeItemRow(e);
      // Autosave after removing item
      debouncedSaveFormDraft();
    }
  });
  
  // Item calculations and auto-save on input
  document.getElementById('items-body').addEventListener('input', function(e) {
    if (e.target.classList.contains('item-quantity') || e.target.classList.contains('item-rate')) {
      updateRowAmount(e.target.closest('tr'));
      calculateTotals();
      debouncedSaveFormDraft();
    }
    
    if (e.target.classList.contains('item-description') || 
        e.target.classList.contains('item-service-type') || 
        e.target.classList.contains('item-unit')) {
      debouncedSaveFormDraft();
    }
  });
  
  // Auto-save on form field changes
  document.getElementById('invoice-form').addEventListener('input', function(e) {
    // Skip if it's in the items-body as we handle that separately
    if (!e.target.closest('#items-body')) {
      debouncedSaveFormDraft();
    }
  });
  
  // Form actions
  document.getElementById('save-btn').addEventListener('click', saveInvoice);
  document.getElementById('clear-btn').addEventListener('click', clearForm);
  document.getElementById('export-pdf').addEventListener('click', exportToPDF);
  
  // Theme toggle
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  
  // Online/Offline detection
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  // Autosave before unload
  window.addEventListener('beforeunload', function(e) {
    if (hasUnsavedChanges()) {
      saveFormDraft();
      // Modern browsers no longer respect this, but we'll include it anyway
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  });
}

// Show the selected section and hide others
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll('.main-section').forEach(section => {
    section.style.display = 'none';
  });
  
  // Show the selected section
  const selectedSection = document.getElementById(sectionId + '-section');
  if (selectedSection) {
    selectedSection.style.display = 'block';
  }
}

// Add a new item row to the invoice
function addItemRow() {
  const tbody = document.getElementById('items-body');
  const newRow = document.createElement('tr');
  newRow.className = 'item-row';
  
  newRow.innerHTML = `
    <td><input type="text" class="form-control item-description" placeholder="Item description"></td>
    <td>
      <select class="form-select item-service-type">
        <option value="Operations">Operations</option>
        <option value="Consultation">Consultation</option>
        <option value="Traveling">Traveling</option>
        <option value="Other">Other</option>
      </select>
    </td>
    <td>
      <div class="input-group">
        <input type="number" class="form-control item-quantity" value="0" min="0">
        <select class="form-select item-unit">
          <option value="hours">hours</option>
          <option value="locations">locations</option>
          <option value="km">km</option>
        </select>
      </div>
    </td>
    <td><input type="number" class="form-control item-rate" value="0" min="0" step="0.01"></td>
    <td class="item-amount">$0.00</td>
    <td><button type="button" class="btn btn-sm btn-danger remove-item"><i class="bi bi-trash"></i></button></td>
  `;
  
  tbody.appendChild(newRow);
}

// Remove an item row
function removeItemRow(event) {
  const row = event.target.closest('tr');
  if (row && document.getElementById('items-body').children.length > 1) {
    row.remove();
    calculateTotals();
  } else {
    // Don't remove the last row, just clear it
    const inputs = row.querySelectorAll('input');
    inputs.forEach(input => {
      if (input.type === 'number') {
        input.value = 0;
      } else {
        input.value = '';
      }
    });
    
    // Reset selects
    const selects = row.querySelectorAll('select');
    selects.forEach(select => {
      select.selectedIndex = 0;
    });
    
    row.querySelector('.item-amount').textContent = '$0.00';
    calculateTotals();
  }
}

// Update the amount for a single row
function updateRowAmount(row) {
  const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
  const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
  const amount = quantity * rate;
  
  row.querySelector('.item-amount').textContent = '$' + amount.toFixed(2);
}

// Calculate totals for the invoice with GST and TVQ
function calculateTotals() {
  // Get all item amounts
  const amounts = Array.from(document.querySelectorAll('.item-amount')).map(el => {
    return parseFloat(el.textContent.replace('$', '')) || 0;
  });
  
  // Calculate subtotal
  const subtotal = amounts.reduce((sum, amount) => sum + amount, 0);
  
  // Get tax settings
  const applyGST = document.getElementById('apply-gst').checked;
  const applyTVQ = document.getElementById('apply-tvq').checked;
  const gstRate = parseFloat(document.getElementById('gst-rate').value) || 0;
  const tvqRate = parseFloat(document.getElementById('tvq-rate').value) || 0;
  
  // Calculate taxes
  const gstAmount = applyGST ? subtotal * (gstRate / 100) : 0;
  const tvqAmount = applyTVQ ? (subtotal + (applyGST ? gstAmount : 0)) * (tvqRate / 100) : 0;
  
  // Calculate total
  const total = subtotal + gstAmount + tvqAmount;
  
  // Update display
  document.getElementById('subtotal').textContent = '$' + subtotal.toFixed(2);
  document.getElementById('gst-amount').textContent = '$' + gstAmount.toFixed(2);
  document.getElementById('tvq-amount').textContent = '$' + tvqAmount.toFixed(2);
  document.getElementById('total').textContent = '$' + total.toFixed(2);
}

// Set default dates (today for invoice date, +30 days for payment due)
function setDefaultDates() {
  const today = new Date();
  
  // Set period dates to current month
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  // Set payment due to 7 days after the end of the period
  const dueDate = new Date(lastDay);
  dueDate.setDate(lastDay.getDate() + 7);
  
  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // YYYY-MM-DD format
  };
  
  document.getElementById('invoice-date').value = formatDate(today);
  document.getElementById('period-start').value = formatDate(firstDay);
  document.getElementById('period-end').value = formatDate(lastDay);
  document.getElementById('payment-due').value = formatDate(dueDate);
}

// Client data store
const clientsData = {
  '1': {
    company: 'NETCOR',
    address: '17585 DE L\'ALPINISME, MIRABEL, QC J7J 2J9',
    phone: '514-783-1460',
    website: 'NETCORPLUS.CA'
  },
  '2': {
    company: 'Optimized Leadership',
    address: '140 rue leduc, H7W 4E9, Laval, QC, Canada',
    phone: '4385022327',
    website: 'optimizedleadership.com'
  },
  '3': {
    company: 'Tech Solutions Inc.',
    address: '123 Tech Blvd, Montreal, QC H2X 1Y9',
    phone: '514-555-1234',
    website: 'techsolutions.com'
  }
};

// Logo handling and setup
function setupLogoHandling() {
  // Also save the hide logo placeholder preference
  const hidePlaceholder = document.getElementById('hide-logo-placeholder');
  
  // Setup hide logo checkbox - persist its state in localStorage
  hidePlaceholder.checked = localStorage.getItem('ol-hide-logo-placeholder') === 'true';
  hidePlaceholder.addEventListener('change', function() {
    localStorage.setItem('ol-hide-logo-placeholder', this.checked);
  });
  const logoUploadBtn = document.getElementById('logo-upload-btn');
  const logoUploadInput = document.getElementById('logo-upload');
  const logoPreview = document.getElementById('logo-preview');
  
  // Load saved logo if it exists
  const savedLogo = localStorage.getItem('ol-company-logo');
  if (savedLogo) {
    logoPreview.innerHTML = `<img src="${savedLogo}" alt="Company Logo" style="max-width: 100%; max-height: 100px;">`;
  }
  
  // Setup logo upload button
  logoUploadBtn.addEventListener('click', function() {
    logoUploadInput.click();
  });
  
  // Handle file selection
  logoUploadInput.addEventListener('change', function(e) {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      
      reader.onload = function(e) {
        const logoSrc = e.target.result;
        logoPreview.innerHTML = `<img src="${logoSrc}" alt="Company Logo" style="max-width: 100%; max-height: 100px;">`;
        localStorage.setItem('ol-company-logo', logoSrc);
      };
      
      reader.readAsDataURL(e.target.files[0]);
    }
  });
}

// Client selection handling
function setupClientHandling() {
  const clientSelect = document.getElementById('client-select');
  
  clientSelect.addEventListener('change', function() {
    const selectedClientId = this.value;
    
    if (selectedClientId && clientsData[selectedClientId]) {
      const clientData = clientsData[selectedClientId];
      
      // Populate client fields
      document.getElementById('client-company').value = clientData.company || '';
      document.getElementById('client-address').value = clientData.address || '';
      document.getElementById('client-phone').value = clientData.phone || '';
      document.getElementById('client-website').value = clientData.website || '';
    } else {
      // Clear client fields
      document.getElementById('client-company').value = '';
      document.getElementById('client-address').value = '';
      document.getElementById('client-phone').value = '';
      document.getElementById('client-website').value = '';
    }
    
    // Trigger autosave
    debouncedSaveFormDraft();
  });
}

// Setup tax handling
function setupTaxHandling() {
  const applyGST = document.getElementById('apply-gst');
  const applyTVQ = document.getElementById('apply-tvq');
  const gstRate = document.getElementById('gst-rate');
  const tvqRate = document.getElementById('tvq-rate');
  
  // Add event listeners for tax changes
  [applyGST, applyTVQ, gstRate, tvqRate].forEach(el => {
    el.addEventListener('change', calculateTotals);
    el.addEventListener('change', debouncedSaveFormDraft);
  });
}

// Save the current invoice
function saveInvoice() {
  try {
    // Get logo data
    const logoImg = document.querySelector('#logo-preview img');
    const logoSrc = logoImg ? logoImg.src : null;
    
    // Collect form data
    const invoiceData = {
      // Basic invoice info
      invoiceNumber: document.getElementById('invoice-number').value,
      invoiceDate: document.getElementById('invoice-date').value,
      periodStart: document.getElementById('period-start').value,
      periodEnd: document.getElementById('period-end').value,
      paymentDue: document.getElementById('payment-due').value,
      message: document.getElementById('invoice-message').value,
      logo: logoSrc,
      
      // Sender information
      from: {
        name: document.getElementById('from-name').value,
        email: document.getElementById('from-email').value,
        phone: document.getElementById('from-phone').value,
        address: document.getElementById('from-address').value
      },
      
      // Client information
      clientId: document.getElementById('client-select').value,
      client: {
        company: document.getElementById('client-company').value,
        address: document.getElementById('client-address').value,
        phone: document.getElementById('client-phone').value,
        website: document.getElementById('client-website').value
      },
      
      // Items/services
      items: [],
      
      // Tax information
      taxSettings: {
        applyGST: document.getElementById('apply-gst').checked,
        applyTVQ: document.getElementById('apply-tvq').checked,
        gstRate: document.getElementById('gst-rate').value,
        tvqRate: document.getElementById('tvq-rate').value
      },
      
      // Payment information
      paymentMethods: document.getElementById('payment-methods').value,
      paymentInstructions: document.getElementById('payment-instructions').value,
      notes: document.getElementById('invoice-notes').value,
      
      // Calculated totals
      subtotal: document.getElementById('subtotal').textContent,
      gstAmount: document.getElementById('gst-amount').textContent,
      tvqAmount: document.getElementById('tvq-amount').textContent,
      total: document.getElementById('total').textContent,
      
      // Metadata
      timestamp: new Date().toISOString()
    };
    
    // Collect items
    document.querySelectorAll('#items-body tr').forEach(row => {
      invoiceData.items.push({
        description: row.querySelector('.item-description').value,
        serviceType: row.querySelector('.item-service-type').value,
        quantity: row.querySelector('.item-quantity').value,
        unit: row.querySelector('.item-unit').value,
        rate: row.querySelector('.item-rate').value,
        amount: row.querySelector('.item-amount').textContent
      });
    });
    
    // Save to localStorage
    const invoices = JSON.parse(localStorage.getItem('ol-invoices') || '[]');
    invoices.push(invoiceData);
    localStorage.setItem('ol-invoices', JSON.stringify(invoices));
    
    // Clear the draft since we've saved the invoice
    localStorage.removeItem('ol-invoice-draft');
    
    // Show success message
    window.utils.showNotification('Invoice saved successfully', 'success');
    
    return true;
  } catch (error) {
    console.error('Error saving invoice:', error);
    window.utils.showNotification('Error saving invoice: ' + error.message, 'danger');
    return false;
  }
}

// Clear the invoice form
function clearForm() {
  if (!confirm('Are you sure you want to clear the form? All unsaved data will be lost.')) {
    return;
  }
  
  // Reset the main form
  document.getElementById('invoice-form').reset();
  
  // Clear logo preview if there is one
  const logoPreview = document.getElementById('logo-preview');
  logoPreview.innerHTML = '<span>YOUR<br>LOGO<br>HERE</span>';
  
  // Clear client details
  document.getElementById('client-company').value = '';
  document.getElementById('client-address').value = '';
  document.getElementById('client-phone').value = '';
  document.getElementById('client-website').value = '';
  
  // Clear item rows except the first one
  const tbody = document.getElementById('items-body');
  while (tbody.children.length > 1) {
    tbody.removeChild(tbody.lastChild);
  }
  
  // Reset the first row values
  const firstRow = tbody.firstChild;
  if (firstRow) {
    firstRow.querySelector('.item-description').value = '';
    firstRow.querySelector('.item-quantity').value = '0';
    firstRow.querySelector('.item-rate').value = '0';
    firstRow.querySelector('.item-amount').textContent = '$0.00';
    
    // Reset the dropdowns
    firstRow.querySelector('.item-service-type').selectedIndex = 0;
    firstRow.querySelector('.item-unit').selectedIndex = 0;
  }
  
  // Reset totals
  calculateTotals();
  
  // Reset dates
  setDefaultDates();
  
  // Clear draft storage
  localStorage.removeItem('ol-invoice-draft');
  
  window.utils.showNotification('Form cleared', 'info');
}

// Export the invoice to PDF or print view with error handling
function exportToPDF() {
  try {
    // Save form data first to prevent data loss
    saveFormDraft();
    
    console.log("Starting PDF export...");
    
    // Create a new window for the export view
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    
    if (!printWindow) {
      throw new Error('Unable to open print window. Your browser might be blocking pop-ups.');
    }
    
    // Collect all invoice data
    const invoiceData = collectInvoiceData();
    
    // Generate HTML for the PDF using the export utility
    const exportHTML = window.exportUtils.generatePDFHTML(invoiceData);
    
    // Try-catch around all window operations
    try {
      // Write the HTML to the new window
      printWindow.document.open();
      printWindow.document.write(exportHTML);
      printWindow.document.close();
      
      // Show success message
      window.utils.showNotification('Invoice exported successfully', 'success');
    } catch (windowError) {
      console.error('Error writing to print window:', windowError);
      window.utils.showNotification('Error creating print view. Please check browser pop-up settings.', 'danger');
      
      // Try to close the window if it exists but we couldn't write to it
      try {
        if (printWindow) printWindow.close();
      } catch (e) {
        // Ignore errors when trying to close
      }
    }
  } catch (error) {
    console.error('PDF export error:', error);
    window.utils.showNotification('Error exporting PDF: ' + error.message, 'danger');
  }
}

// Collect all the invoice data for export
function collectInvoiceData() {
  // Get logo data and preferences
  const logoImg = document.querySelector('#logo-preview img');
  const logoSrc = logoImg ? logoImg.src : null;
  const hideLogoPlaceholder = document.getElementById('hide-logo-placeholder').checked;
  
  // Get invoice data
  const invoiceNumber = document.getElementById('invoice-number').value;
  const invoiceDate = document.getElementById('invoice-date').value;
  const formattedInvoiceDate = invoiceDate ? new Date(invoiceDate).toLocaleDateString() : '';
  
  const periodStart = document.getElementById('period-start').value;
  const formattedPeriodStart = periodStart ? new Date(periodStart).toLocaleDateString() : '';
  
  const periodEnd = document.getElementById('period-end').value;
  const formattedPeriodEnd = periodEnd ? new Date(periodEnd).toLocaleDateString() : '';
  
  const paymentDue = document.getElementById('payment-due').value;
  const formattedPaymentDue = paymentDue ? new Date(paymentDue).toLocaleDateString() : '';
  
  // Get from information
  const fromName = document.getElementById('from-name').value;
  const fromEmail = document.getElementById('from-email').value;
  const fromPhone = document.getElementById('from-phone').value;
  const fromAddress = document.getElementById('from-address').value;
  
  // Get client information
  const clientCompany = document.getElementById('client-company').value;
  const clientAddress = document.getElementById('client-address').value;
  const clientPhone = document.getElementById('client-phone').value;
  const clientWebsite = document.getElementById('client-website').value;
  
  // Get message
  const messageText = document.getElementById('invoice-message').value || '';
  
  // Get payment information
  const paymentMethods = document.getElementById('payment-methods').value || '';
  const paymentInstructions = document.getElementById('payment-instructions').value || '';
  const notes = document.getElementById('invoice-notes').value || '';
  
  // Calculate totals
  calculateTotals();
  const subtotal = document.getElementById('subtotal').textContent;
  const gstAmount = document.getElementById('gst-amount').textContent;
  const tvqAmount = document.getElementById('tvq-amount').textContent;
  const total = document.getElementById('total').textContent;
  
  // Get items
  const items = [];
  document.querySelectorAll('#items-body tr').forEach(row => {
    try {
      const description = row.querySelector('.item-description')?.value || '';
      const serviceType = row.querySelector('.item-service-type')?.value || '';
      const quantity = row.querySelector('.item-quantity')?.value || '0';
      const unit = row.querySelector('.item-unit')?.value || '';
      const rate = row.querySelector('.item-rate')?.value || '0';
      const amount = row.querySelector('.item-amount')?.textContent || '$0.00';
      
      // Only include rows that have some content
      if (description || parseFloat(quantity) > 0 || parseFloat(rate) > 0) {
        items.push({ description, serviceType, quantity, unit, rate, amount });
      }
    } catch (rowError) {
      console.error('Error processing invoice row:', rowError);
    }
  });
  
  return {
    logoSrc,
    hideLogoPlaceholder,
    invoiceNumber,
    formattedInvoiceDate,
    formattedPeriodStart,
    formattedPeriodEnd,
    formattedPaymentDue,
    fromName,
    fromEmail,
    fromPhone,
    fromAddress,
    clientCompany,
    clientAddress,
    clientPhone,
    clientWebsite,
    messageText,
    paymentMethods,
    paymentInstructions,
    notes,
    subtotal,
    gstAmount,
    tvqAmount,
    total,
    items
  };
}

// Note: We're using window.utils directly throughout the code
// No need to destructure the functions here which causes duplicate declarations

// Setup PDF buttons functionality
function setupPDFButtons() {
  // Download PDF button
  const downloadPdfBtn = document.getElementById('download-pdf');
  if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', function() {
      // First collect all the data and generate PDF
      const invoiceData = collectInvoiceData();
      
      try {
        // Create spinner to show loading
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm me-2';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        
        // Save original button content
        const originalContent = this.innerHTML;
        
        // Show loading state
        this.prepend(spinner);
        this.disabled = true;
        
        // Use html2canvas and jsPDF from CDN
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(html2canvasScript);
        
        const jsPdfScript = document.createElement('script');
        jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(jsPdfScript);
        
        jsPdfScript.onload = function() {
          // Create a temporary element to render the invoice
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.top = '-9999px';
          document.body.appendChild(tempContainer);
          
          // Generate HTML for the PDF
          const exportHTML = window.exportUtils.generatePDFHTML(invoiceData);
          tempContainer.innerHTML = exportHTML;
          
          // Use setTimeout to allow the content to render
          setTimeout(() => {
            const invoiceElement = tempContainer.querySelector('.invoice-container');
            if (!invoiceElement) {
              throw new Error('Could not find invoice container');
            }
            
            // Use html2canvas to render the invoice
            html2canvas(invoiceElement, {
              scale: 2,
              useCORS: true,
              allowTaint: true
            }).then(canvas => {
              // Create PDF with jsPDF
              const pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              
              const imgData = canvas.toDataURL('image/png');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = canvas.width;
              const imgHeight = canvas.height;
              const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
              const imgX = (pdfWidth - imgWidth * ratio) / 2;
              
              pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
              
              // Download the PDF
              pdf.save(`invoice-${invoiceData.invoiceNumber.replace('#', '').trim()}.pdf`);
              
              // Clean up
              document.body.removeChild(tempContainer);
              downloadPdfBtn.innerHTML = originalContent;
              downloadPdfBtn.disabled = false;
              
              window.utils.showNotification('PDF download complete', 'success');
            }).catch(err => {
              console.error('Error generating PDF:', err);
              window.utils.showNotification('Error generating PDF: ' + err.message, 'danger');
              
              // Reset button
              downloadPdfBtn.innerHTML = originalContent;
              downloadPdfBtn.disabled = false;
              document.body.removeChild(tempContainer);
            });
          }, 500);
        };
        
        jsPdfScript.onerror = function() {
          window.utils.showNotification('Error loading PDF generation libraries', 'danger');
          downloadPdfBtn.innerHTML = originalContent;
          downloadPdfBtn.disabled = false;
        };
      } catch (error) {
        console.error('Download PDF error:', error);
        window.utils.showNotification('Error downloading PDF: ' + error.message, 'danger');
      }
    });
  }
  
  // Save As PDF button
  const saveAsPdfBtn = document.getElementById('save-as-pdf');
  if (saveAsPdfBtn) {
    saveAsPdfBtn.addEventListener('click', function() {
      // Check if File System Access API is supported
      if (!('showSaveFilePicker' in window)) {
        window.utils.showNotification('Save As feature is not supported in this browser. Try using Chrome or Edge instead.', 'warning');
        return;
      }
      
      // First collect all the data and generate PDF
      const invoiceData = collectInvoiceData();
      
      try {
        // Create spinner to show loading
        const spinner = document.createElement('span');
        spinner.className = 'spinner-border spinner-border-sm me-2';
        spinner.setAttribute('role', 'status');
        spinner.setAttribute('aria-hidden', 'true');
        
        // Save original button content
        const originalContent = this.innerHTML;
        
        // Show loading state
        this.prepend(spinner);
        this.disabled = true;
        
        // Use html2canvas and jsPDF from CDN
        const html2canvasScript = document.createElement('script');
        html2canvasScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
        document.head.appendChild(html2canvasScript);
        
        const jsPdfScript = document.createElement('script');
        jsPdfScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        document.head.appendChild(jsPdfScript);
        
        jsPdfScript.onload = function() {
          // Create a temporary element to render the invoice
          const tempContainer = document.createElement('div');
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px';
          tempContainer.style.top = '-9999px';
          document.body.appendChild(tempContainer);
          
          // Generate HTML for the PDF
          const exportHTML = window.exportUtils.generatePDFHTML(invoiceData);
          tempContainer.innerHTML = exportHTML;
          
          // Use setTimeout to allow the content to render
          setTimeout(async () => {
            try {
              const invoiceElement = tempContainer.querySelector('.invoice-container');
              if (!invoiceElement) {
                throw new Error('Could not find invoice container');
              }
              
              // Use html2canvas to render the invoice
              const canvas = await html2canvas(invoiceElement, {
                scale: 2,
                useCORS: true,
                allowTaint: true
              });
              
              // Create PDF with jsPDF
              const pdf = new window.jspdf.jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
              });
              
              const imgData = canvas.toDataURL('image/png');
              const pdfWidth = pdf.internal.pageSize.getWidth();
              const pdfHeight = pdf.internal.pageSize.getHeight();
              const imgWidth = canvas.width;
              const imgHeight = canvas.height;
              const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
              const imgX = (pdfWidth - imgWidth * ratio) / 2;
              
              pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
              
              // Convert to blob
              const pdfBlob = pdf.output('blob');
              
              // Use the File System Access API to save the file
              try {
                const suggestedName = `invoice-${invoiceData.invoiceNumber.replace('#', '').trim()}.pdf`;
                const fileHandle = await window.showSaveFilePicker({
                  suggestedName: suggestedName,
                  types: [{
                    description: 'PDF Document',
                    accept: {'application/pdf': ['.pdf']}
                  }]
                });
                
                // Create a FileSystemWritableFileStream to write to
                const writable = await fileHandle.createWritable();
                
                // Write the contents of the file to the stream
                await writable.write(pdfBlob);
                
                // Close the file and write the contents to disk
                await writable.close();
                
                window.utils.showNotification('PDF file saved successfully', 'success');
              } catch (fsError) {
                // User may have cancelled the save dialog
                if (fsError.name !== 'AbortError') {
                  console.error('File System API error:', fsError);
                  window.utils.showNotification('Error saving file: ' + fsError.message, 'danger');
                }
              }
              
              // Clean up
              document.body.removeChild(tempContainer);
              saveAsPdfBtn.innerHTML = originalContent;
              saveAsPdfBtn.disabled = false;
            } catch (error) {
              console.error('Error in save as PDF:', error);
              window.utils.showNotification('Error saving PDF: ' + error.message, 'danger');
              
              // Reset button
              saveAsPdfBtn.innerHTML = originalContent;
              saveAsPdfBtn.disabled = false;
              document.body.removeChild(tempContainer);
            }
          }, 500);
        };
        
        jsPdfScript.onerror = function() {
          window.utils.showNotification('Error loading PDF generation libraries', 'danger');
          saveAsPdfBtn.innerHTML = originalContent;
          saveAsPdfBtn.disabled = false;
        };
      } catch (error) {
        console.error('Save As PDF error:', error);
        window.utils.showNotification('Error saving PDF: ' + error.message, 'danger');
      }
    });
  }
}

// Setup Install App button functionality
function setupInstallAppButton() {
  const showInstallBtn = document.getElementById('show-install-btn');
  
  // Function to check if app can be installed and show button if so
  const checkInstallable = () => {
    if (deferredPrompt && showInstallBtn) {
      showInstallBtn.style.display = 'inline-block';
      
      // Add click event to trigger install
      showInstallBtn.addEventListener('click', () => {
        // Hide the button once clicked
        showInstallBtn.style.display = 'none';
        
        // Show the installation prompt
        deferredPrompt.prompt();
        
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
          if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
            window.utils.showNotification('App installation started', 'success');
          } else {
            console.log('User dismissed the install prompt');
            // Show the button again if they dismiss
            showInstallBtn.style.display = 'inline-block';
          }
          
          // Clear the saved prompt
          deferredPrompt = null;
        });
      });
    } else {
      if (showInstallBtn) {
        showInstallBtn.style.display = 'none';
      }
    }
  };
  
  // Initial check
  checkInstallable();
  
  // Also check whenever beforeinstallprompt occurs
  window.addEventListener('beforeinstallprompt', () => {
    checkInstallable();
  });
  
  // Hide when app is installed
  window.addEventListener('appinstalled', () => {
    if (showInstallBtn) {
      showInstallBtn.style.display = 'none';
    }
  });
}
