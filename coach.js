/* מאמן שינה: שאלון קצר ותוכנית מבוססת מחקר. רץ כולו בדפדפן, לא שולח ולא שומר דבר.
   התוכן המדעי נלקח מהמדריך 'sleep' ב-content.js (אותן פסקאות מאומתות ואותם תרגומים), כך שאין כאן טענה חדשה.
   אינו נותן אבחנה, ולא ממליץ על תרופות מרשם, מינונים או הפחתת מינון. */
var SleepCoach = (function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  // פסקאות מהמדריך לפי מיקום (בדיקה בזמן ריצה: אם המבנה השתנה, הקטע פשוט לא יוצג)
  var guide = null;
  for (var i = 0; i < TOPICS.length; i++) if (TOPICS[i].id === 'sleep') guide = TOPICS[i];
  function gp(sec, idx) {
    return guide && guide.sections[sec] && guide.sections[sec].p[idx] ? guide.sections[sec].p[idx] : '';
  }
  // אינדקסים: 1 קביעות · 2 איך לישון טוב · 3 איך להאריך · 4 כשהשינה לא מגיעה · 5 דום נשימה · 6 כדורי שינה · 7 תוספים

  var QUESTIONS = [
    { id: 'main', type: 'multi', q: L('מה הבעיות? אפשר לסמן כמה.'), o: [
      ['falling', L('קשה לי להירדם')], ['waking', L('אני מתעורר/ת באמצע הלילה וקשה לחזור לישון')],
      ['early', L('אני מתעורר/ת מוקדם מדי ולא חוזר/ת לישון')], ['short', L('אני ישן/ה מעט כי אני הולך/ת לישון מאוחר')],
      ['unrefreshed', L('אני ישן/ה מספיק שעות אבל קם/ה עייף/ה')]] },
    { id: 'dur', type: 'one', q: L('כמה זמן זה נמשך?'), o: [
      ['new', L('פחות משלושה שבועות')], ['mid', L('שלושה שבועות עד שלושה חודשים')], ['long', L('יותר משלושה חודשים')]] },
    { id: 'wake', type: 'one', q: L('האם שעת הקימה שלך קבועה גם בסוף השבוע?'), o: [['yes', L('כן')], ['no', L('לא')]] },
    { id: 'caf', type: 'one', q: L('האם אתה שותה קפה, תה חזק או משקאות אנרגיה בשש השעות שלפני השינה?'), o: [['yes', L('כן')], ['no', L('לא')]] },
    { id: 'screen', type: 'one', q: L('האם אתה מסתכל על מסך מואר (טלפון, טלוויזיה או מחשב) בשעה האחרונה לפני השינה?'), o: [['yes', L('כן')], ['no', L('לא')]] },
    { id: 'alc', type: 'one', q: L('האם אתה שותה אלכוהול או אוכל ארוחה כבדה בשעות שלפני השינה?'), o: [['yes', L('כן')], ['no', L('לא')]] },
    { id: 'flags', type: 'multi', q: L('האם אחד מאלה נכון לגביך?'), o: [
      ['snore', L('נחירות חזקות, הפסקות נשימה בשינה (שמישהו שם לב אליהן) או התעוררות עם תחושת חנק')],
      ['drive', L('נרדמתי או כמעט נרדמתי בנהיגה או במצב מסוכן אחר')],
      ['mood', L('מצב רוח ירוד, חרדה או מחשבות קשות רוב הימים')],
      ['preg', L('אני בהריון או מניקה')],
      ['pills', L('אני נוטל/ת תרופות מרשם לשינה, לחרדה, לכאב או לאפילפסיה')],
      ['taper', L('אני בתהליך של הפחתת מינון של תרופה')],
      ['sudden', L('בעיית השינה התחילה פתאום, או אחרי מחלה או שינוי בתרופות')]] },
    { id: 'supp', type: 'multi', q: L('האם אתה נוטל או שוקל תוספים לשינה? אפשר לסמן כמה.'), o: [
      ['melatonin', L('מלטונין')], ['magnesium', L('מגנזיום')], ['theanine', L('L-תיאנין')], ['glycine', L('גליצין')],
      ['chamomile', L('קמומיל או אפיגנין')], ['ps', L('פוספטידיל-סרין או מיו-אינוזיטול')]] }
  ];
  // פסקת התוסף במדריך (סעיף 7: 0 מבוא, 1 מלטונין, 2 מגנזיום, 3 תיאנין, 4 גליצין, 5 קמומיל, 6 PS ואינוזיטול, 7 הנחיית AASM, 8 סיום)
  var SUPP_P = { melatonin: 1, magnesium: 2, theanine: 3, glycine: 4, chamomile: 5, ps: 6 };

  var answers = {};

  function formHTML() {
    return QUESTIONS.map(function (q) {
      return '<fieldset class="cq"><legend>' + esc(q.q) + '</legend>' + q.o.map(function (o) {
        return '<label class="copt"><input type="' + (q.type === 'one' ? 'radio' : 'checkbox') + '" name="' + q.id + '" value="' + o[0] + '"> <span>' + esc(o[1]) + '</span></label>';
      }).join('') + '</fieldset>';
    }).join('');
  }

  function collect(root) {
    var a = {};
    QUESTIONS.forEach(function (q) {
      var els = root.querySelectorAll('input[name="' + q.id + '"]:checked'), v = [];
      for (var i = 0; i < els.length; i++) v.push(els[i].value);
      a[q.id] = q.type === 'one' ? (v[0] || '') : v;
    });
    return a;
  }

  function has(a, id, v) { return (a[id] || []).indexOf(v) >= 0; }
  function para(t) { return t ? '<p>' + esc(t) + '</p>' : ''; }
  function block(title, bodies) { return '<li><h3>' + esc(title) + '</h3>' + bodies.map(para).join('') + '</li>'; }

  // בונה את התוכנית. מחזיר HTML. הכלל: קודם בטיחות, אחר כך צעדים לפי עוצמת הראיות, ובסוף התוספים שנבחרו.
  function plan(a) {
    var safety = [], steps = [], supp = [];
    var f = function (v) { return has(a, 'flags', v); };
    if (f('snore')) safety.push([L('נחירות והפסקות נשימה'), [gp(5, 2)]]);
    if (f('drive')) safety.push([L('ישנוניות בנהיגה'), [L('ישנוניות בנהיגה היא סכנה מיידית. אל תנהגו כשאתם ישנוניים, ופנו לרופא/ה בהקדם.')]]);
    if (f('mood')) safety.push([L('מצב רוח וחרדה'), [L('מצב רוח ירוד וחרדה קשורים לעיתים קרובות לשינה גרועה. כדאי לדבר עם רופא/ה או עם איש מקצוע לבריאות הנפש, כי הטיפול בהם הוא חלק מהפתרון.')]]);
    if (f('preg')) safety.push([L('הריון והנקה'), [L('בהריון או בהנקה כדאי להתייעץ עם רופא/ה לפני נטילת כל תוסף או תרופה לשינה.')]]);
    if (f('pills') || f('taper')) {
      safety.push([L('תרופות מרשם'), [L('אל תפסיקו תרופה ואל תשנו מינון בלי רופא/ה. אל תוסיפו תוספים או תרופות חדשות בלי לבדוק איתם, כי יש אינטראקציות.')]]);
      if (f('taper')) safety.push([L('הפחתת מינון'), [L('הפחתת מינון היא החלטה רפואית. אם השינה מתדרדרת בזמן ההפחתה, ספרו על כך לרופא/ה שמלווה אתכם.')]]);
      safety.push([L('כדורי שינה: מה חשוב לדעת'), [gp(6, 0), gp(6, 1), gp(6, 2)]]);
    }
    if (f('sudden')) safety.push([L('בעיה שהתחילה פתאום'), [L('בעיית שינה שהתחילה פתאום, או אחרי מחלה או שינוי בתרופות, כדאי לבדוק עם רופא/ה.')]]);
    if (has(a, 'main', 'unrefreshed')) safety.push([L('עייפות למרות שינה'), [L('עייפות למרות שעות שינה מספקות היא סיבה לדבר עם רופא/ה: היא יכולה לנבוע מדום נשימה או ממצבים אחרים שנבדקים בבדיקה.')]]);

    if (a.wake !== 'yes') steps.push([L('שעת קימה קבועה'), [gp(1, 0)]]);
    if (a.caf === 'yes') steps.push([L('קפאין'), [gp(2, 0)]]);
    if (a.screen === 'yes') steps.push([L('מסכים בשעה האחרונה'), [gp(2, 1)]]);
    if (a.alc === 'yes') steps.push([L('אלכוהול וארוחה כבדה'), [L('אלכוהול וארוחה כבדה בערב עלולים לפגוע בשינה. כדאי להימנע מהם בשעות שלפני השינה.')]]);
    if (has(a, 'main', 'short')) steps.push([L('להקדים את שעת השינה'), [gp(3, 0), gp(3, 1)]]);
    if (has(a, 'main', 'falling') || has(a, 'main', 'waking') || has(a, 'main', 'early') || a.dur === 'long')
      steps.push([L('טיפול קוגניטיבי-התנהגותי (CBT-I)'), [gp(2, 2), gp(4, 0)]]);
    steps.push([L('יומן שינה לשבועיים'), [L('לרשום כל יום את שעת הכניסה למיטה ושעת הקימה, התעוררויות בלילה, קפאין ואלכוהול. אחרי שבועיים אפשר לראות דפוס ולהראות אותו לרופא/ה. נתוני שעון חכם הם הערכה ולא מדידה רפואית, ושימושיים בעיקר להשוואה בין לילות.')]]);

    var sel = a.supp || [];
    sel.forEach(function (k) { if (SUPP_P[k]) supp.push(gp(7, SUPP_P[k])); });

    var out = '<div class="cplan"><h2>' + esc(L('התוכנית שלך')) + '</h2>' +
      '<p class="muted">' + esc(L('לפי התשובות שלך. זה מידע כללי מבוסס מחקר, לא אבחנה ולא תחליף לרופא/ה.')) + '</p>';
    if (safety.length) out += '<section class="csafe"><h2>' + esc(L('קודם כול: כדאי לבדוק עם רופא/ה')) + '</h2><ul class="clist">' + safety.map(function (x) { return block(x[0], x[1]); }).join('') + '</ul></section>';
    out += '<section><h2>' + esc(L('מה לנסות')) + '</h2><ol class="clist">' + steps.map(function (x) { return block(x[0], x[1]); }).join('') + '</ol></section>';
    if (supp.length) out += '<section><h2>' + esc(L('התוספים שבחרת: מה הראיות')) + '</h2>' + para(gp(7, 0)) + supp.map(para).join('') + para(gp(7, 7)) + para(gp(7, 8)) + '</section>';
    out += '<p><a href="' + esc(SiteURL('topic', 'sleep')) + '">' + esc(L('למדריך השינה המלא, עם כל המקורות')) + '</a></p>' +
      '<div class="cta-row"><button type="button" class="btn ghost" id="coach-reset">' + esc(L('התחלה מחדש')) + '</button></div></div>';
    return out;
  }

  function mount(root) {
    root.innerHTML = '<form class="coachform" id="coach-form">' + formHTML() +
      '<p class="small muted">' + esc(L('אפשר לדלג על שאלות. התשובות לא נשלחות לשום מקום ולא נשמרות.')) + '</p>' +
      '<div class="cta-row"><button type="submit" class="btn primary">' + esc(L('בנו לי תוכנית')) + '</button></div></form><div id="coach-out" aria-live="polite"></div>';
    var form = document.getElementById('coach-form'), out = document.getElementById('coach-out');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      answers = collect(form);
      out.innerHTML = plan(answers);
      form.style.display = 'none';
      out.scrollIntoView();
      document.getElementById('coach-reset').addEventListener('click', function () {
        out.innerHTML = ''; form.reset(); form.style.display = ''; form.scrollIntoView();
      });
    });
  }

  return { mount: mount, plan: plan, QUESTIONS: QUESTIONS };
})();

(function () {
  function go() { var el = document.getElementById('coach'); if (el) SleepCoach.mount(el); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
