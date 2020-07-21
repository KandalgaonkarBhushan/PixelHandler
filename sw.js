// A list of local resources we always want to be cached
const CACHE_NAME = 'task-1';

const urlsToCache = [
'/',
'/scripts/app.js',
'/sw.js'
];
var our_db;
const serverImageParams = {
  'interaction': 'event',
  'client': 'customer',
  'os_name': 'operating_system_name', 
  'x1': 'utm_source',
  'x2': 'utm_medium',
  'x3': 'utm_campaign',
  'landing_url': 'campaign_url'
};

self.addEventListener('install', event => {
  // Perform install steps
  event.waitUntil(caches.open(CACHE_NAME)
    .then(cache => {
      console.log('Opened cache');
      return cache.addAll(urlsToCache);
    }));
});

openDatabase();

self.addEventListener('activate', event => {

  const cacheWhitelist = ['task-1'];

  event.waitUntil(caches.keys().then(cacheNames => {
    return Promise.all(
      cacheNames.map(cacheName => {
        if (cacheWhitelist.indexOf(cacheName) === -1) {
          return caches.delete(cacheName);
        }
      })
    );
  }));
});


function handleUrl(event, newUrl, isCacheResponseSend) {
  return event.waitUntil(fetch(newUrl).then(
    response => {

      // Check if we received a valid response
      if (response) {
        const responseToCache = response.clone();

      caches.open(CACHE_NAME)
        .then(cache => {
          cache.put(newUrl, responseToCache);
        });
        if (!isCacheResponseSend) {
          console.info("fetch request response from server" + response);
          return response;
        }
      
      }
      
    }
  )
  .catch(err => {  
    // saved the get request 
    saveGetRequests(newUrl);
  }));
}

self.addEventListener('fetch', event => {
  console.info("fetch request " + event.request);
  let newUrl = event.request.url;
  if (newUrl.indexOf("giphy.gif")> -1) { 
      const queryParam = newUrl.split("?");
      updatedParams = queryParam[1];
      for (const k of Object.entries(serverImageParams)) {
        updatedParams = updatedParams.replace(k[0], k[1]);
      }
      newUrl = `${queryParam[0]}?${updatedParams}`;
      event.respondWith(caches.match(newUrl)
      .then(response => {
        
        handleUrl(event, newUrl, response);
        if (response) {
          // Cache hit - return response
          console.info("fetch request response from cache" + response);
          return response;
        }
      }));
  }

});

const FOLDER_NAME = 'get_request';
function openDatabase() {

  // if `service-worker-data` does not already exist in our browser (under our site), it is created
  const indexedDBOpenRequest = indexedDB.open('service-worker-data');

  indexedDBOpenRequest.onerror = function(error) {
    // error creating db
    console.error('IndexedDB error:', error)
  }

  
  indexedDBOpenRequest.onupgradeneeded = function() {
    // This should only execute if there's a need to create/update db.
    this.result.createObjectStore(FOLDER_NAME, { autoIncrement: true, keyPath: 'id' })
  }

  // This will execute each time the database is opened.
  indexedDBOpenRequest.onsuccess = function() {
    our_db = this.result
    console.error('IndexedDB success');
  }
}

function saveGetRequests(url, payload) {
  const request = getObjectStore(FOLDER_NAME, 'readwrite').add({
    url: url,
    method: 'GET'
  });
  request.onsuccess = function(event) {
    console.log('a new get request has been added to indexedb')
  }

  request.onerror = function(error) {
    console.error(error)
  }
}

function getObjectStore(storeName, mode) {
  return our_db.transaction(storeName, mode).objectStore(storeName)
}

self.addEventListener('sync', event => {
  if (event.tag === 'sendGetRequest' && our_db) {
     // Send our get requests to the server, now that the user is online
    event.waitUntil(sendGetRequestToServer());
   
  }
});

function sendGetRequestToServer() {
  const savedRequests = [];
  const req = getObjectStore(FOLDER_NAME).openCursor(); // FOLDERNAME = 'get_requests'

  req.onsuccess = async function(event) {
    const cursor = event.target.result;

    if (cursor) {
      // Keep moving the cursor forward and collecting saved requests.
      savedRequests.push(cursor.value)
      cursor.continue()
    } else {
      // At this point, we have collected all the post requests in indexedb.
        for (const savedRequest of savedRequests) {
          // send them to the server one after the other
          console.log('saved request', savedRequest)
          const requestUrl = savedRequest.url;

          fetch(requestUrl).then(response => {
            console.log('server response', response)
            if (response.status < 400) {
              // If sending the get request was successful, then remove it from the IndexedDB.
              getObjectStore(FOLDER_NAME, 'readwrite').delete(savedRequest.id)
              const responseToCache = response.clone();
              console.info('fetch request response after user is online', response)
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(requestUrl, responseToCache);
                });
            } 
          }).catch(error => {
            console.error('Send to Server failed:', error)
            throw error
          })
        }
    }
  }
}
