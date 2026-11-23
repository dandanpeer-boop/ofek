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

/* מאמן עישון: שאלון קצר ותוכנית מבוססת מחקר. רץ כולו בדפדפן, לא שולח ולא שומר דבר.
   הראיות מפורטות ב-research/proposals/2026-11-23-coach-smoking.md. אינו נותן אבחנה, ואינו ממליץ על תרופת מרשם מסוימת או מינון.
   קו הסיוע הטלפוני: HOTLINE נשאר null עד שדן מאמת את המספר והשעות באתר gov.il. */
var SmokingCoach = (function () {
  'use strict';
  var HOTLINE = { num: '*6800' }; // המספר אושר על ידי דן ב-23.11.2026. שעות הפעילות לא אומתו ולכן לא מוצגות (אפשר להוסיף hours אחרי אימות)
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var QUESTIONS = [
    { id: 'cigs', type: 'one', q: L('בערך כמה סיגריות ביום?'), o: [['lt10', L('פחות מ-10')], ['mid', L('10–20')], ['gt20', L('יותר מ-20')]] },
    { id: 'first', type: 'one', q: L('כמה זמן אחרי ההתעוררות אתה מעשן את הראשונה?'), o: [['soon', L('עד חצי שעה')], ['later', L('יותר מחצי שעה')]] },
    { id: 'tries', type: 'one', q: L('האם ניסית להפסיק בעבר?'), o: [['never', L('לא')], ['relapse', L('כן, וחזרתי לעשן')], ['hard', L('כן, והיו תסמיני גמילה קשים')]] },
    { id: 'why', type: 'multi', q: L('מה הסיבה לכך שאתה חושב על זה עכשיו? אפשר לסמן כמה.'), o: [
      ['health', L('הבריאות שלי')], ['money', L('כסף')], ['family', L('המשפחה')], ['other', L('סיבה אחרת')]] },
    { id: 'trig', type: 'multi', q: L('מתי הכי קשה בלי סיגריה? אפשר לסמן כמה.'), o: [
      ['meal', L('אחרי ארוחה')], ['coffee', L('עם קפה')], ['stress', L('בלחץ')], ['social', L('בחברה או עם אלכוהול')],
      ['bored', L('משעמום')], ['drive', L('בנהיגה')]] },
    { id: 'flags', type: 'multi', q: L('האם אחד מאלה נכון לגביך?'), o: [
      ['preg', L('אני בהריון, מתכננת הריון או מניקה')], ['heart', L('יש לי מחלת לב, או שהיה לי אירוע לבבי')],
      ['mental', L('אני נוטל/ת תרופות נפשיות או מטופל/ת בגלל מצב נפשי')], ['chronic', L('יש לי מחלה כרונית אחרת')]] },
    { id: 'ready', type: 'one', q: L('עד כמה אתה מוכן להפסיק?'), o: [['decided', L('כבר החלטתי')], ['thinking', L('שוקל')], ['curious', L('רק מתעניין')]] }
  ];

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

  var TRIG = {
    meal: L('אחרי ארוחה: לקום מהשולחן מיד ולעשות משהו אחר, כמו לצחצח שיניים או לשטוף כלים.'),
    coffee: L('עם קפה: לשנות את ההרגל (תה, מקום אחר, שעה אחרת), כי הקפה הוא טריגר קבוע.'),
    stress: L('בלחץ: להכין מראש תגובה אחרת לרגע הלחץ, כמו הליכה קצרה, מים או כמה נשימות איטיות.'),
    social: L('בחברה או עם אלכוהול: לספר לחברים שאתם מפסיקים, ובהתחלה להימנע ממצבים שבהם הכי קשה.'),
    bored: L('משעמום: לתכנן פעילות קטנה מראש, כמו הליכה או טלפון לחבר.'),
    drive: L('בנהיגה: להוציא את הסיגריות והמצית מהרכב ולהכין מסטיק או משהו אחר בהישג יד.')
  };

  function plan(a) {
    var safety = [], steps = [], f = function (v) { return has(a, 'flags', v); };
    if (f('preg')) safety.push([L('הריון והנקה'), [L('בהריון ובהנקה כדאי להיוועץ ברופא/ה או באחות לפני כל טיפול. ליווי בשיחות מומלץ, ובנוגע לתרופות אין כיום די ראיות לבטיחות או לתועלת בהריון.')]]);
    if (f('heart')) safety.push([L('מחלת לב'), [L('אם יש לכם מחלת לב, קבלו ייעוץ רפואי לפני תחליפי ניקוטין או תרופות. בסקירת Cochrane נרשמו בתחליפי ניקוטין יותר כאבי חזה ודפיקות לב.')]]);
    if (f('mental')) safety.push([L('בריאות הנפש'), [L('אם אתם נוטלים תרופות נפשיות או מטופלים בגלל מצב נפשי, התייעצו עם הרופא/ה לפני שמתחילים, כדי שילוו אתכם בתהליך.')]]);
    if (f('chronic')) safety.push([L('מחלה כרונית'), [L('עם מחלה כרונית כדאי לשלב רופא/ה בתהליך מההתחלה, כדי שיתאים את הצעדים והטיפול למצב שלכם.')]]);
    if (a.cigs === 'gt20' || a.first === 'soon' || a.tries === 'hard')
      safety.push([L('כדאי לשלב רופא/ה מההתחלה'), [L('לפי התשובות שלך, כדאי לשלב רופא/ה בתהליך מההתחלה. זה לא אבחנה, אלא המלצה כללית כשהעישון כבד או כשהיו קשיים בניסיון קודם.')]]);

    var reasons = (a.why || []).filter(function (r) { return r !== 'other'; });
    var intro = a.ready === 'curious' ? L('אין חובה להחליט עכשיו. אפשר להתחיל בהיכרות עם האפשרויות ולחזור כשתרצו.') :
      a.ready === 'decided' ? L('ההחלטה כבר אצלכם, והצעדים הבאים עוזרים להפוך אותה לתוכנית.') : L('לשקול זה צעד ראשון. אלה הצעדים שכדאי להכיר.');

    steps.push([L('לא עושים את זה לבד'), [
      L('ליווי מקצועי מעלה את הסיכוי להפסיק. בסקירות Cochrane, ייעוץ אישי היה יעיל בכ-1.6 פעמים מאשר מגע מינימלי, ושילוב של ליווי ותרופה היה יעיל בכ-1.8 פעמים מייעוץ קצר או טיפול רגיל. אלה יחסי סיכוי להצלחה, ולא אחוז ההצלחה עצמו. אפשר לבחור מה שנוח: פגישה, קבוצה או שיחות טלפון.'),
      HOTLINE ? L('קו סיוע טלפוני: ') + HOTLINE.num + (HOTLINE.hours ? ' (' + HOTLINE.hours + ')' : '') : L('אפשר לשאול בקופת החולים על שירותי ליווי לגמילה מעישון.')]]);
    steps.push([L('תחליפי ניקוטין'), [L('תחליפי ניקוטין (מדבקות, מסטיקים, לכסניות) מעלים את הסיכוי להפסיק בכ-1.5 פעמים. שילוב של מדבקה עם צורה מהירת פעולה עבד טוב יותר מצורה אחת. כדאי לשאול רוקח/ה או רופא/ה איך להשתמש בהם.')]]);
    steps.push([L('שיחה עם רופא/ה על תרופות'), [L('קיימות גם תרופות מרשם לגמילה. בסקירות הן נמצאו יעילות, וחלקן יעילות יותר מתחליפי ניקוטין לבדם, אבל הן מתאימות רק לחלק מהאנשים, ולכן זו שיחה עם רופא/ה. אנחנו לא ממליצים על תרופה מסוימת ולא על מינון.')]]);
    var trig = (a.trig || []).filter(function (k) { return TRIG[k]; }).map(function (k) { return TRIG[k]; });
    steps.push([L('לתכנן את הרגעים הקשים'), [L('רוב הקושי מגיע ברגעים קבועים. כדאי להחליט מראש מה תעשו במקום סיגריה. אלה רעיונות מעשיים, ולא תוצאות של מחקר:')].concat(trig.length ? trig : [L('בחרו שניים או שלושה רגעים קשים והכינו לכל אחד מהם תגובה אחרת.')])]);
    steps.push([L('אם החלקתם'), [L('החלקה לא מבטלת את מה שהשגתם עד עכשיו, ואפשר לנסות שוב. כדאי לדבר עם יועץ או רופא/ה: תרופות נבדקו גם למניעת חזרה, ואילו תוכנית התנהגותית נוספת לבדה לא הוכחה כמוסיפה.')]]);
    steps.push([L('מה זה שווה'), [L('במחקר של Jha (NEJM, 2013) מי שהפסיק לעשן בגיל 45–54 הרוויח כ-6 שנים, ומי שהפסיק לפני גיל 40 נמנע מכ-90% מעודף הסיכון.')]]);

    var out = '<div class="cplan"><h2>' + esc(L('התוכנית שלך')) + '</h2>' +
      '<p class="muted">' + esc(L('לפי התשובות שלך. זה מידע כללי מבוסס מחקר, לא אבחנה ולא תחליף לרופא/ה.')) + '</p>' + para(intro);
    if (reasons.length) out += para(L('מה שהניע אותך: ') + reasons.map(function (r) { return { health: L('הבריאות'), money: L('כסף'), family: L('המשפחה') }[r]; }).join(', ') + '.');
    if (safety.length) out += '<section class="csafe"><h2>' + esc(L('קודם כול: כדאי לבדוק עם רופא/ה')) + '</h2><ul class="clist">' + safety.map(function (x) { return block(x[0], x[1]); }).join('') + '</ul></section>';
    out += '<section><h2>' + esc(L('מה לנסות')) + '</h2><ol class="clist">' + steps.map(function (x) { return block(x[0], x[1]); }).join('') + '</ol></section>';
    out += para(L('שאלות על סיגריה אלקטרונית או על תרופה מסוימת: כדאי לשוחח עם רופא/ה. אנחנו לא ממליצים עליהן כאן.')) +
      '<p><a href="' + esc(SiteURL('topic', 'habits')) + '">' + esc(L('למדריך ההרגלים המלא, עם כל המקורות')) + '</a></p>' +
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

/* מאמן משקל ותזונה (גרסה 2, אחרי סבב ראשון של ועדת המומחים 23.11.2026): שאלון קצר ותוכנית מבוססת מחקר. רץ כולו בדפדפן, לא שולח ולא שומר דבר.
   הראיות: research/proposals/2026-11-23-coach-weight-nutrition.md. הביקורות והאיחוד: research/committee/coaches/weight/. אין יעדי קלוריות, אין תרופה או מינון, אין הבטחת תוצאה.
   עוצר (בלי תוכנית) ב: גיל מתחת ל-18, גיל 65 ומעלה (מסלול נפרד), משקל נמוך (מתחת ל-18.5, או מתחת ל-20 כשהמטרה היא ירידה), סימנים של קושי עם אוכל,
   סוכרת עם תרופות, הריון/הנקה, מחלת כליות, ירידה לא מוסברת במשקל, ניתוח בריאטרי או תרופה להורדת משקל, וסימנים לבביים.
   BMI מעל 35 הוא אזהרה רכה (הסף הוא הצעה של דן). בדיקת ההפרעות אכילה היא שאלה נפרדת עם כמה פריטי התנהגות. */
var WeightCoach = (function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var QUESTIONS = [
    { id: 'age', type: 'num', q: L('גיל בשנים'), min: 10, max: 110 },
    { id: 'height', type: 'num', q: L('גובה בסנטימטרים (אפשר לדלג)'), min: 120, max: 230 },
    { id: 'weight', type: 'num', q: L('משקל בקילוגרמים (אפשר לדלג)'), min: 30, max: 300 },
    { id: 'goal', type: 'one', q: L('מה המטרה?'), o: [
      ['lose', L('להוריד משקל')], ['eat', L('לשפר את התזונה, בלי להתמקד במשקל')], ['keep', L('לשמור על המשקל')], ['unsure', L('לא בטוח/ה')]] },
    { id: 'tries', type: 'one', q: L('האם ניסית להוריד משקל בעבר?'), o: [
      ['never', L('לא')], ['regain', L('כן, והמשקל חזר')], ['kept', L('כן, ושמרתי על התוצאה')]] },
    { id: 'drinks', type: 'one', q: L('כמה משקאות ממותקים (קולה, מיץ, משקאות אנרגיה) בדרך כלל ביום?'), o: [
      ['none', L('כמעט אף אחד')], ['some', L('אחד או שניים')], ['many', L('שלושה או יותר')]] },
    { id: 'alc', type: 'one', q: L('כמה משקאות אלכוהוליים בשבוע?'), o: [
      ['none', L('אף אחד')], ['low', L('עד 7')], ['high', L('יותר מ-7')]] },
    { id: 'proc', type: 'one', q: L('באיזו תדירות אתה אוכל מזון מהיר, חטיפים או מזון מוכן ארוז?'), o: [
      ['rare', L('לעיתים רחוקות')], ['some', L('כמה פעמים בשבוע')], ['often', L('כמעט כל יום')]] },
    { id: 'act', type: 'one', q: L('כמה דקות פעילות גופנית בשבוע (הליכה מהירה, ריצה, אופניים)?'), o: [
      ['low', L('פחות מ-150')], ['mid', L('150–300')], ['high', L('יותר מ-300')]] },
    { id: 'str', type: 'one', q: L('האם אתה עושה אימוני כוח?'), o: [['yes', L('כן')], ['no', L('לא')]] },
    { id: 'eat', type: 'multi', q: L('בתקופה האחרונה, האם אחד מאלה נכון לגביך?'), o: [
      ['restrict', L('אני מגביל/ה מאוד את האוכל, מדלג/ת על ארוחות או מפחד/ת מסוגי אוכל מסוימים')],
      ['binge', L('יש לי התקפי אכילה שבהם אני מרגיש/ה שאין לי שליטה')],
      ['purge', L('אני גורם/ת להקאה, או משתמש/ת בכדורי הרזיה, משלשלים או פעילות מוגזמת כדי לפצות על אכילה')],
      ['obsess', L('אני סופר/ת קלוריות או שוקל/ת את עצמי בכפייתיות, או שמחשבות על אוכל ומשקל תופסות אותי רוב היום')],
      ['clean', L('אני נמנע/ת מאוד מאוכל שנחשב לא בריא או לא נקי, ומרגיש/ה חרדה או אשמה כשאני אוכל/ת אותו')],
      ['past', L('אובחנה אצלי בעבר הפרעת אכילה')]] },
    { id: 'flags', type: 'multi', q: L('האם אחד מאלה נכון לגביך?'), o: [
      ['minor', L('אני מתחת לגיל 18')],
      ['preg', L('אני בהריון, מתכננת הריון או מניקה')],
      ['insulin', L('יש לי סוכרת ואני נוטל/ת תרופות לסוכרת (אינסולין או כדורים)')],
      ['kidney', L('יש לי מחלת כליות')],
      ['loss', L('ירדתי במשקל מהר ובלי סיבה ברורה')],
      ['bariatric', L('עברתי ניתוח בריאטרי, או שאני נוטל/ת תרופה להורדת משקל')],
      ['heart', L('יש לי מחלת לב, או שיש לי כאבים בחזה, דפיקות לב חזקות, עילפון או קוצר נשימה')],
      ['gall', L('היו לי אבנים בכיס המרה או התקפי כאב בכיס המרה')],
      ['meds', L('אני נוטל/ת תרופות קבועות נוספות (למשל נוגדי קרישה, תרופות ללחץ דם או תרופות פסיכיאטריות)')]] }
  ];

  var answers = {};
  function formHTML() {
    return QUESTIONS.map(function (q) {
      if (q.type === 'num') {
        return '<fieldset class="cq"><legend>' + esc(q.q) + '</legend><input type="number" inputmode="decimal" step="any" name="' + q.id + '" min="' + q.min + '" max="' + q.max + '" dir="ltr" style="max-width:8rem"></fieldset>';
      }
      return '<fieldset class="cq"><legend>' + esc(q.q) + '</legend>' + q.o.map(function (o) {
        return '<label class="copt"><input type="' + (q.type === 'one' ? 'radio' : 'checkbox') + '" name="' + q.id + '" value="' + o[0] + '"> <span>' + esc(o[1]) + '</span></label>';
      }).join('') + '</fieldset>';
    }).join('');
  }
  function collect(root) {
    var a = {};
    QUESTIONS.forEach(function (q) {
      if (q.type === 'num') {
        var el = root.querySelector('input[name="' + q.id + '"]'), n = el && el.value !== '' ? Number(el.value) : NaN;
        a[q.id] = isFinite(n) && n >= q.min && n <= q.max ? n : undefined;
        return;
      }
      var els = root.querySelectorAll('input[name="' + q.id + '"]:checked'), v = [];
      for (var i = 0; i < els.length; i++) v.push(els[i].value);
      a[q.id] = q.type === 'one' ? (v[0] || '') : v;
    });
    return a;
  }
  function has(a, id, v) { return (a[id] || []).indexOf(v) >= 0; }
  function para(t) { return t ? '<p>' + esc(t) + '</p>' : ''; }
  function block(title, bodies) { return '<li><h3>' + esc(title) + '</h3>' + bodies.map(para).join('') + '</li>'; }
  function resetBtn() { return '<div class="cta-row"><button type="button" class="btn ghost" id="coach-reset">' + esc(L('התחלה מחדש')) + '</button></div>'; }

  function plan(a) {
    var f = function (v) { return has(a, 'flags', v); };
    var bmi = a.height && a.weight ? a.weight / Math.pow(a.height / 100, 2) : null;
    var lose = a.goal === 'lose';
    var safety = [], stop = false;
    if (f('minor') || (a.age !== undefined && a.age < 18)) { stop = true; safety.push([L('המאמן הזה מיועד למבוגרים'), [L('המאמן הזה מיועד למבוגרים בלבד. בגיל צעיר כדאי להתייעץ עם רופא/ת הילדים או עם דיאטן/ית.')]]); }
    if (a.age !== undefined && a.age >= 65) { stop = true; safety.push([L('בגיל 65 ומעלה'), [L('בגיל 65 ומעלה ירידה במשקל אינה תמיד מומלצת, כי חלק מהירידה הוא מסת שריר. לכן לא נציג כאן תוכנית ירידה. מה שכדאי: לאכול מספיק, לא לוותר על חלבון, להמשיך בתנועה ובאימוני כוח ואיזון, ולבדוק עם רופא/ה או דיאטן/ית לפני שמנסים להוריד משקל. כמה חלבון מתאים לכם, כדאי לברר עם דיאטן/ית.')]]); }
    if (bmi !== null && (bmi < 18.5 || (lose && bmi < 20))) { stop = true; safety.push([L('משקל נמוך'), [L('לפי הגובה והמשקל שהוזנו, המשקל נמוך או קרוב לתחתית הטווח התקין. במצב כזה ירידה במשקל אינה מומלצת, ויש גם סיבות רפואיות למשקל נמוך. כדאי לדבר עם רופא/ה לפני כל שינוי.')]]); }
    if ((a.eat || []).length) { stop = true; safety.push([L('קושי עם אוכל'), [L('מהתשובות שלכם ייתכן שיש קושי עם אוכל, ואז תוכנית לירידה במשקל עלולה להחמיר אותו. לכן לא נציג תוכנית. זה לא אומר שמשהו לא בסדר אצלכם, ואפשר לקבל עזרה. כדאי לפנות לרופא/ת המשפחה ולבקש הפניה לדיאטן/ית או למטפל/ת המתמחים בהפרעות אכילה.'), L('אם מצבכם הגופני מדאיג (עילפון, כאבים בחזה, חולשה קשה), או אם עולות מחשבות לפגוע בעצמכם, פנו למיון או למד"א.')]]); }
    if (f('insulin')) { stop = true; safety.push([L('סוכרת וטיפול תרופתי'), [L('כשנוטלים תרופות לסוכרת, שינוי בתזונה או ירידה במשקל עלולים לדרוש התאמת טיפול. אין לשנות לבד. כדאי להתייעץ עם הרופא/ה המטפל/ת לפני כן.')]]); }
    if (f('preg')) { stop = true; safety.push([L('הריון והנקה'), [L('בהריון ובהנקה נדרשות המלצות מותאמות. אנחנו לא מציגים כאן תוכנית ירידה. כדאי להתייעץ עם רופא/ה או דיאטן/ית.')]]); }
    if (f('kidney')) { stop = true; safety.push([L('מחלת כליות'), [L('במחלת כליות יש מגבלות תזונתיות, בעיקר סביב חלבון, שדורשות התאמה אישית. כדאי להתייעץ עם רופא/ה או דיאטן/ית כליות לפני שינוי.')]]); }
    if (f('loss')) { stop = true; safety.push([L('ירידה מהירה בלי סיבה'), [L('ירידה במשקל בלי כוונה ובלי סיבה ברורה היא סיבה לבדיקה רפואית. המאמן הזה אינו מתאים למצב כזה.')]]); }
    if (f('bariatric')) { stop = true; safety.push([L('ניתוח בריאטרי או תרופה להורדת משקל'), [L('אחרי ניתוח בריאטרי, או בזמן טיפול תרופתי להורדת משקל, התזונה והמשקל נקבעים עם הצוות המטפל. כדאי להתייעץ איתם ולא להסתמך על תוכנית כללית.')]]); }
    if (f('heart')) { stop = true; safety.push([L('מחלת לב או תסמינים'), [L('מחלת לב, או כאבים בחזה, דפיקות לב חזקות, עילפון או קוצר נשימה, הם סיבה לפנות לרופא/ה לפני שמשנים תזונה או פעילות. אם התסמינים מופיעים עכשיו, פנו למיון או למד"א.')]]); }

    var out = '<div class="cplan" id="coach-result"><h2>' + esc(stop ? L('מה עושים עכשיו') : L('התוכנית שלך')) + '</h2>' +
      '<p class="muted">' + esc(L('לפי התשובות שלך. זה מידע כללי מבוסס מחקר, לא אבחנה ולא תחליף לרופא/ה או לדיאטן/ית.')) + '</p>';
    if (stop) {
      return out + '<section class="csafe"><h2>' + esc(L('קודם כול: כדאי לדבר עם איש מקצוע')) + '</h2><ul class="clist">' + safety.map(function (x) { return block(x[0], x[1]); }).join('') + '</ul></section>' +
        para(L('לכן אנחנו לא מציגים תוכנית. המאמן הזה כללי, ולא מחליף ייעוץ אישי.')) + resetBtn() + '</div>';
    }

    var soft = [];
    if (a.age === undefined) soft.push([L('לא הוזן גיל'), [L('לא הוזן גיל. המאמן הזה מיועד לבני 18 עד 64. אם אתם מתחת לגיל 18 או בני 65 ומעלה, התוכנית כאן לא מתאימה.')]]);
    if (lose && bmi === null) soft.push([L('לא הוזנו גובה ומשקל'), [L('לא הוזנו גובה ומשקל, ולכן אי אפשר לבדוק אם ירידה במשקל מתאימה לכם. אם המשקל נמוך או קרוב לתחתית הטווח התקין, ירידה אינה מומלצת. כדאי לדבר עם רופא/ה.')]]);
    if (bmi !== null && bmi >= 18.5 && bmi < 20 && !lose) soft.push([L('משקל קרוב לתחתית הטווח'), [L('לפי הגובה והמשקל שהוזנו, המשקל קרוב לתחתית הטווח התקין. התוכנית כאן אינה נועדה להוריד משקל. אם יש ירידה לא מכוונת, תיאבון נמוך או מחלה, כדאי לדבר עם רופא/ה.')]]);
    if (f('gall') && lose) soft.push([L('אבנים בכיס המרה'), [L('לפי NIDDK, ירידה מהירה במשקל עלולה להעלות את הסיכוי לבעיות בכיס המרה, ולכן עדיף קצב איטי. כדאי לשוחח עם רופא/ה לפני שמתחילים.')]]);
    if (f('meds')) soft.push([L('תרופות קבועות'), [L('שינוי משמעותי בתזונה או בירידה במשקל עשוי להשפיע על חלק מהתרופות הקבועות. כדאי לשוחח עם רופא/ה או רוקח/ת לפני שמשנים.')]]);
    if (bmi !== null && bmi >= 45) soft.push([L('כדאי לבדוק את הנתונים'), [L('הגובה והמשקל שהוזנו נותנים BMI גבוה במיוחד. כדאי לוודא שהזנתם סנטימטרים וקילוגרמים (ולא אינצ או פאונד).')]]);
    if (bmi !== null && bmi > 35) soft.push([L('ייעוץ מקצועי יכול לעזור'), [L('כשהמשקל גבוה יותר, ייעוץ מקצועי עשוי להועיל, כולל תוכניות מובנות עם ליווי ואפשרויות נוספות. אפשר להשתמש בהצעות כאן בנוסף לשיחה עם רופא/ה, ולא במקומה.')]]);
    var steps = [];
    if (lose) {
      steps.push([L('מתחילים ביעד קטן'), [L('אפשר להתחיל בקטן. במחקרים, ירידה של 3% עד 5% מהמשקל, אם היא נשמרת, קשורה לשיפור בסוכר ובטריגליצרידים, ובירידה של כ-5% גם בלחץ הדם. זה נכון בעיקר לאנשים עם עודף משקל או גורמי סיכון. קצב הירידה שונה מאדם לאדם. אצל חלק היא מתחילה מהר ומתמתנת אחרי כחצי שנה, וגם זה נורמלי ואינו כישלון.'),
        L('הנחיות בריאות בריטיות מציינות קצב של כחצי ועד קילוגרם בשבוע כקצב סביר, ומזהירות מירידה פתאומית בדיאטות. אין צורך למהר.')]]);
    }
    steps.push(lose || a.goal === 'keep'
      ? [L('תזונה שאפשר להתמיד בה'), [L('אין עדות שדיאטה אחת מנצחת. בסקירת Cochrane שהשוותה דיאטות דלות פחמימות לדיאטות מאוזנות, ההבדל בירידה במשקל היה קטן, בערך קילוגרם או פחות. מה שחשוב הוא דפוס שמתאים לך ושאפשר להמשיך בו לאורך זמן.'),
        L('בניסוי PREDIMED, אנשים בני 55 עד 80 בסיכון לבבי גבוה שאכלו תזונה ים-תיכונית עם שמן זית כתית או אגוזים חוו פחות אירועי לב ושבץ. ההפרש המוחלט היה קטן. הניסוי לא נועד להוריד משקל, ולכן אנחנו לא מבטיחים ירידה, אבל זה דפוס עם ראיות לבריאות הלב.')]]
      : [L('תזונה שאפשר להתמיד בה, בלי להתמקד במשקל'), [L('אין עדות שדיאטה אחת מנצחת. מה שחשוב הוא דפוס שמתאים לך ושאפשר להמשיך בו לאורך זמן, בלי איסורים ובלי ספירה.'),
        L('בניסוי PREDIMED, אנשים בני 55 עד 80 בסיכון לבבי גבוה שאכלו תזונה ים-תיכונית עם שמן זית כתית או אגוזים חוו פחות אירועי לב ושבץ. ההפרש המוחלט היה קטן. זה דפוס עם ראיות לבריאות הלב, ואפשר להתחיל ממנו בלי לשנות הכול.')]]);
    if (a.act !== 'high' || a.str === 'no') {
      var mv = [L('ההנחיות ממליצות על לפחות 150 דקות בשבוע של פעילות בינונית, כמו הליכה מהירה. אפשר להתחיל מ-10 דקות ולהוסיף.')];
      if (lose || a.goal === 'keep') mv[0] = L('ההנחיות ממליצות על לפחות 150 דקות בשבוע של פעילות בינונית, כמו הליכה מהירה. כדי לשמור על משקל שירד לאורך שנים מדברים על 200 עד 300 דקות בשבוע. אפשר להתחיל מ-10 דקות ולהוסיף.');
      if (a.str === 'no' && lose) mv.push(L('כשיורדים במשקל, חלק מהירידה היא מסת שריר. בניסוי אחד באנשים מבוגרים עם השמנה, שירדו כ-9% מהמשקל, מי שהוסיפו אימוני כוח איבדו פחות מסת גוף רזה (2% עד 3% לעומת 5% באימון אירובי בלבד). לא ידוע אם זה נכון גם לצעירים. בשאלה כמה חלבון מתאים לכם, כדאי להתייעץ עם דיאטן/ית.'));
      steps.push([L('תנועה ואימוני כוח'), mv]);
    }
    if (a.drinks === 'some' || a.drinks === 'many' || ((lose || a.goal === 'keep') && (a.alc === 'low' || a.alc === 'high'))) {
      var dr = [];
      if (a.drinks === 'some' || a.drinks === 'many') dr.push(L('במחקרי עוקבה, מי ששתה בדרך כלל 1–2 משקאות ממותקים ביום חלה בסוכרת סוג 2 בשכיחות גבוהה ב-26% בהשוואה למי שכמעט לא שתה. זה קשר סטטיסטי ממחקרי תצפית, ולא הוכחה שהמשקאות גרמו לכך. החלפה במים, סודה או תה לא ממותק היא אחד הצעדים הקלים להתחיל בהם.'));
      if ((lose || a.goal === 'keep') && (a.alc === 'low' || a.alc === 'high')) dr.push(L('לאלכוהול יש כ-7 קלוריות לגרם. כוס יין (175 מ"ל) יכולה להכיל עד 158 קלוריות, ופינט בירה עד 222. הקשר בין שתייה לעלייה במשקל במחקרים אינו עקבי, והוא ברור יותר בשתייה מרובה.'));
      steps.push([L('משקאות'), dr]);
    }
    if ((lose || a.goal === 'keep') && (a.proc === 'often' || a.proc === 'some')) steps.push([L('מזון אולטרה-מעובד, בזהירות'), [L('בניסוי אשפוז קטן של 20 מבוגרים, שבו כל אחד אכל בשני התנאים בתורו, בדיאטה עתירת מזון אולטרה-מעובד אכלו כ-500 קלוריות ביום יותר ועלו כ-0.9 ק"ג בשבועיים (ובדיאטה הלא מעובדת ירדו כ-0.9 ק"ג). רוב הראיות האחרות הן מחקרי תצפית באיכות נמוכה, ואין עדיין הוכחה שהמעבוד עצמו הוא הסיבה. אפשר לשים לב כמה מהאוכל מוכן, ארוז וקל לאכול ממנו הרבה.')]]);
    if (a.goal === 'keep' || a.tries === 'regain' || lose) steps.push([L('שמירה על המשקל'), [L('שמירה על משקל לאורך זמן היא אתגר בפני עצמו. ההנחיות ממליצות על תוכנית שמירה של לפחות שנה, עם מעקב קבוע ופעילות גבוהה יותר. אם ניסיתם בעבר והמשקל חזר, זו תופעה מוכרת ולא סימן שמשהו לא בסדר אצלכם.')]]);
    steps = steps.slice(0, 6);

    if (soft.length) out += '<section class="csafe"><h2>' + esc(L('כדאי לשים לב')) + '</h2><ul class="clist">' + soft.map(function (x) { return block(x[0], x[1]); }).join('') + '</ul></section>';
    out += '<section><h2>' + esc(L('מה לנסות')) + '</h2><ol class="clist">' + steps.map(function (x) { return block(x[0], x[1]); }).join('') + '</ol></section>';
    if (lose) out += para(L('דיאטות דלות מאוד בקלוריות (פחות מ-800 קלוריות ביום) מתאימות רק במקרים מוגבלים ובמסגרת רפואית עם ניטור, לפי הנחיית AHA. אל תנסו זאת לבד.'));
    if (lose && bmi !== null && bmi >= 30) out += para(L('קיימות גם תרופות להשמנה. הן נרשמות רק על ידי רופא/ה, ויש להן תופעות לוואי והתוויות נגד. לפי הנחיית AHA/ACC/TOS מ-2013 (דעת מומחים, ייתכן שהידע התעדכן מאז), אפשר לשקול תרופה כתוספת לשינוי אורח חיים כש-BMI הוא 30 ומעלה, או 27 ומעלה עם מצב רפואי נלווה. זו אינה המלצה אישית, ואנחנו לא ממליצים על תרופה או מינון. אם זה רלוונטי, שאלו את הרופא/ה גם מה קורה אחרי שמפסיקים.'));
    out += para(L('המאמן הזה כללי, ולא מחליף ייעוץ אישי. אם יש לכם מצב רפואי, אתם נוטלים תרופות או שאתם לא בטוחים, כדאי להתייעץ עם רופא/ה או דיאטן/ית לפני שמשנים משמעותית את התזונה. אם מופיעים כאבים בחזה, עילפון או ירידה מהירה בלי סיבה, פנו לרופא/ה.')) +
      '<p><a href="' + esc(SiteURL('topic', 'weight')) + '">' + esc(L('למדריך המשקל המלא, עם כל המקורות')) + '</a></p>' + resetBtn() + '</div>';
    return out;
  }

  function mount(root) {
    root.innerHTML = '<form class="coachform" id="coach-form">' + formHTML() +
      '<p class="small muted">' + esc(L('אפשר לדלג על שאלות. התשובות לא נשלחות לשום מקום ולא נשמרות.')) + '</p>' +
      '<div class="cta-row"><button type="submit" class="btn primary">' + esc(L('בנו לי תוכנית')) + '</button></div></form><div id="coach-out" aria-live="polite" tabindex="-1"></div>';
    var form = document.getElementById('coach-form'), out = document.getElementById('coach-out');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      answers = collect(form);
      out.innerHTML = plan(answers);
      form.style.display = 'none';
      out.scrollIntoView();
      out.focus();
      document.getElementById('coach-reset').addEventListener('click', function () {
        out.innerHTML = ''; form.reset(); form.style.display = ''; form.scrollIntoView();
      });
    });
  }
  return { mount: mount, plan: plan, QUESTIONS: QUESTIONS };
})();

