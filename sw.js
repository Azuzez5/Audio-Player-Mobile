const CACHE_NAME="audio-player-v2"

const ASSETS=[
"/",
"/index.html",
"/style.css",
"/app.js",
"/manifest.json"
]

self.addEventListener("install",e=>{

self.skipWaiting()

e.waitUntil(
caches.open(CACHE_NAME).then(cache=>{
return cache.addAll(ASSETS)
})
)

})

self.addEventListener("activate",e=>{

e.waitUntil(
caches.keys().then(keys=>{
return Promise.all(
keys.filter(k=>k!==CACHE_NAME)
.map(k=>caches.delete(k))
)
})
)

})

self.addEventListener("fetch",e=>{

e.respondWith(
caches.match(e.request).then(res=>{
return res || fetch(e.request)
})
)

})
