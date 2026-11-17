/*
 * ייבוא נתונים מקובץ הייצוא של Garmin Connect — הכול בדפדפן, שום דבר לא נשלח.
 *
 * מקבל את קובץ ה-ZIP שגרמין שולחת ("Export Your Data"), או קובצי JSON / CSV בודדים מתוכו,
 * ומחפש בהם שני נתונים: דופק במנוחה ו-VO2max.
 *
 * מבנה הייצוא של גרמין אינו מתועד רשמית ומשתנה בין חשבונות, ולכן החיפוש נעשה לפי שמות
 * השדות (restingHeartRate, vo2Max...) בכל קובץ, ולא לפי נתיב קבוע.
 */
var GarminImport = (function () {
  'use strict';

  // ---------- סריקת התוכן ----------

  function toDate(v) {
    if (typeof v === 'number') return new Date(v < 1e11 ? v * 1000 : v);
    if (typeof v === 'string') {
      var m = v.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
    }
    if (v && typeof v === 'object' && typeof v.date === 'string') return toDate(v.date);
    return null;
  }

  function dateOf(obj) {
    var keys = ['calendarDate', 'date', 'summaryDate', 'updateTimestamp', 'timestamp', 'startTimestampGMT', 'createTimestamp'];
    for (var i = 0; i < keys.length; i++) {
      if (obj[keys[i]] !== undefined) { var d = toDate(obj[keys[i]]); if (d && !isNaN(d)) return d; }
    }
    for (var k in obj) if (/date|timestamp/i.test(k)) { var d2 = toDate(obj[k]); if (d2 && !isNaN(d2)) return d2; }
    return null;
  }

  function walk(node, out, depth) {
    if (!node || typeof node !== 'object' || depth > 8) return;
    if (Array.isArray(node)) { for (var i = 0; i < node.length; i++) walk(node[i], out, depth + 1); return; }
    var date = null, got = false;
    for (var k in node) {
      var v = node[k];
      if (typeof v === 'number' && isFinite(v)) {
        if (/^restingHeartRate$/i.test(k) && v >= 30 && v <= 120) { date = date || dateOf(node); out.rhr.push({ v: v, d: date }); got = true; }
        else if (/^vo2max(value|precisevalue)?$/i.test(k) && v >= 10 && v <= 90) { date = date || dateOf(node); out.vo2.push({ v: v, d: date }); got = true; }
      } else if (v && typeof v === 'object') walk(v, out, depth + 1);
    }
  }

  function scanCsv(text, out) {
    var lines = text.split(/\r?\n/).filter(Boolean);
    if (lines.length < 2) return;
    var head = lines[0].split(',').map(function (h) { return h.replace(/"/g, '').trim(); });
    var iR = -1, iV = -1, iD = -1;
    head.forEach(function (h, i) {
      if (/resting/i.test(h) && iR < 0) iR = i;
      if (/vo2/i.test(h) && iV < 0) iV = i;
      if (/date|day/i.test(h) && iD < 0) iD = i;
    });
    if (iR < 0 && iV < 0) return;
    for (var r = 1; r < lines.length; r++) {
      var c = lines[r].split(',').map(function (x) { return x.replace(/"/g, '').trim(); });
      var d = iD >= 0 ? toDate(c[iD]) : null;
      var a = parseFloat(c[iR]), b = parseFloat(c[iV]);
      if (iR >= 0 && a >= 30 && a <= 120) out.rhr.push({ v: a, d: d });
      if (iV >= 0 && b >= 10 && b <= 90) out.vo2.push({ v: b, d: d });
    }
  }

  /** texts: [{name, text}] -> { rhr, rhrDays, rhrDate, vo2, vo2Date } (שדות חסרים = לא נמצא) */
  function scan(texts) {
    var out = { rhr: [], vo2: [] };
    texts.forEach(function (t) {
      if (/\.csv$/i.test(t.name)) { scanCsv(t.text, out); return; }
      if (!/restingHeartRate|vo2max/i.test(t.text)) return;
      try { walk(JSON.parse(t.text), out, 0); } catch (e) { /* קובץ שאינו JSON תקין — מדלגים */ }
    });
    function byDate(a, b) { return (b.d ? b.d.getTime() : 0) - (a.d ? a.d.getTime() : 0); }
    var res = {};
    if (out.rhr.length) {
      out.rhr.sort(byDate);
      // ממוצע של עד 30 המדידות האחרונות, מתוך 60 הימים האחרונים שנמדדו — יציב יותר מיום בודד
      var newest = out.rhr[0].d ? out.rhr[0].d.getTime() : 0;
      var last = out.rhr.filter(function (x) { return !newest || !x.d || newest - x.d.getTime() <= 60 * 864e5; }).slice(0, 30);
      res.rhr = Math.round(last.reduce(function (s, x) { return s + x.v; }, 0) / last.length);
      res.rhrDays = last.length; res.rhrDate = last[0].d;
    }
    if (out.vo2.length) {
      out.vo2.sort(byDate);
      res.vo2 = Math.round(out.vo2[0].v * 10) / 10; res.vo2Date = out.vo2[0].d;
    }
    return res;
  }

  // ---------- קריאת ZIP בלי ספרייה ----------

  function u64(dv, off) { return Number(dv.getBigUint64(off, true)); }

  /** מחזיר את רשימת הקבצים ב-ZIP: [{name, method, compSize, size, offset}] */
  function zipEntries(file) {
    var tailLen = Math.min(file.size, 65557 + 20);
    return file.slice(file.size - tailLen).arrayBuffer().then(function (buf) {
      var dv = new DataView(buf), eocd = -1;
      for (var i = buf.byteLength - 22; i >= 0; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
      if (eocd < 0) throw new Error('not a zip');
      var cdSize = dv.getUint32(eocd + 12, true), cdOff = dv.getUint32(eocd + 16, true);
      if (cdOff === 0xFFFFFFFF || cdSize === 0xFFFFFFFF) {
        // ZIP64: המיקום האמיתי נמצא ברשומה נפרדת
        var loc = eocd - 20;
        if (loc < 0 || dv.getUint32(loc, true) !== 0x07064b50) throw new Error('zip64 locator');
        var recOff = u64(dv, loc + 8);
        return file.slice(recOff, recOff + 56).arrayBuffer().then(function (rb) {
          var r = new DataView(rb);
          return { size: u64(r, 40), off: u64(r, 48) };
        });
      }
      return { size: cdSize, off: cdOff };
    }).then(function (cd) {
      return file.slice(cd.off, cd.off + cd.size).arrayBuffer();
    }).then(function (buf) {
      var dv = new DataView(buf), p = 0, list = [], dec = new TextDecoder();
      while (p + 46 <= buf.byteLength && dv.getUint32(p, true) === 0x02014b50) {
        var nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commLen = dv.getUint16(p + 32, true);
        var e = { method: dv.getUint16(p + 10, true), compSize: dv.getUint32(p + 20, true), size: dv.getUint32(p + 24, true), offset: dv.getUint32(p + 42, true),
          name: dec.decode(new Uint8Array(buf, p + 46, nameLen)) };
        // שדה ZIP64 מורחב
        var x = p + 46 + nameLen, xEnd = x + extraLen;
        while (x + 4 <= xEnd) {
          var id = dv.getUint16(x, true), len = dv.getUint16(x + 2, true), q = x + 4;
          if (id === 1) {
            if (e.size === 0xFFFFFFFF) { e.size = u64(dv, q); q += 8; }
            if (e.compSize === 0xFFFFFFFF) { e.compSize = u64(dv, q); q += 8; }
            if (e.offset === 0xFFFFFFFF) { e.offset = u64(dv, q); }
          }
          x += 4 + len;
        }
        list.push(e);
        p += 46 + nameLen + extraLen + commLen;
      }
      return list;
    });
  }

  function zipText(file, e) {
    return file.slice(e.offset, e.offset + 30).arrayBuffer().then(function (hb) {
      var h = new DataView(hb);
      var start = e.offset + 30 + h.getUint16(26, true) + h.getUint16(28, true);
      var blob = file.slice(start, start + e.compSize);
      if (e.method === 0) return blob.text();
      if (e.method !== 8) throw new Error('zip method');
      return new Response(blob.stream().pipeThrough(new DecompressionStream('deflate-raw'))).text();
    });
  }

  /** קורא קובץ שהמשתמש בחר (ZIP / JSON / CSV) ומחזיר [{name, text}] */
  function readFile(file) {
    if (!/\.zip$/i.test(file.name)) return file.text().then(function (t) { return [{ name: file.name, text: t }]; });
    return zipEntries(file).then(function (entries) {
      var wanted = entries.filter(function (e) { return /\.(json|csv)$/i.test(e.name) && e.size > 0 && e.size <= 80e6; });
      // קודם הקבצים שסביר שמכילים את הנתונים; אם אין כאלה — כל קובצי ה-JSON
      var likely = wanted.filter(function (e) { return /UDS|MaxMet|Metrics|Wellness|Aggregator|fitnessAge|heart/i.test(e.name); });
      var pick = (likely.length ? likely : wanted).slice(0, 400), out = [];
      return pick.reduce(function (p, e) {
        return p.then(function () { return zipText(file, e); }).then(function (t) { out.push({ name: e.name, text: t }); }, function () { /* קובץ בודד שנכשל — ממשיכים */ });
      }, Promise.resolve()).then(function () { return out; });
    });
  }

  function importFiles(files) {
    return Promise.all(Array.prototype.map.call(files, readFile)).then(function (groups) {
      var all = []; groups.forEach(function (g) { all = all.concat(g); });
      var res = scan(all); res.filesRead = all.length;
      return res;
    });
  }

  return { scan: scan, importFiles: importFiles };
})();

if (typeof module !== 'undefined') module.exports = GarminImport;
