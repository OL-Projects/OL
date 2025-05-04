// Utility functions for OL Invoicing App

// Show a notification message
function showNotification(message, type = 'success') {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `alert alert-${type} position-fixed`;
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '1050';
  notification.innerHTML = message;
  
  // Add to body
  document.body.appendChild(notification);
  
  // Automatically remove after 3 seconds
  setTimeout(() => {
    notification.classList.add('fade');
    setTimeout(() => {
      if (document.body.contains(notification)) {
        document.body.removeChild(notification);
      }
    }, 300);
  }, 3000);
}

// Initialize theme based on user preference
function initTheme() {
  const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
    document.body.classList.add('dark-mode');
    document.getElementById('theme-icon').classList.remove('bi-moon-fill');
    document.getElementById('theme-icon').classList.add('bi-sun-fill');
  }
}

// Toggle between light and dark mode
function toggleTheme() {
  if (document.body.classList.contains('dark-mode')) {
    // Switch to light mode
    document.body.classList.remove('dark-mode');
    localStorage.setItem('theme', 'light');
    document.getElementById('theme-icon').classList.remove('bi-sun-fill');
    document.getElementById('theme-icon').classList.add('bi-moon-fill');
  } else {
    // Switch to dark mode
    document.body.classList.add('dark-mode');
    localStorage.setItem('theme', 'dark');
    document.getElementById('theme-icon').classList.remove('bi-moon-fill');
    document.getElementById('theme-icon').classList.add('bi-sun-fill');
  }
}

// Update online/offline status
function updateOnlineStatus() {
  const offlineIndicator = document.getElementById('offline-indicator');
  
  if (navigator.onLine) {
    offlineIndicator.style.display = 'none';
  } else {
    offlineIndicator.style.display = 'flex';
  }
}

