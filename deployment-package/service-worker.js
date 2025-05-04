const CACHE_NAME = 'ol-invoicing-v2'; // Increment version to ensure clean update
const OFFLINE_FALLBACK_PAGE = './index.html';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './pwa.js',
  './manifest.json',
  './export.js',
  './utilities.js',
  './icons/icon.svg',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.2/font/bootstrap-icons.css',
  'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap',
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.0-alpha1/dist/js/bootstrap.bundle.min.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  // Skip waiting to ensure the new service worker activates immediately
  self.skipWaiting();
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching assets...');
        
        // Cache core assets with error recovery
        return Promise.allSettled(
          ASSETS_TO_CACHE.map(url => {
            return cache.add(url).catch(err => {
              console.warn(`Failed to cache ${url}: ${err.message}`);
              // Continue despite individual asset failures
              return Promise.resolve();
            });
          })
        );
      })
      .then((results) => {
        // Log successful and failed caches
        const failed = results.filter(r => r.status === 'rejected').length;
        console.log(`Service Worker: Cached ${results.length - failed} assets (${failed} failed)`);
        
        // Always cache at least the offline page
        return caches.open(CACHE_NAME).then(cache => {
          return cache.add(OFFLINE_FALLBACK_PAGE).catch(err => {
            console.error(`Critical failure: Could not cache offline page: ${err.message}`);
          });
        });
      })
      .catch(error => {
        console.error('Service Worker: Cache failed:', error);
        // Even if the overall caching fails, the service worker will still activate
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  // Claim clients to ensure that the service worker takes control immediately
  self.clients.claim();
  
  // Remove old caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache:', cacheName);
            return caches.delete(cacheName);
          }
          return Promise.resolve();
        })
      );
    }).catch(error => {
      console.error('Service Worker: Activation error:', error);
      // Service worker will still activate even if cache cleanup fails
    })
  );
});

// Fetch event - serve from cache or network with better error handling
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and browser extensions
  if (event.request.method !== 'GET' || 
      event.request.url.startsWith('chrome-extension://') ||
      event.request.url.includes('extension/')) {
    return;
  }
  
  // Define a function to handle network fetch with timeout
  const timeoutNetworkRequest = (request, timeoutMs = 5000) => {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Network request timed out'));
      }, timeoutMs);

      fetch(request).then(
        response => {
          clearTimeout(timeoutId);
          resolve(response);
        },
        error => {
          clearTimeout(timeoutId);
          reject(error);
        }
      );
    });
  };
  
  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request).then(cachedResponse => {
        const networkFetch = timeoutNetworkRequest(event.request)
          .then(networkResponse => {
            // Check if we received a valid response
            if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
              // Cache the fetched response for future use
              // Clone the response because it can only be used once
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(error => {
            console.log(`Service Worker: Network fetch failed for ${event.request.url}:`, error);
            
            // If the request is for navigation, serve the fallback page
            if (event.request.mode === 'navigate') {
              return cache.match(OFFLINE_FALLBACK_PAGE);
            }
            
            // For other resources, just propagate the error
            throw error;
          });
        
        // Return the cached response if we have one, otherwise wait for the network response
        return cachedResponse || networkFetch;
      }).catch(error => {
        console.error('Service Worker: Cache match error:', error);
        
        // Try the network as a fallback
        return timeoutNetworkRequest(event.request).catch(networkError => {
          console.error('Service Worker: Complete fallback error:', networkError);
          
          // For navigation requests, use the offline page
          if (event.request.mode === 'navigate') {
            return cache.match(OFFLINE_FALLBACK_PAGE);
          }
          
          // For other requests, return a simple error response
          return new Response('Network unavailable and resource not in cache', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    }).catch(error => {
      console.error('Service Worker: Critical cache error:', error);
      
      // Last resort: try direct network request
      return fetch(event.request).catch(() => {
        if (event.request.mode === 'navigate') {
          return new Response('Application is offline. Please try again when you have network connectivity.', {
            status: 503,
            headers: { 'Content-Type': 'text/html' }
          });
        }
        return new Response('Network unavailable', { status: 503 });
      });
    })
  );
});

// Push event handler with error handling
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  try {
    const notificationData = event.data.json();
    
    const options = {
      body: notificationData.body,
      icon: './icons/icon-192x192.png', // Use relative paths
      badge: './icons/icon-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        url: notificationData.url || './'
      }
    };
    
    event.waitUntil(
      self.registration.showNotification(notificationData.title, options)
        .catch(error => {
          console.error('Service Worker: Notification display failed:', error);
        })
    );
  } catch (e) {
    console.error('Service Worker: Push event processing failed:', e);
    // Try to show a generic notification
    event.waitUntil(
      self.registration.showNotification('New Notification', {
        body: 'Please check the application for updates.',
        icon: './icons/icon-192x192.png'
      }).catch(err => {
        console.error('Service Worker: Generic notification failed:', err);
      })
    );
  }
});

// Notification click event handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.matchAll({type: 'window'})
      .then((clientList) => {
        // Check if there is already a window/tab open with the target URL
        for (const client of clientList) {
          if (client.url === event.notification.data.url && 'focus' in client) {
            return client.focus();
          }
        }
        
        // If no window/tab is open with the target URL, open a new one
        if (clients.openWindow) {
          return clients.openWindow(event.notification.data.url);
        }
      })
  );
});
