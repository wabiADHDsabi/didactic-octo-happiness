// Service Worker — caches app shell for instant repeat loads
var CACHE='dash-v14-1';
var ASSETS=[
  './',
  './index.html',
  './dashboard-1.js',
  './dashboard-2.js',
  './dashboard-3.js'
];

self.addEventListener('install',function(e){
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function(c){
    return c.addAll(ASSETS).catch(function(){});
  }));
});

self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(keys){
    return Promise.all(keys.map(function(k){
      if(k!==CACHE)return caches.delete(k);
    }));
  }).then(function(){return self.clients.claim();}));
});

self.addEventListener('fetch',function(e){
  var url=e.request.url;
  // Never cache: API calls, Supabase, audio, JSON data files
  if(url.includes('supabase')||url.includes('everyayah')||
     url.includes('api.')||url.includes('/rest/')||
     e.request.method!=='GET'){
    return; // let it hit network normally
  }
  // App shell (html/js): cache-first, update in background
  if(url.includes('dashboard-')||url.endsWith('.html')||url.endsWith('/')){
    e.respondWith(
      caches.match(e.request).then(function(cached){
        var fetchPromise=fetch(e.request).then(function(net){
          if(net&&net.status===200){
            var clone=net.clone();
            caches.open(CACHE).then(function(c){c.put(e.request,clone);});
          }
          return net;
        }).catch(function(){return cached;});
        return cached||fetchPromise;
      })
    );
    return;
  }
  // JSON data: network-first, fall back to cache
  if(url.endsWith('.json')){
    e.respondWith(
      fetch(e.request).then(function(net){
        if(net&&net.status===200){
          var clone=net.clone();
          caches.open(CACHE).then(function(c){c.put(e.request,clone);});
        }
        return net;
      }).catch(function(){return caches.match(e.request);})
    );
    return;
  }
});