/* מאמן הפחתת אלכוהול (גרסה 2, אחרי סבב ראשון של ועדת המומחים 23.11.2026): כלי להפחתה ולא תוכנית גמילה.
   גמילה פתאומית אחרי שתייה כבדה עלולה להיות מסוכנת, ולכן מי שהתשובות שלו מצביעות על סיכון מקבל מסך הפניה לרופא/ה ולא תוכנית.
   הספים (מעל 25 משקאות בשבוע, שתייה יומית עם 15 ומעלה בשבוע, 6 משקאות ומעלה באירוע כל יום) הם החלטת תכנון שמרנית ולא סף ממקור,
   ולא נבדקו על ידי רופא/ה. הביקורות: research/committee/coaches/alcohol/review-*.md. אין הוראות גמילה, תרופות או מינונים. רץ בדפדפן, לא שולח ולא שומר דבר. */
var AlcoholCoach = (function () {
  'use strict';
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var QUESTIONS = [
    { id: 'week', type: 'one', q: L('בערך כמה משקאות אלכוהוליים בשבוע? (מנה = כוס יין, בקבוק בירה קטן או כוסית משקה חריף, כ-14 גרם אלכוהול)'), o: [
      ['le7', L('עד 7')], ['8to14', L('8–14')], ['15to25', L('15–25')], ['gt25', L('יותר מ-25')]] },
    { id: 'days', type: 'one', q: L('בכמה ימים בשבוע אתה שותה אלכוהול?'), o: [
      ['d12', L('יום או יומיים')], ['d35', L('שלושה עד חמישה ימים')], ['d67', L('שישה או שבעה ימים')]] },
    { id: 'binge', type: 'one', q: L('באיזו תדירות אתה שותה שישה משקאות או יותר באירוע אחד?'), o: [
      ['never', L('אף פעם')], ['monthly', L('פחות מפעם בשבוע')], ['weekly', L('פעם בשבוע בערך')], ['daily', L('כל יום או כמעט כל יום')]] },
    { id: 'past', type: 'one', q: L('האם בעבר, כשהפחתת או הפסקת לשתות, קרה לך אחד מאלה: רעד בידיים, הזעה, חרדה חזקה, בחילה, הזיות, בלבול או פרכוס?'), o: [
      ['yes', L('כן')], ['no', L('לא')], ['never', L('מעולם לא הפחתתי או הפסקתי')]] },
    { id: 'morning', type: 'one', q: L('האם קורה שאתה שותה בבוקר כדי להרגיע רעד או חרדה, או כדי להתחיל את היום?'), o: [
      ['yes', L('כן')], ['no', L('לא')]] },
    { id: 'health', type: 'multi', q: L('מצב רפואי ותרופות: האם אחד מאלה נכון לגביך?'), o: [
      ['liver', L('יש לי מחלת כבד')],
      ['seiz', L('יש לי אפילפסיה, או שהיה לי פרכוס כלשהו בעבר')],
      ['detox', L('אושפזתי או עברתי גמילה בעבר בגלל אלכוהול')],
      ['crave', L('יש לי חשק חזק לשתות, או שניסיתי להפחית כמה פעמים ולא הצלחתי')],
      ['sed', L('אני נוטל/ת תרופות הרגעה, שינה או חרדה (למשל בנזודיאזפינים)')],
      ['opi', L('אני נוטל/ת תרופות חזקות לכאב, או משתמש/ת בסמים')],
      ['med', L('אני נוטל/ת נוגדי דיכאון או תרופה קבועה אחרת')]] },
    { id: 'life', type: 'multi', q: L('האם אחד מאלה נכון לגביך?'), o: [
      ['minor', L('אני מתחת לגיל 18')],
      ['preg', L('אני בהריון או מתכננת הריון')],
      ['mood', L('יש לי כרגע דיכאון או חרדה קשים')],
      ['harm', L('עולות לי מחשבות על פגיעה עצמית')]] }
  ];

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
  function reset() { return '<div class="cta-row"><button type="button" class="btn ghost" id="coach-reset">' + esc(L('התחלה מחדש')) + '</button></div>'; }
  function emerg() { return '<p><strong>' + esc(L('רעד חזק, בלבול, הזיות או פרכוס הם מצב חירום. פנו למיון או למד"א.')) + '</strong></p>'; }

  // מחזיר { stop: מסך בלי תוכנית, route: צריך רופא/ה, ... }. הכלל: המחמיר מנצח.
  function assess(a) {
    var h = function (v) { return has(a, 'health', v); }, l = function (v) { return has(a, 'life', v); };
    var heavy = a.week === 'gt25' || a.binge === 'daily' || (a.days === 'd67' && (a.week === '15to25' || a.week === '8to14'));
    var untried = a.past === 'never' && (a.week === '15to25' || a.days === 'd67' && a.week !== 'le7');
    var route = a.past === 'yes' || a.morning === 'yes' || heavy || untried || h('detox') || h('seiz') || h('liver') || h('crave') || h('sed') || h('opi') || l('mood');
    var skipped = !a.week || !a.days || !a.binge || !a.past || !a.morning;
    var unsure = a.past === 'never' && (a.week !== 'le7' || a.days === 'd67');
    return { route: route, skipped: skipped, unsure: unsure, harm: l('harm'), preg: l('preg'), minor: l('minor'), sed: h('sed') || h('opi'), hx: h('liver') || h('seiz') || h('detox'), daily: a.days === 'd67' };
  }

  function plan(a) {
    var s = assess(a);
    var out = '<div class="cplan" id="coach-result"><h2>' + esc(s.harm || s.minor || s.route || s.preg ? L('מה עושים עכשיו') : L('התוכנית שלך')) + '</h2>' +
      '<p class="muted">' + esc(L('לפי התשובות שלך. זה כלי להפחתה ולא תוכנית גמילה. זה מידע כללי, לא אבחנה ולא תחליף לרופא/ה.')) + '</p>';

    if (s.minor) {
      return out + '<section class="csafe"><h2>' + esc(L('המאמן הזה מיועד למבוגרים')) + '</h2>' + para(L('המאמן הזה מיועד למבוגרים בלבד. בגיל צעיר כדאי לדבר עם רופא/ת הילדים או עם יועץ/ת. אם קורה משהו מסוכן עכשיו, פנו למיון או למד"א.')) + '</section>' + reset() + '</div>';
    }
    if (s.harm) {
      return out + '<section class="csafe"><h2>' + esc(L('שיתפתם משהו חשוב')) + '</h2>' +
        para(L('מחשבות על פגיעה בעצמכם הן דבר שכדאי לא לשאת לבד, ואפשר לקבל עזרה גם בלי להיות בטוחים מה בדיוק קורה. אם יש סכנה מיידית עכשיו, או אם אתם מרגישים שאולי תפגעו בעצמכם הערב: פנו למיון הקרוב או למד"א, או בקשו מאדם קרוב להישאר איתכם.')) +
        para(L('אפשר גם לדבר עכשיו עם מישהו: ער"ן, עזרה ראשונה נפשית, בטלפון 1201 (וגם בצ\'אט באתר eran.org.il).')) +
        para(L('אם אפשר, הרחיקו מהישג יד דברים שאפשר להזיק בהם לעצמכם, וכדאי לא לשתות הערב אם אתם מרגישים כך. ספרו על המחשבות גם לרופא/ת המשפחה.')) + '</section>' + reset() + '</div>';
    }
    if (s.preg) {
      out += '<section class="csafe"><h2>' + esc(L('הריון')) + '</h2>' +
        para(L('אם את בהריון או מתכננת הריון, ההנחיה הבריטית אומרת שהדרך הבטוחה ביותר היא לא לשתות בכלל. אם שתית כמויות קטנות לפני שידעת על ההריון, ההנחיה אומרת שהסיכון נמוך ככל הנראה. אם קשה לך להפסיק, ספרי על כך לרופא/ה או למיילדת. זה חלק רגיל מהשיחה, ואין צורך להתבייש.')) + '</section>';
      if (s.route) out += para(L('אם את שותה הרבה, אל תפסיקי בבת אחת לבד: פני לרופא/ה או למיילדת בהקדם. זה דחוף, כי הפסקה פתאומית עלולה להיות מסוכנת גם בהריון.'));
      if (!s.route) return out + '<p>' + esc(L('לא נציג כאן תוכנית הפחתה בזמן הריון.')) + '</p>' + reset() + '</div>';
    }
    if (s.route) {
      out += '<section class="csafe"><h2>' + esc(L('לפני שמפחיתים: כדאי לדבר עם רופא/ה')) + '</h2>' +
        para(L('לפי מה שסיפרתם, ייתכן שהגוף רגיל לאלכוהול, או שיש מצב שבו הפחתה עצמאית אינה בטוחה. אצל חלק מהאנשים, הפחתה חדה או הפסקה פתאומית עלולה לגרום לרעד, להזעה, לבלבול, להזיות ואפילו לפרכוסים, ואצל מי שחווה את זה בעבר הסיכון גבוה יותר. זה לא אומר שעשיתם משהו לא בסדר. זה אומר שכדאי שרופא/ה ילווה את התהליך.')) +
        para(L('לכן לא נציג כאן תוכנית להפחתה בכוחות עצמכם. הצעד הכי טוב עכשיו: לקבוע תור לרופא/ת המשפחה ולספר בכנות כמה אתם שותים, ובאילו תרופות ומצבים רפואיים אתם. הרופא/ה יכול/ה גם להסביר אם יש תרופות שיכולות לעזור, וזו החלטה שלו/ה ולא של האתר.'));
      if (s.sed) out += para(L('שילוב של אלכוהול עם תרופות הרגעה, שינה או כאב חזקות, או עם סמים, עלול להיות מסוכן גם בכמויות קטנות יחסית. אל תפסיקו תרופה ואל תשנו מינון בלי רופא/ה, ושאלו את הרופא/ה או הרוקח/ת אם מותר לשתות איתן.'));
      if (s.hx) out += para(L('אם יש מחלת כבד, אפילפסיה או פרכוס בעבר, או אשפוז או גמילה קודמים בגלל אלכוהול, חשוב במיוחד שרופא/ה ילווה את ההפחתה.'));
      out += '<p><strong>' + esc(L('בינתיים, אל תפסיקו בבת אחת בלי רופא/ה, גם אם אתם מרגישים טוב.')) + '</strong></p>' +
        '<p>' + esc(L('אם מופיעים רעד, הזעה חזקה או בלבול כשאתם לא שותים, פנו לרופא/ה באותו יום.')) + '</p>' + emerg() + '</section>' + reset() + '</div>';
      return out;
    }

    // תוכנית (למי שלא מנותב)
    out += '<section class="csafe"><h2>' + esc(L('לפני שמתחילים: כללי בטיחות')) + '</h2>' +
      para(L('אם אתם שותים כל יום, או שנהגתם להרגיש לא טוב כשלא שתיתם, אל תפסיקו בבת אחת בלי רופא/ה, גם אם אתם מרגישים טוב.')) +
      para(L('אם בזמן ההפחתה מופיעים חרדה חזקה בבוקר, הזעה, רעד, בחילה או הקאות: הפסיקו להפחית ופנו לרופא/ה באותו יום.')) + emerg() + '</section>';
    if (s.skipped || s.unsure) out += '<section class="csafe"><h2>' + esc(L('כדאי לדעת')) + '</h2>' + para(L('לא כל שאלות הבטיחות נענו, או שעוד לא ניסיתם להפחית, ולכן אי אפשר לדעת איך הגוף יגיב. אם אתם שותים הרבה או כל יום, או שמופיעים רעד או הזעה כשאתם לא שותים, דברו קודם עם רופא/ה.')) + '</section>';
    if (has(a, 'health', 'med')) out += '<section class="csafe"><h2>' + esc(L('תרופות')) + '</h2>' + para(L('אם אתם נוטלים תרופות מרשם, שאלו את הרופא/ה או הרוקח/ת אם מותר לשתות איתן. בחלק מהתרופות שילוב עם אלכוהול יכול להיות מסוכן, וזה נכון גם אם לא שותים הרבה. אל תפסיקו ואל תשנו תרופה בלי שיחה עם הרופא/ה.')) + '</section>';

    out += para(L('אפשר להתחיל בקטן. אלה צעדים שכדאי להכיר.'));
    var steps = [];
    steps.push([L('גבול מראש ומעקב'), [L('בניסויים על שיחות קצרות עם אנשים ששותים בצורה מסוכנת אבל אינם תלויים באלכוהול, הצריכה ירדה בכ-20 גרם בשבוע בממוצע אחרי שנה (34 מחקרים, 15,197 משתתפים), בהשוואה לקבוצת ביקורת. לא נבדק אם כלי באינטרנט עובד באותו אופן. זה צעד צנוע שמראה ששינוי קטן אפשרי. אפשר לקבוע גבול לפני שיוצאים ולרשום בסוף היום כמה שתיתם. אנחנו לא יודעים אם הרישום עצמו עוזר.')]]);
    steps.push([L('גבול סביר ופיזור'), [L('לפי ההנחיה הבריטית, כדאי לא לעבור באופן קבוע 14 יחידות בשבוע, ולפזר את השתייה באופן שווה על שלושה ימים לפחות. יחידה בריטית היא 8 גרם, ולכן 14 יחידות הן כ-112 גרם, כלומר כ-8 משקאות לפי ההגדרה כאן (כ-14 גרם למשקה), ולא 14 משקאות. במחקר Wood (Lancet 2018) הסיכון לתמותה היה הנמוך ביותר סביב 100 גרם בשבוע או פחות (כ-7 משקאות). זה מחקר תצפיתי על תמותה, ואינו מבטיח שהכמות הזו בטוחה עבורכם. פחות עדיף.')]]);
    steps.push(s.daily
      ? [L('שתייה יומית'), [L('אם אתם שותים כל יום, אל תעשו ימים בלי אלכוהול בבת אחת. אם רוצים להפחית, עשו זאת בהדרגה ועם רופא/ה, ואל תפסיקו בבת אחת.')]]
      : [L('ימים בלי אלכוהול'), [L('כמה ימים קבועים בשבוע בלי אלכוהול, למשל ימים שקל לכם. זו המלצה מקובלת בהנחיות, ולא מחקר שמוכיח שהיא עדיפה על דרכים אחרות.')]]);
    steps.push([L('דברים קטנים שעוזרים'), [L('אפשר לאכול ולשתות כוס מים לפני, להחליף כל כוס שנייה בכוס בלי אלכוהול, לבחור כוס קטנה יותר או משקה חלש יותר, ולספר לחבר או לבן/בת זוג שאתם מפחיתים. אלה טיפים מההנחיות ולא ממחקרים שבדקו כל טיפ בנפרד. לא כל טיפ מתאים לכולם, אפשר לבחור אחד או שניים. אלכוהול בערב עלול לשבש את השינה, בעיקר בחצי השני של הלילה. אם אתם שותים כדי להירגע או כדי לישון, ספרו על זה לרופא/ה: יש דרכים אחרות.')]]);
    out += '<section><h2>' + esc(L('מה לנסות')) + '</h2><ol class="clist">' + steps.map(function (x) { return block(x[0], x[1]); }).join('') + '</ol></section>' +
      para(L('כל צעד קטן נחשב. אם לא הצלחתם, זו לא כישלון אלא מידע על מה קשה לכם. ואם זה קשה, אפשר לבקש עזרה, וזה לא סימן לחולשה. אם אתם מתקשים להפחית שוב ושוב, כדאי לדבר עם רופא/ה.')) +
      '<p><a href="' + esc(SiteURL('topic', 'habits')) + '">' + esc(L('למדריך ההרגלים המלא, עם כל המקורות')) + '</a></p>' + reset() + '</div>';
    return out;
  }

  function mount(root) {
    root.innerHTML = '<form class="coachform" id="coach-form">' + formHTML() +
      '<p class="small muted">' + esc(L('אפשר לדלג על שאלות. התשובות לא נשלחות לשום מקום ולא נשמרות.')) + '</p>' +
      '<div class="cta-row"><button type="submit" class="btn primary">' + esc(L('בנו לי תוכנית')) + '</button></div></form><div id="coach-out" aria-live="polite" tabindex="-1"></div>';
    var form = document.getElementById('coach-form'), out = document.getElementById('coach-out');
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      answers = collect(form);
      out.innerHTML = plan(answers);
      form.style.display = 'none';
      out.scrollIntoView();
      out.focus();
      document.getElementById('coach-reset').addEventListener('click', function () {
        out.innerHTML = ''; form.reset(); form.style.display = ''; form.scrollIntoView();
      });
    });
  }
  return { mount: mount, plan: plan, assess: assess, QUESTIONS: QUESTIONS };
})();

(function () {
  function go() {
    var el = document.getElementById('coach');
    if (!el) return;
    var id = document.body.getAttribute('data-topic');
    if (id === 'smoking') SmokingCoach.mount(el); else if (id === 'weight') WeightCoach.mount(el); else if (id === 'alcohol') AlcoholCoach.mount(el); else SleepCoach.mount(el);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go); else go();
})();
