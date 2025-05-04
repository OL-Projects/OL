// PWA functionality for OL Invoicing

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    // Use a relative path to service-worker.js to ensure it works regardless of where the site is hosted
    navigator.serviceWorker.register('./service-worker.js')
      .then(registration => {
        console.log('ServiceWorker registration successful with scope: ', registration.scope);
      })
      .catch(error => {
        console.error('ServiceWorker registration failed: ', error);
        // Show error notification but don't prevent app from running
        if (typeof showNotification === 'function') {
          showNotification('ServiceWorker registration failed. Some offline features may not work.', 'warning');
        }
      });
  });
}

// Variables for PWA installation
let deferredPrompt;
const installButton = document.getElementById('install-button');

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent Chrome 76+ from automatically showing the prompt
  e.preventDefault();
  
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  
  // Show the install button
  if (installButton) {
    installButton.style.display = 'flex';
    
    // Setup click handler for the install button
    installButton.addEventListener('click', installApp);
  }
});

// Install app handler
function installApp() {
  // Hide the install button
  if (installButton) {
    installButton.style.display = 'none';
  }
  
  // Show the installation prompt
  if (deferredPrompt) {
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    deferredPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Clear the saved prompt
      deferredPrompt = null;
    });
  }
}

// Hide install button when app is installed
window.addEventListener('appinstalled', (e) => {
  console.log('App was installed', e);
  
  // Hide the install button
  if (installButton) {
    installButton.style.display = 'none';
  }
});

// Check if app is launched in standalone mode (installed)
if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
  console.log('App is running in standalone mode (installed)');
  
  // Hide install button if app is already installed
  if (installButton) {
    installButton.style.display = 'none';
  }
}

// Display a notification when we go online/offline
window.addEventListener('online', () => {
  // Use the enhanced showNotification function if available, otherwise fallback to console
  if (typeof showNotification === 'function') {
    showNotification('You are back online', 'success');
  } else {
    console.log('You are back online');
  }
});

window.addEventListener('offline', () => {
  // Use the enhanced showNotification function if available, otherwise fallback to console
  if (typeof showNotification === 'function') {
    showNotification('You are offline. Some features may be limited.', 'warning');
  } else {
    console.log('You are offline. Some features may be limited.');
  }
});
