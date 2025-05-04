// PDF Export functions for OL Invoicing

// Generate the complete HTML for PDF exports
function generatePDFHTML(data) {
  const hideLogoPlaceholder = data.hideLogoPlaceholder || false;
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice #${data.invoiceNumber}</title>
      <style>
        body {
          font-family: 'Roboto', 'Segoe UI', Arial, sans-serif;
          color: #333;
          line-height: 1.5;
          margin: 0;
          padding: 20px;
          user-select: text;
          -webkit-user-select: text;
        }
        .invoice-container {
          max-width: 800px;
          margin: 0 auto;
          border: 1px solid #eee;
          padding: 40px;
          box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
        }
        .invoice-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 40px;
          align-items: center;
        }
        .invoice-title {
          font-size: 40px;
          font-weight: 700;
          color: #343a50;
          margin: 0;
        }
        .logo-container {
          width: 150px;
          height: 150px;
          text-align: center;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo-container img {
          max-width: 100%;
          max-height: 100%;
        }
        .logo-container span {
          text-align: center;
          font-size: 14px;
          color: #777;
        }
        .invoice-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 30px;
        }
        .invoice-info-section {
          width: 45%;
        }
        .section-title {
          font-weight: 700;
          margin-bottom: 8px;
          color: #343a50;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .invoice-message {
          margin-bottom: 30px;
          font-style: italic;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
        }
        th {
          background-color: #f8f9fa;
          text-align: left;
          padding: 12px;
          border-bottom: 2px solid #ddd;
        }
        td {
          padding: 12px;
          border-bottom: 1px solid #ddd;
        }
        .amount-column {
          text-align: right;
        }
        .totals-section {
          width: 40%;
          margin-left: auto;
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 5px;
          background-color: #f9f9f9;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
        }
        .grand-total {
          font-weight: 700;
          font-size: 1.2em;
          border-top: 2px solid #ddd;
          padding-top: 12px;
          margin-top: 10px;
        }
        .payment-section, .notes-section {
          margin-top: 30px;
          padding: 20px;
          background-color: #f9f9f9;
          border-radius: 5px;
        }
        .footer {
          margin-top: 50px;
          text-align: center;
          color: #777;
          font-size: 0.9em;
        }
        @media print {
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .invoice-container {
            border: none;
            box-shadow: none;
          }
          .control-buttons {
            display: none !important;
          }
        }
        
        /* Button styles */
        .control-buttons {
          position: fixed;
          bottom: 20px;
          right: 20px;
          display: flex;
          flex-direction: column;
          gap: 10px;
          z-index: 1000;
        }
        
        .download-button {
          padding: 10px 15px;
          background-color: #343a50;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 8px;
          box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
          font-family: Arial, sans-serif;
          font-size: 14px;
          width: 180px;
        }
        
        .download-button:hover {
          background-color: #444b66;
        }
        
        .download-button:active {
          transform: translateY(1px);
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        }
        
        .save-as-button {
          background-color: #28a745;
        }
        
        .save-as-button:hover {
          background-color: #218838;
        }
        
        .browser-not-supported {
          font-size: 12px;
          color: #dc3545;
          text-align: center;
          margin-top: 5px;
          max-width: 180px;
        }
        
        .loading-indicator {
          display: none;
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(255, 255, 255, 0.8);
          z-index: 2000;
          align-items: center;
          justify-content: center;
          flex-direction: column;
        }
        
        .spinner {
          border: 5px solid #f3f3f3;
          border-top: 5px solid #343a50;
          border-radius: 50%;
          width: 50px;
          height: 50px;
          animation: spin 2s linear infinite;
          margin-bottom: 20px;
        }
        
        .loading-text {
          font-size: 16px;
          font-weight: bold;
          color: #343a50;
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    </head>
    <body>
      <div class="invoice-container">
        <div class="invoice-header">
          <h1 class="invoice-title">INVOICE</h1>
          <div class="logo-container">
            ${data.logoSrc 
            ? `<img src="${data.logoSrc}" alt="Company Logo">` 
            : hideLogoPlaceholder 
              ? '' 
              : '<span>YOUR<br>LOGO<br>HERE</span>'}
          </div>
        </div>
        
        ${data.messageText ? `
        <div class="invoice-message">
          ${data.messageText}
        </div>
        ` : ''}
        
        <div class="invoice-info">
          <div class="invoice-info-section">
            <div class="section-title">From</div>
            ${data.fromName ? `<div>${data.fromName}</div>` : ''}
            ${data.fromEmail ? `<div>Email: ${data.fromEmail}</div>` : ''}
            ${data.fromPhone ? `<div>Phone: ${data.fromPhone}</div>` : ''}
            ${data.fromAddress ? `<div>Address: ${data.fromAddress}</div>` : ''}
          </div>
          <div class="invoice-info-section">
            <div class="section-title">Bill To</div>
            ${data.clientCompany ? `<div>${data.clientCompany}</div>` : ''}
            ${data.clientAddress ? `<div>${data.clientAddress}</div>` : ''}
            ${data.clientPhone ? `<div>Phone: ${data.clientPhone}</div>` : ''}
            ${data.clientWebsite ? `<div>Website: ${data.clientWebsite}</div>` : ''}
          </div>
        </div>
        
        <div class="invoice-info">
          <div class="invoice-info-section">
            <div class="section-title">Invoice Details</div>
            <div><strong>Invoice Number:</strong> ${data.invoiceNumber}</div>
            ${data.formattedInvoiceDate ? `<div><strong>Date:</strong> ${data.formattedInvoiceDate}</div>` : ''}
          </div>
          <div class="invoice-info-section">
            <div class="section-title">Payment Details</div>
            ${data.formattedPeriodStart ? `<div><strong>Period Start:</strong> ${data.formattedPeriodStart}</div>` : ''}
            ${data.formattedPeriodEnd ? `<div><strong>Period End:</strong> ${data.formattedPeriodEnd}</div>` : ''}
            ${data.formattedPaymentDue ? `<div><strong>Payment Due:</strong> ${data.formattedPaymentDue}</div>` : ''}
          </div>
        </div>
        
        <div class="section-title">Services</div>
        <table>
          <thead>
            <tr>
              <th style="width: 35%;">Description</th>
              <th style="width: 15%;">Service Type</th>
              <th style="width: 15%;">Quantity</th>
              <th style="width: 15%;">Rate</th>
              <th class="amount-column" style="width: 20%;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${data.items.length > 0 ? data.items.map(item => `
              <tr>
                <td>${item.description}</td>
                <td>${item.serviceType}</td>
                <td>${item.quantity} ${item.unit}</td>
                <td>${item.rate}</td>
                <td class="amount-column">${item.amount}</td>
              </tr>
            `).join('') : `
              <tr>
                <td colspan="5" style="text-align: center;">No items added</td>
              </tr>
            `}
          </tbody>
        </table>
        
        <div class="totals-section">
          <div class="total-row">
            <span>Subtotal:</span>
            <span>${data.subtotal}</span>
          </div>
          <div class="total-row">
            <span>GST:</span>
            <span>${data.gstAmount}</span>
          </div>
          <div class="total-row">
            <span>TVQ:</span>
            <span>${data.tvqAmount}</span>
          </div>
          <div class="total-row grand-total">
            <span>Total:</span>
            <span>${data.total}</span>
          </div>
        </div>
        
        ${data.paymentMethods || data.paymentInstructions ? `
        <div class="payment-section">
          <div class="section-title">Payment Information</div>
          ${data.paymentMethods ? `<div><strong>Payment Methods:</strong> ${data.paymentMethods}</div>` : ''}
          ${data.paymentInstructions ? `<div><strong>Payment Instructions:</strong> ${data.paymentInstructions}</div>` : ''}
        </div>
        ` : ''}
        
        ${data.notes ? `
        <div class="notes-section">
          <div class="section-title">Notes</div>
          <div>${data.notes}</div>
        </div>
        ` : ''}
        
        <div class="footer">
          Thank you for your business!
        </div>
      </div>
      
      <!-- Loading indicator -->
      <div id="loading-indicator" class="loading-indicator">
        <div class="spinner"></div>
        <div class="loading-text">Generating PDF...</div>
      </div>
      
      <!-- Control buttons -->
      <div class="control-buttons">
        <button id="quick-download" class="download-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
            <path d="M7.646 11.854a.5.5 0 0 0 .708 0l3-3a.5.5 0 0 0-.708-.708L8.5 10.293V1.5a.5.5 0 0 0-1 0v8.793L5.354 8.146a.5.5 0 1 0-.708.708l3 3z"/>
          </svg>
          Quick Download
        </button>
        <button id="save-as" class="download-button save-as-button">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
            <path d="M8.5 1.5A1.5 1.5 0 0 1 10 0h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h6c-.314.418-.5.937-.5 1.5v6h-2a.5.5 0 0 0-.354.854l2.5 2.5a.5.5 0 0 0 .708 0l2.5-2.5A.5.5 0 0 0 10.5 7.5h-2v-6z"/>
          </svg>
          Save As...
        </button>
        <div id="fsapi-support-message" class="browser-not-supported" style="display: none;">
          "Save As" not supported in this browser
        </div>
      </div>
      
      <script>
        // Handle errors
        window.onerror = function(message, source, lineno, colno, error) {
          console.error('Error in export page:', message, error);
          document.body.innerHTML = '<div style="color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; border-radius: 4px; padding: 20px; margin: 20px;">An error occurred while displaying the invoice. Please try again or contact support.</div>' + document.body.innerHTML;
          return true;
        };

        // Set up functionality when the page loads
        document.addEventListener('DOMContentLoaded', function() {
          // PDF.js library
          const scriptPdfJs = document.createElement('script');
          scriptPdfJs.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          document.head.appendChild(scriptPdfJs);
          
          // Add jsPDF library
          const scriptJsPdf = document.createElement('script');
          scriptJsPdf.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
          document.head.appendChild(scriptJsPdf);
          
          // Add html2canvas library
          const scriptHtml2Canvas = document.createElement('script');
          scriptHtml2Canvas.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
          document.head.appendChild(scriptHtml2Canvas);
          
          // Check if File System Access API is supported
          const isFileSystemAccessSupported = 'showSaveFilePicker' in window;
          
          if (!isFileSystemAccessSupported) {
            document.getElementById('save-as').style.display = 'none';
            document.getElementById('fsapi-support-message').style.display = 'block';
          }
          
          // Show loading indicator
          function showLoading() {
            document.getElementById('loading-indicator').style.display = 'flex';
          }
          
          // Hide loading indicator
          function hideLoading() {
            document.getElementById('loading-indicator').style.display = 'none';
          }
          
          // Initialize buttons after libraries have loaded
          scriptHtml2Canvas.onload = function() {
            // Get invoice number for filename
            const getInvoiceFilename = () => {
              const invoiceElement = document.querySelector('.invoice-container');
              const invoiceText = invoiceElement ? invoiceElement.textContent : '';
              const match = invoiceText.match(/Invoice Number:\\s*([^\\s\\n]+)/);
              const invoiceNumber = match ? match[1].replace('#', '').trim() : 'invoice';
              return \`invoice-\${invoiceNumber}.pdf\`;
            };
            
            // Generate PDF from the HTML content
            async function generatePDF() {
              showLoading();
              
              try {
                const invoiceElement = document.querySelector('.invoice-container');
                const options = {
                  scale: 2,
                  useCORS: true,
                  allowTaint: true,
                  backgroundColor: '#ffffff'
                };
                
                // Temporarily hide the buttons for the capture
                const buttons = document.querySelector('.control-buttons');
                const originalDisplay = buttons.style.display;
                buttons.style.display = 'none';
                
                const canvas = await html2canvas(invoiceElement, options);
                
                // Show the buttons again
                buttons.style.display = originalDisplay;
                
                // Create PDF
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
                const imgY = 10;
                
                pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
                
                hideLoading();
                return pdf;
              } catch (error) {
                console.error('Error generating PDF:', error);
                hideLoading();
                alert('There was an error generating the PDF: ' + error.message);
                throw error;
              }
            }
            
            // Quick download button
            document.getElementById('quick-download').addEventListener('click', async function() {
              try {
                const pdf = await generatePDF();
                const filename = getInvoiceFilename();
                pdf.save(filename);
              } catch (error) {
                console.error('Error in quick download:', error);
              }
            });
            
            // Save As button (only if File System Access API is supported)
            if (isFileSystemAccessSupported) {
              document.getElementById('save-as').addEventListener('click', async function() {
                try {
                  const pdf = await generatePDF();
                  const blob = pdf.output('blob');
                  const filename = getInvoiceFilename();
                  
                  try {
                    // Open the file picker
                    const handle = await window.showSaveFilePicker({
                      suggestedName: filename,
                      types: [{
                        description: 'PDF Document',
                        accept: { 'application/pdf': ['.pdf'] }
                      }]
                    });
                    
                    // Create a writable stream
                    const writable = await handle.createWritable();
                    
                    // Write the blob to the file
                    await writable.write(blob);
                    
                    // Close the file
                    await writable.close();
                    
                  } catch (fileError) {
                    if (fileError.name !== 'AbortError') {
                      console.error('Error saving file:', fileError);
                      alert('There was an error saving the file: ' + fileError.message);
                    }
                  }
                } catch (error) {
                  console.error('Error in save as:', error);
                }
              });
            }
          };
          
          // Enable text selection
          document.querySelectorAll('*').forEach(el => {
            el.style.userSelect = 'text';
            el.style.webkitUserSelect = 'text';
            el.style.MozUserSelect = 'text';
            el.style.msUserSelect = 'text';
          });
        });
      </script>
    </body>
    </html>
  `;
}

// Export function for use in other modules
window.exportUtils = {
  generatePDFHTML
};