// Debounce function to limit how often a function can be called
function debounce(func, wait) {
  let timeout;
  return function(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Save the current form state as a draft
function saveFormDraft() {
  try {
    // Collect basic form data
    const formData = {
      // Basic info
      invoiceNumber: document.getElementById('invoice-number').value,
      invoiceDate: document.getElementById('invoice-date').value,
      periodStart: document.getElementById('period-start').value,
      periodEnd: document.getElementById('period-end').value,
      paymentDue: document.getElementById('payment-due').value,
      message: document.getElementById('invoice-message').value,
      
      // Sender information
      fromName: document.getElementById('from-name').value,
      fromEmail: document.getElementById('from-email').value,
      fromPhone: document.getElementById('from-phone').value,
      fromAddress: document.getElementById('from-address').value,
      
      // Client information
      clientId: document.getElementById('client-select').value,
      clientCompany: document.getElementById('client-company').value,
      clientAddress: document.getElementById('client-address').value,
      clientPhone: document.getElementById('client-phone').value,
      clientWebsite: document.getElementById('client-website').value,
      
      // Tax information
      applyGST: document.getElementById('apply-gst').checked,
      applyTVQ: document.getElementById('apply-tvq').checked,
      gstRate: document.getElementById('gst-rate').value,
      tvqRate: document.getElementById('tvq-rate').value,
      
      // Payment information
      paymentMethods: document.getElementById('payment-methods').value,
      paymentInstructions: document.getElementById('payment-instructions').value,
      notes: document.getElementById('invoice-notes').value,
      
      // Logo data
      logo: document.querySelector('#logo-preview img')?.src || null,
      
      // Items
      items: [],
      
      // Metadata
      lastModified: new Date().toISOString()
    };
    
    // Collect items
    document.querySelectorAll('#items-body tr').forEach(row => {
      try {
        formData.items.push({
          description: row.querySelector('.item-description').value,
          serviceType: row.querySelector('.item-service-type').value,
          quantity: row.querySelector('.item-quantity').value,
          unit: row.querySelector('.item-unit').value,
          rate: row.querySelector('.item-rate').value
        });
      } catch (e) {
        console.error('Error saving item row:', e);
      }
    });
    
    // Save to localStorage
    localStorage.setItem('ol-invoice-draft', JSON.stringify(formData));
    console.log('Draft saved:', new Date().toLocaleTimeString());
  } catch (error) {
    console.error('Error saving draft:', error);
  }
}

// Create a debounced version of the saveFormDraft function
const debouncedSaveFormDraft = debounce(() => {
  saveFormDraft();
}, 2000); // Save after 2 seconds of inactivity

// Check if there are unsaved changes by comparing form data with the last saved invoice
function hasUnsavedChanges() {
  try {
    // Get form values
    const invoiceNumber = document.getElementById('invoice-number').value;
    const invoiceDate = document.getElementById('invoice-date').value;
    const paymentDue = document.getElementById('payment-due').value;
    const clientValue = document.getElementById('client-select').value;
    
    // Check if we have any data entered
    if (invoiceNumber.trim() !== '#27001' ||  // Default invoice number
        clientValue.trim() !== '' ||
        document.getElementById('invoice-message').value.trim() !== '' ||
        document.querySelectorAll('#items-body tr').length > 1) {
      return true;
    }
    
    // Check if any item row has content
    let hasContent = false;
    document.querySelectorAll('#items-body tr').forEach(row => {
      const description = row.querySelector('.item-description').value;
      const quantity = parseFloat(row.querySelector('.item-quantity').value) || 0;
      const rate = parseFloat(row.querySelector('.item-rate').value) || 0;
      
      if (description.trim() !== '' || quantity > 0 || rate > 0) {
        hasContent = true;
      }
    });
    
    return hasContent;
  } catch (error) {
    console.error('Error checking for unsaved changes:', error);
    return false;
  }
}

// Check for and restore any unsaved draft
function checkForUnsavedDraft() {
  try {
    const draftJson = localStorage.getItem('ol-invoice-draft');
    if (!draftJson) return;
    
    const draft = JSON.parse(draftJson);
    const lastModified = new Date(draft.lastModified);
    const now = new Date();
    const hoursDiff = (now - lastModified) / (1000 * 60 * 60);
    
    // Only offer to restore if the draft is less than 24 hours old
    if (hoursDiff < 24) {
      const formattedDate = lastModified.toLocaleString();
      
      // Create a restore notification with buttons
      const notification = document.createElement('div');
      notification.className = 'alert alert-info position-fixed';
      notification.style.top = '20px';
      notification.style.right = '20px';
      notification.style.zIndex = '1050';
      notification.style.maxWidth = '400px';
      notification.style.display = 'flex';
      notification.style.flexDirection = 'column';
      notification.style.gap = '10px';
      
      notification.innerHTML = `
        <div>Unsaved draft found from ${formattedDate}</div>
        <div style="display: flex; gap: 10px;">
          <button id="restore-draft" class="btn btn-sm btn-primary">Restore</button>
          <button id="discard-draft" class="btn btn-sm btn-outline-secondary">Discard</button>
        </div>
      `;
      
      // Add to body
      document.body.appendChild(notification);
      
      // Add event listeners to buttons
      document.getElementById('restore-draft').addEventListener('click', function() {
        restoreDraft(draft);
        document.body.removeChild(notification);
      });
      
      document.getElementById('discard-draft').addEventListener('click', function() {
        localStorage.removeItem('ol-invoice-draft');
        document.body.removeChild(notification);
      });
      
      // Automatically remove after 60 seconds if no action is taken
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 60000);
    }
  } catch (error) {
    console.error('Error checking for draft:', error);
  }
}

// Restore a draft to the form
function restoreDraft(draft) {
  try {
    // Restore basic form fields
    document.getElementById('invoice-number').value = draft.invoiceNumber || '';
    document.getElementById('invoice-date').value = draft.invoiceDate || '';
    document.getElementById('period-start').value = draft.periodStart || '';
    document.getElementById('period-end').value = draft.periodEnd || '';
    document.getElementById('payment-due').value = draft.paymentDue || '';
    document.getElementById('invoice-message').value = draft.message || '';
    
    // Restore sender information
    document.getElementById('from-name').value = draft.fromName || '';
    document.getElementById('from-email').value = draft.fromEmail || '';
    document.getElementById('from-phone').value = draft.fromPhone || '';
    document.getElementById('from-address').value = draft.fromAddress || '';
    
    // Restore client information
    document.getElementById('client-select').value = draft.clientId || '';
    document.getElementById('client-company').value = draft.clientCompany || '';
    document.getElementById('client-address').value = draft.clientAddress || '';
    document.getElementById('client-phone').value = draft.clientPhone || '';
    document.getElementById('client-website').value = draft.clientWebsite || '';
    
    // Restore tax settings
    document.getElementById('apply-gst').checked = draft.applyGST || false;
    document.getElementById('apply-tvq').checked = draft.applyTVQ || false;
    document.getElementById('gst-rate').value = draft.gstRate || '5.000';
    document.getElementById('tvq-rate').value = draft.tvqRate || '9.975';
    
    // Restore payment information
    document.getElementById('payment-methods').value = draft.paymentMethods || '';
    document.getElementById('payment-instructions').value = draft.paymentInstructions || '';
    document.getElementById('invoice-notes').value = draft.notes || '';
    
    // Restore logo if present
    if (draft.logo) {
      const logoPreview = document.getElementById('logo-preview');
      logoPreview.innerHTML = `<img src="${draft.logo}" alt="Company Logo" style="max-width: 100%; max-height: 100px;">`;
    }
    
    // Clear existing items except the first row
    const tbody = document.getElementById('items-body');
    while (tbody.children.length > 1) {
      tbody.removeChild(tbody.lastChild);
    }
    
    // Restore items
    if (draft.items && draft.items.length > 0) {
      // Update the first row
      const firstRow = tbody.firstChild;
      if (firstRow) {
        firstRow.querySelector('.item-description').value = draft.items[0].description || '';
        firstRow.querySelector('.item-service-type').value = draft.items[0].serviceType || 'Operations';
        firstRow.querySelector('.item-quantity').value = draft.items[0].quantity || '0';
        firstRow.querySelector('.item-unit').value = draft.items[0].unit || 'hours';
        firstRow.querySelector('.item-rate').value = draft.items[0].rate || '0';
        updateRowAmount(firstRow);
      }
      
      // Add additional rows
      for (let i = 1; i < draft.items.length; i++) {
        const item = draft.items[i];
        addItemRow();
        const newRow = tbody.lastChild;
        
        newRow.querySelector('.item-description').value = item.description || '';
        newRow.querySelector('.item-service-type').value = item.serviceType || 'Operations';
        newRow.querySelector('.item-quantity').value = item.quantity || '0';
        newRow.querySelector('.item-unit').value = item.unit || 'hours';
        newRow.querySelector('.item-rate').value = item.rate || '0';
        updateRowAmount(newRow);
      }
    }
    
    // Recalculate totals
    calculateTotals();
    
    showNotification('Draft restored successfully', 'success');
  } catch (error) {
    console.error('Error restoring draft:', error);
    showNotification('Error restoring draft', 'danger');
  }
}

// Export utility functions
window.utils = {
  showNotification,
  initTheme,
  toggleTheme,
  updateOnlineStatus,
  debounce,
  saveFormDraft,
  debouncedSaveFormDraft,
  hasUnsavedChanges,
  checkForUnsavedDraft,
  restoreDraft
};
