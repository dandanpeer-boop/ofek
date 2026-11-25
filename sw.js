/*
 * Service worker: מאפשר לאפליקציה לעבוד בלי אינטרנט ולהיות מותקנת במסך הבית.
 * אסטרטגיה: קודם רשת (כדי לקבל עדכונים), ואם אין רשת — מהמטמון.
 * הוא מטפל רק בקובצי האפליקציה עצמה. נתוני המשתמש אינם עוברים דרכו ואינם נשמרים בו.
 */
var CACHE = 'ofek-v86';
var FILES = ['./', 'index.html', 'styles.css', 'i18n.js', 'app.js', 'model.js', 'data.js', 'labs.js', 'garmin.js', 'guide.js', 'content.js', 'site.js', 'coach.js',
  'fonts/Heebo-400.ttf', 'fonts/Heebo-500.ttf', 'fonts/Heebo-700.ttf', 'fonts/Rubik-500.ttf', 'fonts/Rubik-600.ttf', 'fonts/Rubik-700.ttf', 'vendor/pdf.min.js', 'vendor/pdf.worker.min.js', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-180.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

// שמירה מראש של דפי האתר באפליקציה המותקנת: הדף שולח הודעה עם כתובת רשימת הדפים של השפה.
// מדלג על מה שכבר שמור, ושגיאה בקובץ בודד לא עוצרת את השאר.
// שמירת הדף הנוכחי: הדף נטען לפני שה-service worker הותקן, ולכן לא נשמר. בלי זה, פתיחה ראשונה בלי רשת של דף שנטען פעם אחת לא הייתה עובדת.
self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'cachepage' || typeof e.data.url !== 'string') return;
  var u = e.data.url;
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return c.match(u).then(function (hit) {
      if (hit) return;
      return fetch(u, { cache: 'no-cache' }).then(function (res) { if (res && res.ok) return c.put(u, res); });
    });
  }).catch(function () { /* לא קריטי */ }));
});

self.addEventListener('message', function (e) {
  if (!e.data || e.data.type !== 'precache' || typeof e.data.url !== 'string') return;
  e.waitUntil(fetch(e.data.url, { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (list) {
    return caches.open(CACHE).then(function (c) {
      return list.reduce(function (p, u) {
        return p.then(function () {
          return c.match(u).then(function (hit) {
            if (hit) return;
            return fetch(u, { cache: 'no-cache' }).then(function (res) { if (res && res.ok) return c.put(u, res); }).catch(function () { /* ממשיכים */ });
          });
        });
      }, Promise.resolve());
    });
  }).catch(function () { /* אין רשת או קובץ לא תקין: לא קריטי */ }));
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // cache: 'no-cache' מחייב בדיקה מול השרת בכל טעינה, כדי שמטמון הדפדפן (10 דקות באירוח) לא יחזיק גרסה ישנה
  e.respondWith(fetch(req, { cache: 'no-cache' }).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(CACHE).then(function (c) { c.put(req, copy); }); }
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (hit) { return hit || caches.match('index.html'); });
  }));
});
