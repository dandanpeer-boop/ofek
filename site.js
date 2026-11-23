/*
 * האתר: עמוד בית, עמודי נושא ו"איך זה עובד". כל עמוד הוא קובץ HTML אמיתי בכתובת משלו
 * (למשל en/sleep/), שנבנה מראש ב-build-site.js, כדי שמנועי חיפוש יוכלו לקרוא אותו.
 * בדפדפן, הקובץ הזה מצייר את העמוד מחדש (אותו תוכן) ומחבר את החלקים האינטראקטיביים.
 * SiteRender — פונקציות טהורות שמחזירות HTML, משמשות גם את build-site.js ב-Node.
 */
var SiteRender = (function () {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function byId(id) { for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === id) return TOPICS[i]; return null; }
  function hasData() {
    if (typeof window === 'undefined') return false;
    if (window.Calc) return window.Calc.hasData();
    try { var d = JSON.parse(localStorage.getItem('ofek-data-v1') || 'null'); return !!(d && d.age && d.sex); } catch (e) { return false; }
  }
  var FWD = function () { return LANGS[LANG].dir === 'rtl' ? '←' : '→'; };

  /* אייקונים בקו, 24x24, בצבע הטקסט */
  var ICONS = {
    moon: '<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>',
    leaf: '<path d="M5 19c0-8 5-14 15-14 0 10-6 15-14 15"/><path d="M5 19c3-4 6-7 10-9"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2"/>',
    cube: '<path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z"/><path d="M4 7.5l8 4.5 8-4.5M12 12v9"/>',
    run: '<circle cx="14" cy="4.5" r="1.8"/><path d="M8 21l3-6 3 2v5M6 11l3-3h4l3 4 3 1M11 15l-1-5"/>',
    wave: '<path d="M3 12c2-4 4-4 6 0s4 4 6 0 4-4 6 0"/><path d="M3 17c2-3 4-3 6 0s4 3 6 0 4-3 6 0" opacity=".5"/>',
    people: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9.5" r="2.4"/><path d="M3.5 19c.8-3.5 3-5 5.5-5s4.7 1.5 5.5 5M15 14.2c2.6-.4 4.6 1 5.4 4.3"/>',
    glass: '<path d="M7 3h10l-1 8a4 4 0 0 1-8 0z"/><path d="M12 15v5M8.5 20h7"/><path d="M4 4l16 16" opacity=".55"/>',
    pulse: '<path d="M3 12h4l2-5 4 10 2-5h6"/>',
    pill: '<path d="M10.5 20.5a4.95 4.95 0 0 1-7-7l9-9a4.95 4.95 0 0 1 7 7z"/><path d="M8.5 8.5l7 7"/>',
    arrow: '<path d="M15 6l-6 6 6 6"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
    lock: '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
    book: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2.5"/><path d="M8.5 7.5h7M8.5 12h1M12 12h1M15.5 12h0M8.5 16h1M12 16h1M15.5 16h0"/>',
    doc: '<path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5M10 13h6M10 17h6"/>',
    watch: '<rect x="7" y="6" width="10" height="12" rx="3"/><path d="M9 6l1-3h4l1 3M9 18l1 3h4l1-3M12 10v2.5l1.5 1"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>'
  };
  function icon(name, cls) {
    return '<svg class="ic ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || '') + '</svg>';
  }

  var HERO_ART =
    '<svg class="hero-art" viewBox="0 0 520 360" aria-hidden="true">' +
    '<defs><linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--sky1)"/><stop offset="1" stop-color="var(--sky2)"/></linearGradient>' +
    '<radialGradient id="sun" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="var(--sun1)"/><stop offset="1" stop-color="var(--sun2)"/></radialGradient></defs>' +
    '<rect width="520" height="360" rx="28" fill="url(#sky)"/>' +
    '<circle cx="300" cy="230" r="150" fill="var(--sun2)" opacity=".18"/>' +
    '<circle cx="300" cy="230" r="86" fill="url(#sun)"/>' +
    '<path d="M0 238 C90 200 170 214 250 228 S420 250 520 214 V360 H0Z" fill="var(--hill1)"/>' +
    '<path d="M0 276 C110 246 210 262 300 274 S450 290 520 262 V360 H0Z" fill="var(--hill2)"/>' +
    '<path d="M0 314 C120 296 240 306 340 314 S470 324 520 306 V360 H0Z" fill="var(--hill3)"/>' +
    '<g fill="none" stroke="var(--line-art)" stroke-width="2" stroke-linecap="round" opacity=".55">' +
    '<path d="M70 92 q14 -10 28 0 q14 -10 28 0"/><path d="M118 62 q10 -7 20 0 q10 -7 20 0"/></g>' +
    '</svg>';

  /* ---------- עמוד הבית ---------- */
  function topicCard(t) {
    return '<a class="tcard" href="' + SiteURL('topic', t.id) + '" style="--h:' + t.hue + '">' +
      '<span class="tcard-ic">' + icon(t.icon) + '</span>' +
      '<span class="tcard-title">' + esc(t.title) + '</span>' +
      '<span class="tcard-text">' + esc(t.short) + '</span>' +
      '<span class="tcard-meta">' + t.mins + ' ' + L('דקות קריאה') + ' ' + icon('arrow', 'sm fwd') + '</span></a>';
  }

  function week() {
    return [
      { d: L('יום ראשון'), t: L('שעת קימה קבועה לכל השבוע'), topic: 'sleep' },
      { d: L('יום שני'), t: L('להחליף משקה ממותק אחד במים'), topic: 'sugar' },
      { d: L('יום שלישי'), t: L('הליכה מהירה של 30 דקות'), topic: 'movement' },
      { d: L('יום רביעי'), t: L('ירק בכל ארוחה'), topic: 'nutrition' },
      { d: L('יום חמישי'), t: L('שיחה עם אדם קרוב'), topic: 'social' },
      { d: L('יום שישי'), t: L('למדוד לחץ דם ולרשום'), topic: 'numbers' },
      { d: L('שבת'), t: L('שלוש דקות של קרקוע ונשימה'), topic: 'stress' }
    ];
  }

  function calcLabel(fresh) { return hasData() ? L('לתוצאה שלי') : fresh; }

  function home() {
    var myths = [];
    TOPICS.forEach(function (t) { if (t.myths && t.myths[0]) myths.push({ t: t, m: t.myths[0] }); });
    myths = myths.slice(0, 6);

    return '' +
      '<section class="hero"><div class="hero-in">' +
        '<div class="hero-text">' +
          '<p class="eyebrow">' + L('מדע פשוט לחיים ארוכים') + '</p>' +
          '<h1>' + L('כמה שנים עוד לפניך?') + '<br><span class="h1sub">' + L('מחשבון תוחלת חיים של דקה: הערכה וטווח, ומה אפשר לשנות כדי להוסיף עוד.') + '</span>' + '</h1>' +
          '<p class="hero-lead">' + L('המחקר כבר יודע מה מקצר חיים ומה מאריך אותם. החישוב מראה מה זה אומר עליך, והמדריכים מראים מה לשנות.') + '</p>' +
          '<div class="cta-row"><a class="btn primary" href="' + SiteURL('calc') + '" data-calc-cta>' + icon('calc') + '<span>' + calcLabel(L('לחישוב, כדקה')) + '</span></a>' +
          '<a class="btn ghost" href="' + SiteURL('topics') + '">' + icon('book') + L('למדריכים') + '</a></div>' +
          '<ul class="trust"><li>' + icon('lock', 'sm') + L('בלי הרשמה, הנתונים נשארים במכשיר') + '</li><li>' + icon('check', 'sm') + L('כל מספר עם מקור מחקרי') + '</li></ul>' +
        '</div>' + HERO_ART +
      '</div></section>' +

      '<section class="band"><div class="band-in">' +
        '<div class="bignum"><b>14</b><span>' + L('שנים') + '</span></div>' +
        '<div class="band-text"><h2>' + L('חמישה הרגלים, יותר מעשור של חיים') + '</h2>' +
          '<p>' + L('במחקר של אוניברסיטת הרווארד שעקב אחרי יותר מ-120 אלף איש עד 34 שנים, נשים בגיל 50 שאימצו את כל חמשת ההרגלים צפויות לחיות 14 שנים יותר מאלה שלא אימצו אף אחד. אצל גברים: 12.2 שנים.') + '</p>' +
          '<ol class="habits">' + FIVE_HABITS.items.map(function (h, i) {
            var t = byId(h.topic);
            return '<li><a href="' + SiteURL('topic', h.topic) + '" style="--h:' + t.hue + '"><i>' + (i + 1) + '</i>' + esc(h.t) + '</a></li>';
          }).join('') + '</ol>' +
          '<p class="src">' + L('מקור:') + ' <a href="' + FIVE_HABITS.source.u + '" target="_blank" rel="noopener">' + esc(FIVE_HABITS.source.l) + '</a></p>' +
        '</div>' +
      '</div></section>' +

      '<section class="sec" id="topics"><div class="sec-head"><p class="eyebrow">' + L('המדריכים') + '</p><h2>' + L('מה משפיע על אורך החיים, ומה עושים עם זה') + '</h2>' +
        '<p class="trustline">' + L('כל מספר כאן מגיע ממחקר, עם קישור למקור.') + '</p>' +
        '<p class="muted">' + L('אין כאן דעות מהמותן. כל מספר נכתב בעברית פשוטה, ומי שרוצה יכול לפתוח את המחקר עצמו. כשהראיות חלשות או סותרות, כותבים את זה בגלוי. בכל מדריך: מה המחקר מצא, צעדים קטנים שאפשר לסמן, מיתוסים נפוצים ומקורות.') + '</p></div>' +
        '<div class="tgrid">' + TOPICS.map(topicCard).join('') + '</div></section>' +

      '<section class="sec calc-promo"><div class="promo">' +
        '<div class="promo-text"><p class="eyebrow">' + L('הכלי המרכזי') + '</p><h2>' + L('מחשבון תוחלת חיים אישי') + '</h2>' +
          '<p>' + L('מתחיל מלוח התמותה של ארגון הבריאות העולמי לפי גיל, מין ומדינה, ומתקן אותו לפי עשרות גורמים מתוך מחקרים גדולים. התוצאה היא טווח, לא תאריך, עם פירוט של מה מוסיף ומה מוריד שנים.') + '</p>' +
          '<ul class="feat">' +
            '<li>' + icon('doc') + '<div><b>' + L('בדיקות דם מקובץ') + '</b><span>' + L('מעלים PDF של תוצאות, והערכים מתמלאים לבד') + '</span></div></li>' +
            '<li>' + icon('watch') + '<div><b>' + L('ייבוא משעון Garmin') + '</b><span>' + L('דופק במנוחה ו-VO2max מהקובץ של השעון') + '</span></div></li>' +
            '<li>' + icon('sliders') + '<div><b>' + L('סימולטור "מה אם"') + '</b><span>' + L('מזיזים סרגל ורואים כמה שנים שינוי מסוים שווה') + '</span></div></li>' +
            '<li>' + icon('lock') + '<div><b>' + L('פרטי לגמרי') + '</b><span>' + L('החישוב כולו בדפדפן, והתשובות שלך לא נשלחות לשום מקום') + '</span></div></li>' +
          '</ul>' +
          '<a class="btn primary" href="' + SiteURL('calc') + '" data-calc-cta>' + icon('calc') + '<span>' + calcLabel(L('בואו נתחיל, כ-3 דקות')) + '</span></a>' +
        '</div>' +
        '<div class="mock" aria-hidden="true"><div class="mock-card">' +
          '<span class="mock-tag">' + L('דוגמה להמחשה') + '</span>' +
          '<div class="mock-k">' + L('הגיל המשוער') + '</div><div class="mock-big">86</div>' +
          '<div class="mock-range"><i class="w"></i><i class="n"></i><b></b></div>' +
          '<div class="mock-legend"><span>78</span><span>94</span></div>' +
          '<div class="mock-row pos"><span>' + L('פעילות גופנית') + '</span><em>+2.1</em><i style="width:62%"></i></div>' +
          '<div class="mock-row pos"><span>' + L('לא מעשן/ת') + '</span><em>+1.4</em><i style="width:42%"></i></div>' +
          '<div class="mock-row neg"><span>' + L('לחץ דם') + '</span><em>−0.9</em><i style="width:28%"></i></div>' +
          '<div class="mock-row neg"><span>' + L('שינה') + '</span><em>−0.5</em><i style="width:16%"></i></div>' +
        '</div></div>' +
      '</div></section>' +

      '<section class="sec"><div class="sec-head"><p class="eyebrow">' + L('להתחיל השבוע') + '</p><h2>' + L('שבעה צעדים קטנים לשבוע הקרוב') + '</h2>' +
        '<p class="muted">' + L('צעד אחד ביום. כל אחד מהם מוביל למדריך המלא.') + '</p></div>' +
        '<ol class="week">' + week().map(function (w) {
          var t = byId(w.topic);
          return '<li style="--h:' + t.hue + '"><a href="' + SiteURL('topic', t.id) + '"><span class="day">' + w.d + '</span><span class="wt">' + esc(w.t) + '</span><span class="wtopic">' + icon(t.icon, 'sm') + esc(t.title) + '</span></a></li>';
        }).join('') + '</ol></section>' +

      '<section class="sec"><div class="sec-head"><p class="eyebrow">' + L('מיתוס או עובדה') + '</p><h2>' + L('מה שכולם יודעים, ומה המחקר באמת מצא') + '</h2>' +
        '<p class="muted">' + L('לחצו על כרטיס כדי לראות את התשובה.') + '</p></div>' +
        '<div class="myths">' + myths.map(function (x) {
          return '<details class="myth" style="--h:' + x.t.hue + '"><summary><span class="myth-tag">' + esc(x.t.title) + '</span><span class="myth-m">"' + esc(x.m.m) + '"</span><span class="myth-cta">' + L('מה ידוע?') + '</span></summary>' +
            '<p><b class="known">' + L('מה ידוע:') + '</b> ' + esc(x.m.f) + '</p><a href="' + SiteURL('topic', x.t.id) + '">' + L('למדריך') + ' ' + esc(x.t.title) + ' ' + FWD() + '</a></details>';
        }).join('') + '</div></section>';
  }

  /* ---------- עמוד נושא ---------- */
  function topic(t, checks) {
    checks = checks || [];
    var idx = TOPICS.indexOf(t);
    var related = [TOPICS[(idx + 1) % TOPICS.length], TOPICS[(idx + 2) % TOPICS.length], TOPICS[(idx + 3) % TOPICS.length]];

    function srcLink(s) {
      var src = t.sources[s];
      return src ? ' <a class="fact-src" href="' + esc(src.u) + '" target="_blank" rel="noopener" title="' + esc(src.l) + '">[' + (s + 1) + ']</a>' : '';
    }

    return '<article class="topic" style="--h:' + t.hue + '">' +
      '<header class="topic-hero"><div class="topic-hero-in">' +
        '<a class="crumb" href="' + SiteURL('topics') + '">' + icon('arrow', 'sm back') + L('כל המדריכים') + '</a>' +
        '<div class="topic-title"><span class="topic-ic">' + icon(t.icon) + '</span><h1>' + esc(t.title) + '</h1></div>' +
        (t.answer ? '<p class="topic-answer"><b>' + L('התשובה הקצרה:') + '</b> ' + esc(t.answer) + '</p>' : '') +
        '<p class="topic-lead">' + esc(t.lead) + '</p>' +
        (t.id === 'sleep' ? '<p><a class="btn ghost" href="' + SiteURL('coach', 'sleep') + '">' + L('למאמן השינה: תוכנית אישית') + '</a></p>' : '') +
        (t.id === 'weight' ? '<p><a class="btn ghost" href="' + SiteURL('coach', 'weight') + '">' + L('למאמן המשקל והתזונה: תוכנית אישית') + '</a></p>' : '') +
        (t.id === 'habits' ? '<p><a class="btn ghost" href="' + SiteURL('coach', 'alcohol') + '">' + L('למאמן הפחתת האלכוהול: תוכנית אישית') + '</a></p>' : '') +
        (t.id === 'habits' ? '<p><a class="btn ghost" href="' + SiteURL('coach', 'smoking') + '">' + L('למאמן הגמילה מעישון: תוכנית אישית') + '</a></p>' : '') +
        '<p class="topic-meta">' + t.mins + ' ' + L('דקות קריאה') + ' · ' + t.sources.length + ' ' + L('מקורות') + '</p>' +
      '</div></header>' +

      '<div class="topic-body">' +
        '<div class="facts">' + t.facts.map(function (f) {
          return '<div class="fact"><b>' + esc(f.n) + '</b>' + (f.u ? '<span class="fu">' + esc(f.u) + '</span>' : '') + '<p>' + esc(f.t) + srcLink(f.s) + '</p></div>';
        }).join('') + '</div>' +

        '<div class="topic-cols"><div class="topic-main">' +
          t.sections.map(function (s) { return '<section><h2>' + esc(s.h) + '</h2>' + s.p.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') + '</section>'; }).join('') +
          (t.myths && t.myths.length ? '<section><h2>' + L('מיתוס או עובדה') + '</h2><div class="myths one">' + t.myths.map(function (m) {
            return '<details class="myth"><summary><span class="myth-m">"' + esc(m.m) + '"</span><span class="myth-cta">' + L('מה ידוע?') + '</span></summary><p><b class="known">' + L('מה ידוע:') + '</b> ' + esc(m.f) + '</p></details>';
          }).join('') + '</div></section>' : '') +
          '<section><h2>' + L('המקורות') + '</h2><ol class="srcs">' + t.sources.map(function (s) {
            return '<li><a href="' + esc(s.u) + '" target="_blank" rel="noopener">' + esc(s.l) + '</a></li>';
          }).join('') + '</ol></section>' +
        '</div>' +

        '<aside class="topic-side">' +
          '<div class="todo"><h2>' + L('מה עושים מחר בבוקר') + '</h2>' +
            '<p class="todo-prog" id="todoProg"></p>' +
            '<ul>' + t.actions.map(function (a, i) {
              var on = checks.indexOf(i) >= 0;
              return '<li><label><input type="checkbox" data-i="' + i + '"' + (on ? ' checked' : '') + '><span class="box">' + icon('check', 'sm') + '</span><span><b>' + esc(a.t) + '</b><em>' + esc(a.h) + '</em></span></label></li>';
            }).join('') + '</ul>' +
            '<p class="small muted">' + L('הסימון נשמר רק בדפדפן הזה.') + '</p>' +
          '</div>' +
          '<div class="inmodel"><h3>' + icon('calc', 'sm') + L('במחשבון') + '</h3><p>' + esc(t.model) + '</p><a class="btn primary sm" href="' + SiteURL('calc') + '">' + L('לחשב את שלי') + '</a></div>' +
        '</aside></div>' +

        '<p class="disclaimer">' + L('מידע כללי מבוסס מחקר, לא ייעוץ רפואי ולא תחליף לרופא/ה. לפני שינוי משמעותי, במיוחד עם מחלה או תרופות, כדאי להתייעץ.') + '</p>' +

        '<section class="related"><h2>' + L('להמשיך לקרוא') + '</h2><div class="tgrid three">' + related.map(topicCard).join('') + '</div></section>' +
      '</div></article>';
  }

  /* ---------- איך זה עובד ---------- */
  function about() {
    return '<article class="page"><p class="eyebrow">' + L('על האתר') + '</p><h1>' + L('איך זה עובד') + '</h1>' +
      '<section><h2>' + L('המדריכים') + '</h2><p>' + L('כל מדריך נשען על מחקרים שפורסמו בכתבי עת רפואיים ועל הנחיות של גופים כמו ארגון הבריאות העולמי. כל מספר באתר מופיע עם קישור למקור, והמספרים נבדקו מול תקצירי המחקרים עצמם. כשמחקר הוא תצפיתי, כלומר מראה קשר ולא בהכרח סיבה, זה כתוב.') + '</p></section>' +
      '<section><h2>' + L('המחשבון') + '</h2><p>' + L('נקודת הבסיס היא לוח התמותה של ארגון הבריאות העולמי לפי מדינה, גיל ומין. כל גורם סיכון מתורגם ליחס סיכונים מתוך מחקר גדול, ומכפיל את קצב התמותה בכל גיל. ההשפעה נחלשת בגיל מבוגר, וגורמים קשורים נספרים במשקל מופחת כדי לא לספור אותו דבר פעמיים. התוצאה מוצגת כטווח, כי אף אחד לא יכול לדעת תאריך.') + '</p></section>' +
      '<section><h2>' + L('מגבלות המודל') + '</h2><ul class="notes">' + '<li>' + L('המודל מחבר ממצאים של מחקרים נפרדים, ואינו מבוסס על מחקר אחד שנבדק מול נתוני אמת. הוא אינו מודל מאומת.') + '</li>' + '<li>' + L('גורמים שקשורים זה לזה, כמו משקל, סוכר ולחץ דם, חופפים בחלקם. הטיפול בחפיפה הוא קירוב, והוא עלול להגזים או להמעיט, בעיקר למי שיש לו הרבה גורמי סיכון.') + '</li>' + '<li>' + L('לוח התמותה משקף את התמותה של היום ולא שיפור עתידי ברפואה, ולכן ההערכה לצעירים כנראה שמרנית.') + '</li>' + '<li>' + L('הטווח המוצג משקף את ההבדלים בין אנשים עם אותו פרופיל, ולא את אי-הוודאות של המודל עצמו.') + '</li>' + '<li>' + L('רוב המחקרים הם תצפיתיים. כשהם מראים קשר, לא תמיד אפשר לדעת כמה ממנו סיבתי, ולכן "כמה שנים תרוויח" הוא הערכה ולא הבטחה.') + '</li>' + '<li>' + L('חלק גדול מהמחקרים נערכו במדינות מערביות. המודל לא מכיר מחלות נדירות, גנטיקה או סיכונים חריפים.') + '</li>' + '<li>' + L('בבדיקה ראשונית שערכנו על נתוני NHANES האמריקאיים (כ-23,500 מבוגרים, מעקב של 10 שנים) המודל הבחין היטב בין אנשים בסיכון גבוה לנמוך, אבל נטה לנבא בממוצע כ-15 עד 20 אחוז יותר מקרי מוות ממה שנצפה בפועל. לכן ההערכה המוחלטת עשויה להיות מעט נמוכה מדי, וההשוואה בין אנשים או בין הרגלים מדויקת יותר מהמספר עצמו. זו אינה בדיקה בלתי תלויה, והיא לא נעשתה על אוכלוסייה ישראלית.') + '</li>' + '</ul></section>' +
      '<section><h2>' + L('עדכון שוטף') + '</h2><p>' + L('כל שבוע נסרק PubMed לאיתור מחקרים חדשים בתחום: מטה-אנליזות, סקירות שיטתיות, ניסויים מבוקרים ומחקרי עוקבה גדולים על תמותה ותוחלת חיים. כל מחקר שנמצא נבדק מול התקציר שלו ומול המספרים שכבר באתר, ורק מחקר חזק שמשנה את התמונה מעדכן מספר במחשבון או מדריך.') + ' ' + L('לא כל מחקר חדש משנה משהו, וזה בכוונה: מחקר בודד שיוצא דופן לא אמור להזיז את ההערכה שלך.') + '</p></section>' +
      '<section><h2>' + L('פרטיות') + '</h2><p>' + L('התשובות שלך לא נשלחות לשום מקום. החישוב, קריאת קובצי בדיקות הדם וקובצי השעון נעשים כולם בדפדפן. אם בחרת לזכור את הנתונים, הם נשמרים רק בדפדפן הזה, ואפשר למחוק אותם בכל רגע בכפתור "מחיקת הנתונים" בתחתית העמוד.') + ' ' + L('כדי לדעת כמה אנשים מבקרים באתר ובאילו עמודים, אנחנו משתמשים ב-Google Analytics. הוא מקבל את כתובת העמוד ופרטים כלליים כמו סוג המכשיר והמדינה, ולא את מה שהזנת במחשבון.') + ' ' + L('אפשר לבדוק בעצמך: אחרי שהעמוד נטען פעם אחת, אפשר להתנתק מהאינטרנט או לעבור למצב טיסה, והמחשבון ימשיך לעבוד, כולל קריאת קובץ בדיקות דם.') + '</p></section>' +
      '<section><h2>' + L('מי בנה את האתר') + '</h2><p>' + L('האתר נבנה על ידי אדם פרטי. אין מאחוריו חברת ביטוח, חברת תוספי תזונה או כוונת רווח כרגע.') + '</p><p>' + L('הסיבה: אחרי מותה של אמי בגיל 77, וכשהתגלה סרטן אצל אבי בגיל 77, החלטתי לעזור לאנשים לשפר את תוחלת חייהם.') + '</p><p>' + L('האתר נכתב בעזרת כלי בינה מלאכותית. כל מספר נבדק מול התקציר או הטקסט המלא של המחקר המקורי.') + '</p></section>' +
      '<section><h2>' + L('מה זה לא') + '</h2><p>' + L('זו לא אבחנה ולא ייעוץ רפואי. המחקרים מתארים ממוצעים של קבוצות גדולות, לא את העתיד של אדם מסוים. בכל שאלה על הבריאות שלך, הכתובת היא רופא/ת המשפחה.') + '</p></section>' +
      '<div class="cta-row"><a class="btn primary" href="' + SiteURL('calc') + '">' + icon('calc') + L('למחשבון') + '</a><a class="btn ghost" href="' + SiteURL('topics') + '">' + icon('book') + L('למדריכים') + '</a></div>' +
      '</article>';
  }

  /* ---------- מקורות ושיטה ---------- */
  function sources() {
    var lv = { full: L('נבדק מול הטקסט המלא'), abs: L('נבדק מול התקציר'), doc: L('מתועד, לא נבדק מחדש') };
    var rows = SOURCES.map(function (x) {
      var cite = x.u ? '<a href="' + esc(x.u) + '" target="_blank" rel="noopener noreferrer">' + esc(x.s) + '</a>' : esc(x.s);
      return '<tr><td>' + esc(x.f) + '</td><td dir="ltr">' + cite + '</td><td dir="ltr">' + esc(x.v) + '</td><td><span class="lvl lvl-' + x.l + '">' + lv[x.l] + '</span></td></tr>';
    }).join('');
    var d = new Date(SOURCES_UPDATED + 'T12:00:00');
    return '<article class="page"><p class="eyebrow">' + L('על האתר') + '</p><h1>' + L('מקורות ושיטה') + '</h1>' +
      '<p class="muted">' + L('עודכן לאחרונה:') + ' <time datetime="' + SOURCES_UPDATED + '">' + d.toLocaleDateString(LANGS[LANG].locale) + '</time></p>' +
      '<section><h2>' + L('איך המחשבון עובד, בקצרה') + '</h2><ul class="notes">' +
        '<li>' + L('נקודת הבסיס היא לוח התמותה של ארגון הבריאות העולמי לפי מדינה, גיל ומין.') + '</li>' +
        '<li>' + L('כל גורם סיכון מתורגם ליחס סיכונים (HR) ממחקר, ומכפיל את קצב התמותה בכל גיל. ההשפעה נחלשת בגיל מבוגר.') + '</li>' +
        '<li>' + L('גורמים קשורים נספרים במשקל מופחת (1 / 0.85 / 0.7), והיחס המשולב מוגבל לטווח 0.4–8.') + '</li>' +
        '<li>' + L('התוצאה מוצגת כטווח. זו הערכה סטטיסטית ולא תחזית אישית.') + '</li></ul></section>' +
      '<section><h2>' + L('מה המשמעות של רמת האימות') + '</h2><ul class="notes">' +
        '<li><b>' + lv.full + '</b>: ' + L('המספר שבמחשבון הושווה לטקסט המלא של המאמר.') + '</li>' +
        '<li><b>' + lv.abs + '</b>: ' + L('הושווה לתקציר המאמר בלבד, כי הטקסט המלא לא היה זמין לנו.') + '</li>' +
        '<li><b>' + lv.doc + '</b>: ' + L('נלקח מתיעוד קודם של הבנייה ועוד לא נבדק שוב. מסומן בגלוי.') + '</li></ul></section>' +
      '<section><h2>' + L('הגורמים והמקורות') + '</h2><div class="srcwrap"><table class="srctable"><thead><tr><th>' + L('גורם') + '</th><th>' + L('מחקר') + '</th><th>' + L('ערך במודל') + '</th><th>' + L('רמת אימות') + '</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
      '<p class="small muted">' + L('הערכים הם יחסי סיכון (HR) לתמותה מכל סיבה, אלא אם כתוב אחרת. יש מחקרים שבהם המודל משתמש רק בחלק מהמספרים, והטבלה מציגה את העיקריים.') + '</p></section>' +
      '<section><h2>' + L('מגבלות ובדיקות חיצוניות') + '</h2><p>' + L('המודל לא נבדק עדיין על ידי אקטואר או רופא. הבדיקה הראשונית על נתוני NHANES מתוארת בעמוד "איך זה עובד", יחד עם המגבלות.') + '</p></section>' +
      '<div class="cta-row"><a class="btn primary" href="' + SiteURL('calc') + '">' + icon('calc') + L('למחשבון') + '</a><a class="btn ghost" href="' + SiteURL('about') + '">' + icon('book') + L('איך זה עובד') + '</a></div>' +
      '</article>';
  }

  /* ---------- מאמן שינה: הקליפה הסטטית; השאלון עצמו נבנה ב-coach.js ---------- */
  function coach(id) {
    var C = {
      sleep: { eb: L('שינה'), h1: L('מאמן שינה'), lead: L('כמה שאלות על השינה שלך, ותוכנית מבוססת מחקר. כל הפסקאות לקוחות ממדריך השינה, עם קישור לכל מקור.'),
        trust: L('זה לא אבחנה ולא ייעוץ רפואי. אנחנו לא ממליצים על תרופות מרשם או מינונים. בכל ספק, רופא/ה.'), ns: L('המאמן דורש JavaScript. אפשר לקרוא את מדריך השינה במקומו.'), topic: 'sleep', link: L('למדריך השינה המלא, עם כל המקורות') },
      smoking: { eb: L('עישון'), h1: L('מאמן גמילה מעישון'), lead: L('כמה שאלות עליך, ותוכנית מבוססת מחקר לגמילה מעישון, עם מקורות. בלי שיפוט.'),
        trust: L('זה לא אבחנה ולא ייעוץ רפואי. אנחנו לא ממליצים על תרופת מרשם מסוימת או על מינונים. בכל ספק, רופא/ה.'), ns: L('המאמן דורש JavaScript. אפשר לקרוא את מדריך ההרגלים במקומו.'), topic: 'habits', link: L('למדריך ההרגלים המלא, עם כל המקורות') },
      alcohol: { eb: L('אלכוהול'), h1: L('מאמן הפחתת אלכוהול'), lead: L('כמה שאלות עליך, ותוכנית מבוססת מחקר להפחתת שתייה, עם מקורות. בלי שיפוט. זה כלי להפחתה ולא תוכנית גמילה.'),
        trust: L('זה לא אבחנה ולא ייעוץ רפואי. אנחנו לא נותנים הוראות גמילה, תרופות או מינונים. מי ששותה הרבה מופנה לרופא/ה. בכל ספק, רופא/ה.'), ns: L('המאמן דורש JavaScript. אפשר לקרוא את מדריך ההרגלים במקומו. אם אתם שותים הרבה כל יום, אל תפסיקו בבת אחת בלי רופא/ה. רעד חזק, בלבול, הזיות או פרכוס הם מצב חירום: פנו למיון או למד"א.'), topic: 'habits', link: L('למדריך ההרגלים המלא, עם כל המקורות') },
      weight: { eb: L('משקל'), h1: L('מאמן משקל ותזונה'), lead: L('כמה שאלות עליך, ותוכנית מבוססת מחקר לתזונה ולירידה מתונה במשקל, עם מקורות. בלי שיפוט ובלי הבטחות.'),
        trust: L('זה לא אבחנה ולא ייעוץ רפואי או תזונתי. אנחנו לא נותנים יעדי קלוריות, תרופות או מינונים. בכל ספק, רופא/ה או דיאטן/ית.'), ns: L('המאמן דורש JavaScript. אפשר לקרוא את מדריך המשקל במקומו.'), topic: 'weight', link: L('למדריך המשקל המלא, עם כל המקורות') }
    }[id === 'smoking' || id === 'weight' || id === 'alcohol' ? id : 'sleep'];
    return '<article class="page"><p class="eyebrow">' + C.eb + '</p><h1>' + C.h1 + '</h1>' +
      '<p class="lead">' + C.lead + '</p><p class="trustline">' + C.trust + '</p>' +
      '<div id="coach" class="coach"></div><noscript><p>' + C.ns + '</p></noscript>' +
      '<p><a href="' + SiteURL('topic', C.topic) + '">' + C.link + '</a></p></article>';
  }

  return { home: home, topic: topic, about: about, sources: sources, coach: coach, byId: byId, esc: esc };
})();

/* ---------- בדפדפן: ציור העמוד וחיבור הסימונים ---------- */
(function () {
  if (typeof document === 'undefined') return;
  var site = document.getElementById('site');
  if (!site) return;
  var CHECKS = 'ofek-checks';
  function loadChecks() { try { return JSON.parse(localStorage.getItem(CHECKS) || '{}') || {}; } catch (e) { return {}; } }
  function saveChecks(c) { try { localStorage.setItem(CHECKS, JSON.stringify(c)); } catch (e) { /* חסום, מצב פרטי */ } }

  // קישורים ישנים מהגרסה הקודמת (#/topic/sleep וכו')
  var h = location.hash;
  if (/^#\//.test(h)) {
    var m;
    if (/^#\/calc/.test(h)) { location.replace(SiteURL('calc')); return; }
    if (/^#\/about/.test(h)) { location.replace(SiteURL('about')); return; }
    if ((m = h.match(/^#\/topic\/([\w-]+)/)) && SiteRender.byId(m[1])) { location.replace(SiteURL('topic', m[1])); return; }
    if (/^#\/topics/.test(h)) { history.replaceState(null, '', '#topics'); }
    else history.replaceState(null, '', location.pathname);
  }

  var page = document.body.getAttribute('data-page');
  if (page === 'calc') {
    if (window.Calc) window.Calc.open(0);
    return;
  }
  if (page === 'topic') {
    var t = SiteRender.byId(document.body.getAttribute('data-topic'));
    if (!t) return;
    site.innerHTML = SiteRender.topic(t, loadChecks()[t.id]);
    var prog = function () {
      var n = site.querySelectorAll('.todo input:checked').length;
      document.getElementById('todoProg').innerHTML = '<span class="bar"><i style="width:' + Math.round(100 * n / t.actions.length) + '%"></i></span>' +
        (n ? L('סימנת') + ' ' + n + ' ' + L('מתוך') + ' ' + t.actions.length : t.actions.length + ' ' + L('צעדים קטנים. מסמנים מה שעשית.'));
    };
    site.querySelectorAll('.todo input').forEach(function (cb) {
      cb.onchange = function () {
        var all = loadChecks();
        all[t.id] = Array.prototype.map.call(site.querySelectorAll('.todo input:checked'), function (c) { return +c.dataset.i; });
        saveChecks(all); prog();
      };
    });
    prog();
  } else if (page === 'home') {
    // הכפתורים "לתוצאה שלי" תלויים בנתונים השמורים, ולכן מצוירים מחדש בדפדפן
    site.innerHTML = SiteRender.home();
    if (location.hash === '#topics') { var el = document.getElementById('topics'); if (el) el.scrollIntoView(); }
  }
})();

// טווחי מספרים (4–7, 15–25) מתהפכים בטקסט עברי (RTL). עוטפים אותם במבודד LTR, בכל עמוד ובכל שינוי בעמוד. לא נוגע בשפות LTR.
(function () {
  if (typeof document === 'undefined' || typeof LANGS === 'undefined' || LANGS[LANG].dir !== 'rtl') return;
  var RE = /(\d+(?:[.,]\d+)?\s?[–\-]\s?\d+(?:[.,]\d+)?)/g, busy = false;
  function fix(root) {
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null), n, list = [];
    while ((n = w.nextNode())) {
      var p = n.parentNode && n.parentNode.nodeName;
      if (p === 'SCRIPT' || p === 'STYLE' || p === 'TEXTAREA') continue;
      if (RE.test(n.nodeValue) && n.nodeValue.indexOf('⁦') < 0) list.push(n);
      RE.lastIndex = 0;
    }
    list.forEach(function (t) { t.nodeValue = t.nodeValue.replace(RE, '⁦$1⁩'); });
  }
  function run() { if (busy) return; busy = true; try { fix(document.body); } finally { busy = false; } }
  run();
  new MutationObserver(function () { if (!busy) { busy = true; setTimeout(function () { busy = false; run(); }, 0); } }).observe(document.body, { childList: true, subtree: true, characterData: true });
})();
