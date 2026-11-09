// Giữ app chạy được khi mất mạng: lưu sẵn các file của app, ưu tiên bản mới khi có mạng.
// Khi sửa app, đổi số phiên bản ở VERSION để điện thoại tải lại.
var VERSION = 'chitieu-v1';
var FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;   // không đụng vào lời gọi tới Google
  e.respondWith(
    new Promise(function (resolve) {
      var done = false;
      function fromCache() {
        return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); });
      }
      var timer = setTimeout(function () { fromCache().then(function (r) { if (r && !done) { done = true; resolve(r); } }); }, 3000);
      fetch(req).then(function (res) {
        clearTimeout(timer);
        if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(req, copy); }); }
        if (!done) { done = true; resolve(res); }
      }).catch(function () {
        clearTimeout(timer);
        fromCache().then(function (r) { if (!done) { done = true; resolve(r || Response.error()); } });
      });
    })
  );
});
