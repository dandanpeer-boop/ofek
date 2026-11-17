/* ממשק המשתמש: טופס רב-שלבי ומסך תוצאה. אין כאן שום קריאת רשת ושום שמירה — הכול בזיכרון הדף בלבד. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  var data = { country: 'ISR' };   // הערכים שהוזנו

  // ---------- שמירה במכשיר (localStorage בלבד — שום דבר לא נשלח) ----------
  var STORE = 'ofek-data-v1', remember = true, saveTimer = null;
  function storage() { try { return window.localStorage; } catch (e) { return null; } }
  function save() {
    var ls = storage(); if (!ls) return;
    try { if (remember) ls.setItem(STORE, JSON.stringify(data)); else ls.removeItem(STORE); } catch (e) { /* אחסון מלא או חסום */ }
  }
  function saveSoon() { clearTimeout(saveTimer); saveTimer = setTimeout(save, 300); }
  function wipe() {
    var ls = storage(); try { if (ls) { ls.removeItem(STORE); ls.removeItem('ofek-checks'); } } catch (e) { /* */ }
    data = { country: 'ISR' };
  }
  (function load() {
    var ls = storage(); if (!ls) return;
    try {
      remember = ls.getItem(STORE + '-off') !== '1';
      var saved = JSON.parse(ls.getItem(STORE) || 'null');
      if (saved && typeof saved === 'object' && LIFE_TABLES[saved.country]) data = saved;
    } catch (e) { /* נתונים פגומים — מתחילים מחדש */ }
  })();
  var step = 0;                    // 0 = פתיחה, 1..4 = שלבי הטופס, 5 = תוצאה

  var DISCLAIMER = '<div class="disclaimer"><strong>חשוב לדעת:</strong> זו הערכה סטטיסטית לצורכי סקרנות בלבד. ' +
    'היא מתארת ממוצעים של קבוצות גדולות של אנשים, לא את העתיד של אדם מסוים. היא אינה אבחנה רפואית, אינה ייעוץ רפואי ואינה תחליף לרופא/ה.</div>';

  // ---------- הגדרת הטופס ----------

  var countryOptions = Object.keys(LIFE_TABLES).map(function (c) { return [c, LIFE_TABLES[c].name]; })
    .sort(function (a, b) { return a[0] === 'ISR' ? -1 : b[0] === 'ISR' ? 1 : a[1].localeCompare(b[1], 'he'); });

  var STEPS = [
    {
      title: 'פרטים אישיים', intro: 'אלה קובעים את נקודת הבסיס: לוח התמותה הרשמי לפי גיל, מין ומדינה.',
      fields: [
        { row: [
          { id: 'age', type: 'num', label: 'גיל', unit: 'שנים', min: 18, max: 105, required: true },
          { id: 'country', type: 'select', label: 'מדינת מגורים', options: countryOptions, required: true }
        ] },
        { id: 'sex', type: 'choice', label: 'מין', hint: 'לוחות התמותה מחולקים לגברים ולנשים.', options: [['m', 'גבר'], ['f', 'אישה']], required: true },
        { row: [
          { id: 'height', type: 'num', label: 'גובה', unit: 'ס"מ', min: 120, max: 220 },
          { id: 'weight', type: 'num', label: 'משקל', unit: 'ק"ג', min: 30, max: 250 }
        ] },
        { id: 'waist', type: 'num', label: 'היקף מותניים', hint: 'בגובה הטבור, בעמידה, אחרי נשיפה רגילה.', unit: 'ס"מ', min: 50, max: 200 },
        { id: 'eduYears', type: 'choice', label: 'השכלה', options: [['9', 'עד 10 שנות לימוד'], ['12', 'תיכון'], ['14', 'על-תיכונית'], ['15', 'תואר ראשון'], ['17', 'תואר שני'], ['20', 'דוקטורט']] },
        { id: 'marital', type: 'choice', label: 'מצב משפחתי', options: [['married', 'נשוי/אה או בזוגיות קבועה'], ['single', 'ללא בן/בת זוג']] },
        { id: 'srh', type: 'choice', label: 'איך היית מגדיר/ה את מצב הבריאות שלך באופן כללי?', hint: 'שאלה אחת שמנבאת תמותה טוב יותר מהרבה בדיקות.', options: [['excellent', 'מצוינת'], ['good', 'טובה'], ['fair', 'בינונית'], ['poor', 'גרועה']] },
        { id: 'conditions', type: 'multi', label: 'האם אובחנה אצלך אחת מהמחלות האלה?', hint: 'סוכרת נשאלת בשלב בדיקות הדם.', options: [['mi', 'התקף לב'], ['stroke', 'אירוע מוחי'], ['cancer', 'סרטן'], ['copd', 'מחלת ריאות כרונית (COPD)'], ['other', 'מחלה קשה אחרת']] },
        { id: 'meds', type: 'multi', label: 'תרופות קבועות', options: [['bp', 'ללחץ דם'], ['statin', 'לכולסטרול (סטטינים)']] }
      ]
    },
    {
      title: 'אורח חיים', intro: 'הגורמים שהכי קל לשנות, ושחלקם משפיעים יותר מכל השאר.',
      fields: [
        { id: 'smoking', type: 'choice', label: 'עישון', options: [['never', 'מעולם לא עישנתי'], ['former', 'עישנתי והפסקתי'], ['current', 'מעשן/ת כיום']] },
        { id: 'quitAge', type: 'num', label: 'באיזה גיל הפסקת לעשן?', unit: 'שנים', min: 10, max: 100, showIf: function () { return data.smoking === 'former'; } },
        { id: 'alcohol', type: 'choice', label: 'אלכוהול', hint: 'מנה = כוס יין, בקבוק בירה קטן או כוסית משקה חריף.', options: [['none', 'לא שותה'], ['light', 'עד 7 מנות בשבוע'], ['mod', '8–14'], ['heavy', '15–25'], ['vheavy', 'מעל 25']] },
        { id: 'activity', type: 'choice', label: 'פעילות גופנית בשבוע', hint: 'הליכה מהירה, ריצה, שחייה, אופניים וכדומה. דקת פעילות עצימה שווה שתי דקות מתונות.', options: [['none', 'כמעט בכלל לא'], ['low', 'פחות מ-150 דקות'], ['rec', '150–300 דקות'], ['high', '300–450 דקות'], ['vhigh', 'מעל 450 דקות']] },
        { id: 'sleep', type: 'choice', label: 'שעות שינה בלילה, בממוצע', options: [['short', 'פחות מ-6'], ['normal', '6 עד 9'], ['long', 'מעל 9']] },
        { id: 'fruitveg', type: 'choice', label: 'מנות פירות וירקות ביום', hint: 'מנה = פרי בינוני או כוס ירקות חתוכים.', options: [['1', '0–1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5 ומעלה']] },
        { id: 'sitting', type: 'choice', label: 'שעות ישיבה ביום', hint: 'עבודה, נסיעות ומסכים יחד.', options: [['3', 'פחות מ-4'], ['5.5', '4–7'], ['9', '8–10'], ['12', '11 ומעלה']] },
        { type: 'heading', label: 'יש לך שעון כושר?' },
        { type: 'text', label: 'שני מספרים שהשעון כבר מודד, ואפשר פשוט להעתיק אותם מהאפליקציה בטלפון. שניהם רשות.' },
        { row: [
          { id: 'rhr', type: 'num', label: 'דופק במנוחה', hint: 'באפליקציית Garmin Connect: בכרטיס "דופק" (Heart Rate) במסך הבית, המספר שליד "מנוחה" (Resting).', unit: 'פעימות בדקה', min: 30, max: 150 },
          { id: 'vo2max', type: 'num', label: 'VO2max (מדד כושר)', hint: 'באפליקציה: בתפריט "עוד" (More) ← "נתוני ביצועים" (Performance Stats) ← VO2 Max. מספר בין 20 ל-60 בערך.', unit: 'מ"ל/ק"ג/דקה', min: 10, max: 90, stepAttr: '0.1' }
        ] },
        { type: 'text', label: 'בשעון עצמו: הדופק במנוחה מופיע במסך הדופק, וה-VO2max במסך "מצב אימון" (Training Status). בשעונים של יצרנים אחרים (Apple, Fitbit, Polar) שני הנתונים מופיעים באפליקציית הבריאות של השעון.' },
        { type: 'garmin' },
        { id: 'lonely', type: 'choice', label: 'האם לעיתים קרובות יש לך תחושת בדידות או ניתוק חברתי?', options: [['no', 'לא'], ['yes', 'כן']] }
      ]
    },
    {
      title: 'משפחה ומוצא', intro: 'אריכות ימים עוברת חלקית במשפחה. מלאו מה שידוע לכם, ודלגו על השאר.',
      fields: [
        { type: 'heading', label: 'הורים' },
        { id: 'mother', type: 'person', label: 'אמא' },
        { id: 'father', type: 'person', label: 'אבא' },
        { type: 'heading', label: 'סבים וסבתות' },
        { id: 'gp0', type: 'person', label: 'סבתא (מצד אמא)' },
        { id: 'gp1', type: 'person', label: 'סבא (מצד אמא)' },
        { id: 'gp2', type: 'person', label: 'סבתא (מצד אבא)' },
        { id: 'gp3', type: 'person', label: 'סבא (מצד אבא)' },
        { type: 'heading', label: 'מחלות במשפחה' },
        { id: 'famHeart', type: 'choice', label: 'האם להורה, אח או אחות היה התקף לב או אירוע מוחי בגיל צעיר?', hint: 'לפני גיל 55 אצל גבר, או לפני גיל 65 אצל אישה.', options: [['no', 'לא'], ['yes', 'כן'], ['', 'לא ידוע']] },
        { id: 'hered', type: 'multi', label: 'מחלות נוספות אצל קרובים מדרגה ראשונה', hint: 'לא משפיע על המספר, אבל יופיע בהערות.', options: [['breast', 'סרטן שד או שחלה'], ['colon', 'סרטן המעי הגס'], ['t2d', 'סוכרת סוג 2'], ['alz', 'אלצהיימר'], ['fh', 'כולסטרול גבוה משפחתי']] },
        { id: 'origin', type: 'multi', label: 'מוצא משפחתי', hint: 'לא משפיע על המספר. הסבר למה מופיע במסך התוצאה.', options: [['ashk', 'אשכנזי'], ['seph', 'ספרדי / צפון אפריקה'], ['miz', 'עיראק / איראן / כורדיסטן'], ['yem', 'תימן'], ['eth', 'אתיופיה'], ['arab', 'ערבי / דרוזי / בדואי'], ['other', 'אחר']] }
      ]
    },
    {
      title: 'בדיקות דם ולחץ דם', intro: 'הכול כאן רשות. כל ערך שתזינו מדייק את ההערכה; אם אין לכם תוצאות, פשוט המשיכו.',
      fields: [
        { type: 'upload' },
        { id: 'diabetes', type: 'choice', label: 'האם אובחנת בסוכרת?', options: [['no', 'לא'], ['yes', 'כן']] },
        { row: [
          { id: 'sbp', type: 'num', label: 'לחץ דם סיסטולי', hint: 'המספר הגבוה, במנוחה.', unit: 'ממ"כ', min: 70, max: 250 },
          { id: 'dbp', type: 'num', label: 'לחץ דם דיאסטולי', hint: 'המספר הנמוך. נכנס לחישוב יחד עם הסיסטולי.', unit: 'ממ"כ', min: 40, max: 150 }
        ] },
        { row: [
          { id: 'tc', type: 'num', label: 'כולסטרול כללי', unit: 'מ"ג/ד"ל', min: 80, max: 500 },
          { id: 'hdl', type: 'num', label: 'HDL ("הטוב")', unit: 'מ"ג/ד"ל', min: 10, max: 150 }
        ] },
        { row: [
          { id: 'ldl', type: 'num', label: 'LDL ("הרע")', hint: 'נכנס לחישוב רק אם לא הוזן כולסטרול כללי.', unit: 'מ"ג/ד"ל', min: 20, max: 400 },
          { id: 'tg', type: 'num', label: 'טריגליצרידים', unit: 'מ"ג/ד"ל', min: 20, max: 2000 }
        ] },
        { row: [
          { id: 'glucose', type: 'num', label: 'גלוקוז בצום', unit: 'מ"ג/ד"ל', min: 40, max: 500 },
          { id: 'hba1c', type: 'num', label: 'HbA1c', unit: '%', min: 3, max: 18, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'creatinine', type: 'num', label: 'קריאטינין', unit: 'מ"ג/ד"ל', min: 0.2, max: 15, stepAttr: '0.01' },
          { id: 'crp', type: 'num', label: 'CRP', unit: 'מ"ג/ליטר', min: 0, max: 200, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'ggt', type: 'num', label: 'GGT (אנזים כבד)', unit: 'U/L', min: 3, max: 2000 },
          { id: 'acr', type: 'num', label: 'אלבומין/קריאטינין בשתן', unit: 'מ"ג/ג', min: 0, max: 5000 }
        ] },
        { id: 'lpa', type: 'num', label: 'ליפופרוטאין (a) — Lp(a)', hint: 'בדיקה חד-פעמית בדרך כלל; הערך כמעט לא משתנה לאורך החיים.', unit: 'מ"ג/ד"ל', min: 0, max: 400, stepAttr: '0.1' },
        { type: 'heading', label: 'לחישוב הגיל הביולוגי' },
        { type: 'text', label: 'ששת הערכים האלה, יחד עם גלוקוז, קריאטינין ו-CRP שלמעלה, מאפשרים לחשב גיל ביולוגי. כולם מופיעים בספירת דם ובבדיקת כימיה רגילות.' },
        { row: [
          { id: 'albumin', type: 'num', label: 'אלבומין', unit: 'ג/ד"ל', min: 1.5, max: 6.5, stepAttr: '0.1' },
          { id: 'alp', type: 'num', label: 'פוספטאזה בסיסית (ALP)', unit: 'U/L', min: 10, max: 1000 }
        ] },
        { row: [
          { id: 'wbc', type: 'num', label: 'תאים לבנים (WBC)', unit: 'אלפים/מק"ל', min: 0.5, max: 50, stepAttr: '0.1' },
          { id: 'lymph', type: 'num', label: 'לימפוציטים', unit: '%', min: 5, max: 80, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'mcv', type: 'num', label: 'MCV', unit: 'fL', min: 50, max: 130, stepAttr: '0.1' },
          { id: 'rdw', type: 'num', label: 'RDW', unit: '%', min: 9, max: 25, stepAttr: '0.1' }
        ] }
      ]
    }
  ];

  // ---------- עזרים ----------

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function num(v) { if (v === undefined || v === null || String(v).trim() === '') return undefined; var n = Number(v); return isFinite(n) ? n : undefined; }
  function flat(fields) { var out = []; fields.forEach(function (f) { if (f.row) out = out.concat(f.row); else out.push(f); }); return out; }
  function fmt(x, d) { return x.toFixed(d === undefined ? 1 : d); }
  function signed(x) { return (x >= 0 ? '+' : '−') + Math.abs(x).toFixed(1); }

  // ---------- ציור הטופס ----------

  function fieldHTML(f) {
    if (f.row) return '<div class="row2">' + f.row.map(fieldHTML).join('') + '</div>';
    if (f.type === 'heading') return '<h3>' + esc(f.label) + '</h3>';
    if (f.type === 'text') return '<p class="small muted">' + esc(f.label) + '</p>';
    if (f.type === 'upload') {
      return '<div class="upload"><div class="lbl">יש לכם קובצי PDF של בדיקות דם?</div>' +
        '<p class="hint">אפשר לבחור כמה קבצים יחד: כמה דפים של אותה בדיקה, וגם בדיקות ישנות יותר. הטופס יתמלא מהבדיקה העדכנית ביותר, ובמסך התוצאה תוצג המגמה לאורך זמן. הקבצים נקראים במכשיר שלכם בלבד.</p>' +
        '<label class="filebtn"><input type="file" id="labfile" multiple accept="application/pdf,.pdf,.txt,text/plain"><span>בחירת קובצי PDF</span></label>' +
        '<details><summary>או הדבקת טקסט מתוך הבדיקות</summary><textarea id="labtext" rows="5" dir="auto" aria-label="טקסט הבדיקות"></textarea>' +
        '<button type="button" id="labparse">שליפת ערכים מהטקסט</button></details>' +
        '<div id="labdocs"></div><div id="labresult" aria-live="polite"></div></div>';
    }
    if (f.type === 'garmin') {
      return '<details class="adv"><summary>למתקדמים: ייבוא אוטומטי מקובץ ייצוא של Garmin</summary><div class="upload">' +
        '<p class="hint">לא חובה, וההזנה הידנית למעלה נותנת בדיוק את אותה תוצאה. מי שביקש מגרמין את כל הנתונים שלו (באתר Garmin: Account ← Data Management ← Export Your Data, והקובץ מגיע במייל) יכול לבחור כאן את קובץ ה-ZIP. הקובץ נקרא במכשיר שלכם בלבד.</p>' +
        '<label class="filebtn"><input type="file" id="garminfile" multiple accept=".zip,.json,.csv,application/zip,application/json,text/csv"><span>בחירת קובץ ייצוא</span></label>' +
        '<div id="garminresult" aria-live="polite"></div></div></details>';
    }
    var hidden = f.showIf && !f.showIf() ? ' hidden' : '';
    var hint = f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '';
    var v = data[f.id];
    if (f.type === 'num') {
      return '<div class="field" data-field="' + f.id + '"' + hidden + '><label for="f_' + f.id + '">' + esc(f.label) + '</label>' + hint +
        '<div class="with-unit"><input type="number" inputmode="decimal" id="f_' + f.id + '" data-id="' + f.id + '" step="' + (f.stepAttr || '1') +
        '" value="' + esc(v === undefined ? '' : v) + '"><span>' + esc(f.unit || '') + '</span></div><div class="err" id="e_' + f.id + '"></div></div>';
    }
    if (f.type === 'select') {
      return '<div class="field"><label for="f_' + f.id + '">' + esc(f.label) + '</label>' + hint + '<select id="f_' + f.id + '" data-id="' + f.id + '">' +
        f.options.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    }
    if (f.type === 'choice' || f.type === 'multi') {
      var multi = f.type === 'multi';
      return '<div class="field" role="group" aria-label="' + esc(f.label) + '"><div class="lbl">' + esc(f.label) + '</div>' + hint + '<div class="opts">' +
        f.options.map(function (o) {
          var on = multi ? (v || []).indexOf(o[0]) >= 0 : (v === o[0] && v !== undefined);
          return '<label class="opt"><input type="' + (multi ? 'checkbox' : 'radio') + '" name="f_' + f.id + '" data-id="' + f.id + '" value="' + o[0] + '"' + (on ? ' checked' : '') + '><span>' + esc(o[1]) + '</span></label>';
        }).join('') + '</div><div class="err" id="e_' + f.id + '"></div></div>';
    }
    if (f.type === 'person') {
      var p = data[f.id] || {};
      return '<div class="person" data-person="' + f.id + '"><div class="lbl">' + esc(f.label) + '</div><div class="person-grid">' +
        '<select data-p="status" aria-label="' + esc(f.label) + ' — מצב"><option value="">לא ידוע</option><option value="alive"' + (p.status === 'alive' ? ' selected' : '') + '>בחיים</option><option value="dead"' + (p.status === 'dead' ? ' selected' : '') + '>נפטר/ה</option></select>' +
        '<input type="number" inputmode="numeric" data-p="age" min="0" max="120" placeholder="' + (p.status === 'dead' ? 'גיל בפטירה' : 'גיל') + '" aria-label="' + esc(f.label) + ' — גיל" value="' + esc(p.age === undefined ? '' : p.age) + '"' + (p.status ? '' : ' hidden') + '>' +
        '<select data-p="cause" aria-label="' + esc(f.label) + ' — סיבת הפטירה"' + (p.status === 'dead' ? '' : ' hidden') + '><option value="natural">ממחלה או מזקנה</option><option value="external"' + (p.cause === 'external' ? ' selected' : '') + '>תאונה, מלחמה או אלימות</option></select>' +
        '</div><div class="err" id="e_' + f.id + '"></div></div>';
    }
    return '';
  }

  function renderIntro() {
    var returning = num(data.age) !== undefined && !!data.sex;
    app.innerHTML = '<div class="card">' +
      '<h1>כמה שנים, סטטיסטית, עוד לפניך?</h1>' +
      '<p>מחשבון שמעריך תוחלת חיים אישית. הוא מתחיל מלוח התמותה הרשמי של ארגון הבריאות העולמי לפי גיל, מין ומדינה, ומתקן אותו לפי אורח החיים, ההיסטוריה המשפחתית ובדיקות הדם שלך, על סמך מחקרים אפידמיולוגיים גדולים.</p>' +
      (returning
        ? '<div class="welcome"><b>הנתונים שהזנת בפעם הקודמת שמורים במכשיר הזה.</b> אפשר לעבור ישר לתוצאה, או לעדכן רק את מה שהשתנה.</div>'
        : '<p class="muted">ארבעה שלבים קצרים, כשלוש דקות. רק הגיל, המין והמדינה הם חובה.</p>') +
      DISCLAIMER +
      '<label class="remember"><input type="checkbox" id="remember"' + (remember ? ' checked' : '') + '> לזכור את הנתונים שלי במכשיר הזה, כדי שלא אצטרך להזין שוב</label>' +
      '<p class="small muted">🔒 פרטיות: כל החישוב נעשה בדפדפן שלך ושום נתון לא נשלח לשרת. אם בחרת לזכור, הנתונים נשמרים רק בדפדפן הזה, ואפשר למחוק אותם בכל רגע בכפתור "מחיקת הנתונים" למעלה. במחשב משותף עדיף לא לסמן.</p>' +
      '<div class="guidelink"><button type="button" id="guideOpen">📖 מדריכים: שינה, תזונה, צום, סוכר ועוד <span class="small muted">(בלי להזין נתונים)</span></button></div>' +
      '<div class="nav">' + (returning ? '<button id="edit">עדכון הנתונים</button><button class="primary" id="next">לתוצאה שלי</button>'
        : '<span></span><button class="primary" id="next">בואו נתחיל</button>') + '</div></div>';
    document.getElementById('remember').onchange = function () {
      remember = this.checked;
      var ls = storage(); try { if (ls) { if (remember) ls.removeItem(STORE + '-off'); else ls.setItem(STORE + '-off', '1'); } } catch (e) { /* */ }
      save();
    };
    document.getElementById('next').onclick = function () { step = returning ? STEPS.length + 1 : 1; render(); };
    document.getElementById('guideOpen').onclick = function () { location.hash = '#/topics'; };
    if (returning) document.getElementById('edit').onclick = function () { step = 1; render(); };
  }

  function renderStep() {
    var s = STEPS[step - 1];
    var prog = '<div class="progress" aria-hidden="true">' + STEPS.map(function (_, i) { return '<div class="' + (i < step ? 'on' : '') + '"></div>'; }).join('') + '</div>';
    app.innerHTML = '<div class="card">' + prog +
      '<div class="step-label">שלב ' + step + ' מתוך ' + STEPS.length + '</div><h2>' + esc(s.title) + '</h2><p class="muted">' + esc(s.intro) + '</p>' +
      s.fields.map(fieldHTML).join('') +
      '<div class="nav"><button id="back">חזרה</button><button class="primary" id="next">' + (step === STEPS.length ? 'חשבו את ההערכה' : 'המשך') + '</button></div></div>';

    app.querySelectorAll('[data-id]').forEach(function (el) {
      el.addEventListener(el.type === 'number' ? 'input' : 'change', function () {
        var id = el.dataset.id;
        if (el.type === 'checkbox') {
          data[id] = Array.prototype.map.call(app.querySelectorAll('[data-id="' + id + '"]:checked'), function (c) { return c.value; });
        } else data[id] = el.value;
        // שדות מותנים
        flat(s.fields).forEach(function (f) {
          if (f.showIf) { var w = app.querySelector('[data-field="' + f.id + '"]'); if (w) w.hidden = !f.showIf(); }
        });
      });
    });
    app.querySelectorAll('[data-person]').forEach(function (box) {
      var id = box.dataset.person;
      var st = box.querySelector('[data-p=status]'), ag = box.querySelector('[data-p=age]'), ca = box.querySelector('[data-p=cause]');
      function sync() {
        data[id] = { status: st.value, age: num(ag.value), cause: ca.value };
        ag.hidden = !st.value; ca.hidden = st.value !== 'dead';
        ag.placeholder = st.value === 'dead' ? 'גיל בפטירה' : 'גיל כיום';
      }
      st.onchange = sync; ag.oninput = sync; ca.onchange = sync;
    });
    wireUpload();
    wireGarmin();
    document.getElementById('back').onclick = function () { step--; render(); };
    document.getElementById('next').onclick = function () { if (validate(s)) { step++; render(); } };
  }

  // ---------- שליפת ערכים ממסמך בדיקות ----------

  function heDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /** מסמכי הבדיקות לפי תאריך: [{date, values:{id:value}}], מהישן לחדש. מסמכים מאותו תאריך מתמזגים. */
  function labsByDate() {
    var map = {};
    (data.labDocs || []).forEach(function (doc) {
      var k = doc.date || todayISO();
      map[k] = map[k] || {};
      doc.found.forEach(function (r) { map[k][r.id] = r.value; });
    });
    return Object.keys(map).sort().map(function (k) { return { date: k, values: map[k] }; });
  }

  /** ממלא את שדות הטופס מהבדיקה העדכנית ביותר שיש בה כל ערך */
  function applyLabDocs() {
    var latest = {};
    labsByDate().forEach(function (d) { Object.keys(d.values).forEach(function (id) { latest[id] = d.values[id]; }); });
    Object.keys(latest).forEach(function (id) {
      data[id] = String(latest[id]);
      var el = document.getElementById('f_' + id); if (el) el.value = latest[id];
    });
    save();
  }

  function wireUpload() {
    var file = document.getElementById('labfile'); if (!file) return;
    var out = document.getElementById('labresult'), list = document.getElementById('labdocs');
    data.labDocs = data.labDocs || [];
    function msg(html, cls) { out.className = cls || ''; out.innerHTML = html; }

    function drawDocs() {
      if (!data.labDocs.length) { list.innerHTML = ''; return; }
      list.innerHTML = '<div class="doclist">' + data.labDocs.map(function (d, i) {
        return '<div class="docrow"><span class="docname" dir="auto">' + esc(d.name) + '</span>' +
          '<input type="date" data-doc="' + i + '" value="' + esc(d.date) + '" max="' + todayISO() + '" aria-label="תאריך הבדיקה">' +
          '<span class="small muted">' + d.found.length + ' ערכים</span>' +
          '<button type="button" data-rm="' + i + '" aria-label="הסרת המסמך">הסרה</button></div>';
      }).join('') + '</div><p class="small muted">בדקו שתאריך כל בדיקה נכון. מסמכים מאותו תאריך נחשבים בדיקה אחת.</p>';
      list.querySelectorAll('[data-doc]').forEach(function (el) {
        el.onchange = function () { data.labDocs[+el.dataset.doc].date = el.value; applyLabDocs(); };
      });
      list.querySelectorAll('[data-rm]').forEach(function (el) {
        el.onclick = function () { data.labDocs.splice(+el.dataset.rm, 1); drawDocs(); applyLabDocs(); msg(''); };
      });
    }

    function addDoc(name, text, fromPdf) {
      var found = LabParser.parse(text), other = LabParser.parseOther(text);
      if (!found.length && !other.length) {
        var half = text.split('\n\n')[0] || text;
        return { name: name, ok: false, scanned: fromPdf && text.replace(/\s/g, '').length < 20,
          preview: half.split('\n').filter(function (l) { return l.trim(); }).slice(0, 40).map(function (l) { return l.slice(0, 110); }).join('\n') };
      }
      data.labDocs.push({ name: name, date: LabParser.findDate(text) || todayISO(), found: found, other: other });
      return { name: name, ok: true, found: found };
    }

    function report(results) {
      drawDocs(); applyLabDocs();
      var good = results.filter(function (r) { return r.ok; }), bad = results.filter(function (r) { return !r.ok; });
      var html = '';
      if (good.length) {
        var last = good[good.length - 1];
        html += '<b>' + (good.length === 1 ? 'נמצאו ' + last.found.length + ' ערכים' : 'נקראו ' + good.length + ' מסמכים') + ' והטופס מולא מהבדיקה העדכנית ביותר.</b> בדקו את הערכים מול המסמך לפני שממשיכים' +
          (good.length === 1 ? ':' : '. הערכים מהמסמך האחרון שנקרא (' + esc(last.name) + '):') + '<ul>' +
          last.found.map(function (r) {
            return '<li>' + esc(r.label) + ': <b dir="ltr">' + r.value + '</b> ' + esc(r.unit) + (r.converted ? ' (הומר מיחידות אחרות)' : '') +
              '<div class="src" dir="auto">' + esc(r.line) + '</div></li>';
          }).join('') + '</ul>';
      }
      bad.forEach(function (r) {
        html += '<p>' + esc(r.name) + ': ' + (r.error ? (r.error === 'ScriptLoadError' ? 'רכיב קריאת ה-PDF לא נטען. אם הדף פתוח בכתובת localhost, השרת המקומי כנראה כבוי: פתחו את הקובץ index.html ישירות בלחיצה כפולה, או הפעילו את השרת מחדש ורעננו.'
          : /Password/.test(r.error) ? 'הקובץ מוגן בסיסמה ולא נפתח. נסו שוב והקלידו את הסיסמה (בדרך כלל מספר תעודת הזהות).'
          : 'לא הצלחתי לקרוא את הקובץ; ייתכן שהוא פגום או שאינו PDF. (פרט טכני: ' + esc(r.error) + ')')
          : r.scanned ? 'לא נמצא טקסט. כנראה מסמך סרוק (תמונה), וכרגע נקראים רק קובצי PDF עם טקסט.'
          : 'לא זוהו בדיקות מוכרות.') + '</p>' +
          (r.preview && !r.scanned ? '<details class="rawtext"><summary>הצגת הטקסט שנקרא מהקובץ</summary><p class="small">זה מה שהמערכת הצליחה לקרוא. אם זה אכן דוח בדיקות, העתיקו מכאן כמה שורות של תוצאות (בלי שם, תעודת זהות או פרטים מזהים) כדי שאפשר יהיה להתאים את הקריאה למבנה של הדוח.</p><pre dir="auto">' + esc(r.preview) + '</pre></details>' : '');
      });
      msg(html, good.length ? 'ok' : 'warn');
    }

    file.onchange = function () {
      var files = Array.prototype.slice.call(file.files); if (!files.length) return;
      msg('קורא ' + (files.length === 1 ? 'את הקובץ' : files.length + ' קבצים') + '…');
      Promise.all(files.map(function (f) {
        var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
        return (isPdf ? LabParser.readPdf(f) : f.text()).then(function (t) { return addDoc(f.name, t, isPdf); },
          function (e) { return { name: f.name, ok: false, error: (e && e.name) || 'Error' }; });
      })).then(report);
      file.value = '';
    };
    document.getElementById('labparse').onclick = function () { report([addDoc('טקסט שהודבק', document.getElementById('labtext').value, false)]); };
    drawDocs();
  }

  // ---------- ייבוא מ-Garmin ----------

  function wireGarmin() {
    var file = document.getElementById('garminfile'); if (!file) return;
    var out = document.getElementById('garminresult');
    function msg(html, cls) { out.className = 'impres ' + (cls || ''); out.innerHTML = html; }
    function fmtD(d) { return d ? ' (עד ' + d.toLocaleDateString('he-IL') + ')' : ''; }
    file.onchange = function () {
      if (!file.files.length) return;
      msg('קורא את הקובץ… בקובץ ייצוא גדול זה יכול לקחת כמה שניות.');
      GarminImport.importFiles(file.files).then(function (r) {
        var parts = [];
        if (r.rhr !== undefined) {
          data.rhr = String(r.rhr); document.getElementById('f_rhr').value = r.rhr;
          parts.push('דופק במנוחה: <b dir="ltr">' + r.rhr + '</b>, ממוצע של ' + r.rhrDays + ' הימים האחרונים שנמדדו' + fmtD(r.rhrDate));
        }
        if (r.vo2 !== undefined) {
          data.vo2max = String(r.vo2); document.getElementById('f_vo2max').value = r.vo2;
          parts.push('VO2max: <b dir="ltr">' + r.vo2 + '</b>, המדידה האחרונה' + fmtD(r.vo2Date));
        }
        save();
        if (parts.length) msg('<b>יובא מהקובץ ומולא בטופס:</b><ul><li>' + parts.join('</li><li>') + '</li></ul>' +
          (parts.length < 2 ? '<p>הנתון השני לא נמצא בקובץ; אפשר להזין אותו ידנית.</p>' : ''), 'ok');
        else msg('לא נמצאו בקובץ דופק במנוחה או VO2max (נקראו ' + r.filesRead + ' קבצים). אפשר להעתיק את שני הנתונים ידנית מאפליקציית Garmin Connect.', 'warn');
      }).catch(function () {
        msg('לא הצלחתי לקרוא את הקובץ. ודאו שזה קובץ ה-ZIP המקורי מגרמין, או קובצי JSON / CSV מתוכו.', 'warn');
      });
      file.value = '';
    };
  }

  // ---------- מגמות בבדיקות הדם ----------

  var TREND_DIR = { tc: -1, ldl: -1, tg: -1, glucose: -1, hba1c: -1, crp: -1, creatinine: -1, ggt: -1, acr: -1, rdw: -1, hdl: 1, albumin: 1 };

  function spark(vals, cls) {
    var W = 110, H = 30, p = 4, min = Math.min.apply(null, vals), max = Math.max.apply(null, vals), span = max - min || 1;
    var pts = vals.map(function (v, i) { return [p + i * (W - 2 * p) / (vals.length - 1), H - p - (v - min) / span * (H - 2 * p)]; });
    var col = cls === 'pos' ? 'var(--pos)' : cls === 'neg' ? 'var(--neg)' : 'var(--muted)';
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="spark" aria-hidden="true"><polyline fill="none" stroke="' + col + '" stroke-width="2" stroke-linejoin="round" points="' +
      pts.map(function (q) { return q[0].toFixed(1) + ',' + q[1].toFixed(1); }).join(' ') + '"/>' +
      pts.map(function (q) { return '<circle cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="2.5" fill="' + col + '"/>'; }).join('') + '</svg>';
  }

  /** ערכים שנמצאו במסמכים ואינם חלק מהמודל — הערך העדכני ביותר לכל בדיקה */
  function othersHTML() {
    var docs = (data.labDocs || []).slice().sort(function (a, b) { return (a.date || '') < (b.date || '') ? -1 : 1; });
    var map = {};
    docs.forEach(function (d) { (d.other || []).forEach(function (o) { map[o.name.toLowerCase()] = { o: o, date: d.date }; }); });
    var list = Object.keys(map).map(function (k) { return map[k]; });
    if (!list.length) return '';
    var rank = { high: 0, low: 0, ok: 1 };
    list.sort(function (a, b) { return rank[a.o.status] - rank[b.o.status]; });
    var out = list.filter(function (x) { return x.o.status !== 'ok'; }).length;
    return '<h3>ערכים נוספים מהבדיקות</h3><details class="others"' + (out ? ' open' : '') + '><summary>' + list.length + ' ערכים נוספים נמצאו במסמכים' +
      (out ? ', מתוכם <b class="neg">' + out + ' מחוץ לטווח</b>' : ', כולם בטווח') + '</summary>' +
      '<p class="small muted">הערכים האלה אינם נכללים בחישוב תוחלת החיים. הטווח הוא זה שמופיע במסמך עצמו, והקריאה אוטומטית ועלולה לטעות; ערך מחוץ לטווח הוא סיבה לשאול את הרופא/ה, לא אבחנה.</p>' +
      list.map(function (x) {
        var o = x.o, st = o.status === 'ok' ? '<span class="chip">בטווח</span>' : '<span class="chip bad">' + (o.status === 'high' ? 'גבוה' : 'נמוך') + '</span>';
        return '<div class="orow"><span class="oname" dir="auto">' + esc(o.name) + '</span><b dir="ltr">' + o.value + '</b><span class="small muted" dir="ltr">' + o.lo + ' – ' + o.hi + '</span>' + st + '</div>';
      }).join('') + '</details>';
  }

  function trendsHTML(inp, r) {
    var dates = labsByDate();
    if (dates.length < 2) return '';
    var rows = '';
    LabParser.TESTS.forEach(function (T) {
      var pts = dates.filter(function (d) { return d.values[T.id] !== undefined; });
      if (pts.length < 2) return;
      var first = pts[0].values[T.id], last = pts[pts.length - 1].values[T.id];
      var rel = first ? (last - first) / Math.abs(first) : 0, dir = TREND_DIR[T.id] || 0;
      var cls = Math.abs(rel) < 0.03 || !dir ? '' : (rel * dir > 0 ? 'pos' : 'neg');
      var word = Math.abs(rel) < 0.03 ? 'יציב' : (rel > 0 ? 'עלייה' : 'ירידה') + ' של ' + Math.round(Math.abs(rel) * 100) + '%';
      rows += '<div class="trow"><div class="name">' + esc(T.label) + '<div class="det">' + heDate(pts[0].date) + ' ← ' + heDate(pts[pts.length - 1].date) + '</div></div>' +
        '<div dir="ltr">' + spark(pts.map(function (d) { return d.values[T.id]; }), cls) + '</div>' +
        '<div class="tval"><span dir="ltr">' + first + ' → ' + last + '</span><div class="det ' + cls + '">' + word + '</div></div></div>';
    });
    if (!rows) return '';

    // ההערכה לפי כל בדיקה: משתנים רק הערכים שנמדדו בכל התאריכים, וכל השאר קבוע
    var common = Object.keys(dates[0].values).filter(function (id) { return dates.every(function (d) { return d.values[id] !== undefined; }); });
    var est = '';
    if (common.length) {
      var ages = dates.map(function (d) {
        var x = Object.assign({}, inp);
        common.forEach(function (id) { x[id] = d.values[id]; });
        return LifeModel.estimate(x);
      });
      var diff = ages[ages.length - 1] - ages[0];
      est = '<div class="trendest"><div class="small muted">ההערכה לפי כל בדיקה, בגילך הנוכחי וכשכל שאר הנתונים קבועים</div><div class="estrow">' +
        dates.map(function (d, i) { return '<div><b>' + fmt(ages[i]) + '</b><span>' + heDate(d.date) + '</span></div>'; }).join('<i aria-hidden="true">←</i>') + '</div>' +
        '<div>' + (Math.abs(diff) < 0.05 ? 'הבדיקות לא שינו את ההערכה.' : 'השינוי בבדיקות ' + (diff > 0 ? 'הוסיף' : 'הוריד') +
          ' <b class="' + (diff > 0 ? 'pos' : 'neg') + '" dir="ltr">' + signed(diff) + '</b> שנים להערכה.') + '</div></div>';
    }
    return '<h3>מגמות בבדיקות הדם</h3><p class="small muted">השוואה בין ' + dates.length + ' בדיקות. ירוק מסמן שינוי לכיוון שקשור בסיכון נמוך יותר, אדום לכיוון ההפוך. הבדלים קטנים בין בדיקות הם טבעיים ואינם בהכרח מגמה.</p>' +
      rows + est;
  }

  function validate(s) {
    var ok = true, first = null;
    flat(s.fields).forEach(function (f) {
      var e = document.getElementById('e_' + f.id); if (!e) return;
      var msg = '';
      if (f.showIf && !f.showIf()) { e.textContent = ''; return; }
      if (f.type === 'num') {
        var raw = data[f.id], n = num(raw);
        if (f.required && n === undefined) msg = 'שדה חובה';
        else if (raw !== undefined && String(raw).trim() !== '' && n === undefined) msg = 'יש להזין מספר';
        else if (n !== undefined && (n < f.min || n > f.max)) msg = 'הערך צריך להיות בין ' + f.min + ' ל-' + f.max;
        if (f.id === 'quitAge' && n !== undefined && num(data.age) !== undefined && n > num(data.age)) msg = 'גיל ההפסקה לא יכול להיות גבוה מהגיל שלך';
      } else if (f.type === 'choice' && f.required && !data[f.id]) msg = 'יש לבחור אחת מהאפשרויות';
      else if (f.type === 'person') {
        var p = data[f.id];
        if (p && p.status && p.age !== undefined && (p.age < 0 || p.age > 120)) msg = 'הגיל צריך להיות בין 0 ל-120';
      }
      e.textContent = msg;
      if (msg) { ok = false; first = first || e; }
    });
    if (first) first.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  // ---------- איסוף הקלט למודל ----------

  function collect() {
    var inp = { country: data.country, sex: data.sex, age: num(data.age) };
    ['height', 'weight', 'eduYears', 'quitAge', 'fruitveg', 'sbp', 'tc', 'hdl', 'ldl', 'glucose', 'hba1c', 'creatinine', 'crp', 'albumin', 'alp', 'wbc', 'lymph', 'mcv', 'rdw', 'waist', 'sitting', 'rhr', 'vo2max', 'dbp', 'tg', 'ggt', 'acr', 'lpa']
      .forEach(function (k) { inp[k] = num(data[k]); });
    ['smoking', 'alcohol', 'activity', 'sleep', 'lonely', 'diabetes', 'famHeart', 'srh', 'marital'].forEach(function (k) { inp[k] = data[k] || undefined; });
    inp.conditions = data.conditions || [];
    inp.mother = data.mother; inp.father = data.father;
    inp.grandparents = [data.gp0, data.gp1, data.gp2, data.gp3].filter(Boolean);
    return inp;
  }

  // ---------- מסך התוצאה ----------

  // רוחב התרשים בפיקסלים אמיתיים, כדי שהטקסט לא יתכווץ במסכים צרים
  function chartW() { return Math.max(280, Math.min(680, app.clientWidth - 50)); }

  function rangeChart(r) {
    var p = r.personal, W = chartW(), H = 92, padX = 24;
    var lo = Math.floor(Math.min(p.p10, r.baseline.expectedAge) / 5) * 5 - 5, hi = Math.ceil(Math.max(p.p90, r.baseline.expectedAge) / 5) * 5 + 5;
    function x(a) { return padX + (a - lo) / (hi - lo) * (W - 2 * padX); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="טווח גילים: 80% מהמקרים בין ' + Math.round(p.p10) + ' ל-' + Math.round(p.p90) + '">';
    s += '<rect x="' + padX + '" y="30" width="' + (W - 2 * padX) + '" height="18" rx="9" fill="var(--track)"/>';
    s += '<rect x="' + x(p.p10) + '" y="30" width="' + (x(p.p90) - x(p.p10)) + '" height="18" rx="9" fill="var(--accent)" opacity=".3"/>';
    s += '<rect x="' + x(p.p25) + '" y="30" width="' + (x(p.p75) - x(p.p25)) + '" height="18" rx="9" fill="var(--accent)"/>';
    s += '<line x1="' + x(p.expectedAge) + '" x2="' + x(p.expectedAge) + '" y1="22" y2="56" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>';
    s += '<text x="' + x(p.expectedAge) + '" y="15" text-anchor="middle" style="fill:var(--ink);font-weight:700;font-size:14px">' + fmt(p.expectedAge) + '</text>';
    for (var a = lo; a <= hi; a += 5) s += '<text x="' + x(a) + '" y="80" text-anchor="middle">' + a + '</text><line x1="' + x(a) + '" x2="' + x(a) + '" y1="60" y2="65" stroke="var(--line)"/>';
    return s + '</svg>';
  }

  function survivalChart(r) {
    var W = chartW(), H = W < 450 ? 240 : 300, L = 46, R = 12, T = 12, B = 34, a0 = r.age, a1 = 110;
    function x(a) { return L + (a - a0) / (a1 - a0) * (W - L - R); }
    function y(p) { return T + (1 - p) * (H - T - B); }
    function path(curve) {
      var d = '';
      for (var i = 0; i < curve.length && a0 + i <= a1; i++) d += (i ? 'L' : 'M') + x(a0 + i).toFixed(1) + ' ' + y(curve[i]).toFixed(1);
      return d;
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="עקומת הישרדות: הסיכוי להיות בחיים בכל גיל">';
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
      s += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="var(--line)"/>' +
        '<text x="' + (L - 8) + '" y="' + (y(p) + 4) + '" text-anchor="end">' + Math.round(p * 100) + '%</text>';
    });
    for (var a = Math.ceil(a0 / 10) * 10; a <= a1; a += 10) s += '<text x="' + x(a) + '" y="' + (H - 10) + '" text-anchor="middle">' + a + '</text>';
    s += '<path d="' + path(r.baseline.curve) + '" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>';
    s += '<path d="' + path(r.personal.curve) + '" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>';
    return s + '</svg>';
  }

  function factorRows(r) {
    var list = r.contributions;
    if (!list.length) return '<p class="muted">לא הוזנו נתונים מעבר לגיל, מין ומדינה, ולכן ההערכה זהה לממוצע. חזרו לטופס והוסיפו פרטים כדי לקבל הערכה אישית.</p>';
    var max = Math.max.apply(null, list.map(function (c) { return Math.abs(c.years); }).concat([0.5]));
    return list.map(function (c) {
      var w = Math.abs(c.years) / max * 50, pos = c.years >= 0;
      var cls = Math.abs(c.years) < 0.05 ? '' : pos ? 'pos' : 'neg';
      var bar = '<div class="bar ' + (pos ? 'pos' : 'neg') + '" style="' + (pos ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%"></div>';
      return '<div class="frow"><div class="name">' + esc(c.label) + '<div class="det">' + esc(c.detail) + '</div></div>' +
        '<div class="track">' + bar + '</div><div class="val ' + cls + '">' + signed(c.years) + ' שנים</div></div>';
    }).join('');
  }

  // ---------- סימולטור "מה אם" ----------

  function fieldById(id) {
    for (var i = 0; i < STEPS.length; i++) { var fs = flat(STEPS[i].fields); for (var j = 0; j < fs.length; j++) if (fs[j].id === id) return fs[j]; }
  }

  /** השינויים האפשריים בהרגלים, עם ההשפעה של כל אחד בשנים. מחזיר רשימה ממוינת מהגדול לקטן. */
  function improvements(inp, r) {
    var c = [], bmi = inp.height && inp.weight ? inp.weight / Math.pow(inp.height / 100, 2) : null;
    function add(id, label, over) { c.push({ id: id, label: label, over: over }); }
    if (inp.smoking === 'current') add('smoking', 'להפסיק לעשן', { smoking: 'former', quitAge: r.age });
    if (bmi !== null && bmi > 25.5) { var w = Math.round(24 * Math.pow(inp.height / 100, 2)); add('bmi', 'לרדת למשקל ' + w + ' ק"ג (BMI 24)', { weight: w }); }
    if (bmi !== null && bmi < 18.5) { var w2 = Math.round(20 * Math.pow(inp.height / 100, 2)); add('bmi', 'לעלות למשקל ' + w2 + ' ק"ג (BMI 20)', { weight: w2 }); }
    if (inp.activity === 'none' || inp.activity === 'low') add('activity', 'להגיע ל-150–300 דקות פעילות גופנית בשבוע', { activity: 'rec' });
    else if (inp.activity === 'rec') add('activity', 'להגדיל את הפעילות ל-300–450 דקות בשבוע', { activity: 'high' });
    if (inp.alcohol === 'mod' || inp.alcohol === 'heavy' || inp.alcohol === 'vheavy') add('alcohol', 'להפחית אלכוהול לעד 7 מנות בשבוע', { alcohol: 'light' });
    if (inp.sleep === 'short' || inp.sleep === 'long') add('sleep', 'לישון 6 עד 9 שעות בלילה', { sleep: 'normal' });
    if (inp.fruitveg !== undefined && inp.fruitveg < 5) add('fruitveg', 'לאכול 5 מנות פירות וירקות ביום', { fruitveg: 5 });
    if (inp.sitting !== undefined && inp.sitting > 5.5) add('sitting', 'להפחית ישיבה ל-4–7 שעות ביום', { sitting: 5.5 });
    if (inp.lonely === 'yes') add('social', 'לחזק קשרים חברתיים', { lonely: 'no' });
    if (inp.sbp !== undefined && inp.sbp > 122) add('bp', 'להוריד לחץ דם סיסטולי ל-120', inp.dbp !== undefined ? { sbp: 120, dbp: Math.min(inp.dbp, 80) } : { sbp: 120 });
    if (inp.tc !== undefined && inp.tc > 185) add('chol', 'להוריד כולסטרול כללי ל-180', { tc: 180 });
    var base = r.personal.expectedAge;
    c.forEach(function (x) { x.gain = LifeModel.estimate(Object.assign({}, inp, x.over)) - base; });
    return c.filter(function (x) { return x.gain >= 0.1; }).sort(function (a, b) { return b.gain - a.gain; });
  }

  // ---------- מדריך: שינה, תזונה ולחץ ----------

  function guideHTML(inp, r) {
    if (typeof GUIDE === 'undefined') return '';
    var standalone = !inp; // דף המדריך העצמאי: בלי נתונים אישיים
    var gain = {}; if (!standalone) improvements(inp, r).forEach(function (x) { gain[x.id] = x.gain; });
    var sleepLbl = { short: 'פחות מ-6 שעות', normal: '6 עד 9 שעות', long: 'מעל 9 שעות' };
    // שורה אישית לכל נושא, ודירוג: מה שרלוונטי לתשובות של המשתמש קודם
    var personal = standalone ? {} : {
      sleep: !inp.sleep ? { rank: 1, text: 'לא הזנת שעות שינה, ולכן הנושא הזה לא נכלל בהערכה שלך.' }
        : gain.sleep ? { rank: 2, text: 'דיווחת על שינה של ' + sleepLbl[inp.sleep] + '. לפי החישוב, שינה של 6 עד 9 שעות שווה כ-<b class="pos" dir="ltr">' + signed(gain.sleep) + '</b> שנים.' }
        : { rank: 0, text: 'דיווחת על שינה של ' + sleepLbl[inp.sleep] + ', בטווח שהחישוב מניח.' },
      nutrition: inp.fruitveg === undefined ? { rank: 1, text: 'לא הזנת צריכת ירקות ופירות, ולכן הנושא הזה לא נכלל בהערכה שלך.' }
        : gain.fruitveg ? { rank: 2, text: 'דיווחת על ' + inp.fruitveg + ' מנות ירקות ופירות ביום. הגעה לחמש מנות שווה לפי החישוב כ-<b class="pos" dir="ltr">' + signed(gain.fruitveg) + '</b> שנים.' }
        : { rank: 0, text: 'דיווחת על חמש מנות ירקות ופירות ביום או יותר, וזה כבר המקסימום שהחישוב מביא בחשבון.' },
      stress: { rank: 1, text: 'הנושא הזה לא נכלל בחישוב, ולכן אין כאן הערכה בשנים.' }
    };
    var topics = GUIDE.map(function (g, i) { return { g: g, i: i, rank: (personal[g.id] || { rank: 1 }).rank }; })
      .sort(function (a, b) { return b.rank - a.rank || a.i - b.i; });

    return (standalone ? '' : '<h3>מדריך: שינה, תזונה ולחץ</h3>') +
      '<p class="small muted">מידע כללי על שלושה נושאים שמשפיעים על הבריאות, עם מקורות לקריאה. זה אינו ייעוץ רפואי.' + (standalone ? '' : ' הנושאים שרלוונטיים לתשובות שלך מופיעים קודם.') + '</p>' +
      topics.map(function (t, k) {
        var g = t.g, p = personal[g.id];
        return '<details class="gtopic"' + (k === 0 ? ' open' : '') + '><summary>' + esc(g.title) +
          (p && p.rank === 2 ? ' <span class="chip">כדאי לשים לב</span>' : '') + '</summary>' +
          (p ? '<div class="gpersonal">' + p.text + '</div>' : '') +
          '<p>' + esc(g.lead) + '</p>' +
          '<p class="small muted">' + esc(g.model) + '</p>' +
          '<ol class="gacts">' + g.actions.map(function (a) {
            return '<li><b>' + esc(a.t) + '</b><div>' + esc(a.h) + '</div></li>';
          }).join('') + '</ol>' +
          '<div class="small"><b>מקורות לקריאה</b> (נפתחים בלשונית חדשה, ויוצאים מהאפליקציה):<ul class="gsrc">' +
          g.sources.map(function (s) { return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.l) + '</a></li>'; }).join('') +
          '</ul></div></details>';
      }).join('');
  }

  function improveHTML(inp, r) {
    var list = improvements(inp, r);
    var head = '<h3>איך אפשר לשפר את ההערכה</h3>';
    if (!list.length) {
      return head + '<p class="muted">לפי הנתונים שהזנת, אין שינוי בהרגלים שהמודל מעריך שיוסיף יותר מעשירית שנה. אפשר לבדוק תרחישים בעצמך בסרגלים שלמטה.</p>';
    }
    var all = {}; list.forEach(function (x) { Object.assign(all, x.over); });
    var total = LifeModel.estimate(Object.assign({}, inp, all)), max = list[0].gain;
    return head + '<p class="small muted">השינויים שהמודל מעריך שישפיעו הכי הרבה, מהגדול לקטן. כל שורה מחושבת בנפרד, כשכל השאר נשאר כמו שהוא.</p>' +
      list.map(function (x) {
        return '<div class="imp"><div class="imptop"><span class="implbl">' + esc(x.label) + '</span><b class="pos" dir="ltr">' + signed(x.gain) + ' שנים</b></div>' +
          '<div class="impbar"><div style="width:' + (x.gain / max * 100).toFixed(1) + '%"></div></div>' +
          (TIPS[x.id] ? '<div class="small muted">' + esc(TIPS[x.id]) + '</div>' : '') + '</div>';
      }).join('') +
      (list.length > 1 ? '<div class="impall"><div>כל השינויים יחד: <b class="pos" dir="ltr">' + signed(total - r.personal.expectedAge) + ' שנים</b>, עד גיל <b>' + fmt(total) + '</b>' +
        '<div class="small muted">הסכום קטן מחיבור השורות, כי ההשפעות חופפות זו לזו.</div></div><button type="button" id="simAll">הצגה בסרגלים</button></div>' : '') +
      '<p class="small muted">אלה קשרים סטטיסטיים ממחקרי תצפית. הם מראים שאנשים עם ההרגלים האלה חיים בממוצע יותר, לא שהשינוי מבטיח את התוספת לאדם מסוים.</p>';
  }

  // ---------- סרגלים: "נסו בעצמכם" ----------

  var SIM_ORD = { activity: 1, alcohol: 1, fruitveg: 1, sitting: 1 }; // גורמים עם סדר טבעי — מוצגים כסרגל

  function simHTML(inp, r) {
    function opts(id) { return fieldById(id).options.filter(function (o) { return o[0] !== ''; }); }
    function sel(id, label) {
      var cur = data[id] || '', o = opts(id), idx = o.map(function (x) { return x[0]; }).indexOf(cur);
      if (SIM_ORD[id] && idx >= 0) {
        return '<div class="simrow"><label for="s_' + id + '">' + esc(label) + '</label><div class="rng"><input type="range" id="s_' + id + '" data-sim="' + id +
          '" data-ord="1" min="0" max="' + (o.length - 1) + '" step="1" value="' + idx + '"><output id="o_' + id + '"></output></div></div>';
      }
      return '<div class="simrow"><label for="s_' + id + '">' + esc(label) + '</label><select id="s_' + id + '" data-sim="' + id + '">' +
        (cur ? '' : '<option value="">לא צוין</option>') +
        o.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') +
        '</select></div>';
    }
    function range(id, label, min, max, val, unit) {
      return '<div class="simrow"><label for="s_' + id + '">' + esc(label) + '</label><div class="rng"><input type="range" id="s_' + id + '" data-sim="' + id +
        '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"><output id="o_' + id + '" dir="ltr"></output><span>' + esc(unit) + '</span></div></div>';
    }
    var rows = '';
    if (inp.smoking === 'current') rows += '<div class="simrow"><label for="s_quit">עישון</label><select id="s_quit" data-sim="quit"><option value="">ממשיך/ה לעשן</option><option value="1">מפסיק/ה לעשן עכשיו</option></select></div>';
    if (inp.height && inp.weight) rows += range('weight', 'משקל', Math.max(35, Math.round(inp.weight - 50)), Math.round(inp.weight + 30), Math.round(inp.weight), 'ק"ג');
    rows += sel('activity', 'פעילות גופנית בשבוע') + sel('alcohol', 'אלכוהול בשבוע') + sel('fruitveg', 'פירות וירקות ביום') + sel('sitting', 'שעות ישיבה ביום') + sel('sleep', 'שעות שינה') + sel('lonely', 'תחושת בדידות תכופה');
    if (inp.sbp) rows += range('sbp', 'לחץ דם סיסטולי', 100, 200, Math.round(inp.sbp), 'ממ"כ');
    if (inp.tc) rows += range('tc', 'כולסטרול כללי', 120, 350, Math.round(inp.tc), 'מ"ג/ד"ל');
    return '<h3>נסו בעצמכם</h3><p class="small muted">הזיזו את הסרגלים וראו מיד כמה שנים כל שינוי מוסיף או מוריד, לשני הכיוונים.</p>' +
      '<div class="sim" id="simBox"><div class="simout" aria-live="polite"><div><span class="muted small">ההערכה בתרחיש הזה</span><b id="simAge">' + fmt(r.personal.expectedAge) + '</b></div>' +
      '<div id="simDelta" class="simdelta">ללא שינוי</div></div>' + rows +
      '<button type="button" id="simReset">איפוס</button></div>';
  }

  function wireSim(inp, r) {
    var ctrls = app.querySelectorAll('[data-sim]');
    function optsOf(id) { return fieldById(id).options.filter(function (o) { return o[0] !== ''; }); }
    function update() {
      var x = Object.assign({}, inp);
      ctrls.forEach(function (c) {
        var id = c.dataset.sim, v = c.value, o = document.getElementById('o_' + id);
        if (c.dataset.ord) { var op = optsOf(id)[+v]; v = op[0]; o.textContent = op[1]; }
        if (c.type === 'range' && !c.dataset.ord) {
          x[id] = Number(v);
          o.textContent = id === 'weight' ? v + ' (BMI ' + (v / Math.pow(inp.height / 100, 2)).toFixed(1) + ')' : v;
        } else if (id === 'quit') { if (v) { x.smoking = 'former'; x.quitAge = r.age; } }
        else if (id === 'fruitveg' || id === 'sitting') x[id] = v === '' ? undefined : Number(v);
        else x[id] = v || undefined;
      });
      var e = LifeModel.estimate(x), d = e - r.personal.expectedAge;
      document.getElementById('simAge').textContent = fmt(e);
      var el = document.getElementById('simDelta');
      if (Math.abs(d) < 0.05) { el.className = 'simdelta'; el.textContent = 'ללא שינוי'; }
      else { el.className = 'simdelta ' + (d > 0 ? 'pos' : 'neg'); el.innerHTML = '<b dir="ltr">' + signed(d) + '</b> שנים לעומת ההערכה שלך'; }
    }
    ctrls.forEach(function (c) { c.addEventListener(c.type === 'range' ? 'input' : 'change', update); });
    document.getElementById('simReset').onclick = function () {
      ctrls.forEach(function (c) { c.value = c.type === 'range' ? c.defaultValue : (c.querySelector('[selected]') || c.options[0]).value; });
      update();
    };
    // "הצגה בסרגלים": מעביר את כל השינויים המומלצים לסרגלים
    var allBtn = document.getElementById('simAll');
    if (allBtn) allBtn.onclick = function () {
      var all = {}; improvements(inp, r).forEach(function (x) { Object.assign(all, x.over); });
      ctrls.forEach(function (c) {
        var id = c.dataset.sim;
        if (id === 'quit') { if (all.smoking) c.value = '1'; return; }
        if (all[id] === undefined) return;
        if (c.dataset.ord) c.value = optsOf(id).map(function (o) { return o[0]; }).indexOf(String(all[id]));
        else c.value = all[id];
      });
      update();
      document.getElementById('simBox').scrollIntoView({ behavior: 'smooth', block: 'center' });
    };
    update();
  }

  var TIPS = {
    smoking: 'הפסקת עישון היא השינוי היחיד בעל ההשפעה הגדולה ביותר. לפי Jha 2013, מי שמפסיק לפני גיל 40 נמנע מכ-90% מעודף הסיכון.',
    bmi: 'ירידה לכיוון טווח BMI של 20–25 קשורה בתמותה נמוכה יותר.',
    activity: 'גם מעט פעילות עוזר: לפי Arem 2015, פחות מ-150 דקות בשבוע כבר קשורות בירידה של כ-20% בסיכון לעומת חוסר פעילות.',
    alcohol: 'לפי Wood 2018, הסיכון הנמוך ביותר הוא בצריכה של עד כ-100 גרם אלכוהול בשבוע (כ-7 מנות).',
    sleep: 'שינה קצרה מאוד או ארוכה מאוד קשורה בתמותה גבוהה יותר; לעיתים היא סימן לבעיה אחרת ששווה לבדוק.',
    fruitveg: 'כל מנה נוספת של פירות וירקות ביום, עד חמש, קשורה בירידה של כ-5% בסיכון.',
    bp: 'לחץ דם גבוה ניתן לטיפול יעיל. שווה למדוד שוב ולדבר עם רופא/ת המשפחה.',
    chol: 'ערכי כולסטרול גבוהים ניתנים לאיזון בתזונה ובטיפול. שווה להתייעץ עם רופא/ת המשפחה.',
    sitting: 'ישיבה ממושכת קשורה בתמותה גבוהה יותר, בעיקר מעל 7 שעות ביום. פעילות גופנית מקזזת חלק מההשפעה.',
    social: 'קשרים חברתיים הם גורם בריאותי של ממש, בסדר גודל דומה לגורמי סיכון מוכרים אחרים.'
  };

  function bioAgeHTML(r) {
    var ph = r.derived.phenoAge; if (ph === undefined) return '';
    var d = ph - r.age;
    var txt = Math.abs(d) < 0.5 ? 'זהה כמעט לגילך בפועל'
      : '<b class="' + (d < 0 ? 'pos' : 'neg') + '">' + (d < 0 ? 'צעיר' : 'מבוגר') + ' ב-' + Math.abs(d).toFixed(1) + ' שנים</b> מגילך בפועל (' + r.age + ')';
    return '<div class="bioage"><div><div class="muted small">הגיל הביולוגי שלך</div><div class="bionum">' + ph.toFixed(1) + '</div></div>' +
      '<div class="biotxt">' + txt + '<div class="small muted">מחושב מתשעה ערכים בבדיקות הדם לפי נוסחת Phenotypic Age (Levine 2018). אנשים בריאים מקבלים לעיתים קרובות גיל ביולוגי נמוך בכמה שנים מגילם.</div></div></div>';
  }

  function buildNotes(r) {
    var n = r.notes.slice();
    var h = data.hered || [], o = data.origin || [];
    var cnd = data.conditions || [], meds = data.meds || [];
    if (cnd.indexOf('cancer') >= 0 || cnd.indexOf('copd') >= 0 || cnd.indexOf('other') >= 0) n.unshift('ציינת סרטן, מחלת ריאות כרונית או מחלה קשה אחרת. אלה לא נכללו במספר: ההשפעה שלהן תלויה מאוד בסוג, בשלב ובטיפול, והמודל בנוי על האוכלוסייה הכללית. לכן ההערכה כאן כנראה אופטימית מדי עבורך, והרופא/ה המטפל/ת הוא הכתובת.');
    if (cnd.indexOf('mi') >= 0 || cnd.indexOf('stroke') >= 0) n.push('התקף לב ואירוע מוחי נכללו במספר לפי ממוצע של כל מי שעבר אירוע כזה (ERFC 2015). המצב האישי, הזמן שעבר מאז והטיפול יכולים לשנות את התמונה במידה רבה.');
    if (meds.indexOf('bp') >= 0 && r.contributions.some(function (c) { return c.id === 'bp'; })) n.push('לחץ הדם שהזנת נמדד תחת טיפול תרופתי. המודל משתמש בערך הנמדד; מי שמאוזן בעזרת תרופות נמצא בדרך כלל בסיכון מעט גבוה יותר ממי שיש לו אותו ערך ללא טיפול.');
    if (meds.indexOf('statin') >= 0 && r.contributions.some(function (c) { return c.id === 'chol'; })) n.push('ערכי הכולסטרול שהזנת נמדדו תחת טיפול בסטטינים, והמודל משתמש בערך הנמדד.');
    if (r.derived.phenoMissing) n.push('כדי לחשב גיל ביולוגי חסרים עוד: ' + r.derived.phenoMissing.join(', ') + '.');
    if (r.derived.phenoAge !== undefined) n.push('כשמחושב גיל ביולוגי, CRP ותפקוד הכליות כבר כלולים בו, ולכן הם לא מופיעים כגורמים נפרדים.');
    if (r.derived.egfr !== undefined && r.derived.egfr < 60) n.push('ה-eGFR המחושב מהקריאטינין שלך (' + Math.round(r.derived.egfr) + ') נמוך מ-60. תוצאה בודדת אינה אבחנה, אבל כדאי להראות אותה לרופא/ה.');
    if (r.derived.cholRatio !== undefined) n.push('יחס כולסטרול כללי ל-HDL שלך: ' + fmt(r.derived.cholRatio) + '. לפי Prospective Studies Collaboration, היחס הזה הוא המנבא הטוב ביותר מבין מדדי הכולסטרול לתמותה ממחלת לב.');
    if (h.indexOf('breast') >= 0 || h.indexOf('colon') >= 0) n.push('סיפור משפחתי של סרטן שד, שחלה או מעי גס לא נכלל במספר, אבל הוא סיבה טובה לשאול רופא/ה על בדיקות סקר מוקדמות ועל ייעוץ גנטי.');
    if (h.indexOf('fh') >= 0) n.push('כולסטרול גבוה משפחתי (FH) הוא מצב תורשתי שמעלה מאוד את הסיכון למחלת לב מוקדמת, והוא ניתן לטיפול. אם לא נבדקת, שווה לבדוק.');
    if (h.indexOf('t2d') >= 0 || h.indexOf('alz') >= 0) n.push('סוכרת סוג 2 ואלצהיימר במשפחה מעלים את הסיכון האישי למחלות אלה, אך לא מצאתי להם יחס סיכונים מבוסס לתמותה כללית, ולכן הם לא נכללו במספר.');
    if (o.length) {
      n.push('מוצא: המוצא לא שינה את המספר. ההבדלים בתוחלת החיים בין קבוצות מוצא נובעים בעיקר ממדינת המגורים, מהשכלה ומאורח חיים, שכבר נכללים בחישוב, ואין יחס סיכונים עצמאי ומבוסס למוצא עצמו.');
      if (o.indexOf('ashk') >= 0) n.push('בקרב יהודים אשכנזים, כ-1 מכל 40 נושא/ת מוטציה בגנים BRCA1/2, שמעלה את הסיכון לסרטן שד, שחלה וערמונית. אפשר לשאול את רופא/ת המשפחה על בדיקה גנטית.');
    }
    return n;
  }

  function renderResult() {
    var inp = collect(), r = LifeModel.compute(inp);
    var p = r.personal, b = r.baseline, diff = p.expectedAge - b.expectedAge;
    var year = new Date().getFullYear() + Math.round(p.remaining);
    var who = (inp.sex === 'f' ? 'אישה בת ' : 'גבר בן ') + r.age + ' ב' + LIFE_TABLES[inp.country].name;
    var deltaTxt = Math.abs(diff) < 0.05 ? 'זהה לממוצע של ' + who + ' (' + fmt(b.expectedAge) + ')'
      : '<b class="' + (diff > 0 ? 'pos' : 'neg') + '" dir="ltr">' + signed(diff) + '</b> שנים לעומת הממוצע של ' + who + ' (' + fmt(b.expectedAge) + ')';
    var tips = r.contributions.filter(function (c) { return c.years < -0.3 && TIPS[c.id]; }).reverse().map(function (c) { return TIPS[c.id]; });
    var notes = buildNotes(r);
    function pct(x) { return x < 0.005 ? 'פחות מ-1%' : Math.round(x * 100) + '%'; }
    var stats = [80, 90, 100].filter(function (t) { return t > r.age; }).map(function (t) {
      return '<div class="stat"><b>' + pct(p['reach' + t]) + '</b><span>סיכוי להגיע לגיל ' + t + '</span></div>';
    }).join('');

    app.innerHTML = '<div class="card">' +
      '<div class="hero"><div class="muted">תוחלת החיים המשוערת שלך</div><div class="big">' + fmt(p.expectedAge) + '</div>' +
      '<div class="sub">עוד כ-' + Math.round(p.remaining) + ' שנים, עד סביבות שנת ' + year + '</div>' +
      '<div class="delta">' + deltaTxt + '</div></div>' +
      DISCLAIMER +

      bioAgeHTML(r) +

      '<h3>הטווח, לא רק המספר</h3>' +
      '<p>אף מודל לא יודע לנבא תאריך. מתוך אנשים עם נתונים כמו שלך, <b>חצי</b> חיים עד גיל שבין <b>' + Math.round(p.p25) + ' ל-' + Math.round(p.p75) +
      '</b>, ו-<b>80%</b> עד גיל שבין <b>' + Math.round(p.p10) + ' ל-' + Math.round(p.p90) + '</b>.</p>' +
      '<div dir="ltr">' + rangeChart(r) + '</div>' +
      '<div class="legend"><span><i class="band"></i>50% מהמקרים</span><span><i class="band wide"></i>80% מהמקרים</span></div>' +
      (stats ? '<div class="stats" style="margin-top:18px">' + stats + '</div>' : '') +

      '<h3>מה מוסיף ומה מוריד שנים</h3>' +
      '<p class="small muted">השפעת כל גורם בשנים, ביחס לממוצע האוכלוסייה. הסכום שווה להפרש הכולל מהממוצע.</p>' +
      factorRows(r) +

      trendsHTML(inp, r) +
      othersHTML() +

      '<h3>הסיכוי להיות בחיים בכל גיל</h3><div dir="ltr">' + survivalChart(r) + '</div>' +
      '<div class="legend"><span><i></i>ההערכה שלך</span><span><i class="base"></i>ממוצע: ' + esc(who) + '</span></div>' +

      (notes.length ? '<h3>הערות</h3><ul class="notes">' + notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +

      improveHTML(inp, r) +
      simHTML(inp, r) +
      guideHTML(inp, r) +
      '<p style="margin-top:14px"><a href="#/topics">לכל המדריכים באתר: תזונה, צום, סוכר, תנועה, קשרים חברתיים ועוד ←</a></p>' +

      '<h3>איך זה מחושב</h3>' +
      '<details><summary>השיטה בקצרה</summary><p class="small" style="margin-top:8px">נקודת הבסיס היא לוח התמותה של ארגון הבריאות העולמי לשנת ' + LIFE_TABLE_YEAR + ' (השנה האחרונה לפני הקורונה), לפי מדינה ומין. כל גורם סיכון מתורגם ליחס סיכונים (Hazard Ratio) מתוך מחקר מפורסם, מנורמל לממוצע האוכלוסייה, ומכפיל את קצב התמותה בכל גיל. יחסי הסיכון נחלשים בגיל מבוגר, כפי שנמצא במחקרים. מכיוון שגורמי הסיכון מתואמים זה עם זה, הגורם החזק ביותר נספר במלואו והאחרים במשקל מופחת, והיחס המשולב מוגבל לטווח 0.4–5.</p>' +
      '<p class="small"><b>מגבלות:</b> המחקרים הם תצפיתיים ומראים קשר סטטיסטי, לא בהכרח סיבתיות. המודל אינו מכיר מחלות קיימות, תרופות, גנטיקה אישית או תאונות, ואינו מביא בחשבון שיפורים עתידיים ברפואה. לוח התמותה משקף את התמותה של היום, ולכן לצעירים ההערכה נוטה להיות שמרנית.</p></details>' +
      '<details><summary>המקורות ויחסי הסיכון ששימשו</summary><p class="small muted" style="margin-top:8px">ליד כל מקור מופיע יחס הסיכון (HR) ששימש במודל. מעל 1 פירושו סיכון גבוה יותר, ומתחת ל-1 נמוך יותר. אלה הערכים מהמחקר, לפני הנרמול לממוצע האוכלוסייה ולפני ההיחלשות בגיל מבוגר.</p><ol>' + SOURCES.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></details>' +

      '<div class="nav"><button id="back">עריכת הנתונים</button><button class="primary" id="print">הדפסה / שמירה כ-PDF</button></div></div>';

    wireSim(inp, r);
    document.getElementById('back').onclick = function () { step = 1; render(); };
    document.getElementById('print').onclick = function () { window.print(); };
  }

  var SOURCES = [
    '<b>בסיס:</b> WHO Global Health Observatory, Life tables by country, 2019 (nqx, ex).',
    '<b>עישון:</b> Jha P. et al. 21st-Century Hazards of Smoking and Benefits of Cessation in the United States. <i>NEJM</i> 2013;368:341–50. <span class="hrnote">במודל: מעשן/ת: 2.8 בגברים, 3.0 בנשים. הפסקת עישון: 1.0 בגיל 25–34, 1.2 ב-35–44, 1.5 ב-45–54, 1.7 ב-55–64; מעל 65: 1.9 (הנחה)</span>',
    '<b>BMI:</b> Global BMI Mortality Collaboration. Body-mass index and all-cause mortality: individual-participant-data meta-analysis of 239 prospective studies. <i>Lancet</i> 2016;388:776–86. <span class="hrnote">במודל: מתחת ל-18.5: 1.51 · 18.5–20: 1.13 · 25–27.5: 1.07 · 27.5–30: 1.20 · 30–35: 1.45 · 35–40: 1.94 · 40+: 2.76 (ייחוס: 20–25)</span>',
    '<b>פעילות גופנית:</b> Arem H. et al. Leisure Time Physical Activity and Mortality. <i>JAMA Intern Med</i> 2015;175:959–67. <span class="hrnote">במודל: פחות מ-150 דק׳ בשבוע: 0.80 · 150–300: 0.69 · 300–450: 0.63 · מעל 450: 0.61 (ייחוס: ללא פעילות)</span>',
    '<b>אלכוהול:</b> Wood A.M. et al. Risk thresholds for alcohol consumption. <i>Lancet</i> 2018;391:1513–23. <span class="hrnote">במודל: 8–14 מנות בשבוע: 1.05 · 15–25: 1.16 · מעל 25: 1.57 (נגזר מהפרשי תוחלת החיים במחקר)</span>',
    '<b>שינה:</b> Cappuccio F.P. et al. Sleep Duration and All-Cause Mortality. <i>Sleep</i> 2010;33:585–92. <span class="hrnote">במודל: פחות מ-6 שעות: 1.12 · מעל 9 שעות: 1.30</span>',
    '<b>פירות וירקות:</b> Wang X. et al. Fruit and vegetable consumption and mortality. <i>BMJ</i> 2014;349:g4490. <span class="hrnote">במודל: 0.95 לכל מנה ביום, עד 5 מנות</span>',
    '<b>בדידות:</b> Holt-Lunstad J. et al. Loneliness and Social Isolation as Risk Factors for Mortality. <i>Perspect Psychol Sci</i> 2015;10:227–37. <span class="hrnote">במודל: בדידות תכופה: 1.26</span>',
    '<b>השכלה:</b> IHME-CHAIN Collaborators. Effects of education on adult mortality. <i>Lancet Public Health</i> 2024;9:e155–65. <span class="hrnote">במודל: לכל שנת לימוד: 2.9% פחות סיכון עד גיל 50, 1.9% בגיל 50–69, 0.8% מגיל 70</span>',
    '<b>סוכרת:</b> Emerging Risk Factors Collaboration. Diabetes Mellitus, Fasting Glucose, and Risk of Cause-Specific Death. <i>NEJM</i> 2011;364:829–41. <span class="hrnote">במודל: סוכרת: 1.80. בלי סוכרת: 1.10 לכל 18 מ"ג/ד"ל גלוקוז בצום מעל 100</span>',
    '<b>לחץ דם:</b> Prospective Studies Collaboration. Age-specific relevance of usual blood pressure to vascular mortality. <i>Lancet</i> 2002;360:1903–13. <span class="hrnote">במודל: פי 2 בתמותה ממחלות לב וכלי דם לכל 20 ממ"כ סיסטולי (או 10 דיאסטולי), מוחל על 30% מהתמותה</span>',
    '<b>כולסטרול:</b> Prospective Studies Collaboration. Blood cholesterol and vascular mortality by age, sex, and blood pressure. <i>Lancet</i> 2007;370:1829–39. <span class="hrnote">במודל: לכל 1 mmol/L (כ-39 מ"ג/ד"ל): 2.27 עד גיל 50, 1.52 בגיל 50–69, 1.20 מגיל 70, לתמותה ממחלת לב איסכמית, מוחל על 15% מהתמותה</span>',
    '<b>כליות:</b> CKD Prognosis Consortium. Association of eGFR and albuminuria with all-cause and cardiovascular mortality. <i>Lancet</i> 2010;375:2073–81. חישוב eGFR: Inker L.A. et al. <i>NEJM</i> 2021;385:1737–49 (CKD-EPI 2021). <span class="hrnote">במודל: eGFR 60: 1.18 · 45: 1.57 · 15: 3.14 (ייחוס: 75 ומעלה). חלבון בשתן (ACR) 10: 1.20 · 30: 1.63 · 300: 2.22 (ייחוס: 5)</span>',
    '<b>CRP:</b> Emerging Risk Factors Collaboration. C-reactive protein concentration and risk of coronary heart disease, stroke, and mortality. <i>Lancet</i> 2010;375:132–40. <span class="hrnote">במודל: 1.34 לכל עלייה של פי 3 בערך</span>',
    '<b>אריכות ימים של ההורים:</b> Atkins J.L. et al. Longer-Lived Parents and Cardiovascular Outcomes. <i>JACC</i> 2016;68:874–5. <span class="hrnote">במודל: 0.83 לכל עשור שהורה חי מעבר לגיל 80. סבים וסבתות: חצי מזה (הנחה)</span>',
    '<b>מחלת לב מוקדמת במשפחה:</b> Lloyd-Jones D.M. et al. Parental Cardiovascular Disease as a Risk Factor for Cardiovascular Disease in Middle-aged Adults. <i>JAMA</i> 2004;291:2204–11. <span class="hrnote">במודל: 2.0 בגברים, 1.7 בנשים לאירועי לב וכלי דם, מוחל על 30% מהתמותה (כ-1.25 לתמותה הכוללת)</span>',
    '<b>גיל ביולוגי:</b> Levine M.E. et al. An epigenetic biomarker of aging for lifespan and healthspan. <i>Aging</i> 2018;10:573–91; Liu Z. et al. A new aging measure captures morbidity and mortality risk across diverse subpopulations from NHANES IV. <i>PLoS Med</i> 2018;15:e1002718 (והתיקון לנוסחה, 2019). <span class="hrnote">במודל: 1.09 לכל שנה של גיל ביולוגי מעל הגיל בפועל</span>',
    '<b>הערכה עצמית של הבריאות:</b> DeSalvo K.B. et al. Mortality Prediction with a Single General Self-Rated Health Question. <i>J Gen Intern Med</i> 2006;21:267–75. <span class="hrnote">במודל: טובה: 1.23 · בינונית: 1.44 · גרועה: 1.92 (ייחוס: מצוינת)</span>',
    '<b>התקף לב, שבץ וסוכרת יחד:</b> Emerging Risk Factors Collaboration. Association of Cardiometabolic Multimorbidity With Mortality. <i>JAMA</i> 2015;314:52–60. <span class="hrnote">במודל: התקף לב: 2.0 · שבץ: 2.1 · אחד מהם עם סוכרת: 3.7–3.8 · שניהם: 3.5 · שלושתם: 6.9</span>',
    '<b>דופק במנוחה:</b> Zhang D. et al. Resting heart rate and all-cause and cardiovascular mortality in the general population. <i>CMAJ</i> 2016;188:E53–63. <span class="hrnote">במודל: 1.09 לכל 10 פעימות בדקה</span>',
    '<b>היקף מותניים:</b> Cerhan J.R. et al. A Pooled Analysis of Waist Circumference and Mortality in 650,000 Adults. <i>Mayo Clin Proc</i> 2014;89:335–45. <span class="hrnote">במודל: 1.07 בגברים, 1.09 בנשים, לכל 5 ס"מ</span>',
    '<b>כושר אירובי:</b> Kodama S. et al. Cardiorespiratory Fitness as a Quantitative Predictor of All-Cause Mortality. <i>JAMA</i> 2009;301:2024–35. ערכי ייחוס: Kaminsky L.A. et al. (FRIEND Registry). <i>Mayo Clin Proc</i> 2015;90:1515–23. <span class="hrnote">במודל: 0.87 לכל MET (3.5 מ"ל/ק"ג/דקה) של VO2max מעל החציון לגיל ולמין</span>',
    '<b>ישיבה:</b> Chau J.Y. et al. Daily Sitting Time and All-Cause Mortality: A Meta-Analysis. <i>PLoS One</i> 2013;8:e80000. <span class="hrnote">במודל: 1.02 לכל שעה ביום בין 3 ל-7 שעות, 1.05 לכל שעה מעל 7</span>',
    '<b>מצב משפחתי:</b> Wang Y. et al. Sex differences in the association between marital status and the risk of cardiovascular, cancer, and all-cause mortality. <i>Glob Health Res Policy</i> 2020;5:4. <span class="hrnote">במודל: ללא בן/בת זוג: 1.46 בגברים, 1.22 בנשים</span>',
    '<b>טריגליצרידים:</b> Liu J. et al. Effects of blood triglycerides on cardiovascular and all-cause mortality. <i>Lipids Health Dis</i> 2013;12:159. <span class="hrnote">במודל: 1.12 לכל 88.6 מ"ג/ד"ל (1 mmol/L)</span>',
    '<b>Lp(a):</b> Langsted A. et al. High lipoprotein(a) and high risk of mortality. <i>Eur Heart J</i> 2019;40:2760–70. <span class="hrnote">במודל: 1.05 לכל 50 מ"ג/ד"ל</span>',
    '<b>GGT:</b> Kunutsor S.K. et al. Liver enzymes and risk of all-cause mortality in general populations. <i>Int J Epidemiol</i> 2014;43:187–201. <span class="hrnote">במודל: 1.07 לכל 5 יחידות, עד 1.6 לכל היותר</span>',
    '<b>בדיקת סבירות לשילוב הגורמים:</b> Li Y. et al. Impact of Healthy Lifestyle Factors on Life Expectancies in the US Population. <i>Circulation</i> 2018;138:345–55.'
  ];

  function renderGuide() {
    var hasData = num(data.age) !== undefined && !!data.sex;
    app.innerHTML = '<div class="card"><h1 style="font-size:clamp(26px,5vw,36px)">שינה, תזונה ולחץ</h1>' +
      '<p class="muted">שלושה נושאים שאפשר לשפר, עם צעדים מעשיים ומקורות. אפשר לקרוא בלי להזין שום נתון.</p>' +
      guideHTML() +
      '<div class="nav"><button id="gback">חזרה</button><button class="primary" id="gcalc">' + (hasData ? 'לתוצאה שלי, עם התאמה אישית' : 'לחישוב תוחלת החיים שלי') + '</button></div></div>';
    document.getElementById('gback').onclick = function () { step = 0; render(); };
    document.getElementById('gcalc').onclick = function () { step = hasData ? STEPS.length + 1 : 1; render(); };
  }

  function render() {
    save();
    if (step === 'guide') renderGuide();
    else if (step <= 0) renderIntro();
    else if (step <= STEPS.length) renderStep();
    else renderResult();
    window.scrollTo(0, 0);
  }

  app.addEventListener('input', saveSoon);
  app.addEventListener('change', saveSoon);
  document.getElementById('wipe').onclick = function () {
    if (!window.confirm('למחוק את כל הנתונים שהוזנו ונשמרו במכשיר הזה?')) return;
    wipe(); step = 0;
    if (/^#\/calc/.test(location.hash)) render(); else location.hash = '#/';
    window.dispatchEvent(new Event('hashchange'));
  };

  // האתר (site.js) מנתב בין העמודים, ומבקש מהמחשבון להציג את עצמו כשעוברים אליו
  window.Calc = {
    open: function (s) { if (s !== undefined) step = s; render(); },
    hasData: function () { return num(data.age) !== undefined && !!data.sex; }
  };
})();
