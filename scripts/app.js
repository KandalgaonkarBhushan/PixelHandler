//register service worker

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(registration => {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, err => {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });

    window.addEventListener('online', () => {
      // when came online after network failure
      navigator.serviceWorker.ready.then(registration => {
        return registration.sync.register('sendGetRequest')
      }).then(() => {
        console.log('sync event registered')
      }).catch(() => {
        // system was unable to register for a sync,
        // this could be an OS-level restriction
        console.log('sync registration failed')
      });
    }); 

  });
}

 function _getUrl(event) {
  let url = "https://media1.giphy.com/media/Xf6mBnY3NiZv0GVxTG/giphy.gif?";
  const params= {
    "interaction": event.type,
    "client": "ad_media",
    "os_name": _getOsName(),
    "x1": "google",
    "x2": "email",
    "x3": "pdfconvert",
    "landing_url": "abcd1"
  };

  const keys = Object.keys(params);

  keys.map((elem, index) => 
      url  += index === keys.length - 1 ? `${elem}=${params[elem]}`:`${elem}=${params[elem]}&`)

  return url;
}

function _getOsName() {  
  let osName="Unknown OS";

  if (navigator.appVersion.indexOf("Win")!=-1) osName = "Windows"; 
  else if (navigator.appVersion.indexOf("Mac")!=-1) osName = "MacOS"; 
  else if (navigator.appVersion.indexOf("X11")!=-1) osName = "UNIX"; 
  else if (navigator.appVersion.indexOf("Linux")!=-1) osName = "Linux";
    
  return osName;
}

function loadImage(event) {
  fetch(_getUrl(event))
  .catch(logError);
}
  
function logError(error) {
    console.log('something went wrong: \n', error);
}