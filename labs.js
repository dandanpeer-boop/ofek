var L = (typeof L !== 'undefined') ? L : function (s) { return s; }; // תרגום (i18n.js); בלעדיו — עברית
/*
 * שליפת ערכי בדיקות דם מתוך מסמך — הכול בדפדפן. הקובץ נקרא מקומית ואינו נשלח לשום מקום.
 *
 * parse(text)      — מקבל טקסט (שורות) ומחזיר את הערכים שזוהו, ביחידות של הטופס.
 * readPdf(file)    — מחלץ שורות טקסט מקובץ PDF בעזרת pdf.js (נטען מהתיקייה vendor רק כשצריך).
 */
var LabParser = (function () {
  'use strict';

  // סדר הבדיקות חשוב: HDL ו-LDL נבדקים לפני "כולסטרול" הכללי.
  // min/max = טווח סביר ביחידות היעד; alt = המרה מיחידות חלופיות (מכפיל ליחידות היעד).
  var TESTS = [
    { id: 'lpa', label: 'Lp(a)', unit: L('מ"ג/ד"ל'), re: /lipoprotein\s*\(?\s*a\b\s*\)?|lp\s*\(\s*a\s*\)|\blpa\b/i, min: 0, max: 400,
      alt: { re: /nmol/i, k: 1 / 2.1, min: 0, max: 900, explicit: true } },
    { id: 'acr', label: L('אלבומין/קריאטינין בשתן'), unit: L('מ"ג/ג'), re: /albumin\s*\/\s*creat|alb\w*\.?\s*\/\s*cr|\bacr\b|microalb\w*\s*\/|אלבומין\s*\/\s*קריאטינין/i, min: 0, max: 5000,
      alt: { re: /mg\s*\/\s*mmol/i, k: 8.84, min: 0, max: 600, explicit: true } },
    { id: 'tg', label: L('טריגליצרידים'), unit: L('מ"ג/ד"ל'), re: /triglycerid|טריגליצריד|\btrig\b|\btg\b/i, min: 20, max: 2000,
      alt: { re: /mmol/i, k: 88.57, min: 0.2, max: 19.9 } },
    { id: 'ggt', label: 'GGT', unit: 'U/L', re: /\bggt\b|\bg-?gt\b|gamma[\s-]*g/i, min: 3, max: 2000 },
    { id: 'hdl', label: 'HDL', unit: L('מ"ג/ד"ל'), re: /\bhdl\b/i, not: /non|ratio|יחס|chol\w*\s*\/\s*hdl|ldl\s*\/\s*hdl/i, min: 10, max: 150,
      alt: { re: /mmol/i, k: 38.67, min: 0.3, max: 4 } },
    { id: 'ldl', label: 'LDL', unit: L('מ"ג/ד"ל'), re: /\bldl\b/i, not: /vldl|ratio|יחס|ldl\s*\/\s*hdl/i, min: 20, max: 400,
      alt: { re: /mmol/i, k: 38.67, min: 0.5, max: 10 } },
    { id: 'tc', label: L('כולסטרול כללי'), unit: L('מ"ג/ד"ל'), re: /cholesterol|כולסטרול|\bchol\b/i, not: /hdl|ldl|non|ratio|יחס/i, min: 80, max: 500,
      alt: { re: /mmol/i, k: 38.67, min: 2, max: 13 } },
    { id: 'hba1c', label: 'HbA1c', unit: '%', re: /hba1c|hb\s*a1c|\ba1c\b|glycated|glycosylated|המוגלובין\s*מסוכרר|מסוכרר\s*המוגלובין/i, min: 3, max: 18 },
    { id: 'glucose', label: L('גלוקוז'), unit: L('מ"ג/ד"ל'), re: /glucose|גלוקוז|\bgluc?\b|סוכר בצום/i, not: /urine|שתן|a1c|מסוכרר|tolerance|העמסה|estimated|ממוצע/i, min: 40, max: 500,
      alt: { re: /mmol/i, k: 18.016, min: 2.2, max: 28 } },
    { id: 'creatinine', label: L('קריאטינין'), unit: L('מ"ג/ד"ל'), re: /creatinine|קריאטינין|\bcreat?\b/i, not: /urine|שתן|ratio|יחס|clearance|פינוי|albumin|אלבומין|protein|חלבון/i, min: 0.2, max: 15,
      alt: { re: /[µμu]mol/i, k: 1 / 88.4, min: 20, max: 1300 } },
    { id: 'crp', label: 'CRP', unit: L('מ"ג/ליטר'), re: /\bcrp\b|c[\s-]?reactive/i, min: 0, max: 200,
      alt: { re: /mg\s*\/\s*dl|מ"?ג\s*\/\s*ד"?ל/i, k: 10, min: 0, max: 20, explicit: true } },
    // הערכים הנוספים לגיל הביולוגי
    { id: 'albumin', label: L('אלבומין'), unit: L('ג/ד"ל'), re: /albumin|אלבומין|\balb\b/i, not: /micro|urine|שתן|ratio|יחס|globulin|גלובולין|creat|קריאט|a\/g/i, min: 1.5, max: 6.5,
      alt: { re: /g\s*\/\s*l\b/i, k: 0.1, min: 15, max: 65 } },
    { id: 'lymph', label: L('לימפוציטים'), unit: '%', re: /lymp|\blym\b|לימפוציט/i, not: /abs|#|atyp|אבסולוט|מוחלט|\bno\b\.?(?=\s|$)/i, min: 5, max: 80 },
    { id: 'mcv', label: 'MCV', unit: 'fL', re: /\bmcv\b/i, min: 50, max: 130 },
    { id: 'rdw', label: 'RDW', unit: '%', re: /\brdw\b/i, not: /rdw\s*-?\s*sd/i, min: 9, max: 25 },
    { id: 'alp', label: L('פוספטאזה בסיסית'), unit: 'U/L', re: /alk\w*\.?\s*phos|\balp\b|\balk\.?\s*p\b|פוספטאז/i, min: 10, max: 1000 },
    { id: 'wbc', label: L('תאים לבנים (WBC)'), unit: L('אלפים/מק"ל'), re: /\bwbc\b|leu[ck]ocytes|תאים\s*לבנים|לויקוציטים/i, not: /urine|שתן|esterase|hpf|nrbc|nucleated|\/\s*100|per\s*100/i, min: 0.5, max: 50,
      alt: { re: /a^/, k: 0.001, min: 500, max: 50000 } }
  ];

  // בדיקות תמיכה: לא נכנסות למודל, משמשות רק לבדיקת שפיות של MCV (MCV = 10 × המטוקריט / RBC)
  var SUPPORT = [
    { id: 'hct', label: L('המטוקריט'), unit: '%', re: /\bhct\b|hematocrit|המטוקריט/i, min: 15, max: 70 },
    { id: 'rbc', label: 'RBC', unit: 'M/µL', re: /\brbc\b|red\s*blood\s*cell|אריתרוציטים|כדוריות\s*אדומות/i, not: /\brdw\b|\bmchc?\b/i, min: 1.5, max: 8.5 }
  ];

  /** המספרים בשורה שיכולים להיות תוצאה: בלי תאריכים, שעות, טווחי ייחוס וספי השוואה */
  function candidateNumbers(line) {
    var s = line
      .replace(/\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}/g, ' ')            // תאריכים
      .replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ')                         // שעות
      .replace(/\d+(?:\.\d+)?\s*[-–—]\s*\d+(?:\.\d+)?/g, ' ')          // טווח ייחוס: 70 - 100
      .replace(/(?:[<>≤≥]=?|עד|מעל|מתחת ל-?|up to|below|above)\s*\d+(?:\.\d+)?/gi, ' '); // ספים
    var out = [], m, re = /(^|[^A-Za-z\d.,])(\d+(?:\.\d+)?)(?![A-Za-z\d]|\.\d)/g;
    while ((m = re.exec(s))) out.push(parseFloat(m[2]));
    return out;
  }

  function round(x, id) {
    var d = id === 'creatinine' || id === 'rbc' ? 2 : /^(hba1c|crp|albumin|lymph|mcv|rdw|wbc|lpa|hct)$/.test(id) ? 1 : 0;
    var p = Math.pow(10, d);
    return Math.round(x * p) / p;
  }

  /** שורת הערה או טווח מומלץ ("ערך רצוי קטן מ-200", "הערות לבדיקות CHOLESTEROL:"): המספרים בה אינם תוצאה. הטקסט מופיע גם בסדר הפוך (PDF חזותי). */
  function isRemark(line) {
    return /הערות\s*לבדיקות|לבדיקות\s*הערות|תורעה\s*תוקידבל|תוקידבל\s*תורעה|ערך\s*רצוי|רצוי\s*ערך|יוצר\s*ךרע|ךרע\s*יוצר|\bremarks\b|\bdesirable\b|\boptimal\b|\bnormal\s*:|\bdeficient\s*:/i.test(line);
  }

  function matchesAnyTest(line) {
    for (var t = 0; t < TESTS.length; t++) if (TESTS[t].re.test(line)) return true;
    for (var u = 0; u < SUPPORT.length; u++) if (SUPPORT[u].re.test(line)) return true;
    return false;
  }

  /** עברית שנשמרה ב-PDF בסדר חזותי (אותיות הפוכות): הופך כל רצף אותיות עבריות */
  function unreverseHebrew(line) { return line.replace(/[\u0590-\u05FF]{2,}/g, function (w) { return w.split('').reverse().join(''); }); }

  /** פסיק עשרוני (תוצאות ממעבדות באירופה): 5,8 -> 5.8. שתי ספרות או פחות אחרי הפסיק; שלוש ספרות הן מפריד אלפים ולא משתנות. */
  function decComma(s) { return String(s).replace(/(\d),(\d{1,2})(?!\d)/g, '$1.$2'); }

  function parse(text, tests) {
    var TS = tests || TESTS;
    var lines = decComma(text).split(/\r?\n/), found = {}, fallback = {}, list = [];
    lines.slice().forEach(function (l) { if (/[\u0590-\u05FF]{2}/.test(l)) lines.push(unreverseHebrew(l)); });
    function hit(T, v, converted, line) { return { id: T.id, label: T.label, unit: T.unit, value: round(v, T.id), converted: converted, line: line.trim().slice(0, 120) }; }

    // מחפש תוצאה ל-T בטקסט numText; src היא השורה שתוצג למשתמש. מחזיר true אם נמצא ערך כלשהו.
    function attempt(T, numText, unitText, src) {
      var nums = candidateNumbers(numText), altUnit = T.alt && T.alt.re.test(unitText), i, n;
      // קודם כול: מספר שסביר ביחידת היעד (או ביחידה חלופית שכתובה במפורש בשורה)
      for (i = 0; i < nums.length; i++) {
        n = nums[i];
        if (altUnit ? (n >= T.alt.min && n <= T.alt.max) : (n >= T.min && n <= T.max)) {
          found[T.id] = true;
          list.push(hit(T, altUnit ? n * T.alt.k : n, altUnit, src));
          return true;
        }
      }
      // רק אם אין כזה בשום שורה: ניחוש יחידה חלופית לפי גודל המספר (נשמר כמוצא אחרון)
      if (!altUnit && T.alt && !T.alt.explicit) {
        for (i = 0; i < nums.length; i++) {
          n = nums[i];
          if (n >= T.alt.min && n <= T.alt.max) { if (!fallback[T.id]) fallback[T.id] = hit(T, n * T.alt.k, true, src); return true; }
        }
      }
      return false;
    }

    lines.forEach(function (line, idx) {
      if (!line.trim() || isRemark(line)) return;
      for (var t = 0; t < TS.length; t++) {
        var T = TS[t];
        if (!T.re.test(line) || (T.not && T.not.test(line))) continue;
        if (found[T.id]) break;
        if (!attempt(T, line.replace(T.re, ' '), line, line)) {
          // שם הבדיקה בשורה אחת והתוצאה בשורה שאחריה (פריסת "כרטיסים")
          for (var k = 1; k <= 2; k++) {
            var next = lines[idx + k];
            // שורה שיש בה שם בדיקה משלה (למשל "50.0 % NEUT%") שייכת לבדיקה אחרת: לא לקחת ממנה ערך
            if (next === undefined || matchesAnyTest(next) || isRemark(next) || /[A-Za-z֐-׿]{3}/.test(next.replace(UNIT_RE, ' '))) break;
            if (attempt(T, next, line + ' ' + next, line.trim() + ' ⏎ ' + next.trim())) break;
          }
        }
        break; // שורה שייכת לבדיקה אחת בלבד
      }
    });
    Object.keys(fallback).forEach(function (id) { if (!found[id]) list.push(fallback[id]); });
    return list;
  }

  var UNIT_RE = /(?:mg|g|ug|µg|μg|ng|pg|iu|miu|u|m|mmol|umol|µmol|nmol|pmol|meq|k|cells)\s*\/\s*(?:dl|l|ml|microl|ul|µl|mm3|hpf)\b|\b(?:fl|pg|sec|mm\/hr?|x?10\^?\d)\b|%/gi;

  /**
   * ערכים שאינם חלק מהמודל: כל שורה שיש בה שם, תוצאה וטווח ייחוס ("70 - 100").
   * מחזיר [{name, value, lo, hi, status}] כאשר status הוא 'low' / 'high' / 'ok' לפי הטווח שבמסמך עצמו.
   */
  function parseOther(text) {
    var seen = {}, out = [];
    decComma(text).split(/\r?\n/).forEach(function (line) {
      if (out.length >= 80 || !line.trim() || isRemark(line)) return;
      for (var t = 0; t < TESTS.length; t++) if (TESTS[t].re.test(line)) return; // בדיקה שכבר מטופלת במודל
      var clean = line.replace(/\d{1,4}[\/.\-]\d{1,2}[\/.\-]\d{1,4}/g, ' ').replace(/\d{1,2}:\d{2}(:\d{2})?/g, ' ');
      clean = clean.replace(/\b10e\d\s*\/\s*\S*/gi, ' ').replace(/\[[.*\s]*\]/g, ' ').replace(/\.{2,}/g, ' ');
      var rm = clean.match(/(\d+(?:\.\d+)?)\s*[-–—]\s*(\d+(?:\.\d+)?)/);
      if (!rm) return;
      var lo = Math.min(+rm[1], +rm[2]), hi = Math.max(+rm[1], +rm[2]);
      if (hi === lo) return;
      var nums = candidateNumbers(line);
      if (!nums.length) return;
      var name = clean.replace(UNIT_RE, ' ').replace(/\d+(?:\.\d+)?/g, ' ').replace(/[<>≤≥=:*|\-–—,;()\[\]"]+/g, ' ')
        .replace(/(^|\s)[HL](?=\s|$)/g, ' ').replace(/\s+/g, ' ').trim();
      if (name.length < 2 || name.length > 45 || !/[A-Za-z\u0590-\u05FF]{2}/.test(name)) return;
      var key = name.toLowerCase().split(' ').sort().join(' ');
      if (seen[key]) return;
      seen[key] = true;
      var v = nums[0];
      out.push({ name: name, value: v, lo: lo, hi: hi, status: v < lo ? 'low' : v > hi ? 'high' : 'ok' });
    });
    return out;
  }

  /** תאריך הבדיקה: קודם תאריך שכתוב ליד "תאריך הבדיקה" (ולא תאריך הדפסה), ואם אין כזה, התאריך שמופיע הכי הרבה פעמים (בשוויון — המאוחר). מחזיר 'YYYY-MM-DD' או ''. */
  function findDate(text, now) {
    var today = now || new Date();
    var re = /(?:^|[^\d])(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4}|\d{2})(?!\d)|(?:^|[^\d])(\d{4})-(\d{2})-(\d{2})(?!\d)/g;
    // תווית "תאריך הבדיקה" בשני סדרי המילים (מסמכי PDF חזותיים שומרים עברית הפוכה)
    var LABEL = /תאריך\s*הבדיקה|הבדיקה\s*תאריך|הקידבה\s*ךיראת|ךיראת\s*הקידבה|(?:collection|sample|specimen|test|draw|collected)\s*date|date\s*(?:collected|of\s*(?:test|sample|collection|draw))/i;
    function best(lines) {
      var counts = {}, m, any = false;
      lines.forEach(function (line) {
        re.lastIndex = 0;
        while ((m = re.exec(line))) {
          var d, mo, y;
          if (m[4]) { y = +m[4]; mo = +m[5]; d = +m[6]; } else { d = +m[1]; mo = +m[2]; y = +m[3]; if (y < 100) y += 2000; }
          if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 1990) continue;
          if (new Date(y, mo - 1, d) > today) continue;
          var key = y + '-' + String(mo).padStart(2, '0') + '-' + String(d).padStart(2, '0');
          counts[key] = (counts[key] || 0) + 1; any = true;
        }
      });
      var b = '';
      if (any) Object.keys(counts).forEach(function (k) { if (!b || counts[k] > counts[b] || (counts[k] === counts[b] && k > b)) b = k; });
      return b;
    }
    var lines = String(text).split(/\r?\n/);
    return best(lines.filter(function (l) { return LABEL.test(l); })) || best(lines);
  }

  // ---------- PDF ----------

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = src; s.onload = resolve; s.onerror = function () { var e = new Error('load ' + src); e.name = 'ScriptLoadError'; pdfReady = null; reject(e); };
      document.head.appendChild(s);
    });
  }

  var pdfReady = null;
  function ensurePdfJs() {
    if (!pdfReady) {
      // טעינת קוד ה-worker כסקריפט רגיל גורמת ל-pdf.js לרוץ על התהליך הראשי, כך שזה עובד גם בפתיחה ישירה של הקובץ
      // הנתיב יחסי לשורש האתר (ROOT נקבע בכל עמוד), כי המחשבון יושב בתיקייה ולא בשורש
      var base = (typeof ROOT !== 'undefined' ? ROOT : '') + 'vendor/';
      pdfReady = loadScript(base + 'pdf.min.js').then(function () { return loadScript(base + 'pdf.worker.min.js'); })
        .then(function () { window.pdfjsLib.GlobalWorkerOptions.workerSrc = base + 'pdf.worker.min.js'; });
    }
    return pdfReady;
  }

  /** מחזיר את הטקסט של ה-PDF כשורות. כל שורה מופיעה פעמיים: משמאל לימין ומימין לשמאל (למסמכים בעברית). */
  function readPdf(file) {
    return ensurePdfJs().then(function () { return file.arrayBuffer(); }).then(function (buf) {
      var task = window.pdfjsLib.getDocument({ data: buf });
      // קובץ מוגן בסיסמה (קופות החולים נוהגות להגן במספר תעודת הזהות): מבקשים אותה מהמשתמש. היא לא נשמרת ולא נשלחת.
      task.onPassword = function (update, reason) {
        var pw = window.prompt(reason === 2 ? L('הסיסמה שגויה. נסו שוב:') :
          L('הקובץ "') + file.name + L('" מוגן בסיסמה (בדרך כלל מספר תעודת הזהות). הקלידו אותה כדי לפתוח את הקובץ. הסיסמה נשארת במכשיר ואינה נשמרת.'));
        if (pw === null || pw === '') { var e = new Error('cancelled'); e.name = 'PasswordCancelled'; task.destroy(); throw e; }
        update(pw);
      };
      return task.promise;
    }).then(function (doc) {
      var pages = [];
      for (var p = 1; p <= Math.min(doc.numPages, 30); p++) pages.push(doc.getPage(p).then(function (pg) { return pg.getTextContent(); }));
      return Promise.all(pages);
    }).then(function (contents) {
      var ltr = [], rtl = [];
      contents.forEach(function (c) {
        // מקבץ לשורות לפי גובה, עם סובלנות של 3 נקודות (תאים בטבלה לא תמיד מיושרים בדיוק)
        var items = c.items.filter(function (it) { return it.str && it.str.trim(); })
          .map(function (it) { return { x: it.transform[4], y: it.transform[5], s: it.str }; })
          .sort(function (a, b) { return b.y - a.y; });
        var rows = [], cur = null;
        items.forEach(function (it) {
          if (!cur || Math.abs(cur.y - it.y) > 3) { cur = { y: it.y, items: [] }; rows.push(cur); }
          cur.items.push(it);
        });
        // בטבלאות מסוימות (למשל תוצאות מעבדה מקופות החולים) הערך יושב גבוה כמה נקודות מעל שם הבדיקה, ולכן נשאר בשורה נפרדת.
        // שורה שיש בה רק ערך (ויחידה) מצורפת לשורת השם הקרובה אליה (עד 13 נקודות), אם לשורת השם אין מספר משלה.
        var stripped = function (r) { return r.items.map(function (i) { return i.s; }).join(' ').replace(UNIT_RE, ' '); };
        rows.forEach(function (r) {
          // רק לתוצאה עצמה יש יחידה (mg/dL, U/L...); מספרי טווח הייחוס והתווית שמתחת לא נכללים
          var txt = r.items.map(function (i) { return i.s; }).join(' ');
          r.valueOnly = new RegExp(UNIT_RE.source, 'i').test(txt) && /\d/.test(stripped(r)) && !/[A-Za-z֐-׿]{2}/.test(stripped(r));
          r.nameOnly = !r.valueOnly && /[A-Za-z֐-׿]{3}/.test(stripped(r)) && candidateNumbers(r.items.map(function (i) { return i.s; }).join(' ')).length === 0;
        });
        rows.forEach(function (r) {
          if (!r.valueOnly) return;
          var best = null, bd = 13;
          rows.forEach(function (o) { var d = Math.abs(o.y - r.y); if (o.nameOnly && d <= bd) { best = o; bd = d; } });
          if (best) { best.merge = (best.merge || []).concat(r.items); r.dead = true; }
        });
        rows.forEach(function (r) { if (r.merge) r.items = r.items.concat(r.merge); });
        rows = rows.filter(function (r) { return !r.dead; });
        rows.forEach(function (row) {
          var r = row.items.sort(function (a, b) { return a.x - b.x; }).map(function (i) { return i.s; });
          ltr.push(r.join(' ')); rtl.push(r.slice().reverse().join(' '));
        });
      });
      return ltr.concat(['']).concat(rtl).join('\n');
    });
  }

  return { parse: parse, parseSupport: function (text) { return parse(text, SUPPORT); }, parseOther: parseOther, findDate: findDate, readPdf: readPdf, TESTS: TESTS };
})();

if (typeof module !== 'undefined') module.exports = LabParser;
