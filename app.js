/* ממשק המשתמש: טופס רב-שלבי ומסך תוצאה. אין כאן שום קריאת רשת ושום שמירה — הכול בזיכרון הדף בלבד. */
(function () {
  'use strict';

  var app = document.getElementById('app');
  i18nCountryNames(LIFE_TABLES);
  var DEF_COUNTRY = LANGS[LANG].country;
  var data = { country: DEF_COUNTRY };   // הערכים שהוזנו

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
    data = { country: DEF_COUNTRY };
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

  var DISCLAIMER = L('<div class="disclaimer"><strong>חשוב לדעת:</strong> זו הערכה סטטיסטית לצורכי סקרנות בלבד. ') +
    L('היא מתארת ממוצעים של קבוצות גדולות של אנשים, לא את העתיד של אדם מסוים. היא אינה אבחנה רפואית, אינה ייעוץ רפואי ואינה תחליף לרופא/ה.') +
    L(' ההערכה נשענת על מחקרים תצפיתיים, שמראים קשר סטטיסטי ולא בהכרח סיבתי, ולכן שינוי הרגל אינו מבטיח את ההפרש המוצג.</div>');

  // ---------- הגדרת הטופס ----------

  var countryOptions = Object.keys(LIFE_TABLES).map(function (c) { return [c, LIFE_TABLES[c].name]; })
    .sort(function (a, b) { return a[0] === 'ISR' ? -1 : b[0] === 'ISR' ? 1 : a[1].localeCompare(b[1], 'he'); });

  var STEPS = [
    {
      title: L('פרטים אישיים'), intro: L('אלה קובעים את נקודת הבסיס: לוח התמותה הרשמי לפי גיל, מין ומדינה.'),
      fields: [
        { row: [
          { id: 'age', type: 'num', label: L('גיל'), unit: L('שנים'), min: 18, max: 105, required: true },
          { id: 'country', type: 'select', label: L('מדינת מגורים'), options: countryOptions, required: true }
        ] },
        { id: 'sex', type: 'choice', label: L('מין'), hint: L('לוחות התמותה מחולקים לגברים ולנשים.'), options: [['m', L('גבר')], ['f', L('אישה')]], required: true },
        { row: [
          { id: 'height', type: 'num', label: L('גובה'), unit: L('ס"מ'), min: 120, max: 220 },
          { id: 'weight', type: 'num', label: L('משקל'), unit: L('ק"ג'), min: 30, max: 250 }
        ] },
        { id: 'waist', type: 'num', label: L('היקף מותניים'), hint: L('רשות. בגובה הטבור, בעמידה, אחרי נשיפה רגילה. עוזר להבחין בין שריר לשומן, ש-BMI לבדו לא רואה.'), unit: L('ס"מ'), min: 50, max: 200 },
        { id: 'eduYears', type: 'choice', label: L('השכלה'), options: [['9', L('עד 10 שנות לימוד')], ['12', L('תיכון')], ['14', L('על-תיכונית')], ['15', L('תואר ראשון')], ['17', L('תואר שני')], ['20', L('דוקטורט')]] },
        { id: 'marital', type: 'choice', label: L('מצב משפחתי'), options: [['married', L('נשוי/אה או בזוגיות קבועה')], ['single', L('ללא בן/בת זוג')]] },
        { id: 'srh', type: 'choice', label: L('איך היית מגדיר/ה את מצב הבריאות שלך באופן כללי?'), hint: L('שאלה אחת שמנבאת תמותה טוב יותר מהרבה בדיקות.'), options: [['excellent', L('מצוינת')], ['good', L('טובה')], ['fair', L('בינונית')], ['poor', L('גרועה')]] },
        { id: 'conditions', type: 'multi', label: L('האם אובחנה אצלך אחת מהמחלות האלה?'), hint: L('סוכרת נשאלת בשלב בדיקות הדם.'), options: [['mi', L('התקף לב')], ['stroke', L('אירוע מוחי')], ['cancer', L('סרטן')], ['copd', L('מחלת ריאות כרונית (COPD)')], ['other', L('מחלה קשה אחרת')]] },
        { id: 'meds', type: 'multi', label: L('תרופות קבועות'), options: [['bp', L('ללחץ דם')], ['statin', L('לכולסטרול (סטטינים)')]] }
      ]
    },
    {
      title: L('אורח חיים'), intro: L('הגורמים שהכי קל לשנות, ושחלקם משפיעים יותר מכל השאר.'),
      fields: [
        { id: 'smoking', type: 'choice', label: L('עישון'), options: [['never', L('מעולם לא עישנתי')], ['former', L('עישנתי והפסקתי')], ['current', L('מעשן/ת כיום')]] },
        { id: 'quitAge', type: 'num', label: L('באיזה גיל הפסקת לעשן?'), unit: L('שנים'), min: 10, max: 100, showIf: function () { return data.smoking === 'former'; } },
        { id: 'alcohol', type: 'choice', label: L('אלכוהול'), hint: L('מנה = כוס יין, בקבוק בירה קטן או כוסית משקה חריף.'), options: [['none', L('לא שותה')], ['light', L('עד 7 מנות בשבוע')], ['mod', '8–14'], ['heavy', '15–25'], ['vheavy', L('מעל 25')]] },
        { id: 'activity', type: 'choice', label: L('פעילות גופנית בשבוע'), hint: L('הליכה מהירה, ריצה, שחייה, אופניים וכדומה. דקת פעילות עצימה שווה שתי דקות מתונות.'), options: [['none', L('כמעט בכלל לא')], ['low', L('פחות מ-150 דקות')], ['rec', L('150–300 דקות')], ['high', L('300–450 דקות')], ['vhigh', L('מעל 450 דקות')]] },
        { id: 'walkPace', type: 'choice', label: L('איך היית מתאר/ת את קצב ההליכה הרגיל שלך?'), hint: L('לפי התחושה שלך, ביחס לבני גילך. אם יש לך מדידת VO2max משעון כושר, היא תשמש במקום.'), options: [['brisk', L('מהיר')], ['average', L('ממוצע')], ['slow', L('איטי')]] },
        { id: 'sleep', type: 'choice', label: L('שעות שינה בלילה, בממוצע'), options: [['short', L('פחות מ-6')], ['normal', L('6 עד 9')], ['long', L('מעל 9')]] },
        { id: 'fruitveg', type: 'choice', label: L('מנות פירות וירקות ביום'), hint: L('מנה = פרי בינוני או כוס ירקות חתוכים.'), options: [['1', '0–1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', L('5 ומעלה')]] },
        { id: 'sitting', type: 'choice', label: L('שעות ישיבה ביום'), hint: L('עבודה, נסיעות ומסכים יחד.'), options: [['3', L('פחות מ-4')], ['5.5', '4–7'], ['9', '8–10'], ['12', L('11 ומעלה')]] },
        { type: 'heading', label: L('יש לך שעון כושר?') },
        { type: 'text', label: L('שני מספרים שהשעון כבר מודד, ואפשר פשוט להעתיק אותם מהאפליקציה בטלפון. שניהם רשות.') },
        { row: [
          { id: 'rhr', type: 'num', label: L('דופק במנוחה'), hint: L('באפליקציית Garmin Connect: בכרטיס "דופק" (Heart Rate) במסך הבית, המספר שליד "מנוחה" (Resting).'), unit: L('פעימות בדקה'), min: 30, max: 150 },
          { id: 'vo2max', type: 'num', label: L('VO2max (מדד כושר)'), hint: L('באפליקציה: בתפריט "עוד" (More) ← "נתוני ביצועים" (Performance Stats) ← VO2 Max. מספר בין 20 ל-60 בערך.'), unit: L('מ"ל/ק"ג/דקה'), min: 10, max: 90, stepAttr: '0.1' }
        ] },
        { type: 'text', label: L('בשעון עצמו: הדופק במנוחה מופיע במסך הדופק, וה-VO2max במסך "מצב אימון" (Training Status). בשעונים של יצרנים אחרים (Apple, Fitbit, Polar) שני הנתונים מופיעים באפליקציית הבריאות של השעון.') },
        { type: 'garmin' },
        { id: 'isolated', type: 'choice', label: L('באיזו תדירות יש לך מפגש או שיחה עם חברים או בני משפחה שלא גרים איתך?'), options: [['weekly', L('לפחות פעם בשבוע')], ['rarely', L('פחות מפעם בשבוע')]] },
        { id: 'lonely', type: 'choice', label: L('האם לעיתים קרובות יש לך תחושת בדידות?'), hint: L('גם מי שמוקף באנשים יכול להרגיש בודד, ולהפך. לכן אלה שתי שאלות נפרדות.'), options: [['no', L('לא')], ['yes', L('כן')]] }
      ]
    },
    {
      title: L('משפחה ומוצא'), intro: L('אריכות ימים עוברת חלקית במשפחה. מלאו מה שידוע לכם, ודלגו על השאר.'),
      fields: [
        { type: 'heading', label: L('הורים') },
        { id: 'mother', type: 'person', label: L('אמא') },
        { id: 'father', type: 'person', label: L('אבא') },
        { type: 'heading', label: L('סבים וסבתות') },
        { id: 'gp0', type: 'person', label: L('סבתא (מצד אמא)') },
        { id: 'gp1', type: 'person', label: L('סבא (מצד אמא)') },
        { id: 'gp2', type: 'person', label: L('סבתא (מצד אבא)') },
        { id: 'gp3', type: 'person', label: L('סבא (מצד אבא)') },
        { id: 'gpAvg', type: 'choice', label: L('לא מכירים כל אחד? בערך עד איזה גיל חיו הסבים והסבתות שלך, בממוצע?'), hint: L('בלי מי שנפטר בתאונה או במלחמה. מי שעדיין בחיים, לפי הגיל שלו היום. אם מילאתם את הסבים והסבתות אחד אחד למעלה, התשובה הזו לא תשמש.'), options: [['65', L('פחות מ-70')], ['75', '70–79'], ['85', '80–89'], ['93', L('90 ומעלה')], ['', L('לא ידוע')]] },
        { type: 'heading', label: L('מחלות במשפחה') },
        { id: 'famHeart', type: 'choice', label: L('האם לאחד ההורים היה התקף לב או אירוע מוחי בגיל צעיר?'), hint: L('לפני גיל 55 אצל האב, או לפני גיל 65 אצל האם.'), options: [['no', L('לא')], ['yes', L('כן')], ['', L('לא ידוע')]] },
        { id: 'hered', type: 'multi', label: L('מחלות נוספות אצל קרובים מדרגה ראשונה'), hint: L('לא משפיע על המספר, אבל יופיע בהערות.'), options: [['breast', L('סרטן שד או שחלה')], ['colon', L('סרטן המעי הגס')], ['t2d', L('סוכרת סוג 2')], ['alz', L('אלצהיימר')], ['fh', L('כולסטרול גבוה משפחתי')]] },
        { id: 'origin', type: 'multi', showIf: function () { return LANG === 'he'; }, label: L('מוצא משפחתי'), hint: L('לא משפיע על המספר. הסבר למה מופיע במסך התוצאה.'), options: [['ashk', L('אשכנזי')], ['seph', L('ספרדי / צפון אפריקה')], ['miz', L('עיראק / איראן / כורדיסטן')], ['yem', L('תימן')], ['eth', L('אתיופיה')], ['arab', L('ערבי / דרוזי / בדואי')], ['other', L('אחר')]] }
      ]
    },
    {
      title: L('בדיקות דם ולחץ דם'), intro: L('הכול כאן רשות. אפשר להשאיר כל שדה ריק ולהמשיך לשלב הבא: החישוב ישתמש במה שהוזן.'),
      fields: [
        { id: 'diabetes', type: 'choice', label: L('האם אובחנת בסוכרת?'), options: [['no', L('לא')], ['yes', L('כן')]] },
        { id: 'hasLabs', type: 'choice', gate: true, label: L('יש לך תוצאות של בדיקות דם או מדידה של לחץ דם מהשנה-שנתיים האחרונות?'), hint: L('לא חובה. בלי בדיקות מקבלים הערכה מלאה; עם בדיקות היא מדויקת יותר.'), options: [['yes', L('כן, אני רוצה להזין')], ['no', L('לא, לדלג')]] },
        { type: 'upload' },
        { row: [
          { id: 'sbp', type: 'num', label: L('לחץ דם סיסטולי'), hint: L('המספר הגבוה, במנוחה.'), unit: L('ממ"כ'), min: 70, max: 250 },
          { id: 'dbp', type: 'num', label: L('לחץ דם דיאסטולי'), hint: L('המספר הנמוך. נכנס לחישוב יחד עם הסיסטולי.'), unit: L('ממ"כ'), min: 40, max: 150 }
        ] },
        { row: [
          { id: 'tc', type: 'num', label: L('כולסטרול כללי'), unit: L('מ"ג/ד"ל'), min: 80, max: 500 },
          { id: 'hdl', type: 'num', label: L('HDL ("הטוב")'), unit: L('מ"ג/ד"ל'), min: 10, max: 150 }
        ] },
        { row: [
          { id: 'ldl', type: 'num', label: L('LDL ("הרע")'), hint: L('נכנס לחישוב רק אם לא הוזן כולסטרול כללי.'), unit: L('מ"ג/ד"ל'), min: 20, max: 400 },
          { id: 'tg', type: 'num', label: L('טריגליצרידים'), unit: L('מ"ג/ד"ל'), min: 20, max: 2000 }
        ] },
        { row: [
          { id: 'glucose', type: 'num', label: L('גלוקוז בצום'), unit: L('מ"ג/ד"ל'), min: 40, max: 500 },
          { id: 'hba1c', type: 'num', label: 'HbA1c', unit: '%', min: 3, max: 18, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'creatinine', type: 'num', label: L('קריאטינין'), unit: L('מ"ג/ד"ל'), min: 0.2, max: 15, stepAttr: '0.01' },
          { id: 'crp', type: 'num', label: 'CRP', unit: L('מ"ג/ליטר'), min: 0, max: 200, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'ggt', type: 'num', label: L('GGT (אנזים כבד)'), unit: 'U/L', min: 3, max: 2000 },
          { id: 'acr', type: 'num', label: L('אלבומין/קריאטינין בשתן'), unit: L('מ"ג/ג'), min: 0, max: 5000 }
        ] },
        { id: 'lpa', type: 'num', label: L('ליפופרוטאין (a) — Lp(a)'), hint: L('בדיקה חד-פעמית בדרך כלל; הערך כמעט לא משתנה לאורך החיים.'), unit: L('מ"ג/ד"ל'), min: 0, max: 400, stepAttr: '0.1' },
        { type: 'heading', label: L('לחישוב הגיל הביולוגי') },
        { type: 'text', label: L('ששת הערכים האלה, יחד עם גלוקוז, קריאטינין ו-CRP שלמעלה, מאפשרים לחשב גיל ביולוגי. כולם מופיעים בספירת דם ובבדיקת כימיה רגילות.') },
        { row: [
          { id: 'albumin', type: 'num', label: L('אלבומין'), unit: L('ג/ד"ל'), min: 1.5, max: 6.5, stepAttr: '0.1' },
          { id: 'alp', type: 'num', label: L('פוספטאזה בסיסית (ALP)'), unit: 'U/L', min: 10, max: 1000 }
        ] },
        { row: [
          { id: 'wbc', type: 'num', label: L('תאים לבנים (WBC)'), unit: L('אלפים/מק"ל'), min: 0.5, max: 50, stepAttr: '0.1' },
          { id: 'lymph', type: 'num', label: L('לימפוציטים'), unit: '%', min: 5, max: 80, stepAttr: '0.1' }
        ] },
        { row: [
          { id: 'mcv', type: 'num', label: 'MCV', unit: 'fL', min: 50, max: 130, stepAttr: '0.1' },
          { id: 'rdw', type: 'num', label: 'RDW', unit: '%', min: 9, max: 25, stepAttr: '0.1' }
        ] }
      ]
    }
  ];

  // גרסה מהירה: השאלות עם ההשפעה הגדולה ביותר, בשלב אחד. השדות עצמם משותפים לשאלון המלא.
  function F(id) { return fieldById(id); }
  var QUICK = [{
    title: L('השאלות העיקריות'), intro: L('השאלות שמשפיעות הכי הרבה, כדקה למילוי. אחרי התוצאה אפשר להוסיף פרטים ולדייק.'),
    fields: [
      { row: [F('age'), F('country')] }, F('sex'), { row: [F('height'), F('weight')] }, F('waist'),
      F('smoking'), F('quitAge'), F('activity'), F('walkPace'), F('alcohol'), F('sleep'), F('srh'), F('diabetes'),
      Object.assign({}, F('conditions'), { hint: undefined })
    ]
  }];
  var mode = data._mode === 'quick' ? 'quick' : 'full';
  function steps() { return mode === 'quick' ? QUICK : STEPS; }
  function setMode(m) { mode = m; data._mode = m; }

  // ---------- עזרים ----------

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // מפריד עשרוני לתצוגה: פסיק בספרדית ובצרפתית, נקודה בשאר השפות. גם הקלדה עם פסיק (5,8) מתקבלת.
  var DEC = (LANG === 'es' || LANG === 'fr' || LANG === 'de') ? ',' : '.';
  function dec(s) { return DEC === '.' ? String(s) : String(s).replace('.', DEC); }
  function num(v) { if (v === undefined || v === null || String(v).trim() === '') return undefined; var n = Number(String(v).trim().replace(/^(-?\d+),(\d+)$/, '$1.$2')); return isFinite(n) ? n : undefined; }
  function flat(fields) { var out = []; fields.forEach(function (f) { if (f.row) out = out.concat(f.row); else out.push(f); }); return out; }
  // ---------- בדיקת סבירות רכה: מסמנת ערך חריג בלי לחסום ----------
  // טווחים רחבים לאדם בוגר. מחוץ להם הערך אפשרי אבל נדיר, ולכן עדיף לוודא שלא הוזן בטעות (גלגלת עכבר, הקלדה, יחידות).
  var SOFT = { height: [140, 205], weight: [40, 180], waist: [55, 140], rhr: [40, 100], vo2max: [20, 70], sbp: [90, 200], dbp: [50, 120],
    tc: [100, 350], hdl: [20, 100], ldl: [40, 250], tg: [30, 800], glucose: [60, 300], hba1c: [4, 12], creatinine: [0.4, 3], crp: [0, 50],
    ggt: [5, 300], acr: [0, 1000], lpa: [0, 300], albumin: [2.5, 5.5], alp: [25, 300], wbc: [2, 20], lymph: [10, 60], mcv: [70, 110],
    rdw: [11, 18], gpAvg: [50, 105] };
  var SOFT_AGE = [30, 108];
  var SOFT_MSG = L('ערך חריג. כדאי לוודא שהוזן נכון.');
  function softBad(id) { var r = SOFT[id], v = num(data[id]); return !!r && v !== undefined && (v < r[0] || v > r[1]); }
  function softPersonBad(id) { var p = data[id], a = p && p.status ? num(p.age) : undefined; return a !== undefined && (a < SOFT_AGE[0] || a > SOFT_AGE[1]); }
  function setSoft(id, bad) { var w = document.getElementById('w_' + id); if (w) w.textContent = bad ? SOFT_MSG : ''; }
  function flaggedInputs() {
    var out = [];
    STEPS.forEach(function (st) {
      flat(st.fields).forEach(function (f) {
        if (f.type === 'num' && softBad(f.id)) out.push(f.label);
        else if (f.type === 'person' && softPersonBad(f.id)) out.push(f.label);
      });
    });
    return out;
  }
  function fmt(x, d) { return dec(x.toFixed(d === undefined ? 1 : d)); }
  function signed(x) { return (x >= 0 ? '+' : '−') + dec(Math.abs(x).toFixed(1)); }

  // ---------- ציור הטופס ----------

  function fieldHTML(f) {
    if (f.row) return '<div class="row2">' + f.row.map(fieldHTML).join('') + '</div>';
    if (f.type === 'heading') return '<h3>' + esc(f.label) + '</h3>';
    if (f.type === 'text') return '<p class="small muted">' + esc(f.label) + '</p>';
    if (f.type === 'upload') {
      return L('<div class="upload"><div class="lbl">יש לכם קובצי PDF של בדיקות דם?</div>') +
        L('<p class="hint">אפשר לבחור כמה קבצים יחד: כמה דפים של אותה בדיקה, וגם בדיקות ישנות יותר. הטופס יתמלא מהבדיקה העדכנית ביותר, ובמסך התוצאה תוצג המגמה לאורך זמן. הקבצים נקראים במכשיר שלכם בלבד.</p>') +
        L('<label class="filebtn"><input type="file" id="labfile" multiple accept="application/pdf,.pdf,.txt,text/plain"><span>בחירת קובצי PDF</span></label>') +
        L('<details><summary>או הדבקת טקסט מתוך הבדיקות</summary><textarea id="labtext" rows="5" dir="auto" aria-label="טקסט הבדיקות"></textarea>') +
        L('<button type="button" id="labparse">שליפת ערכים מהטקסט</button></details>') +
        '<div id="labdocs"></div><div id="labresult" aria-live="polite"></div></div>';
    }
    if (f.type === 'garmin') {
      return L('<details class="adv"><summary>למתקדמים: ייבוא אוטומטי מקובץ ייצוא של Garmin</summary><div class="upload">') +
        L('<p class="hint">לא חובה, וההזנה הידנית למעלה נותנת בדיוק את אותה תוצאה. מי שביקש מגרמין את כל הנתונים שלו (באתר Garmin: Account ← Data Management ← Export Your Data, והקובץ מגיע במייל) יכול לבחור כאן את קובץ ה-ZIP. הקובץ נקרא במכשיר שלכם בלבד.</p>') +
        L('<label class="filebtn"><input type="file" id="garminfile" multiple accept=".zip,.json,.csv,application/zip,application/json,text/csv"><span>בחירת קובץ ייצוא</span></label>') +
        '<div id="garminresult" aria-live="polite"></div></div></details>';
    }
    var hidden = f.showIf && !f.showIf() ? ' hidden' : '';
    var hint = f.hint ? '<div class="hint">' + esc(f.hint) + '</div>' : '';
    var v = data[f.id];
    if (f.type === 'num') {
      return '<div class="field" data-field="' + f.id + '"' + hidden + '><label for="f_' + f.id + '">' + esc(f.label) + '</label>' + hint +
        '<div class="with-unit"><input type="number" inputmode="decimal" id="f_' + f.id + '" data-id="' + f.id + '" step="' + (f.stepAttr || '1') +
        '" value="' + esc(v === undefined ? '' : v) + '"><span>' + esc(f.unit || '') + '</span></div><div class="err" id="e_' + f.id + '"></div><div class="softwarn" id="w_' + f.id + '"></div></div>';
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
        '<select data-p="status" aria-label="' + esc(f.label) + L(' — מצב"><option value="">לא ידוע</option><option value="alive"') + (p.status === 'alive' ? ' selected' : '') + L('>בחיים</option><option value="dead"') + (p.status === 'dead' ? ' selected' : '') + L('>נפטר/ה</option></select>') +
        '<input type="number" inputmode="numeric" data-p="age" min="0" max="120" placeholder="' + (p.status === 'dead' ? L('גיל בפטירה') : L('גיל')) + '" aria-label="' + esc(f.label) + L(' — גיל" value="') + esc(p.age === undefined ? '' : p.age) + '"' + (p.status ? '' : ' hidden') + '>' +
        '<select data-p="cause" aria-label="' + esc(f.label) + L(' — סיבת הפטירה"') + (p.status === 'dead' ? '' : ' hidden') + L('><option value="natural">ממחלה או מזקנה</option><option value="external"') + (p.cause === 'external' ? ' selected' : '') + L('>תאונה, מלחמה או אלימות</option></select>') +
        '</div><div class="err" id="e_' + f.id + '"></div><div class="softwarn" id="w_' + f.id + '"></div></div>';
    }
    return '';
  }

  // שדות של שלב, כשאחרי שאלת "שער" (gate) שאר השדות מוסתרים עד שעונים "כן"
  var LAB_IDS = ['sbp', 'dbp', 'tc', 'hdl', 'ldl', 'tg', 'glucose', 'hba1c', 'creatinine', 'crp', 'ggt', 'acr', 'lpa', 'albumin', 'alp', 'wbc', 'lymph', 'mcv', 'rdw'];
  function fieldsHTML(fields) {
    var gi = -1;
    fields.forEach(function (f, i) { if (f.gate && gi < 0) gi = i; });
    if (gi < 0) return fields.map(fieldHTML).join('');
    var g = fields[gi];
    if (!data[g.id] && LAB_IDS.some(function (k) { return num(data[k]) !== undefined; })) data[g.id] = 'yes';
    return fields.slice(0, gi + 1).map(fieldHTML).join('') +
      '<div id="gatebody"' + (data[g.id] === 'yes' ? '' : ' hidden') + '>' + fields.slice(gi + 1).map(fieldHTML).join('') + '</div>';
  }

  function renderIntro() {
    var returning = num(data.age) !== undefined && !!data.sex;
    app.innerHTML = '<div class="card">' +
      L('<h1>כמה שנים, סטטיסטית, עוד לפניך?</h1>') +
      L('<p>מחשבון שמעריך תוחלת חיים אישית. הוא מתחיל מלוח התמותה הרשמי של ארגון הבריאות העולמי לפי גיל, מין ומדינה, ומתקן אותו לפי אורח החיים, ההיסטוריה המשפחתית ובדיקות הדם שלך, על סמך מחקרים אפידמיולוגיים גדולים.</p>') +
      (returning
        ? L('<div class="welcome"><b>הנתונים שהזנת בפעם הקודמת שמורים במכשיר הזה.</b> אפשר לעבור ישר לתוצאה, או לעדכן רק את מה שהשתנה.</div>')
        : L('<p class="muted">אפשר להתחיל בגרסה המהירה, כדקה למילוי, ולהוסיף פרטים אחרי שרואים את התוצאה. רק הגיל, המין והמדינה הם חובה.</p>')) +
      DISCLAIMER +
      '<label class="remember"><input type="checkbox" id="remember"' + (remember ? ' checked' : '') + L('> לזכור את הנתונים שלי במכשיר הזה, כדי שלא אצטרך להזין שוב</label>') +
      L('<p class="small muted">🔒 פרטיות: כל החישוב נעשה בדפדפן שלך, והתשובות שלך לא נשלחות לשום מקום. אם בחרת לזכור, הנתונים נשמרים רק בדפדפן הזה, ואפשר למחוק אותם בכל רגע בכפתור "מחיקת הנתונים" למעלה. במחשב משותף עדיף לא לסמן.</p>') +
      L('<div class="guidelink"><button type="button" id="guideOpen">📖 מדריכים: שינה, תזונה, צום, סוכר ועוד <span class="small muted">(בלי להזין נתונים)</span></button></div>') +
      '<div class="nav">' + (returning ? L('<button id="edit">עדכון הנתונים</button><button class="primary" id="next">לתוצאה שלי</button>')
        : L('<button id="full">שאלון מלא, כ-4 דקות</button><button class="primary" id="next">חישוב מהיר, כדקה</button>')) + '</div></div>';
    document.getElementById('remember').onchange = function () {
      remember = this.checked;
      var ls = storage(); try { if (ls) { if (remember) ls.removeItem(STORE + '-off'); else ls.setItem(STORE + '-off', '1'); } } catch (e) { /* */ }
      save();
    };
    document.getElementById('next').onclick = function () { if (!returning) setMode('quick'); step = returning ? steps().length + 1 : 1; render(); };
    if (!returning) document.getElementById('full').onclick = function () { setMode('full'); step = 1; render(); };
    document.getElementById('guideOpen').onclick = function () { location.href = SiteURL('topics'); };
    if (returning) document.getElementById('edit').onclick = function () { setMode('full'); step = 1; render(); };
  }

  function renderStep() {
    var S = steps(), s = S[step - 1];
    var prog = '<div class="progress" aria-hidden="true">' + S.map(function (_, i) { return '<div class="' + (i < step ? 'on' : '') + '"></div>'; }).join('') + '</div>';
    app.innerHTML = '<div class="card">' + prog +
      (S.length > 1 ? L('<div class="step-label">שלב ') + step + L(' מתוך ') + S.length + '</div>' : '') + '<h2>' + esc(s.title) + '</h2><p class="muted">' + esc(s.intro) + '</p>' +
      fieldsHTML(s.fields) +
      L('<div class="nav"><button id="back">חזרה</button><button class="primary" id="next">') + (step === S.length ? L('חשבו את ההערכה') : L('המשך')) + '</button></div></div>';

    app.querySelectorAll('[data-id]').forEach(function (el) {
      el.addEventListener(el.type === 'number' ? 'input' : 'change', function () {
        var id = el.dataset.id;
        if (el.type === 'checkbox') {
          data[id] = Array.prototype.map.call(app.querySelectorAll('[data-id="' + id + '"]:checked'), function (c) { return c.value; });
        } else data[id] = el.value;
        if (el.type === 'number') setSoft(id, softBad(id));
        if (id === 'hasLabs') { var gb = document.getElementById('gatebody'); if (gb) gb.hidden = el.value !== 'yes'; }
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
        ag.placeholder = st.value === 'dead' ? L('גיל בפטירה') : L('גיל כיום');
        setSoft(id, softPersonBad(id));
      }
      st.onchange = sync; ag.oninput = sync; ca.onchange = sync;
    });
    // גלגלת העכבר על שדה מספר ממוקד משנה את הערך בלי ששמים לב (עד המקסימום). מסירים מיקוד בגלילה.
    flat(s.fields).forEach(function (f) { if (f.type === 'num') setSoft(f.id, softBad(f.id)); else if (f.type === 'person') setSoft(f.id, softPersonBad(f.id)); });
    app.querySelectorAll('input[type=number]').forEach(function (el) { el.addEventListener('wheel', function () { if (document.activeElement === el) el.blur(); }, { passive: true }); });
    wireUpload();
    wireGarmin();
    document.getElementById('back').onclick = function () { step--; render(); };
    document.getElementById('next').onclick = function () { if (validate(s)) { step++; render(); } };
  }

  // ---------- שליפת ערכים ממסמך בדיקות ----------

  function heDate(iso) { var p = String(iso).split('-'); return p.length === 3 ? p[2] + '/' + p[1] + '/' + p[0] : iso; }
  function dlabel(iso) { return iso ? heDate(iso) : L('ללא תאריך'); }
  function todayISO() { var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); }

  /** מסמכי הבדיקות לפי תאריך: [{date, values:{id:value}}], מהישן לחדש. מסמכים מאותו תאריך מתמזגים. */
  function labsByDate() {
    var map = {};
    (data.labDocs || []).forEach(function (doc) {
      var k = doc.date || '';
      map[k] = map[k] || {};
      doc.found.forEach(function (r) { map[k][r.id] = r.value; });
    });
    return Object.keys(map).sort().map(function (k) { return { date: k, values: map[k] }; });
  }

  /** ממלא את שדות הטופס מהבדיקה העדכנית ביותר שיש בה כל ערך */
  function applyLabDocs() {
    var latest = {}, undated = {}, dates = {};
    labsByDate().forEach(function (d) { Object.keys(d.values).forEach(function (id) { if (d.date) { latest[id] = d.values[id]; dates[id] = d.date; } else undated[id] = d.values[id]; }); });
    data.labDates = {}; data.labVals = {};
    // מסמך בלי תאריך לא דורס שום דבר: הוא ממלא רק שדה שאין בו ערך מבדיקה מתוארכת ושעדיין ריק בטופס
    Object.keys(undated).forEach(function (id) { if (latest[id] === undefined && (data[id] === undefined || data[id] === '')) latest[id] = undated[id]; });
    Object.keys(latest).forEach(function (id) {
      data[id] = String(latest[id]);
      if (dates[id]) { data.labDates[id] = dates[id]; data.labVals[id] = String(latest[id]); } // תאריך הערך, כדי לזהות ערכים ישנים (נמחק אם המשתמש מקליד ערך ידנית)
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
          '<input type="date" data-doc="' + i + '" value="' + esc(d.date) + '" max="' + todayISO() + L('" aria-label="תאריך הבדיקה">') +
          '<span class="small muted">' + d.found.length + L(' ערכים</span>') +
          '<button type="button" data-rm="' + i + L('" aria-label="הסרת המסמך">הסרה</button></div>');
      }).join('') + L('</div><p class="small muted">בדקו שתאריך כל בדיקה נכון. מסמכים מאותו תאריך נחשבים בדיקה אחת.</p>');
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
      return { name: name, ok: true, found: found, other: other, support: LabParser.parseSupport(text), date: LabParser.findDate(text) || '' };
    }

    // בדיקת עקביות: LDL אמור להיות קרוב ל"כללי פחות HDL פחות טריגליצרידים/5" (נוסחת Friedewald, תקפה עד טריגליצרידים 400).
    // אם הערכים רחוקים, כנראה ערך אחד נקרא משורה לא נכונה. אזהרה בלבד, לא מתקנת כלום.
    function lipidWarning(found) {
      var v = {}; found.forEach(function (r) { v[r.id] = r.value; });
      if (v.tc === undefined || v.hdl === undefined || v.ldl === undefined || v.tg === undefined || v.tg >= 400) return '';
      return Math.abs(v.tc - v.hdl - v.tg / 5 - v.ldl) > 20
        ? L('<p><b>כדאי לבדוק:</b> כולסטרול כללי, HDL, LDL וטריגליצרידים לא מתיישבים זה עם זה (LDL אמור להיות קרוב ל"כללי פחות HDL פחות טריגליצרידים חלקי 5"). ייתכן שערך נקרא משורה לא נכונה, ולכן כדאי לבדוק כל אחד מהם מול הקובץ לפני שממשיכים.</p>') : '';
    }

    // בדיקות שפיות נוספות (אזהרה בלבד): MCV מול המטוקריט ו-RBC (MCV = 10 × HCT / RBC), ו-CRP גבוה במידה חשודה (בלבול יחידות).
    function labSanity(g, vals) {
      var v = {}, sp = {}, h = '';
      vals.forEach(function (x) { v[x.id] = x.value; });
      (g.support || []).forEach(function (x) { sp[x.id] = x.value; });
      if (v.mcv !== undefined && sp.hct !== undefined && sp.rbc !== undefined) {
        var calc = 10 * sp.hct / sp.rbc;
        if (Math.abs(calc - v.mcv) / v.mcv > 0.1) h += L('<p><b>כדאי לבדוק:</b> ערך ה-MCV (') + v.mcv + L(') לא מתיישב עם המטוקריט ו-RBC בקובץ (לפיהם כ-') + Math.round(calc) + L('). ייתכן שהערך נקרא משורה לא נכונה; בדקו אותו מול הקובץ.</p>');
      }
      if (v.crp !== undefined && v.crp > 30) h += L('<p><b>כדאי לבדוק:</b> ערך ה-CRP גבוה (') + v.crp + L(' מ"ג/ליטר). אם בקובץ הוא מופיע ב-mg/dL, ייתכן שהיחידות לא הומרו.</p>');
      return h;
    }

    // שלב אישור: הערכים שנקראו מוצגים לבדיקה, והטופס מתמלא רק אחרי שהמשתמש לוחץ "אישור". אפשר לתקן מספר או להסיר סימון מערך שגוי.
    function reviewHTML(good) {
      var h = L('<p><b>בדקו כל ערך מול המסמך ואשרו.</b> הטופס יתמלא רק אחרי שתלחצו "אישור ומילוי הטופס". אפשר לתקן מספר, או להסיר את הסימון מערך שאינו נכון.</p>') +
        L('<p class="small muted">כשיש כמה בדיקות, בכל ערך נבחרת הבדיקה העדכנית ביותר לפי התאריך.</p>');
      good.forEach(function (g, gi) {
        h += '<div class="review"><div class="revhead"><b dir="auto">' + esc(g.name) + '</b> <label class="small">' + L('תאריך הבדיקה: ') +
          '<input type="date" data-gdate="' + gi + '" value="' + esc(g.date) + '" max="' + todayISO() + '"></label><span class="small nodatenote" data-dn="' + gi + '"></span></div><ul class="revlist">';
        g.found.forEach(function (r, i) {
          h += '<li><label class="revrow"><input type="checkbox" checked data-g="' + gi + '" data-i="' + i + '" aria-label="' + esc(r.label) + '"> <span>' + esc(r.label) + '</span></label> ' +
            '<input type="number" step="any" dir="ltr" class="revval" data-g="' + gi + '" data-i="' + i + '" value="' + r.value + '"> ' + esc(r.unit) +
            (r.converted ? L(' (הומר מיחידות אחרות)') : '') +
            '<div class="small revnote" data-n="' + gi + '-' + i + '"></div>' +
            '<div class="src" dir="auto">' + esc(r.line) + '</div></li>';
        });
        h += '</ul><div data-w="' + gi + '"></div></div>';
      });
      return h + '<div class="revbtns"><button type="button" class="btn primary" id="labconfirm">' + L('אישור ומילוי הטופס') + '</button> <button type="button" class="btn ghost" id="labcancel">' + L('ביטול') + '</button></div>';
    }

    function markFromFile(ids) {
      // ערך ישן: מעל 12 חודשים מהיום (אותו חלון כמו בחישוב הגיל הביולוגי). התגית מתעדכנת גם כשערך חדש יותר דורס את הקודם.
      var cut = new Date(); cut.setFullYear(cut.getFullYear() - 1);
      var cutS = cut.getFullYear() + '-' + String(cut.getMonth() + 1).padStart(2, '0') + '-' + String(cut.getDate()).padStart(2, '0');
      ids.forEach(function (id) {
        var el = document.getElementById('f_' + id), box = el && el.closest('.field');
        if (!el || !box) return;
        var tag = box.querySelector('.filetag');
        if (!tag) {
          el.classList.add('fromfile');
          tag = document.createElement('div'); tag.className = 'filetag small'; box.appendChild(tag);
          el.addEventListener('input', function () { el.classList.remove('fromfile'); if (tag.parentNode) tag.parentNode.removeChild(tag); });
        }
        var ld = data.labDates && data.labDates[id];
        tag.textContent = L('מולא מקובץ') + (ld && ld < cutS ? L(' · ערך ישן (') + heDate(ld) + ')' : '');
      });
    }

    function wireReview(good) {
      function checked(gi) {
        var vals = [];
        out.querySelectorAll('input[type=checkbox][data-g="' + gi + '"]').forEach(function (cb) {
          if (!cb.checked) return;
          var i = +cb.dataset.i, v = parseFloat(out.querySelector('input.revval[data-g="' + gi + '"][data-i="' + i + '"]').value);
          if (isFinite(v)) vals.push({ i: i, id: good[gi].found[i].id, value: v });
        });
        return vals;
      }
      function noteFor(g, gi, r) {
        var dEl = out.querySelector('input[data-gdate="' + gi + '"]'), date = dEl ? dEl.value : g.date;
        var cur = data[r.id], has = cur !== undefined && cur !== '', newest = '';
        if (!has) return '';
        (data.labDocs || []).forEach(function (d) { if (d.date && d.date > newest && d.found.some(function (x) { return x.id === r.id; })) newest = d.date; });
        if (date) {
          if (newest && newest > date) return L('בטופס כרגע: ') + esc(cur) + L(' (יישאר: קיימת בדיקה חדשה יותר מ-') + heDate(newest) + ')';
          return Number(cur) !== r.value ? L('בטופס כרגע: ') + esc(cur) + L(' (יוחלף)') : '';
        }
        return L('בטופס כרגע: ') + esc(cur) + L(' (יישאר: לא ידוע תאריך הבדיקה)');
      }
      function refresh() {
        good.forEach(function (g, gi) {
          var w = out.querySelector('[data-w="' + gi + '"]'); if (w) w.innerHTML = lipidWarning(checked(gi)) + labSanity(g, checked(gi));
          var dEl = out.querySelector('input[data-gdate="' + gi + '"]'), dn = out.querySelector('[data-dn="' + gi + '"]');
          if (dn) dn.textContent = dEl && !dEl.value ? L('לא זוהה תאריך בקובץ. אפשר להשאיר ריק, ואז הערכים ימלאו רק שדות שעדיין ריקים.') : '';
          g.found.forEach(function (r, i) { var n = out.querySelector('[data-n="' + gi + '-' + i + '"]'); if (n) n.innerHTML = noteFor(g, gi, r); });
        });
      }
      out.querySelectorAll('input[data-i], input[data-gdate]').forEach(function (el) { el.addEventListener('input', refresh); el.addEventListener('change', refresh); });
      refresh();
      document.getElementById('labcancel').onclick = function () { msg(''); };
      document.getElementById('labconfirm').onclick = function () {
        var count = 0, ids = [];
        good.forEach(function (g, gi) {
          var kept = checked(gi).map(function (k) {
            var r = g.found[k.i]; ids.push(r.id);
            return { id: r.id, label: r.label, unit: r.unit, value: k.value, converted: r.converted, line: r.line };
          });
          var dEl = out.querySelector('input[data-gdate="' + gi + '"]');
          if (kept.length) { data.labDocs.push({ name: g.name, date: (dEl && dEl.value) || g.date, found: kept, other: g.other }); count += kept.length; }
        });
        drawDocs(); applyLabDocs(); markFromFile(ids);
        msg(count ? L('הטופס מולא מ-') + count + L(' ערכים שאישרתם. אפשר לתקן כל שדה ידנית.') : L('לא אושר אף ערך, והטופס לא השתנה.'), count ? 'ok' : 'warn');
      };
    }

    function report(results) {
      var good = results.filter(function (r) { return r.ok; }), bad = results.filter(function (r) { return !r.ok; });
      var html = good.length ? reviewHTML(good) : '';
      bad.forEach(function (r) {
        html += '<p>' + esc(r.name) + ': ' + (r.error ? (r.error === 'ScriptLoadError' ? L('רכיב קריאת ה-PDF לא נטען. אם הדף פתוח בכתובת localhost, השרת המקומי כנראה כבוי: פתחו את הקובץ index.html ישירות בלחיצה כפולה, או הפעילו את השרת מחדש ורעננו.')
          : /Password/.test(r.error) ? L('הקובץ מוגן בסיסמה ולא נפתח. נסו שוב והקלידו את הסיסמה (בדרך כלל מספר תעודת הזהות).')
          : L('לא הצלחתי לקרוא את הקובץ; ייתכן שהוא פגום או שאינו PDF. (פרט טכני: ') + esc(r.error) + ')')
          : r.scanned ? L('לא נמצא טקסט. כנראה מסמך סרוק (תמונה), וכרגע נקראים רק קובצי PDF עם טקסט.')
          : L('לא זוהו בדיקות מוכרות.')) + '</p>' +
          (r.preview && !r.scanned ? L('<details class="rawtext"><summary>הצגת הטקסט שנקרא מהקובץ</summary><p class="small">זה מה שהמערכת הצליחה לקרוא. אם זה אכן דוח בדיקות, העתיקו מכאן כמה שורות של תוצאות (בלי שם, תעודת זהות או פרטים מזהים) כדי שאפשר יהיה להתאים את הקריאה למבנה של הדוח.</p><pre dir="auto">') + esc(r.preview) + '</pre></details>' : '');
      });
      if (bad.length) html += L('<p><b>אפשר גם למלא את הערכים ידנית.</b> כל קובץ שהמערכת לא הצליחה לקרוא אפשר לדלג עליו ולהקליד את התוצאות בשדות שבטופס. אף ערך אינו חובה.</p>');
      msg(html, good.length ? 'ok' : 'warn');
      if (good.length) wireReview(good);
    }

    file.onchange = function () {
      var files = Array.prototype.slice.call(file.files); if (!files.length) return;
      msg(L('קורא ') + (files.length === 1 ? L('את הקובץ') : files.length + L(' קבצים')) + '…');
      Promise.all(files.map(function (f) {
        var isPdf = /pdf$/i.test(f.type) || /\.pdf$/i.test(f.name);
        return (isPdf ? LabParser.readPdf(f) : f.text()).then(function (t) { return addDoc(f.name, t, isPdf); },
          function (e) { return { name: f.name, ok: false, error: (e && e.name) || 'Error' }; });
      })).then(report);
      file.value = '';
    };
    document.getElementById('labparse').onclick = function () { report([addDoc(L('טקסט שהודבק'), document.getElementById('labtext').value, false)]); };
    drawDocs();
  }

  // ---------- ייבוא מ-Garmin ----------

  function wireGarmin() {
    var file = document.getElementById('garminfile'); if (!file) return;
    var out = document.getElementById('garminresult');
    function msg(html, cls) { out.className = 'impres ' + (cls || ''); out.innerHTML = html; }
    function fmtD(d) { return d ? L(' (עד ') + d.toLocaleDateString(LANGS[LANG].locale) + ')' : ''; }
    file.onchange = function () {
      if (!file.files.length) return;
      msg(L('קורא את הקובץ… בקובץ ייצוא גדול זה יכול לקחת כמה שניות.'));
      GarminImport.importFiles(file.files).then(function (r) {
        var parts = [];
        if (r.rhr !== undefined) {
          data.rhr = String(r.rhr); document.getElementById('f_rhr').value = r.rhr;
          parts.push(L('דופק במנוחה: <b dir="ltr">') + r.rhr + L('</b>, ממוצע של ') + r.rhrDays + L(' הימים האחרונים שנמדדו') + fmtD(r.rhrDate));
        }
        if (r.vo2 !== undefined) {
          data.vo2max = String(r.vo2); document.getElementById('f_vo2max').value = r.vo2;
          parts.push('VO2max: <b dir="ltr">' + r.vo2 + L('</b>, המדידה האחרונה') + fmtD(r.vo2Date));
        }
        save();
        if (parts.length) msg(L('<b>יובא מהקובץ ומולא בטופס:</b><ul><li>') + parts.join('</li><li>') + '</li></ul>' +
          (parts.length < 2 ? L('<p>הנתון השני לא נמצא בקובץ; אפשר להזין אותו ידנית.</p>') : ''), 'ok');
        else msg(L('לא נמצאו בקובץ דופק במנוחה או VO2max (נקראו ') + r.filesRead + L(' קבצים). אפשר להעתיק את שני הנתונים ידנית מאפליקציית Garmin Connect.'), 'warn');
      }).catch(function () {
        msg(L('לא הצלחתי לקרוא את הקובץ. ודאו שזה קובץ ה-ZIP המקורי מגרמין, או קובצי JSON / CSV מתוכו.'), 'warn');
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
    return L('<h3>ערכים נוספים מהבדיקות</h3><details class="others"') + (out ? ' open' : '') + '><summary>' + list.length + L(' ערכים נוספים נמצאו במסמכים') +
      (out ? L(', מתוכם <b class="neg">') + out + L(' מחוץ לטווח</b>') : L(', כולם בטווח')) + '</summary>' +
      L('<p class="small muted">הערכים האלה אינם נכללים בחישוב תוחלת החיים. הטווח הוא זה שמופיע במסמך עצמו, והקריאה אוטומטית ועלולה לטעות; ערך מחוץ לטווח הוא סיבה לשאול את הרופא/ה, לא אבחנה.</p>') +
      list.map(function (x) {
        var o = x.o, st = o.status === 'ok' ? L('<span class="chip">בטווח</span>') : '<span class="chip bad">' + (o.status === 'high' ? L('גבוה') : L('נמוך')) + '</span>';
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
      var word = Math.abs(rel) < 0.03 ? L('יציב') : (rel > 0 ? L('עלייה') : L('ירידה')) + L(' של ') + Math.round(Math.abs(rel) * 100) + '%';
      rows += '<div class="trow"><div class="name">' + esc(T.label) + '<div class="det"><span dir="ltr">' + dlabel(pts[0].date) + ' – ' + dlabel(pts[pts.length - 1].date) + '</span></div></div>' +
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
      est = L('<div class="trendest"><div class="small muted">ההערכה לפי כל בדיקה, בגילך הנוכחי וכשכל שאר הנתונים קבועים</div><div class="estrow">') +
        dates.map(function (d, i) { return '<div><b>' + fmt(ages[i]) + '</b><span>' + dlabel(d.date) + '</span></div>'; }).join('<i aria-hidden="true">←</i>') + '</div>' +
        '<div>' + (Math.abs(diff) < 0.05 ? L('הבדיקות לא שינו את ההערכה.') : L('השינוי בבדיקות ') + (diff > 0 ? L('הוסיף') : L('הוריד')) +
          ' <b class="' + (diff > 0 ? 'pos' : 'neg') + '" dir="ltr">' + signed(diff) + L('</b> שנים להערכה.')) + '</div></div>';
    }
    return L('<h3>מגמות בבדיקות הדם</h3><p class="small muted">השוואה בין ') + dates.length + L(' בדיקות. ירוק מסמן שינוי לכיוון שקשור בסיכון נמוך יותר, אדום לכיוון ההפוך. הבדלים קטנים בין בדיקות הם טבעיים ואינם בהכרח מגמה.</p>') +
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
        if (f.required && n === undefined) msg = L('שדה חובה');
        else if (raw !== undefined && String(raw).trim() !== '' && n === undefined) msg = L('יש להזין מספר');
        else if (n !== undefined && (n < f.min || n > f.max)) msg = L('הערך צריך להיות בין ') + f.min + L(' ל-') + f.max;
        if (f.id === 'quitAge' && n !== undefined && num(data.age) !== undefined && n > num(data.age)) msg = L('גיל ההפסקה לא יכול להיות גבוה מהגיל שלך');
      } else if (f.type === 'choice' && f.required && !data[f.id]) msg = L('יש לבחור אחת מהאפשרויות');
      else if (f.type === 'person') {
        var p = data[f.id];
        if (p && p.status && p.age !== undefined && (p.age < 0 || p.age > 120)) msg = L('הגיל צריך להיות בין 0 ל-120');
      }
      e.textContent = msg;
      if (msg) { ok = false; first = first || e; }
    });
    if (first) first.parentNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return ok;
  }

  // ---------- איסוף הקלט למודל ----------

  var staleLabs = [];
  function collect() {
    var inp = { country: data.country, sex: data.sex, age: num(data.age) };
    ['height', 'weight', 'eduYears', 'quitAge', 'fruitveg', 'sbp', 'tc', 'hdl', 'ldl', 'glucose', 'hba1c', 'creatinine', 'crp', 'albumin', 'alp', 'wbc', 'lymph', 'mcv', 'rdw', 'waist', 'sitting', 'rhr', 'vo2max', 'dbp', 'tg', 'ggt', 'acr', 'lpa']
      .forEach(function (k) { inp[k] = num(data[k]); });
    ['smoking', 'alcohol', 'activity', 'walkPace', 'sleep', 'lonely', 'isolated', 'diabetes', 'famHeart', 'srh', 'marital'].forEach(function (k) { inp[k] = data[k] || undefined; });
    // גיל ביולוגי: כל תשעת הערכים צריכים להיות מחלון של 12 חודשים. ערך שהוקלד ידנית (שונה מהערך מהקובץ) נחשב עדכני.
    var ph = ['albumin', 'creatinine', 'glucose', 'crp', 'lymph', 'mcv', 'rdw', 'alp', 'wbc'], dated = [], ref = '';
    ph.forEach(function (k) {
      var d = data.labDates && data.labDates[k];
      if (d && data.labVals && String(data[k]) === data.labVals[k]) { dated.push({ id: k, date: d }); if (d > ref) ref = d; }
    });
    staleLabs = [];
    if (ref) { var cut = (parseInt(ref.slice(0, 4), 10) - 1) + ref.slice(4); dated.forEach(function (x) { if (x.date < cut) staleLabs.push(x); }); }
    inp.phenoExclude = staleLabs.map(function (x) { return x.id; });
    inp.conditions = data.conditions || [];
    inp.mother = data.mother; inp.father = data.father;
    // סבים וסבתות: הזנה לכל אחד בנפרד, או (כקיצור) שאלה אחת על הגיל הממוצע.
    var gpa = num(data.gpAvg);
    // קודם הזנה לכל אחד בנפרד (לפחות שניים עם גיל); אחרת התשובה הממוצעת
    var gps = [data.gp0, data.gp1, data.gp2, data.gp3].filter(function (g) { return g && g.status && num(g.age) !== undefined; });
    inp.grandparents = gps.length >= 2 ? gps
      : gpa !== undefined ? [{ status: 'dead', age: gpa, cause: 'natural' }, { status: 'dead', age: gpa, cause: 'natural' }] : gps;
    return inp;
  }

  // ---------- מסך התוצאה ----------

  // רוחב התרשים בפיקסלים אמיתיים, כדי שהטקסט לא יתכווץ במסכים צרים
  function chartW() { return Math.max(280, Math.min(680, app.clientWidth - 50)); }

  function rangeChart(r) {
    var p = r.personal, W = chartW(), H = 92, padX = 24;
    var lo = Math.floor(Math.min(p.p10, r.baseline.expectedAge) / 5) * 5 - 5, hi = Math.ceil(Math.max(p.p90, r.baseline.expectedAge) / 5) * 5 + 5;
    function x(a) { return padX + (a - lo) / (hi - lo) * (W - 2 * padX); }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + L('" role="img" aria-label="טווח גילים: 80% מהמקרים בין ') + Math.round(p.p10) + L(' ל-') + Math.round(p.p90) + '">';
    s += '<rect x="' + padX + '" y="30" width="' + (W - 2 * padX) + '" height="18" rx="9" fill="var(--track)"/>';
    s += '<rect x="' + x(p.p10) + '" y="30" width="' + (x(p.p90) - x(p.p10)) + '" height="18" rx="9" fill="var(--accent)" opacity=".3"/>';
    s += '<rect x="' + x(p.p25) + '" y="30" width="' + (x(p.p75) - x(p.p25)) + '" height="18" rx="9" fill="var(--accent)"/>';
    s += '<line x1="' + x(p.expectedAge) + '" x2="' + x(p.expectedAge) + '" y1="22" y2="56" stroke="var(--ink)" stroke-width="3" stroke-linecap="round"/>';
    s += '<text x="' + x(p.expectedAge) + '" y="15" text-anchor="middle" style="fill:var(--ink);font-weight:700;font-size:14px">' + fmt(p.expectedAge) + '</text>';
    for (var a = lo; a <= hi; a += 5) s += '<text x="' + x(a) + '" y="80" text-anchor="middle">' + a + '</text><line x1="' + x(a) + '" x2="' + x(a) + '" y1="60" y2="65" stroke="var(--line)"/>';
    return s + '</svg>';
  }

  function survivalChart(r) {
    var W = chartW(), H = W < 450 ? 240 : 300, PL = 46, R = 12, T = 12, B = 34, a0 = r.age, a1 = 110;
    function x(a) { return PL + (a - a0) / (a1 - a0) * (W - PL - R); }
    function y(p) { return T + (1 - p) * (H - T - B); }
    function path(curve) {
      var d = '';
      for (var i = 0; i < curve.length && a0 + i <= a1; i++) d += (i ? 'L' : 'M') + x(a0 + i).toFixed(1) + ' ' + y(curve[i]).toFixed(1);
      return d;
    }
    var s = '<svg viewBox="0 0 ' + W + ' ' + H + L('" role="img" aria-label="עקומת הישרדות: הסיכוי להגיע לכל גיל">');
    [0, 0.25, 0.5, 0.75, 1].forEach(function (p) {
      s += '<line x1="' + PL + '" x2="' + (W - R) + '" y1="' + y(p) + '" y2="' + y(p) + '" stroke="var(--line)"/>' +
        '<text x="' + (PL - 8) + '" y="' + (y(p) + 4) + '" text-anchor="end">' + Math.round(p * 100) + '%</text>';
    });
    for (var a = Math.ceil(a0 / 10) * 10; a <= a1; a += 10) s += '<text x="' + x(a) + '" y="' + (H - 10) + '" text-anchor="middle">' + a + '</text>';
    s += '<path d="' + path(r.baseline.curve) + '" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="6 5"/>';
    s += '<path d="' + path(r.personal.curve) + '" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linejoin="round"/>';
    return s + '</svg>';
  }

  function factorRows(r) {
    var list = r.contributions;
    if (!list.length) return L('<p class="muted">לא הוזנו נתונים מעבר לגיל, מין ומדינה, ולכן ההערכה זהה לממוצע. חזרו לטופס והוסיפו פרטים כדי לקבל הערכה אישית.</p>');
    var max = Math.max.apply(null, list.map(function (c) { return Math.abs(c.years); }).concat([0.5]));
    function row(c) {
      var w = Math.abs(c.years) / max * 50, pos = c.years >= 0;
      var cls = Math.abs(c.years) < 0.05 ? '' : pos ? 'pos' : 'neg';
      var bar = '<div class="bar ' + (pos ? 'pos' : 'neg') + '" style="' + (pos ? 'left:50%' : 'right:50%') + ';width:' + w.toFixed(1) + '%"></div>';
      return '<div class="frow"><div class="name">' + esc(c.label) + '<div class="det">' + esc(c.detail) + '</div></div>' +
        '<div class="track">' + bar + '</div><div class="val ' + cls + '">' + signed(c.years) + L(' שנים</div></div>');
    }
    // גורמים עם השפעה זניחה (פחות מ-0.15 שנה, כלומר מוצגים כ-0.0 או 0.1) מקופלים, כדי לא להציף את הרשימה
    var big = list.filter(function (c) { return Math.abs(c.years) >= 0.15; }), small = list.filter(function (c) { return Math.abs(c.years) < 0.15; });
    if (!small.length || !big.length) return list.map(row).join('');
    return big.map(row).join('') + '<details class="frowmore"><summary>' + (small.length === 1 ? L('גורם אחד עם השפעה קטנה (עד 0.1 שנה)') : small.length + L(' גורמים עם השפעה קטנה (עד 0.1 שנה כל אחד)')) + '</summary>' + small.map(row).join('') + '</details>';
  }

  // ---------- סימולטור "מה אם" ----------

  function fieldById(id) {
    for (var i = 0; i < STEPS.length; i++) { var fs = flat(STEPS[i].fields); for (var j = 0; j < fs.length; j++) if (fs[j].id === id) return fs[j]; }
  }

  /** השינויים האפשריים בהרגלים, עם ההשפעה של כל אחד בשנים. מחזיר רשימה ממוינת מהגדול לקטן. */
  function improvements(inp, r) {
    var c = [], bmi = inp.height && inp.weight ? inp.weight / Math.pow(inp.height / 100, 2) : null;
    function add(id, label, over) { c.push({ id: id, label: label, over: over }); }
    if (inp.smoking === 'current') add('smoking', L('להפסיק לעשן'), { smoking: 'former', quitAge: r.age });
    // מותניים בטווח התקין (WHO: פחות מ-94 ס"מ בגברים, 80 בנשים) עם BMI מתחת ל-30 מרמזים על מסת שריר, לא על עודף שומן
    var leanWaist = inp.waist !== undefined && inp.waist < (inp.sex === 'f' ? 80 : 94);
    if (bmi !== null && bmi > 25.5 && !(leanWaist && bmi < 30)) { var w = Math.round(24 * Math.pow(inp.height / 100, 2)); add('bmi', L('לרדת למשקל ') + w + L(' ק"ג (BMI 24)'), { weight: w }); }
    if (bmi !== null && bmi < 18.5) { var w2 = Math.round(20 * Math.pow(inp.height / 100, 2)); add('bmi', L('לעלות למשקל ') + w2 + L(' ק"ג (BMI 20)'), { weight: w2 }); }
    if (inp.activity === 'none' || inp.activity === 'low') add('activity', L('להגיע ל-150–300 דקות פעילות גופנית בשבוע'), { activity: 'rec' });
    else if (inp.activity === 'rec') add('activity', L('להגדיל את הפעילות ל-300–450 דקות בשבוע'), { activity: 'high' });
    if (inp.alcohol === 'mod' || inp.alcohol === 'heavy' || inp.alcohol === 'vheavy') add('alcohol', L('להפחית אלכוהול לעד 7 מנות בשבוע'), { alcohol: 'light' });
    if (inp.sleep === 'short' || inp.sleep === 'long') add('sleep', L('לישון 6 עד 9 שעות בלילה'), { sleep: 'normal' });
    if (inp.fruitveg !== undefined && inp.fruitveg < 5) add('fruitveg', L('לאכול 5 מנות פירות וירקות ביום'), { fruitveg: 5 });
    if (inp.sitting !== undefined && inp.sitting > 5.5) add('sitting', L('להפחית ישיבה ל-4–7 שעות ביום'), { sitting: 5.5 });
    if (inp.lonely === 'yes' || inp.isolated === 'rarely') add('social', L('לחזק קשרים חברתיים'), { lonely: inp.lonely && 'no', isolated: inp.isolated && 'weekly' });
    if (inp.sbp !== undefined && inp.sbp > 122) add('bp', L('להוריד לחץ דם סיסטולי ל-120'), inp.dbp !== undefined ? { sbp: 120, dbp: Math.min(inp.dbp, 80) } : { sbp: 120 });
    if (inp.tc !== undefined && inp.tc > 185) add('chol', L('להוריד כולסטרול כללי ל-180'), { tc: 180 });
    if (inp.vo2max === undefined && (inp.walkPace === 'slow' || inp.walkPace === 'average')) add('walkpace', L('לשפר את הכושר עד הליכה בקצב מהיר'), { walkPace: 'brisk' });
    var g = inp.glucose, h = inp.hba1c;
    if (inp.diabetes !== 'yes' && !(g >= 126) && !(h >= 6.5) && (g >= 100 || h >= 5.7)) {
      add('glucose', L('להחזיר את הסוכר בדם לטווח התקין'), { glucose: g !== undefined ? Math.min(g, 95) : undefined, hba1c: h !== undefined ? Math.min(h, 5.5) : undefined });
    }
    var base = r.personal.expectedAge;
    c.forEach(function (x) { x.gain = LifeModel.estimate(Object.assign({}, inp, x.over)) - base; });
    return c.filter(function (x) { return x.gain >= 0.1; }).sort(function (a, b) { return b.gain - a.gain; });
  }

  // ---------- מדריך: שינה, תזונה ולחץ ----------

  function guideHTML(inp, r) {
    if (typeof GUIDE === 'undefined') return '';
    var standalone = !inp; // דף המדריך העצמאי: בלי נתונים אישיים
    var gain = {}; if (!standalone) improvements(inp, r).forEach(function (x) { gain[x.id] = x.gain; });
    var sleepLbl = { short: L('פחות מ-6 שעות'), normal: L('6 עד 9 שעות'), long: L('מעל 9 שעות') };
    // שורה אישית לכל נושא, ודירוג: מה שרלוונטי לתשובות של המשתמש קודם
    var personal = standalone ? {} : {
      sleep: !inp.sleep ? { rank: 1, text: L('לא הזנת שעות שינה, ולכן הנושא הזה לא נכלל בהערכה שלך.') }
        : gain.sleep ? { rank: 2, text: L('דיווחת על שינה של ') + sleepLbl[inp.sleep] + L('. לפי החישוב, שינה של 6 עד 9 שעות שווה כ-<b class="pos" dir="ltr">') + signed(gain.sleep) + L('</b> שנים.') }
        : { rank: 0, text: L('דיווחת על שינה של ') + sleepLbl[inp.sleep] + L(', בטווח שהחישוב מניח.') },
      nutrition: inp.fruitveg === undefined ? { rank: 1, text: L('לא הזנת צריכת ירקות ופירות, ולכן הנושא הזה לא נכלל בהערכה שלך.') }
        : gain.fruitveg ? { rank: 2, text: L('דיווחת על ') + inp.fruitveg + L(' מנות ירקות ופירות ביום. הגעה לחמש מנות שווה לפי החישוב כ-<b class="pos" dir="ltr">') + signed(gain.fruitveg) + L('</b> שנים.') }
        : { rank: 0, text: L('דיווחת על חמש מנות ירקות ופירות ביום או יותר, וזה כבר המקסימום שהחישוב מביא בחשבון.') },
      stress: { rank: 1, text: L('הנושא הזה לא נכלל בחישוב, ולכן אין כאן הערכה בשנים.') }
    };
    var topics = GUIDE.map(function (g, i) { return { g: g, i: i, rank: (personal[g.id] || { rank: 1 }).rank }; })
      .sort(function (a, b) { return b.rank - a.rank || a.i - b.i; });

    return (standalone ? '' : L('<h3>מדריך: שינה, תזונה ולחץ</h3>')) +
      L('<p class="small muted">מידע כללי על שלושה נושאים שמשפיעים על הבריאות, עם מקורות לקריאה. זה אינו ייעוץ רפואי.') + (standalone ? '' : L(' הנושאים שרלוונטיים לתשובות שלך מופיעים קודם.')) + '</p>' +
      topics.map(function (t, k) {
        var g = t.g, p = personal[g.id];
        return '<details class="gtopic"' + (k === 0 ? ' open' : '') + '><summary>' + esc(g.title) +
          (p && p.rank === 2 ? L(' <span class="chip">כדאי לשים לב</span>') : '') + '</summary>' +
          (p ? '<div class="gpersonal">' + p.text + '</div>' : '') +
          '<p>' + esc(g.lead) + '</p>' +
          '<p class="small muted">' + esc(g.model) + '</p>' +
          '<ol class="gacts">' + g.actions.map(function (a) {
            return '<li><b>' + esc(a.t) + '</b><div>' + esc(a.h) + '</div></li>';
          }).join('') + '</ol>' +
          L('<div class="small"><b>מקורות לקריאה</b> (נפתחים בלשונית חדשה, ויוצאים מהאפליקציה):<ul class="gsrc">') +
          g.sources.map(function (s) { return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener noreferrer">' + esc(s.l) + '</a></li>'; }).join('') +
          '</ul></div></details>';
      }).join('');
  }

  // ---------- תוכנית פעולה: הצעדים הראשונים ----------

  // מתי כדאי לפנות לרופא/ה לפני כל דבר אחר. ספים לפי ההנחיות המקובלות.
  function referrals(inp, r) {
    var out = [], s = inp.sbp, d = inp.dbp, bpTxt = s && d ? s + '/' + d : String(s || d);
    if (s >= 180 || d >= 120) out.push(L('לחץ הדם שהזנת (') + bpTxt + L(') גבוה מאוד. כדאי לפנות לרופא/ה בהקדם.'));
    else if (s >= 140 || d >= 90) out.push(L('לחץ הדם שהזנת (') + bpTxt + L(') בטווח של יתר לחץ דם. כדאי למדוד שוב בבית כמה ימים, ולהראות את התוצאות לרופא/ת המשפחה.'));
    if (inp.diabetes !== 'yes' && (inp.glucose >= 126 || inp.hba1c >= 6.5)) out.push(L('ערך הסוכר שהזנת בטווח של סוכרת. אבחנה דורשת בדיקה חוזרת, ולכן כדאי לפנות לרופא/ת המשפחה.'));
    if (inp.ldl >= 190 || (inp.ldl === undefined && inp.tc >= 300)) out.push(L('ערך הכולסטרול שהזנת גבוה מאוד, ומתאים לבירור של כולסטרול גבוה משפחתי. כדאי לפנות לרופא/ת המשפחה.'));
    if (r.derived.egfr !== undefined && r.derived.egfr < 60) out.push(L('תפקוד הכליות המחושב (eGFR ') + Math.round(r.derived.egfr) + L(') נמוך מ-60. כדאי לחזור על הבדיקה ולהראות אותה לרופא/ה.'));
    if (inp.acr >= 30) out.push(L('יש חלבון בשתן (מעל 30 מ"ג/ג). כדאי לחזור על הבדיקה ולהראות אותה לרופא/ה.'));
    return out;
  }

  // צעד ראשון וקונקרטי לכל שינוי, והמדריך באתר שמרחיב עליו
  var FIRST = {
    smoking: [L('לקבוע תאריך הפסקה בשבועיים הקרובים, ולפנות לרופא/ת המשפחה או לקו לגמילה. טיפול תרופתי ותמיכה מעלים מאוד את סיכויי ההצלחה.'), 'habits'],
    bmi: [L('לרשום שבוע אחד מה אוכלים, בלי לשנות כלום. אחר כך להחליף משקה ממותק או חטיף אחד ביום במשהו פשוט יותר.'), 'nutrition'],
    activity: [L('הליכה מהירה של 30 דקות, חמישה ימים בשבוע. אפשר להתחיל ב-10 דקות אחרי כל ארוחה.'), 'movement'],
    walkpace: [L('בהליכה היומית, להגביר את הקצב עד שקשה לשיר אבל עדיין אפשר לדבר.'), 'movement'],
    alcohol: [L('לקבוע ימים קבועים בשבוע בלי אלכוהול, ולהחליף כוס אחת במים מוגזים.'), 'habits'],
    sleep: [L('שעת קימה קבועה כל יום, גם בסוף השבוע. אם הקושי נמשך, יש טיפול יעיל בלי תרופות (CBT-I).'), 'sleep'],
    fruitveg: [L('להוסיף ירק לכל ארוחה ופרי אחד כנשנוש. זה כבר ארבע מנות ביום.'), 'nutrition'],
    sitting: [L('לקום לשתיים-שלוש דקות כל חצי שעה עד שעה, למשל בכל שיחת טלפון.'), 'movement'],
    social: [L('לקבוע שיחה או מפגש קבועים עם אדם אחד, ביום ובשעה קבועים בשבוע.'), 'social'],
    bp: [L('למדוד לחץ דם בבית כמה ימים, לרשום ולהראות לרופא/ת המשפחה.'), 'numbers'],
    chol: [L('לקבוע תור לרופא/ת המשפחה כדי לדבר על הערכים. בינתיים, להחליף שומן מן החי בשמן זית ואגוזים.'), 'numbers'],
    glucose: [L('לוותר על משקאות ממותקים ולהוסיף הליכה של 10–15 דקות אחרי ארוחות. לחזור על הבדיקה בעוד כמה חודשים.'), 'sugar']
  };

  function planHTML(inp, r) {
    var refs = referrals(inp, r), all = improvements(inp, r);
    // פעילות גופנית היא הדרך המעשית לשפר את קצב ההליכה, ולכן כששניהם ברשימה מציגים רק אותה
    var hasAct = all.some(function (x) { return x.id === 'activity'; });
    var top = all.filter(function (x) { return !(hasAct && x.id === 'walkpace'); }).slice(0, 3);
    var arrow = LANGS[LANG].dir === 'rtl' ? ' ←' : ' →';
    var h = L('<div class="plan"><h3>הצעדים הראשונים שלך</h3>');
    if (refs.length) {
      h += L('<div class="planref"><b>לפני הכול: שווה לדבר עם רופא/ה</b><ul>') + refs.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul></div>';
    }
    if (top.length) {
      h += L('<p class="small muted">שלושת השינויים שהמודל מעריך שישפיעו אצלך הכי הרבה, ולכל אחד צעד ראשון שאפשר להתחיל כבר השבוע.</p><ol class="plansteps">') +
        top.map(function (x) {
          var f = FIRST[x.id] || ['', 'numbers'];
          return '<li><div class="imptop"><span class="implbl">' + esc(x.label) + '</span><b class="pos" dir="ltr">' + signed(x.gain) + L(' שנים</b></div>') +
            (f[0] ? '<div class="planfirst">' + esc(f[0]) + '</div>' : '') +
            '<a class="small" href="' + SiteURL('topic', f[1]) + '">' + L('למדריך המלא ולרשימת הצעדים') + arrow + '</a></li>';
        }).join('') + '</ol>';
    } else {
      h += L('<p>לפי מה שהזנת, ההרגלים שלך כבר בטווח הטוב, ואין שינוי שהמודל מעריך שיוסיף יותר מעשירית שנה. הצעד הבא: לשמור עליהם, ולבדוק את המספרים שלך (לחץ דם, סוכר ושומנים) פעם בשנה.</p>') +
        '<a class="small" href="' + SiteURL('topic', 'numbers') + '">' + L('למדריך: המספרים שלך') + arrow + '</a>';
    }
    return h + '</div>';
  }

  // איורי קו סכמטיים לדוגמאות התרגילים בכרטיס האימונים. דמות מקלות, בלי טקסט בתוך התמונה; הכיתוב נשלף מ-L().
  var EXFIG = {
    sit: '<circle cx="34" cy="20" r="7"/><path d="M34 28V54L52 54V80M34 34L48 44"/><path class="ctx" d="M22 30V56H46M24 56V82M44 56V82"/><circle cx="100" cy="16" r="7"/><path d="M100 24V52L96 82M100 52L104 82M100 30L116 38"/><path class="ctx" d="M62 48H78M73 43L78 48L73 53"/>',
    wall: '<circle cx="94" cy="25" r="7"/><path d="M30 82L90 36M90 36L111 40"/><path class="ctx" d="M114 8V82M10 82H110"/>',
    bridge: '<circle cx="12" cy="71" r="6"/><path d="M20 74L92 36L106 80M22 77L50 78"/><path class="ctx" d="M6 82H118"/>',
    row: '<circle cx="50" cy="28" r="7"/><path d="M50 36V76H100M50 44L38 52L54 58"/><path class="ctx" d="M100 74L54 58" stroke-dasharray="4 4"/><path class="ctx" d="M6 82H118"/>',
    leg: '<circle cx="60" cy="16" r="7"/><path d="M60 24V52L60 82M60 52L76 58L74 74M60 32L98 40"/><path class="ctx" d="M102 28V82"/>',
    heel: '<circle cx="66" cy="16" r="7"/><path d="M66 24V52L52 82M66 52L64 82M66 34L46 38M66 34L86 38M50 82H62M64 82H76"/><path class="ctx" d="M6 82H118"/>'
  };
  var EXIMG = { sit: [455, 560], wall: [560, 533], bridge: [560, 245], row: [560, 398], leg: [492, 560], heel: [499, 560] }; // איורים חדשים (img/ex-*.webp)
  function exFig(key, cap) {
    if (EXIMG[key]) return '<figure class="exfig"><img src="/img/ex-' + key + '.webp" width="' + EXIMG[key][0] + '" height="' + EXIMG[key][1] + '" alt="' + esc(cap) + '" loading="lazy"><figcaption>' + esc(cap) + '</figcaption></figure>';
    return '<figure class="exfig"><svg viewBox="0 0 120 90" role="img" aria-label="' + esc(cap) + '" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">' + EXFIG[key] + '</svg><figcaption>' + esc(cap) + '</figcaption></figure>';
  }

  // נקודת התחלה לאימונים לפי גיל ורמת הפעילות שהוזנה. הכמויות (150–300 דקות, שני ימי כוח, איזון וכוח בשלושה ימים מגיל 65)
  // הן של WHO 2020 (Bull); דוגמאות התרגילים הן הצעות כלליות. בכוונה לא תכנית אישית ולא ייעוץ רפואי.
  function trainingHTML(inp) {
    var a = inp.age, act = inp.activity, old = a >= 65, meds = data.meds || [];
    var chronic = inp.diabetes === 'yes' || meds.indexOf('bp') >= 0 || inp.sbp >= 140 || inp.dbp >= 90;
    var arrow = LANGS[LANG].dir === 'rtl' ? ' ←' : ' →';
    var li = function (t) { return '<li>' + esc(t) + '</li>'; };
    var aer = act === 'high' || act === 'vhigh'
      ? L('אירובי: הנפח שלך כבר מעל המינימום המומלץ. אין צורך להגדיל אותו, ועדיף לשים לב לשני הסעיפים הבאים.')
      : act === 'rec'
        ? L('אירובי: להמשיך ב-150–300 דקות בשבוע של פעילות בעצימות בינונית, למשל הליכה מהירה חמישה ימים בשבוע.')
        : L('אירובי: להתחיל בשלוש הליכות של 10–15 דקות בשבוע, ולהוסיף כמה דקות מדי שבוע או שבועיים, עד 150 דקות בשבוע בעצימות בינונית.');
    var items = [aer,
      L('כוח: לפחות שני ימים בשבוע, לכל קבוצות השרירים הגדולות, בעצימות בינונית ומעלה. אפשר גם בלי משקולות: קימה וישיבה מכיסא, שכיבות סמיכה על קיר או שולחן, גשר עכוז, חתירה עם גומיית התנגדות.')];
    if (old) items.push(L('איזון: מגיל 65 כדאי לשלב פעילות מגוונת שמדגישה איזון וכוח, בשלושה ימים בשבוע לפחות. למשל עמידה על רגל אחת ליד משענת, הליכה עקב-אגודל, וקימה מכיסא בלי עזרת הידיים.'));
    return L('<div class="tests train"><h3>נקודת התחלה לאימונים</h3><p class="small muted">לפי הגיל והפעילות שהזנת. הכמויות הן של ארגון הבריאות העולמי (2020); הדוגמאות הן הצעות כלליות, לא תכנית אישית.</p><ul>') +
      items.map(li).join('') + '</ul>' +
      '<details class="exfigs"><summary>' + L('איורים לדוגמאות') + '</summary><div class="exgrid">' +
        exFig('sit', L('קימה וישיבה מכיסא')) + exFig('wall', L('שכיבות סמיכה על קיר')) + exFig('bridge', L('גשר עכוז')) + exFig('row', L('חתירה עם גומיית התנגדות')) +
        (old ? exFig('leg', L('עמידה על רגל אחת ליד משענת')) + exFig('heel', L('הליכה עקב-אגודל')) : '') +
        '</div>' + L('<p class="small muted">איורים סכמטיים, לא הדרכה לביצוע. אם משהו לא ברור או כואב, שווה לשאול מאמן/ת או פיזיותרפיסט/ית.</p>') + '</details>' +
      (chronic ? L('<p class="small">יש לך מצב כרוני (סוכרת או לחץ דם), ולכן כדאי לשאול את הרופא/ה איזו עצימות מתאימה לך לפני שמגבירים.</p>') : '') +
      L('<p class="small muted">כאב בחזה, סחרחורת או קוצר נשימה חריג באמצע מאמץ הם סימן לעצור ולפנות לרופא/ה. זה מידע כללי ולא ייעוץ רפואי.</p>') +
      '<a class="small" href="' + SiteURL('topic', 'movement') + '">' + L('למדריך: תנועה וכושר') + arrow + '</a></div>';
  }

  // בדיקות ששווה לשאול עליהן את הרופא/ה: רק מה שחסר ומתאים לגיל ולמה שהוזן, לפי ההנחיות המקובלות
  // (USPSTF, ESC/EAS, ADA). בכוונה בלי בדיקות שאין לגביהן המלצה לכלל האוכלוסייה.
  function testsHTML(inp) {
    var a = inp.age, fem = inp.sex === 'f', meds = data.meds || [], labs = [], screen = [];
    var bmi = inp.height && inp.weight ? inp.weight / Math.pow(inp.height / 100, 2) : null;
    var dm = inp.diabetes === 'yes', htn = meds.indexOf('bp') >= 0 || inp.sbp >= 140 || inp.dbp >= 90;
    if (inp.sbp === undefined && meds.indexOf('bp') < 0) labs.push(L('מדידת לחץ דם: לא הזנת ערך. כדאי למדוד לפחות פעם בשנה מגיל 40, ופעם בכמה שנים לפני כן.'));
    if (inp.tc === undefined && inp.ldl === undefined && (a >= 40 || inp.famHeart === 'yes')) labs.push(L('פרופיל שומנים (כולסטרול, LDL, HDL וטריגליצרידים): בדיקה שגרתית מגיל 40, ומוקדם יותר כשיש היסטוריה משפחתית. היא גם מדייקת את ההערכה כאן.'));
    if (dm) { if (inp.hba1c === undefined) labs.push(L('HbA1c: למי שיש סוכרת, בדרך כלל כל שלושה עד שישה חודשים.')); }
    else if (inp.glucose === undefined && inp.hba1c === undefined && (a >= 35 || (bmi !== null && bmi >= 25))) labs.push(L('סוכר בצום או HbA1c: לגילוי טרום-סוכרת, שלב שבו עוד אפשר לעצור את ההתפתחות לסוכרת.'));
    if ((dm || htn) && (inp.creatinine === undefined || inp.acr === undefined)) labs.push(L('תפקוד כליות (קריאטינין) וחלבון בשתן (יחס אלבומין לקריאטינין): מומלץ פעם בשנה למי שיש סוכרת או יתר לחץ דם.'));
    if (inp.lpa === undefined) labs.push(L('Lp(a), פעם אחת בחיים: ערך שנקבע בעיקר גנטית ולא משתנה, ורוב האנשים מעולם לא בדקו אותו. ההנחיות האירופיות ממליצות לבדוק אותו פעם אחת.'));
    if (a >= 45 && a <= 75) screen.push(L('סקר לסרטן המעי הגס: בגילים 45–75 (בחלק מהמדינות מגיל 50), בדיקת דם סמוי בצואה או קולונוסקופיה.'));
    if (fem && a >= 40 && a <= 74) screen.push(L('ממוגרפיה: לנשים בגילים 40–74 (בחלק מהמדינות מגיל 50), כל שנה עד שנתיים.'));
    if (fem && a >= 25 && a <= 65) screen.push(L('סקר לסרטן צוואר הרחם (בדיקת HPV או פאפ): לנשים בגילים 25–65 בערך, לפי ההנחיות במדינה.'));
    if ((inp.smoking === 'current' || (inp.smoking === 'former' && !(inp.quitAge < a - 15))) && a >= 50 && a <= 80) screen.push(L('CT במינון נמוך לסרטן ריאה: לפי העישון והגיל שהזנת (בגילים 50–80, בהווה או ב-15 השנים האחרונות). ההנחיות מיועדות למי שעישן הרבה לאורך שנים, וכמות העישון לא נשאלת כאן, ולכן כדאי לברר עם הרופא/ה אם זה מתאים לך.'));
    if (!labs.length && !screen.length) return '';
    var li = function (t) { return '<li>' + esc(t) + '</li>'; };
    return L('<div class="tests"><h3>בדיקות שכדאי להעלות מול הרופא/ה</h3><p class="small muted">לפי הגיל שלך ומה שהזנת. ההנחיות משתנות בין מדינות, וזו רשימה לשיחה עם הרופא/ה, לא הפניה.</p>') +
      (labs.length ? L('<h4>בדיקות דם ומדידות</h4>') + '<ul>' + labs.map(li).join('') + '</ul>' : '') +
      (screen.length ? L('<h4>גילוי מוקדם של סרטן</h4>') + '<ul>' + screen.map(li).join('') + '</ul>' : '') +
      L('<p class="small muted">בכוונה לא כללנו בדיקות שאין לגביהן המלצה לכלל האוכלוסייה, כמו ויטמין D או טסטוסטרון.</p></div>');
  }

  // ---------- דוח הכנה לרופא/ה: דף להדפסה, בלי תוחלת חיים, רק מה שהוזן ומה כדאי לשאול ----------

  function doctorReport(inp, r) {
    var rows = [];
    function add(label, val) { if (val !== undefined && val !== '') rows.push('<tr><td>' + esc(label) + '</td><td dir="auto">' + esc(val) + '</td></tr>'); }
    function numRow(id) { var f = F(id); if (inp[id] !== undefined && f) add(f.label, dec(String(inp[id])) + ' ' + (f.unit || '')); }
    var bmi = inp.height && inp.weight ? inp.weight / Math.pow(inp.height / 100, 2) : null;
    add(L('גיל'), String(inp.age));
    add(L('מין'), inp.sex === 'f' ? L('אישה') : L('גבר'));
    if (bmi !== null) add('BMI', fmt(bmi) + ' (' + inp.weight + ' ' + L('ק"ג') + ', ' + inp.height + ' ' + L('ס"מ') + ')');
    numRow('waist');
    if (inp.sbp !== undefined || inp.dbp !== undefined) add(L('לחץ דם'), (inp.sbp || '?') + '/' + (inp.dbp || '?') + ' ' + L('ממ"כ'));
    ['tc', 'ldl', 'hdl', 'tg', 'glucose', 'hba1c', 'creatinine'].forEach(numRow);
    if (r.derived.egfr !== undefined) add(L('eGFR (מחושב מהקריאטינין)'), String(Math.round(r.derived.egfr)));
    ['acr', 'crp', 'lpa', 'rhr'].forEach(numRow);
    if (inp.diabetes === 'yes') add(L('סוכרת'), L('כן'));
    if (inp.smoking) { var so = F('smoking').options.filter(function (o) { return o[0] === inp.smoking; })[0]; if (so) add(L('עישון'), so[1]); }
    var cf = F('conditions'), cs = (inp.conditions || []).map(function (c) { var o = cf.options.filter(function (x) { return x[0] === c; })[0]; return o ? o[1] : c; });
    if (cs.length) add(L('מחלות שאובחנו'), cs.join(', '));
    var mf = F('meds'), ms = ((data.meds) || []).map(function (c) { var o = mf.options.filter(function (x) { return x[0] === c; })[0]; return o ? o[1] : c; });
    if (ms.length) add(L('תרופות קבועות'), ms.join(', '));
    if (inp.famHeart === 'yes') add(L('היסטוריה משפחתית'), L('התקף לב או אירוע מוחי בגיל צעיר אצל הורה'));
    var refs = referrals(inp, r);
    var li = function (t) { return '<li>' + esc(t) + '</li>'; };
    var blank = '<div class="docline"></div><div class="docline"></div><div class="docline"></div><div class="docline"></div>';
    return '<div class="card docreport">' +
      L('<h2>דוח הכנה לפגישה עם הרופא/ה</h2>') +
      '<p class="small muted">' + new Date().toLocaleDateString(LANGS[LANG].locale) + ' · myyearsleft.com</p>' +
      L('<p class="small muted">הנתונים הוזנו על ידי המשתמש/ת ולא אומתו. זה אינו אבחנה רפואית, אלא דף להכנת השיחה. הוא נוצר בדפדפן שלך בלבד.</p>') +
      L('<h3>הנתונים שהזנתי</h3>') + '<table class="doctable">' + rows.join('') + '</table>' +
      L('<h3>ערכים שכדאי לדון בהם</h3>') +
      (refs.length ? '<ul>' + refs.map(li).join('') + '</ul>' : L('<p class="small">לא זוהו ערכים חריגים לפי ספי ההפניה הרגילים, על סמך מה שהוזן.</p>')) +
      testsHTML(inp) +
      L('<h3>השאלות שלי</h3>') + blank +
      L('<h3>הערות מהפגישה</h3>') + blank +
      L('<div class="nav"><button id="docback">חזרה לתוצאות</button><button class="primary" id="docprint">הדפסה / שמירה כ-PDF</button></div>') +
      '</div>';
  }

  // ---------- שיתוף התוצאה: כרטיס תמונה בלי שום נתון בריאות, רק המספר ----------

  function shareGain(inp, r) {
    var all = improvements(inp, r);
    if (!all.length) return 0;
    var x = Object.assign.apply(null, [{}, inp].concat(all.map(function (i) { return i.over; })));
    return Math.max(0, LifeModel.estimate(x) - LifeModel.estimate(inp));
  }

  function drawShare(age, gain) {
    var W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
    var g = c.getContext('2d'), rtl = LANGS[LANG].dir === 'rtl', sx = rtl ? 230 : W - 230;
    var bg = g.createLinearGradient(0, 0, 0, H); bg.addColorStop(0, '#fde7c8'); bg.addColorStop(0.7, '#f7f1e6'); g.fillStyle = bg; g.fillRect(0, 0, W, H);
    g.fillStyle = '#ffd27a'; g.beginPath(); g.arc(sx, 230, 120, 0, 7); g.fill();
    g.fillStyle = '#f39a4a'; g.beginPath(); g.arc(sx, 230, 86, 0, 7); g.fill();
    [['#9fcfc6', 760, 700, 780], ['#4e9f97', 830, 790, 850], ['#0e6b68', 890, 870, 905]].forEach(function (h) {
      g.fillStyle = h[0]; g.beginPath(); g.moveTo(0, h[1]); g.bezierCurveTo(300, h[2], 700, h[3] + 40, W, h[2]); g.lineTo(W, H); g.lineTo(0, H); g.fill();
    });
    g.direction = rtl ? 'rtl' : 'ltr'; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    function txt(t, font, color, y) { g.font = font; g.fillStyle = color; g.fillText(t, W / 2, y, W - 120); }
    txt(L('אופק'), '700 44px Rubik, Heebo, sans-serif', '#0e6b68', 120);
    txt(L('תוחלת החיים המשוערת שלי'), '500 48px Heebo, sans-serif', '#3a4a4e', 420);
    txt(fmt(age), '700 230px Rubik, Heebo, sans-serif', '#1c2a2e', 630);
    txt(gain >= 0.3 ? L('ואפשר להוסיף לה עוד כ-') + fmt(gain) + L(' שנים') : L('וההרגלים שלי כבר בטווח הטוב'), '500 46px Heebo, sans-serif', '#2c7a57', 705);
    txt(L('ומה איתך? בדיקה של דקה'), '500 40px Heebo, sans-serif', '#ffffff', 965);
    g.direction = 'ltr'; txt('myyearsleft.com', '700 54px Rubik, sans-serif', '#ffffff', 1035);
    return c;
  }

  function wireShare(inp, r) {
    var btn = document.getElementById('share'); if (!btn) return;
    btn.onclick = function () {
      var age = r.personal.expectedAge, gain = shareGain(inp, r);
      var url = new URL(SiteURL('calc'), location.href).href;
      var text = L('לפי המחשבון, תוחלת החיים המשוערת שלי היא ') + fmt(age) + L('. ומה איתך?');
      var fontsReady = document.fonts && document.fonts.load ? Promise.all(['700 230px Rubik', '500 48px Heebo']
        .map(function (f) { return document.fonts.load(f); })).catch(function () {}) : Promise.resolve();
      fontsReady.then(function () {
        drawShare(age, gain).toBlob(function (blob) {
          var file = new File([blob], 'myyearsleft.png', { type: 'image/png' });
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            navigator.share({ files: [file], text: text + ' ' + url }).catch(function () {});
            return;
          }
          var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'myyearsleft.png'; a.click();
          setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
          var st = document.getElementById('sharestat');
          var done = function () { if (st) st.textContent = L('התמונה נשמרה והטקסט עם הקישור הועתק. אפשר להדביק אותם בכל מקום.'); };
          if (navigator.clipboard) navigator.clipboard.writeText(text + ' ' + url).then(done, done); else done();
        }, 'image/png');
      });
    };
  }

  function refineHTML() {
    if (mode !== 'quick') return '';
    return L('<div class="refine"><div><b>ההערכה מבוססת על השאלות העיקריות.</b> <span class="small muted">היסטוריה משפחתית, הרגלים נוספים ובדיקות דם ידייקו אותה ויצמצמו את הטווח.</span></div><button type="button" id="refine">לדייק את ההערכה</button></div>');
  }

  function improveHTML(inp, r) {
    var list = improvements(inp, r);
    var head = L('<h3>איך אפשר לשפר את ההערכה</h3>');
    if (!list.length) {
      return head + L('<p class="muted">לפי הנתונים שהזנת, אין שינוי בהרגלים שהמודל מעריך שיוסיף יותר מעשירית שנה. אפשר לבדוק תרחישים בעצמך בסרגלים שלמטה.</p>');
    }
    var all = {}; list.forEach(function (x) { Object.assign(all, x.over); });
    var total = LifeModel.estimate(Object.assign({}, inp, all)), max = list[0].gain;
    return head + L('<p class="small muted">השינויים שהמודל מעריך שישפיעו הכי הרבה, מהגדול לקטן. כל שורה מחושבת בנפרד, כשכל השאר נשאר כמו שהוא.') + L(' המספרים מבוססים על קשרים סטטיסטיים, ואינם מבטיחים שהשינוי יניב את מלוא ההפרש.</p>') +
      list.map(function (x) {
        return '<div class="imp"><div class="imptop"><span class="implbl">' + esc(x.label) + '</span><b class="pos" dir="ltr">' + signed(x.gain) + L(' שנים</b></div>') +
          '<div class="impbar"><div style="width:' + (x.gain / max * 100).toFixed(1) + '%"></div></div>' +
          (TIPS[x.id] ? '<div class="small muted">' + esc(TIPS[x.id]) + '</div>' : '') + '</div>';
      }).join('') +
      (list.length > 1 ? L('<div class="impall"><div>כל השינויים יחד: <b class="pos" dir="ltr">') + signed(total - r.personal.expectedAge) + L(' שנים</b>, עד גיל <b>') + fmt(total) + '</b>' +
        L('<div class="small muted">הסכום קטן מחיבור השורות, כי ההשפעות חופפות זו לזו.</div></div><button type="button" id="simAll">הצגה בסרגלים</button></div>') : '') +
      L('<p class="small muted">אלה קשרים סטטיסטיים ממחקרי תצפית. הם מראים שאנשים עם ההרגלים האלה חיים בממוצע יותר, לא שהשינוי מבטיח את התוספת לאדם מסוים.</p>');
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
        (cur ? '' : L('<option value="">לא צוין</option>')) +
        o.map(function (x) { return '<option value="' + x[0] + '"' + (x[0] === cur ? ' selected' : '') + '>' + esc(x[1]) + '</option>'; }).join('') +
        '</select></div>';
    }
    function range(id, label, min, max, val, unit) {
      return '<div class="simrow"><label for="s_' + id + '">' + esc(label) + '</label><div class="rng"><input type="range" id="s_' + id + '" data-sim="' + id +
        '" min="' + min + '" max="' + max + '" step="1" value="' + val + '"><output id="o_' + id + '" dir="ltr"></output><span>' + esc(unit) + '</span></div></div>';
    }
    var rows = '';
    if (inp.smoking === 'current') rows += L('<div class="simrow"><label for="s_quit">עישון</label><select id="s_quit" data-sim="quit"><option value="">ממשיך/ה לעשן</option><option value="1">מפסיק/ה לעשן עכשיו</option></select></div>');
    if (inp.height && inp.weight) rows += range('weight', L('משקל'), Math.max(35, Math.round(inp.weight - 50)), Math.round(inp.weight + 30), Math.round(inp.weight), L('ק"ג'));
    rows += sel('activity', L('פעילות גופנית בשבוע')) + sel('alcohol', L('אלכוהול בשבוע')) + sel('fruitveg', L('פירות וירקות ביום')) + sel('sitting', L('שעות ישיבה ביום')) + sel('sleep', L('שעות שינה')) + sel('isolated', L('מפגשים חברתיים')) + sel('lonely', L('תחושת בדידות תכופה')) + (inp.vo2max ? '' : sel('walkPace', L('קצב הליכה')));
    if (inp.sbp) rows += range('sbp', L('לחץ דם סיסטולי'), 100, 200, Math.round(inp.sbp), L('ממ"כ'));
    if (inp.tc) rows += range('tc', L('כולסטרול כללי'), 120, 350, Math.round(inp.tc), L('מ"ג/ד"ל'));
    return L('<h3>נסו בעצמכם</h3><p class="small muted">הזיזו את הסרגלים וראו מיד איך כל שינוי משפיע על תוחלת החיים.</p>') +
      L('<div class="sim" id="simBox"><div class="simout" aria-live="polite"><div><span class="muted small">תוחלת החיים בתרחיש זה</span><b id="simAge">') + fmt(r.personal.expectedAge) + '</b></div>' +
      L('<div id="simDelta" class="simdelta">ללא שינוי</div></div>') + rows + '<p class="small muted" id="simFloor" hidden></p>' +
      (LifeModel.limitsOf(inp).lower ? L('<button type="button" id="simWorse">מה אם ההרגלים יחמירו? (צעד אחד לרעה בכל גורם)</button> ') : '') +
      L('<button type="button" id="simReset">איפוס</button></div>');
  }

  function wireSim(inp, r) {
    var ctrls = app.querySelectorAll('[data-sim]'), uBase = LifeModel.estimateUncapped(inp);
    function optsOf(id) { return fieldById(id).options.filter(function (o) { return o[0] !== ''; }); }
    function update() {
      var x = Object.assign({}, inp);
      ctrls.forEach(function (c) {
        var id = c.dataset.sim, v = c.value, o = document.getElementById('o_' + id);
        if (c.dataset.ord) { var op = optsOf(id)[+v]; v = op[0]; o.textContent = op[1]; }
        if (c.type === 'range' && !c.dataset.ord) {
          x[id] = Number(v);
          o.textContent = id === 'weight' ? v + ' (BMI ' + dec((v / Math.pow(inp.height / 100, 2)).toFixed(1)) + ')' : v;
        } else if (id === 'quit') { if (v) { x.smoking = 'former'; x.quitAge = r.age; } }
        else if (id === 'fruitveg' || id === 'sitting') x[id] = v === '' ? undefined : Number(v);
        else x[id] = v || undefined;
      });
      var e = LifeModel.estimate(x), d = e - r.personal.expectedAge;
      var fl = document.getElementById('simFloor'), lim = LifeModel.limitsOf(x);
      fl.hidden = !lim.lower;
      if (lim.lower) {
        var u = LifeModel.estimateUncapped(x), du = u - uBase;
        fl.innerHTML = esc(L('שימו לב: הגורמים שהזנת טובים במיוחד, והמודל מגביל את היחס המשולב לרצפה (0.4, הנחה שלנו שנתמכת בנתוני NHANES). לכן שינויים בסרגלים משפיעים כאן פחות מהרגיל, ואל תסיקו מכך שהם לא חשובים.')) + ' ' +
          esc(L('בלי הרצפה (תיאורטי ולא מכויל, רק להמחשת הכיוון) השינוי היה')) + ' <b dir="ltr">' + signed(du) + '</b> ' + esc(L('שנים.'));
      }
      document.getElementById('simAge').textContent = fmt(e);
      var el = document.getElementById('simDelta');
      if (Math.abs(d) < 0.05) { el.className = 'simdelta'; el.textContent = L('ללא שינוי'); }
      else { el.className = 'simdelta ' + (d > 0 ? 'pos' : 'neg'); el.innerHTML = '<b dir="ltr">' + signed(d) + L('</b> שנים לעומת ההערכה שלך'); }
    }
    ctrls.forEach(function (c) { c.addEventListener(c.type === 'range' ? 'input' : 'change', update); });
    document.getElementById('simReset').onclick = function () {
      ctrls.forEach(function (c) { c.value = c.type === 'range' ? c.defaultValue : (c.querySelector('[selected]') || c.options[0]).value; });
      update();
    };
    // "מה אם ההרגלים יחמירו": מי שנמצא על הרצפה לא רואה תגובה לשיפור, אז מזיזים כל גורם צעד אחד לרעה (לפי המודל, בלי הרצפה)
    var worseBtn = document.getElementById('simWorse');
    if (worseBtn) worseBtn.onclick = function () {
      ctrls.forEach(function (c) {
        var id = c.dataset.sim;
        if (id === 'quit' || (c.type === 'range' && !c.dataset.ord)) return;
        var os = optsOf(id).map(function (o) { return o[0]; }), cur = c.dataset.ord ? os[+c.value] : c.value, scored = [];
        os.forEach(function (v) {
          var y = Object.assign({}, inp);
          y[id] = (id === 'fruitveg' || id === 'sitting') ? Number(v) : v;
          scored.push({ v: v, e: LifeModel.estimateUncapped(y) });
        });
        scored.sort(function (a, b) { return b.e - a.e; });
        var i = -1; scored.forEach(function (o, k) { if (o.v === String(cur)) i = k; });
        if (i < 0) i = 0;
        var nxt = scored[Math.min(i + 1, scored.length - 1)].v;
        c.value = c.dataset.ord ? os.indexOf(nxt) : nxt;
      });
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
    smoking: L('הפסקת עישון היא השינוי היחיד בעל ההשפעה הגדולה ביותר. לפי Jha 2013, מי שמפסיק לפני גיל 40 נמנע מכ-90% מעודף הסיכון.'),
    bmi: L('ירידה לכיוון טווח BMI של 20–25 קשורה בתמותה נמוכה יותר.'),
    activity: L('גם מעט פעילות עוזר: לפי Arem 2015, פחות מ-150 דקות בשבוע כבר קשורות בירידה של כ-20% בסיכון לעומת חוסר פעילות.'),
    alcohol: L('לפי Wood 2018, הסיכון הנמוך ביותר הוא בצריכה של עד כ-100 גרם אלכוהול בשבוע (כ-7 מנות).'),
    sleep: L('שינה קצרה מאוד או ארוכה מאוד קשורה בתמותה גבוהה יותר; לעיתים היא סימן לבעיה אחרת ששווה לבדוק.'),
    fruitveg: L('כל מנה נוספת של פירות וירקות ביום, עד חמש, קשורה בירידה של כ-5% בסיכון.'),
    bp: L('לחץ דם גבוה ניתן לטיפול יעיל. שווה למדוד שוב ולדבר עם רופא/ת המשפחה.'),
    chol: L('ערכי כולסטרול גבוהים ניתנים לאיזון בתזונה ובטיפול. שווה להתייעץ עם רופא/ת המשפחה.'),
    sitting: L('ישיבה ממושכת קשורה בתמותה גבוהה יותר, בעיקר מעל 7 שעות ביום. פעילות גופנית מקזזת חלק מההשפעה.'),
    social: L('קשרים חברתיים הם גורם בריאותי של ממש, בסדר גודל דומה לגורמי סיכון מוכרים אחרים.'),
    walkpace: L('קצב הליכה הוא בעיקר מדד לכושר. הוא משתפר עם פעילות אירובית קבועה, כמו הליכה מהירה, אופניים או שחייה.'),
    glucose: L('סוכר בטווח שבין התקין לסוכרת. בניסוי DPP, ירידה קטנה במשקל ופעילות קבועה הפחיתו ב-58% את המעבר לסוכרת.')
  };

  function bioAgeHTML(r) {
    var ph = r.derived.phenoAge; if (ph === undefined) return '';
    var d = ph - r.age;
    var txt = Math.abs(d) < 0.5 ? L('זהה כמעט לגילך בפועל')
      : '<b class="' + (d < 0 ? 'pos' : 'neg') + '">' + (d < 0 ? L('צעיר') : L('מבוגר')) + L(' ב-') + dec(Math.abs(d).toFixed(1)) + L(' שנים</b> מגילך בפועל (') + r.age + ')';
    return L('<div class="bioage"><div><div class="muted small">הגיל הביולוגי שלך</div><div class="bionum">') + dec(ph.toFixed(1)) + '</div></div>' +
      '<div class="biotxt">' + txt + L('<div class="small muted">מחושב מתשעה ערכים בבדיקות הדם לפי נוסחת Phenotypic Age (Levine 2018). אנשים בריאים מקבלים לעיתים קרובות גיל ביולוגי נמוך בכמה שנים מגילם.</div></div></div>');
  }

  function buildNotes(r) {
    var n = r.notes.slice();
    var flagged = flaggedInputs();
    if (flagged.length) n.unshift(L('ערכים חריגים שכדאי לוודא שהוזנו נכון: ') + flagged.join(', ') + L('. אם יש טעות, אפשר לתקן ב"עריכת הנתונים".'));
    var h = data.hered || [], o = data.origin || [];
    var cnd = data.conditions || [], meds = data.meds || [];
    if (cnd.indexOf('cancer') >= 0 || cnd.indexOf('copd') >= 0 || cnd.indexOf('other') >= 0) n.unshift(L('ציינת סרטן, מחלת ריאות כרונית או מחלה קשה אחרת. אלה לא נכללו במספר: ההשפעה שלהן תלויה מאוד בסוג, בשלב ובטיפול, והמודל בנוי על האוכלוסייה הכללית. לכן ההערכה כאן כנראה אופטימית מדי עבורך, והרופא/ה המטפל/ת הוא הכתובת.'));
    if (cnd.indexOf('mi') >= 0 || cnd.indexOf('stroke') >= 0) n.push(L('התקף לב ואירוע מוחי נכללו במספר לפי ממוצע של כל מי שעבר אירוע כזה (ERFC 2015). המצב האישי, הזמן שעבר מאז והטיפול יכולים לשנות את התמונה במידה רבה.'));
    if (meds.indexOf('bp') >= 0 && r.contributions.some(function (c) { return c.id === 'bp'; })) n.push(L('לחץ הדם שהזנת נמדד תחת טיפול תרופתי. המודל משתמש בערך הנמדד; מי שמאוזן בעזרת תרופות נמצא בדרך כלל בסיכון מעט גבוה יותר ממי שיש לו אותו ערך ללא טיפול.'));
    if (meds.indexOf('statin') >= 0 && r.contributions.some(function (c) { return c.id === 'chol'; })) n.push(L('ערכי הכולסטרול שהזנת נמדדו תחת טיפול בסטטינים, והמודל משתמש בערך הנמדד.'));
    var hN = num(data.height), wN = num(data.weight), wa = num(data.waist), bmiN = hN && wN ? wN / Math.pow(hN / 100, 2) : null;
    if (bmiN !== null && bmiN > 25 && bmiN < 30 && wa !== undefined && wa < (data.sex === 'f' ? 80 : 94)) n.push(L('ה-BMI שלך מעל 25, אבל היקף המותניים בטווח התקין. זה מתאים יותר למסת שריר מאשר לעודף שומן, ולכן לא מוצגת המלצה לרדת במשקל. היקף המותניים כבר מקזז חלק מההשפעה של ה-BMI בחישוב.'));
    if (r.limits && r.limits.upper) n.push(L('השילוב שהזנת מגיע לגבול העליון של המודל, ולכן ההערכה פחות בטוחה. כדאי לדבר על כך עם רופא/ה.'));
    // הודעת רצפה הוסרה (20.11.2026): הרצפה 0.40 נפגשת כבר אצל לא-מעשן בכושר טוב, והיא לא מכוילת. הדגל limits.lower נשאר ב-compute למידע.
    if (staleLabs.length && r.derived.phenoAge === undefined) {
      n.push(L('הגיל הביולוגי לא חושב, כי הערכים שהועלו אינם מאותה תקופה (חלון של 12 חודשים). ערכים ישנים: ') + staleLabs.map(function (x) {
        var T = LabParser.TESTS.filter(function (t) { return t.id === x.id; })[0];
        return (T ? T.label : x.id) + ' (' + heDate(x.date) + ')';
      }).join(', ') + L('. אפשר להזין ערך עדכני ידנית בשדה המתאים, או להעלות בדיקה חדשה.'));
    }
        if (r.derived.phenoMissing) n.push(L('כדי לחשב גיל ביולוגי חסרים עוד: ') + r.derived.phenoMissing.join(', ') + '.');
    if (r.derived.phenoAge !== undefined) n.push(L('כשמחושב גיל ביולוגי, CRP ותפקוד הכליות כבר כלולים בו, ולכן הם לא מופיעים כגורמים נפרדים.'));
    if (r.derived.egfr !== undefined && r.derived.egfr < 60) n.push(L('ה-eGFR המחושב מהקריאטינין שלך (') + Math.round(r.derived.egfr) + L(') נמוך מ-60. תוצאה בודדת אינה אבחנה, אבל כדאי להראות אותה לרופא/ה.'));
    if (r.derived.cholRatio !== undefined) n.push(L('יחס כולסטרול כללי ל-HDL שלך: ') + fmt(r.derived.cholRatio) + L('. לפי Prospective Studies Collaboration, היחס הזה הוא המנבא הטוב ביותר מבין מדדי הכולסטרול לתמותה ממחלת לב.'));
    if (h.indexOf('breast') >= 0 || h.indexOf('colon') >= 0) n.push(L('סיפור משפחתי של סרטן שד, שחלה או מעי גס לא נכלל במספר, אבל הוא סיבה טובה לשאול רופא/ה על בדיקות סקר מוקדמות ועל ייעוץ גנטי.'));
    if (h.indexOf('fh') >= 0) n.push(L('כולסטרול גבוה משפחתי (FH) הוא מצב תורשתי שמעלה מאוד את הסיכון למחלת לב מוקדמת, והוא ניתן לטיפול. אם לא נבדקת, שווה לבדוק.'));
    if (h.indexOf('t2d') >= 0 || h.indexOf('alz') >= 0) n.push(L('סוכרת סוג 2 ואלצהיימר במשפחה מעלים את הסיכון האישי למחלות אלה, אך לא מצאתי להם יחס סיכונים מבוסס לתמותה כללית, ולכן הם לא נכללו במספר.'));
    if (o.length) {
      n.push(L('מוצא: המוצא לא שינה את המספר. ההבדלים בתוחלת החיים בין קבוצות מוצא נובעים בעיקר ממדינת המגורים, מהשכלה ומאורח חיים, שכבר נכללים בחישוב, ואין יחס סיכונים עצמאי ומבוסס למוצא עצמו.'));
      if (o.indexOf('ashk') >= 0) n.push(L('בקרב יהודים אשכנזים, כ-1 מכל 40 נושא/ת מוטציה בגנים BRCA1/2, שמעלה את הסיכון לסרטן שד, שחלה וערמונית. אפשר לשאול את רופא/ת המשפחה על בדיקה גנטית.'));
    }
    return n;
  }

  function renderResult() {
    var inp = collect(), r = LifeModel.compute(inp);
    var p = r.personal, b = r.baseline, diff = p.expectedAge - b.expectedAge;
    var year = new Date().getFullYear() + Math.round(p.remaining);
    var who = (inp.sex === 'f' ? L('אישה בת ') : L('גבר בן ')) + r.age + L(' ב') + LIFE_TABLES[inp.country].name;
    var deltaTxt = Math.abs(diff) < 0.05 ? L('זהה לממוצע של ') + who + ' (' + fmt(b.expectedAge) + ')'
      : '<b class="' + (diff > 0 ? 'pos' : 'neg') + '" dir="ltr">' + signed(diff) + L('</b> שנים לעומת הממוצע של ') + who + ' (' + fmt(b.expectedAge) + ')';
    var tips = r.contributions.filter(function (c) { return c.years < -0.3 && TIPS[c.id]; }).reverse().map(function (c) { return TIPS[c.id]; });
    var notes = buildNotes(r);
    function pct(x) { return x < 0.005 ? L('פחות מ-1%') : Math.round(x * 100) + '%'; }
    var stats = [80, 90, 100].filter(function (t) { return t > r.age; }).map(function (t) {
      return '<div class="stat"><b>' + pct(p['reach' + t]) + L('</b><span>סיכוי להגיע לגיל ') + t + '</span></div>';
    }).join('');

    app.innerHTML = '<div class="card">' +
      L('<div class="hero"><div class="muted">תוחלת החיים המשוערת שלך</div><div class="big">') + fmt(p.expectedAge) + '</div>' +
      L('<div class="sub">עוד כ-') + Math.round(p.remaining) + L(' שנים, עד סביבות שנת ') + year + '</div>' +
      '<div class="delta">' + deltaTxt + '</div>' +
      L('<div class="sub" style="margin-top:6px">חצי מהאנשים עם נתונים כמו שלך חיים עד גיל שבין <b>') + Math.round(p.p25) + L(' ל-') + Math.round(p.p75) + '</b></div>' +
      L('<div class="sharerow"><button type="button" class="sharebtn" id="share">שיתוף התוצאה</button><span class="small muted" id="sharestat" role="status"></span></div>') + '</div>' +
      refineHTML() +
      DISCLAIMER +

      bioAgeHTML(r) +

      L('<h3>הטווח, לא רק המספר</h3>') +
      L('<p>אף מודל לא יודע לנבא תאריך. מתוך אנשים עם נתונים כמו שלך, <b>חצי</b> חיים עד גיל שבין <b>') + Math.round(p.p25) + L(' ל-') + Math.round(p.p75) +
      L('</b>, ו-<b>80%</b> עד גיל שבין <b>') + Math.round(p.p10) + L(' ל-') + Math.round(p.p90) + '</b>.</p>' +
      '<div dir="ltr">' + rangeChart(r) + '</div>' +
      L('<div class="legend"><span><i class="band"></i>50% מהמקרים</span><span><i class="band wide"></i>80% מהמקרים</span></div>') +
      (stats ? '<div class="stats" style="margin-top:18px">' + stats + '</div>' : '') +

      planHTML(inp, r) +
      trainingHTML(inp) +
      testsHTML(inp) +

      L('<h3>מה מוסיף ומה מוריד שנים</h3>') +
      L('<p class="small muted">השפעת כל גורם בשנים, ביחס לממוצע האוכלוסייה. הסכום שווה להפרש הכולל מהממוצע.') + L(' הקשרים סטטיסטיים ולא בהכרח סיבתיים, ולכן זו אינה הבטחה לרווח בפועל.</p>') +
      factorRows(r) +

      trendsHTML(inp, r) +
      othersHTML() +

      L('<h3>הסיכוי להגיע לכל גיל</h3><div dir="ltr">') + survivalChart(r) + '</div>' +
      L('<div class="legend"><span><i></i>ההערכה שלך</span><span><i class="base"></i>ממוצע: ') + esc(who) + '</span></div>' +

      (notes.length ? L('<h3>הערות</h3><ul class="notes">') + notes.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>' : '') +

      improveHTML(inp, r) +
      simHTML(inp, r) +
      guideHTML(inp, r) +
      '<p style="margin-top:14px"><a href="' + SiteURL('topics') + '">' + L('לכל המדריכים באתר: תזונה, צום, סוכר, תנועה, קשרים חברתיים ועוד') + (LANGS[LANG].dir === 'rtl' ? ' ←' : ' →') + '</a></p>' +

      L('<h3>איך זה מחושב</h3>') +
      L('<details><summary>השיטה בקצרה</summary><p class="small" style="margin-top:8px">נקודת הבסיס היא לוח התמותה של ארגון הבריאות העולמי לשנת ') + LIFE_TABLE_YEAR + L(' (השנה האחרונה לפני הקורונה), לפי מדינה ומין. כל גורם סיכון מתורגם ליחס סיכונים (Hazard Ratio) מתוך מחקר מפורסם, מנורמל לממוצע האוכלוסייה, ומכפיל את קצב התמותה בכל גיל. יחסי הסיכון נחלשים בגיל מבוגר, כפי שנמצא במחקרים. מכיוון שגורמי הסיכון מתואמים זה עם זה, הגורם החזק ביותר נספר במלואו והאחרים במשקל מופחת, והיחס המשולב מוגבל לטווח 0.4–8.</p>') +
      L('<p class="small"><b>מגבלות:</b> המחקרים הם תצפיתיים ומראים קשר סטטיסטי, לא בהכרח סיבתיות. המודל אינו מכיר מחלות קיימות, תרופות, גנטיקה אישית או תאונות, ואינו מביא בחשבון שיפורים עתידיים ברפואה. לוח התמותה משקף את התמותה של היום, ולכן לצעירים ההערכה נוטה להיות שמרנית.</p></details>') +
      L('<details><summary>המקורות ויחסי הסיכון ששימשו</summary><p class="small muted" style="margin-top:8px">ליד כל מקור מופיע יחס הסיכון (HR) ששימש במודל. מעל 1 פירושו סיכון גבוה יותר, ומתחת ל-1 נמוך יותר. אלה הערכים מהמחקר, לפני הנרמול לממוצע האוכלוסייה ולפני ההיחלשות בגיל מבוגר.</p><ol>') + SOURCES.map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol></details>' +

      L('<div class="nav"><button id="back">עריכת הנתונים</button><button class="primary" id="print">הדפסה / שמירה כ-PDF</button></div></div>');

    wireSim(inp, r);
    wireShare(inp, r);
    document.getElementById('back').onclick = function () { step = 1; render(); };
    var rf = document.getElementById('refine'); if (rf) rf.onclick = function () { setMode('full'); step = 1; render(); };
    document.getElementById('print').onclick = function () { window.print(); };
    var pb = document.getElementById('print'), db = document.createElement('button');
    db.textContent = L('דוח הכנה לרופא/ה'); db.id = 'docrep'; pb.parentNode.insertBefore(db, pb);
    db.onclick = function () {
      app.innerHTML = doctorReport(inp, r); window.scrollTo(0, 0);
      document.getElementById('docback').onclick = renderResult;
      document.getElementById('docprint').onclick = function () { window.print(); };
    };
  }

  var SOURCES = [
    L('<b>בסיס:</b> WHO Global Health Observatory, Life tables by country, 2019 (nqx, ex).'),
    L('<b>עישון:</b> Jha P. et al. 21st-Century Hazards of Smoking and Benefits of Cessation in the United States. <i>NEJM</i> 2013;368:341–50. <span class="hrnote">במודל: מעשן/ת: 2.8 בגברים, 3.0 בנשים. הפסקת עישון: 1.0 בגיל 25–34, 1.2 ב-35–44, 1.5 ב-45–54, 1.7 ב-55–64; מעל 65: 1.9 (הנחה)</span>'),
    L('<b>BMI:</b> Global BMI Mortality Collaboration. Body-mass index and all-cause mortality: individual-participant-data meta-analysis of 239 prospective studies. <i>Lancet</i> 2016;388:776–86. <span class="hrnote">במודל: מתחת ל-18.5: 1.51 · 18.5–20: 1.13 · 25–27.5: 1.07 · 27.5–30: 1.20 · 30–35: 1.45 · 35–40: 1.94 · 40+: 2.76 (ייחוס: 20–25). העקומה קרובה לזו של נשים; לגברים ההשפעה מעל BMI 21 מוגברת פי 1.43 בלוג, כי במאמר הסיכון בגברים גבוה יותר (השמנה דרגה 1: 1.70 לעומת 1.37 בנשים)</span>'),
    L('<b>פעילות גופנית:</b> Arem H. et al. Leisure Time Physical Activity and Mortality. <i>JAMA Intern Med</i> 2015;175:959–67. <span class="hrnote">במודל: פחות מ-150 דק׳ בשבוע: 0.80 · 150–300: 0.69 · 300–450: 0.63 · מעל 450: 0.61 (ייחוס: ללא פעילות)</span>'),
    L('<b>אלכוהול:</b> Wood A.M. et al. Risk thresholds for alcohol consumption. <i>Lancet</i> 2018;391:1513–23. <span class="hrnote">במודל: 8–14 מנות בשבוע: 1.05 · 15–25: 1.16 · מעל 25: 1.57 (נגזר מהפרשי תוחלת החיים במחקר)</span>'),
    L('<b>שינה:</b> Cappuccio F.P. et al. Sleep Duration and All-Cause Mortality. <i>Sleep</i> 2010;33:585–92. <span class="hrnote">במודל: פחות מ-6 שעות: 1.12 · מעל 9 שעות: 1.30</span>'),
    L('<b>פירות וירקות:</b> Wang X. et al. Fruit and vegetable consumption and mortality. <i>BMJ</i> 2014;349:g4490. <span class="hrnote">במודל: 0.95 לכל מנה ביום, עד 5 מנות</span>'),
    L('<b>בידוד חברתי ובדידות:</b> Wang F. et al. A systematic review and meta-analysis of 90 cohort studies of social isolation, loneliness and mortality. <i>Nat Hum Behav</i> 2023;7:1307–19. <span class="hrnote">במודל: מעט מפגשים: 1.32 · בדידות: 1.14</span>'),
    L('<b>קצב הליכה:</b> Yates T. et al. Association of walking pace and handgrip strength with all-cause, cardiovascular, and cancer mortality: a UK Biobank observational study. <i>Eur Heart J</i> 2017;38:3232–40. <span class="hrnote">במודל, לעומת הליכה מהירה: ממוצע 1.09 / 1.17, איטי 1.56 / 1.63 (נשים / גברים); רק כשאין VO2max</span>'),
    L('<b>השכלה:</b> IHME-CHAIN Collaborators. Effects of education on adult mortality. <i>Lancet Public Health</i> 2024;9:e155–65. <span class="hrnote">במודל: לכל שנת לימוד: 2.9% פחות סיכון עד גיל 50, 1.9% בגיל 50–69, 0.8% מגיל 70</span>'),
    L('<b>סוכרת:</b> Emerging Risk Factors Collaboration. Diabetes Mellitus, Fasting Glucose, and Risk of Cause-Specific Death. <i>NEJM</i> 2011;364:829–41. <span class="hrnote">במודל: סוכרת: 1.80. בלי סוכרת: 1.10 לכל 18 מ"ג/ד"ל גלוקוז בצום מעל 100</span>'),
    L('<b>לחץ דם:</b> Prospective Studies Collaboration. Age-specific relevance of usual blood pressure to vascular mortality. <i>Lancet</i> 2002;360:1903–13. <span class="hrnote">במודל: פי 2 בתמותה ממחלות לב וכלי דם לכל 20 ממ"כ סיסטולי (או 10 דיאסטולי), מוחל על 30% מהתמותה</span>'),
    L('<b>כולסטרול:</b> Prospective Studies Collaboration. Blood cholesterol and vascular mortality by age, sex, and blood pressure. <i>Lancet</i> 2007;370:1829–39. <span class="hrnote">במודל: לכל 1 mmol/L (כ-39 מ"ג/ד"ל): 2.27 עד גיל 50, 1.52 בגיל 50–69, 1.20 מגיל 70, לתמותה ממחלת לב איסכמית, מוחל על 15% מהתמותה</span>'),
    L('<b>כליות:</b> CKD Prognosis Consortium. Association of eGFR and albuminuria with all-cause and cardiovascular mortality. <i>Lancet</i> 2010;375:2073–81. חישוב eGFR: Inker L.A. et al. <i>NEJM</i> 2021;385:1737–49 (CKD-EPI 2021). <span class="hrnote">במודל: eGFR 60: 1.18 · 45: 1.57 · 15: 3.14 (ייחוס: 75 ומעלה). חלבון בשתן (ACR) 10: 1.20 · 30: 1.63 · 300: 2.22 (ייחוס: 5)</span>'),
    L('<b>CRP:</b> Emerging Risk Factors Collaboration. C-reactive protein concentration and risk of coronary heart disease, stroke, and mortality. <i>Lancet</i> 2010;375:132–40. <span class="hrnote">במודל: 1.34 לכל עלייה של פי 3 בערך</span>'),
    L('<b>אריכות ימים של ההורים:</b> Atkins J.L. et al. Longer-Lived Parents and Cardiovascular Outcomes. <i>JACC</i> 2016;68:874–5. <span class="hrnote">במודל: 0.83 לכל עשור שהורה חי מעבר לגיל 80. סבים וסבתות: חצי מזה (הנחה)</span>'),
    L('<b>מחלת לב מוקדמת במשפחה:</b> Lloyd-Jones D.M. et al. Parental Cardiovascular Disease as a Risk Factor for Cardiovascular Disease in Middle-aged Adults. <i>JAMA</i> 2004;291:2204–11. <span class="hrnote">במודל: 2.0 בגברים, 1.7 בנשים לאירועי לב וכלי דם, מוחל על 30% מהתמותה (כ-1.25 לתמותה הכוללת)</span>'),
    L('<b>גיל ביולוגי:</b> Levine M.E. et al. An epigenetic biomarker of aging for lifespan and healthspan. <i>Aging</i> 2018;10:573–91; Liu Z. et al. A new aging measure captures morbidity and mortality risk across diverse subpopulations from NHANES IV. <i>PLoS Med</i> 2018;15:e1002718 (והתיקון לנוסחה, 2019). <span class="hrnote">במודל: 1.09 לכל שנה של גיל ביולוגי מעל הגיל בפועל</span>'),
    L('<b>הערכה עצמית של הבריאות:</b> DeSalvo K.B. et al. Mortality Prediction with a Single General Self-Rated Health Question. <i>J Gen Intern Med</i> 2006;21:267–75. <span class="hrnote">במודל: טובה: 1.23 · בינונית: 1.44 · גרועה: 1.92 (ייחוס: מצוינת)</span>'),
    L('<b>התקף לב, שבץ וסוכרת יחד:</b> Emerging Risk Factors Collaboration. Association of Cardiometabolic Multimorbidity With Mortality. <i>JAMA</i> 2015;314:52–60. <span class="hrnote">במודל: התקף לב: 2.0 · שבץ: 2.1 · אחד מהם עם סוכרת: 3.7–3.8 · שניהם: 3.5 · שלושתם: 6.9</span>'),
    L('<b>דופק במנוחה:</b> Zhang D. et al. Resting heart rate and all-cause and cardiovascular mortality in the general population. <i>CMAJ</i> 2016;188:E53–63. <span class="hrnote">במודל: 1.09 לכל 10 פעימות בדקה</span>'),
    L('<b>היקף מותניים:</b> Cerhan J.R. et al. A Pooled Analysis of Waist Circumference and Mortality in 650,000 Adults. <i>Mayo Clin Proc</i> 2014;89:335–45. <span class="hrnote">במודל: 1.07 בגברים, 1.09 בנשים, לכל 5 ס"מ</span>'),
    L('<b>כושר אירובי:</b> Kodama S. et al. Cardiorespiratory Fitness as a Quantitative Predictor of All-Cause Mortality. <i>JAMA</i> 2009;301:2024–35. ערכי ייחוס: Kaminsky L.A. et al. (FRIEND Registry). <i>Mayo Clin Proc</i> 2015;90:1515–23. <span class="hrnote">במודל: 0.87 לכל MET (3.5 מ"ל/ק"ג/דקה) של VO2max מעל החציון לגיל ולמין</span>'),
    L('<b>ישיבה:</b> Chau J.Y. et al. Daily Sitting Time and All-Cause Mortality: A Meta-Analysis. <i>PLoS One</i> 2013;8:e80000. <span class="hrnote">במודל: 1.02 לכל שעה ביום בין 3 ל-7 שעות, 1.05 לכל שעה מעל 7</span>'),
    L('<b>מצב משפחתי:</b> Wang Y. et al. Sex differences in the association between marital status and the risk of cardiovascular, cancer, and all-cause mortality. <i>Glob Health Res Policy</i> 2020;5:4. <span class="hrnote">במודל: ללא בן/בת זוג: 1.46 בגברים, 1.22 בנשים</span>'),
    L('<b>טריגליצרידים:</b> Liu J. et al. Effects of blood triglycerides on cardiovascular and all-cause mortality. <i>Lipids Health Dis</i> 2013;12:159. <span class="hrnote">במודל: 1.12 לכל 88.6 מ"ג/ד"ל (1 mmol/L)</span>'),
    L('<b>Lp(a):</b> Langsted A. et al. High lipoprotein(a) and high risk of mortality. <i>Eur Heart J</i> 2019;40:2760–70. <span class="hrnote">במודל: 1.05 לכל 50 מ"ג/ד"ל</span>'),
    L('<b>GGT:</b> Kunutsor S.K. et al. Liver enzymes and risk of all-cause mortality in general populations. <i>Int J Epidemiol</i> 2014;43:187–201. <span class="hrnote">במודל: 1.07 לכל 5 יחידות, עד 1.6 לכל היותר</span>'),
    L('<b>בדיקת סבירות לשילוב הגורמים:</b> Li Y. et al. Impact of Healthy Lifestyle Factors on Life Expectancies in the US Population. <i>Circulation</i> 2018;138:345–55.')
  ];

  function renderGuide() {
    var hasData = num(data.age) !== undefined && !!data.sex;
    app.innerHTML = L('<div class="card"><h1 style="font-size:clamp(26px,5vw,36px)">שינה, תזונה ולחץ</h1>') +
      L('<p class="muted">שלושה נושאים שאפשר לשפר, עם צעדים מעשיים ומקורות. אפשר לקרוא בלי להזין שום נתון.</p>') +
      guideHTML() +
      L('<div class="nav"><button id="gback">חזרה</button><button class="primary" id="gcalc">') + (hasData ? L('לתוצאה שלי, עם התאמה אישית') : L('לחישוב תוחלת החיים שלי')) + '</button></div></div>';
    document.getElementById('gback').onclick = function () { step = 0; render(); };
    document.getElementById('gcalc').onclick = function () { step = hasData ? steps().length + 1 : 1; render(); };
  }

  function render() {
    save();
    if (step === 'guide') renderGuide();
    else if (step <= 0) renderIntro();
    else if (step <= steps().length) renderStep();
    else renderResult();
    window.scrollTo(0, 0);
  }

  app.addEventListener('input', saveSoon);
  app.addEventListener('change', saveSoon);
  document.getElementById('wipe').onclick = function () {
    if (!window.confirm(L('למחוק את כל הנתונים שהוזנו ונשמרו במכשיר הזה?'))) return;
    wipe(); step = 0;
    if (document.body.getAttribute('data-page') === 'calc') render(); else location.reload();
  };

  // האתר (site.js) מנתב בין העמודים, ומבקש מהמחשבון להציג את עצמו כשעוברים אליו
  window.Calc = {
    open: function (s) { if (s !== undefined) step = s; render(); },
    hasData: function () { return num(data.age) !== undefined && !!data.sex; }
  };
})();
