// Wander-Poster service worker: app files are cached for offline use, map tiles and Overpass always go to the network.
var BUILD='__BUILD__';
var CACHE='wander-poster-'+BUILD;
var SHARED='wander-poster-shared';
var ASSETS=__ASSETS__;

self.addEventListener('install',function(e){
  e.waitUntil(caches.open(CACHE).then(function(c){return c.addAll(ASSETS);}).then(function(){return self.skipWaiting();}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(keys){
      return Promise.all(keys.filter(function(k){return k.indexOf('wander-poster-')===0&&k!==CACHE&&k!==SHARED;}).map(function(k){return caches.delete(k);}));
    }).then(function(){return self.clients.claim();})
  );
});

// a GPX file shared from another app (Komoot, Strava, ...) arrives as a POST; keep it for the page and redirect
async function handleShare(request){
  try{
    var data=await request.formData(), file=data.get('gpx');
    if(file&&typeof file!=='string'){
      var cache=await caches.open(SHARED);
      await cache.put('shared-gpx',new Response(file,{headers:{'X-File-Name':encodeURIComponent(file.name||'geteilt.gpx')}}));
    }
  }catch(err){}
  return Response.redirect(new URL('./?shared=1',self.registration.scope).href,303);
}

self.addEventListener('fetch',function(e){
  var req=e.request, url=new URL(req.url);
  if(req.method==='POST'&&url.pathname.slice(-13)==='/share-target'){e.respondWith(handleShare(req));return;}
  if(req.method!=='GET'||url.origin!==self.location.origin){return;}      // tiles, Overpass and everything else: network
  e.respondWith(caches.match(req,{ignoreSearch:true}).then(function(hit){return hit||fetch(req);}));
});
