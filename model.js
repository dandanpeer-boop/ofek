var L = (typeof L !== 'undefined') ? L : function (s) { return s; }; // תרגום (i18n.js); בלעדיו — עברית
/*
 * מנוע החישוב — כל החישוב רץ בדפדפן, שום נתון לא נשלח לשום מקום.
 *
 * שיטה:
 *  1. בסיס: לוח תמותה של WHO (2019) לפי מדינה ומין -> קצב תמותה שנתי לכל גיל.
 *  2. לכל גורם סיכון: יחס סיכונים (Hazard Ratio) ממחקר מפורסם, מנורמל לממוצע
 *     האוכלוסייה (כי לוח התמותה כבר כולל מעשנים, בעלי עודף משקל וכו').
 *  3. מכפילים את קצב התמותה בכל גיל ביחס הסיכונים המשולב, ומחשבים מחדש את
 *     עקומת ההישרדות, תוחלת החיים והאחוזונים.
 *
 * המקורות לכל מספר מפורטים ב-README.md ובמסך התוצאה.
 */
var LifeModel = (function () {
  'use strict';

  var MAX_AGE = 120;

  // ---------- הנחות המודל (לא נלקחו ישירות ממחקר יחיד — ראו README) ----------
  var ASSUME = {
    weights: [1, 0.85],     // משקל הגורם החזק ביותר והשני בחוזקו
    weightRest: 0.7,        // משקל שאר הגורמים (גורמי הסיכון מתואמים זה עם זה)
    minHR: 0.4, maxHR: 8,   // גבולות ליחס הסיכונים המשולב
    fracVascular: 0.30,     // חלק התמותה ממחלות לב וכלי דם (WHO: כ-32% בעולם)
    fracIHD: 0.15,          // חלק התמותה ממחלת לב איסכמית (WHO: כ-16% בעולם)
    bmiMediation: 0.7       // כשיש גם לחץ דם, סוכר ושומנים — חלק מהשפעת ה-BMI כבר נספר דרכם
  };

  // ---------- 1. בסיס: לוח תמותה ----------

  var hazardCache = {};

  function e85FromSlope(m80, b) {
    var S = 1, e = 0;
    // נקודת האמצע של קבוצת 80-84 היא 82.5
    var s85 = 1;
    for (var a = 85; a < MAX_AGE; a++) {
      var mu = Math.min(m80 * Math.exp(b * (a + 0.5 - 82.5)), 1.0);
      e += S * (1 - Math.exp(-mu)) / mu;
      S *= Math.exp(-mu);
    }
    return e / s85;
  }

  /** קצב תמותה שנתי mu[a] לגיל a עד a+1 */
  function baseHazard(country, sex) {
    var key = country + sex;
    if (hazardCache[key]) return hazardCache[key];
    var t = LIFE_TABLES[country][sex];
    var ages = LIFE_TABLE_AGES;
    var mids = [], ms = [];
    for (var i = 0; i < ages.length; i++) {
      var n = (i + 1 < ages.length ? ages[i + 1] : 85) - ages[i];
      mids.push(ages[i] + n / 2);
      ms.push(-Math.log(1 - t.q[i]) / n);
    }
    var last = ms.length - 1;
    // שיפוע גומפרץ מעל גיל 82.5, מכויל כך שתוחלת החיים בגיל 85 תתאים לנתון של WHO
    var lo = 0.02, hi = 0.25;
    for (var k = 0; k < 50; k++) {
      var mid = (lo + hi) / 2;
      if (e85FromSlope(ms[last], mid) > t.e85) lo = mid; else hi = mid;
    }
    var b = (lo + hi) / 2;

    var mu = [];
    for (var a = 0; a < MAX_AGE; a++) {
      var x = a + 0.5, v;
      if (a < 15) {
        // ילדות: ערך קבוע בתוך קבוצת הגיל
        var gi = a < 1 ? 0 : a < 5 ? 1 : a < 10 ? 2 : 3;
        v = ms[gi];
      } else if (x >= mids[last]) {
        v = Math.min(ms[last] * Math.exp(b * (x - mids[last])), 1.0);
      } else {
        // אינטרפולציה לוג-לינארית בין אמצעי קבוצות הגיל
        var j = 4;
        while (j < last && mids[j + 1] <= x) j++;
        if (x <= mids[4]) v = ms[4];
        else {
          var f = (x - mids[j]) / (mids[j + 1] - mids[j]);
          v = Math.exp(Math.log(ms[j]) * (1 - f) + Math.log(ms[j + 1]) * f);
        }
      }
      mu.push(v);
    }
    hazardCache[key] = mu;
    return mu;
  }

  /**
   * עקומת הישרדות מגיל נתון.
   * logHR(age) -> לוגריתם יחס הסיכונים המשולב בגיל הזה (0 = ממוצע האוכלוסייה)
   */
  function survival(mu, age, logHR) {
    var S = [1], e = 0;
    for (var a = age; a < MAX_AGE; a++) {
      var h = mu[a] * Math.exp(logHR ? logHR(a) : 0);
      var s = S[S.length - 1];
      e += s * (h > 1e-12 ? (1 - Math.exp(-h)) / h : 1);
      S.push(s * Math.exp(-h));
    }
    return { S: S, remaining: e, startAge: age };
  }

  /** הגיל שבו ההסתברות לשרוד יורדת ל-p */
  function ageAtSurvival(sv, p) {
    for (var i = 1; i < sv.S.length; i++) {
      if (sv.S[i] <= p) {
        var f = (sv.S[i - 1] - p) / (sv.S[i - 1] - sv.S[i]);
        return sv.startAge + i - 1 + f;
      }
    }
    return MAX_AGE;
  }

  function probReach(sv, target) {
    var i = target - sv.startAge;
    if (i <= 0) return 1;
    return i < sv.S.length ? sv.S[i] : 0;
  }

  // ---------- 2. עזרי גורמי סיכון ----------

  function clamp(x, lo, hi) { return Math.max(lo, Math.min(hi, x)); }
  function isNum(x) { return typeof x === 'number' && isFinite(x); }

  // היחלשות יחסי הסיכון עם הגיל (Prospective Studies Collaboration 2002:
  // ההבדלים היחסיים בגיל 80-89 הם כמחצית מאלה שבגיל 40-49)
  function attStd(a) { return a <= 50 ? 1 : a >= 85 ? 0.5 : 1 - 0.5 * (a - 50) / 35; }
  // עישון: Jha 2013 מצא יחס של ~3 לאורך כל הגילים 25-79, לכן ההיחלשות מאוחרת יותר
  function attLate(a) { return a <= 75 ? 1 : a >= 95 ? 0.5 : 1 - 0.5 * (a - 75) / 20; }

  function interp(points, x) {
    // points: [[x, y], ...] ממוינים; אינטרפולציה לינארית עם קצוות קבועים
    if (x <= points[0][0]) return points[0][1];
    for (var i = 1; i < points.length; i++) {
      if (x <= points[i][0]) {
        var f = (x - points[i - 1][0]) / (points[i][0] - points[i - 1][0]);
        return points[i - 1][1] * (1 - f) + points[i][1] * f;
      }
    }
    return points[points.length - 1][1];
  }

  /** eGFR לפי נוסחת CKD-EPI 2021 (ללא משתנה גזע) */
  function egfr(creat, age, sex) {
    var k = sex === 'f' ? 0.7 : 0.9, alpha = sex === 'f' ? -0.241 : -0.302;
    var r = creat / k;
    return 142 * Math.pow(Math.min(r, 1), alpha) * Math.pow(Math.max(r, 1), -1.2) *
      Math.pow(0.9938, age) * (sex === 'f' ? 1.012 : 1);
  }

  var MGDL_PER_MMOL_CHOL = 38.67;

  // תשעת הערכים הדרושים לגיל הביולוגי: [שדה, שם לתצוגה]
  var PHENO_FIELDS = [['albumin', L('אלבומין')], ['creatinine', L('קריאטינין')], ['glucose', L('גלוקוז')], ['crp', 'CRP'],
    ['lymph', L('אחוז לימפוציטים')], ['mcv', 'MCV'], ['rdw', 'RDW'], ['alp', L('פוספטאזה בסיסית')], ['wbc', L('תאים לבנים (WBC)')]];

  /**
   * Phenotypic Age — הנוסחה כפי שפורסמה בתיקון ל-Liu et al., PLoS Med 2018 (doi:10.1371/journal.pmed.1002760).
   * היחידות בנוסחה: אלבומין g/L, קריאטינין µmol/L, גלוקוז mmol/L, CRP ב-mg/dL (לוגריתם טבעי).
   * מחזיר null אם חסר אחד מתשעת הערכים.
   */
  function phenoAge(inp) {
    for (var i = 0; i < PHENO_FIELDS.length; i++) if (!isNum(inp[PHENO_FIELDS[i][0]])) return null;
    var xb = -19.907
      - 0.0336 * (inp.albumin * 10)
      + 0.0095 * (inp.creatinine * 88.4)
      + 0.1953 * (inp.glucose / 18.016)
      + 0.0954 * Math.log(clamp(inp.crp, 0.1, 100) / 10)
      - 0.0120 * inp.lymph
      + 0.0268 * inp.mcv
      + 0.3306 * inp.rdw
      + 0.00188 * inp.alp
      + 0.0554 * inp.wbc
      + 0.0804 * inp.age;
    var M = 1 - Math.exp(-1.51714 * Math.exp(xb) / 0.0076927);
    M = clamp(M, 1e-9, 1 - 1e-9);
    return 141.50 + Math.log(-0.00553 * Math.log(1 - M)) / 0.09165;
  }

  // ---------- 3. גורמי הסיכון ----------
  // כל גורם מחזיר { id, label, detail, fn(age) -> ln(HR יחסית לממוצע האוכלוסייה) }

  function buildFactors(inp) {
    var F = [], notes = [], derived = {};
    var sex = inp.sex, age = inp.age;

    function add(id, label, detail, fn) { F.push({ id: id, label: label, detail: detail, fn: fn }); }

    // --- גיל ביולוגי (Phenotypic Age): Levine 2018; Liu et al., PLoS Med 2018 ---
    var pheno = phenoAge(inp);
    if (pheno !== null) {
      derived.phenoAge = pheno;
      // 9% עלייה בסיכון לכל שנת גיל ביולוגי מעבר לגיל הכרונולוגי; מנורמל לפיזור משוער באוכלוסייה
      var lnPh = Math.log(1.09) * clamp(pheno - age, -12, 12) - Math.log(1.10);
      add('bioage', L('גיל ביולוגי (בדיקות דם)'), L('גיל ביולוגי ') + pheno.toFixed(1), function (a) { return lnPh * attStd(a); });
    } else {
      var miss = PHENO_FIELDS.filter(function (k) { return !isNum(inp[k[0]]); });
      if (miss.length < PHENO_FIELDS.length - 2 && miss.length) derived.phenoMissing = miss.map(function (k) { return k[1]; });
    }

    // --- הערכה עצמית של הבריאות: DeSalvo et al., J Gen Intern Med 2006 ---
    if (inp.srh) {
      var srhHR = { excellent: 1.0, good: 1.23, fair: 1.44, poor: 1.92 }[inp.srh];
      var srhLbl = { excellent: L('מצוינת'), good: L('טובה'), fair: L('בינונית'), poor: L('גרועה') }[inp.srh];
      // ממוצע אוכלוסייה משוער: 20% מצוינת, 50% טובה, 23% בינונית, 7% גרועה
      var lnSr = Math.log(srhHR / 1.28);
      add('srh', L('הערכה עצמית של הבריאות'), srhLbl, function (a) { return lnSr * attStd(a); });
    }

    // --- עישון: Jha et al., NEJM 2013 ---
    if (inp.smoking) {
      var hrCur = sex === 'f' ? 3.0 : 2.8;
      // שכיחות משוערת באוכלוסייה (גברים: 25% מעשנים, 28% לשעבר; נשים: 15%, 18%)
      var popSmoke = sex === 'f' ? 0.67 + 0.18 * 1.35 + 0.15 * 3.0 : 0.47 + 0.28 * 1.35 + 0.25 * 2.8;
      var hr = 1, det = L('מעולם לא עישנת');
      if (inp.smoking === 'current') { hr = hrCur; det = L('מעשן/ת כיום'); }
      else if (inp.smoking === 'former') {
        var q = isNum(inp.quitAge) ? inp.quitAge : 45;
        // חלק עודף הסיכון שנמנע לפי גיל ההפסקה (נגזר משנות החיים שהורווחו ב-Jha 2013)
        // Jha 2013, Figure 4 (גברים ונשים יחד, מעשנים לשעבר מול מי שמעולם לא עישן): הפסקה בגיל 25-34: 1.0 · 35-44: 1.2 · 45-54: 1.5 · 55-64: 1.7.
        // לגיל 65 ומעלה אין נתון במאמר; 1.9 הוא הנחה (המשך המגמה, מתחת ל-2.8 של מעשנים נוכחיים).
        hr = q < 35 ? 1.0 : q < 45 ? 1.2 : q < 55 ? 1.5 : q < 65 ? 1.7 : 1.9;
        det = L('הפסקת לעשן בגיל ') + q;
      }
      var lnS = Math.log(hr / popSmoke);
      add('smoking', L('עישון'), det, function (a) { return lnS * attLate(a); });
    }

    // --- BMI: Global BMI Mortality Collaboration, Lancet 2016 ---
    var hasBP = isNum(inp.sbp);
    var hasGlu = isNum(inp.glucose) || isNum(inp.hba1c);
    var hasLip = isNum(inp.tc) || isNum(inp.ldl);
    if (isNum(inp.height) && isNum(inp.weight)) {
      var bmi = inp.weight / Math.pow(inp.height / 100, 2);
      derived.bmi = bmi;
      // לוג יחס הסיכונים באמצע כל טווח BMI (ייחוס: 20-25)
      var lnB = interp([[17.5, Math.log(1.51)], [19.25, Math.log(1.13)], [21, 0], [24, 0],
        [26.25, Math.log(1.07)], [28.75, Math.log(1.20)], [32.5, Math.log(1.45)],
        [37.5, Math.log(1.94)], [45, Math.log(2.76)]], bmi);
      if (lnB > 0 && bmi > 25 && hasBP && hasGlu && hasLip) lnB *= ASSUME.bmiMediation;
      var lnBr = lnB - Math.log(1.21); // ממוצע אוכלוסייה משוער לפי התפלגות BMI טיפוסית
      add('bmi', L('משקל (BMI)'), 'BMI ' + bmi.toFixed(1), function (a) { return lnBr * attStd(a); });
    }

    // --- פעילות גופנית: Arem et al., JAMA Intern Med 2015 ---
    if (inp.activity) {
      var actHR = { none: 1.0, low: 0.80, rec: 0.69, high: 0.63, vhigh: 0.61 }[inp.activity];
      var actLbl = { none: L('ללא פעילות'), low: L('פחות מ-150 דק׳ בשבוע'), rec: L('150–300 דק׳ בשבוע'),
        high: L('300–450 דק׳ בשבוע'), vhigh: L('מעל 450 דק׳ בשבוע') }[inp.activity];
      var lnA = Math.log(actHR / 0.785);
      add('activity', L('פעילות גופנית'), actLbl, function (a) { return lnA * attStd(a); });
    }

    // --- אלכוהול: Wood et al., Lancet 2018 ---
    if (inp.alcohol) {
      // יחסי סיכון שנגזרו מהפרשי תוחלת החיים בגיל 40 שדווחו במחקר (חצי שנה / 1-2 שנים / 4-5 שנים)
      var alcHR = { none: 1.0, light: 1.0, mod: 1.05, heavy: 1.16, vheavy: 1.57 }[inp.alcohol];
      var alcLbl = { none: L('לא שותה'), light: L('עד 7 מנות בשבוע'), mod: L('8–14 מנות בשבוע'),
        heavy: L('15–25 מנות בשבוע'), vheavy: L('מעל 25 מנות בשבוע') }[inp.alcohol];
      var lnAl = Math.log(alcHR / 1.012);
      add('alcohol', L('אלכוהול'), alcLbl, function (a) { return lnAl * attStd(a); });
    }

    // --- שינה: Cappuccio et al., Sleep 2010 ---
    if (inp.sleep) {
      var slHR = { short: 1.12, normal: 1.0, long: 1.30 }[inp.sleep];
      var slLbl = { short: L('פחות מ-6 שעות'), normal: L('6–9 שעות'), long: L('מעל 9 שעות') }[inp.sleep];
      var lnSl = Math.log(slHR / 1.029);
      add('sleep', L('שינה'), slLbl, function (a) { return lnSl * attStd(a); });
    }

    // --- פירות וירקות: Wang et al., BMJ 2014 ---
    if (isNum(inp.fruitveg)) {
      var lnFV = Math.log(0.95) * (Math.min(inp.fruitveg, 5) - 3);
      add('fruitveg', L('פירות וירקות'), inp.fruitveg + L(' מנות ביום'), function (a) { return lnFV * attStd(a); });
    }

    // --- בדידות: Holt-Lunstad et al., Perspect Psychol Sci 2015 ---
    if (inp.lonely) {
      var lnL = Math.log((inp.lonely === 'yes' ? 1.26 : 1.0) / 1.052);
      add('social', L('קשרים חברתיים'), inp.lonely === 'yes' ? L('תחושת בדידות תכופה') : L('קשרים חברתיים טובים'),
        function (a) { return lnL * attStd(a); });
    }

    // --- השכלה: IHME-CHAIN Collaborators, Lancet Public Health 2024 ---
    if (isNum(inp.eduYears)) {
      var dy = inp.eduYears - 12.5;
      add('education', L('השכלה'), inp.eduYears + L(' שנות לימוד'), function (a) {
        var r = a < 50 ? 0.029 : a < 70 ? 0.019 : 0.008; // הפחתה בסיכון לכל שנת לימוד, לפי גיל
        return dy * Math.log(1 - r);
      });
    }

    // --- סוכרת: Emerging Risk Factors Collaboration, NEJM 2011 ---
    var diabetic = inp.diabetes === 'yes' || (isNum(inp.glucose) && inp.glucose >= 126) ||
      (isNum(inp.hba1c) && inp.hba1c >= 6.5);
    // --- התקף לב / שבץ / סוכרת יחד: Emerging Risk Factors Collaboration, JAMA 2015 ---
    var cond = inp.conditions || [];
    var hadMI = cond.indexOf('mi') >= 0, hadStroke = cond.indexOf('stroke') >= 0;
    if (hadMI || hadStroke) {
      var key = (diabetic ? 'd' : '') + (hadMI ? 'm' : '') + (hadStroke ? 's' : '');
      var cmHR = { m: 2.0, s: 2.1, dm: 3.7, ds: 3.8, ms: 3.5, dms: 6.9 }[key];
      var cmLbl = [hadMI ? L('התקף לב') : '', hadStroke ? L('אירוע מוחי') : '', diabetic ? L('סוכרת') : ''].filter(Boolean).join(' + ');
      var lnCM = Math.log(cmHR / 1.13);
      add('cardiomet', L('מחלות לב, שבץ וסוכרת'), cmLbl, function (a) { return lnCM * attStd(a); });
    } else if (inp.diabetes || hasGlu) {
      // ERFC 2011 (NEJM): סוכרת HR 1.80; בלי סוכרת, מעל 100 מ"ג/ד"ל (5.6 mmol/L) HR 1.10 לכל 1 mmol/L (18 מ"ג/ד"ל)
      var preHR = (!diabetic && isNum(inp.glucose) && inp.glucose > 100) ? Math.pow(1.10, (Math.min(inp.glucose, 126) - 100) / 18.016) : 1.0;
      var lnD = Math.log((diabetic ? 1.80 : preHR) / 1.08);
      var dDet = diabetic ? (inp.diabetes === 'yes' ? L('סוכרת מאובחנת') : L('ערכים בטווח הסוכרת')) : L('ללא סוכרת');
      add('diabetes', L('סוכר / סוכרת'), dDet, function (a) { return lnD * attStd(a); });
      if (!diabetic && ((isNum(inp.glucose) && inp.glucose >= 100) || (isNum(inp.hba1c) && inp.hba1c >= 5.7))) {
        notes.push(L('ערכי הסוכר שלך בטווח ה"טרום-סוכרת". מחקר ERFC מצא עלייה של כ-10% בסיכון לכל 18 מ"ג/ד"ל מעל 100, והיא נכללת בחישוב (אם הוזן גלוקוז). שווה לעקוב עם רופא/ת המשפחה.'));
      }
      if (diabetic && inp.diabetes !== 'yes') {
        notes.push(L('הערכים שהזנת (גלוקוז בצום 126 ומעלה או HbA1c 6.5% ומעלה) נמצאים בטווח שמוגדר סוכרת. אם לא אובחנת — כדאי לפנות לרופא/ה.'));
      }
    }

    // --- לחץ דם: Prospective Studies Collaboration, Lancet 2002 ---
    if (hasBP) {
      var sbp = clamp(inp.sbp, 115, 190);
      // תמותה וסקולרית מוכפלת לכל 20 ממ"כ; מתורגם לתמותה כללית לפי חלקה של התמותה הווסקולרית
      // 20 ממ"כ סיסטולי שקולים בערך ל-10 ממ"כ דיאסטולי; כשיש שניהם משתמשים בממוצע (PSC 2002)
      var bpExp = (sbp - 125) / 20;
      if (isNum(inp.dbp)) bpExp = (bpExp + (clamp(inp.dbp, 70, 115) - 78) / 10) / 2;
      var hrV = Math.pow(2, bpExp);
      var lnBP = Math.log(1 + ASSUME.fracVascular * (hrV - 1));
      add('bp', L('לחץ דם'), (isNum(inp.dbp) ? inp.sbp + '/' + inp.dbp : L('סיסטולי ') + inp.sbp), function (a) { return lnBP * attStd(a); });
    }

    // --- כולסטרול: Prospective Studies Collaboration, Lancet 2007 ---
    if (hasLip) {
      var diff, cDet;
      if (isNum(inp.tc) && isNum(inp.hdl)) {
        diff = (inp.tc - inp.hdl) / MGDL_PER_MMOL_CHOL - 3.75; cDet = L('כולסטרול שאינו HDL: ') + Math.round(inp.tc - inp.hdl);
        derived.cholRatio = inp.tc / inp.hdl;
      } else if (isNum(inp.tc)) {
        diff = inp.tc / MGDL_PER_MMOL_CHOL - 5.1; cDet = L('כולסטרול כללי ') + inp.tc;
      } else {
        diff = inp.ldl / MGDL_PER_MMOL_CHOL - 3.1; cDet = 'LDL ' + inp.ldl;
      }
      diff = clamp(diff, -2, 3);
      add('chol', L('כולסטרול'), cDet, function (a) {
        // יחס סיכונים לתמותה ממחלת לב איסכמית לכל 1 mmol/L, לפי גיל (0.44 / 0.66 / 0.83 לכל ירידה)
        var per = a < 50 ? 1 / 0.44 : a < 70 ? 1 / 0.66 : 1 / 0.83;
        return Math.log(1 + ASSUME.fracIHD * (Math.pow(per, diff) - 1));
      });
    }

    // --- תפקוד כליות: CKD Prognosis Consortium, Lancet 2010 ---
    if (isNum(inp.creatinine)) {
      var g = egfr(inp.creatinine, age, sex);
      derived.egfr = g;
      var lnG = interp([[15, Math.log(3.14)], [45, Math.log(1.57)], [60, Math.log(1.18)], [75, 0]], g) - Math.log(1.03);
      if (pheno === null) add('kidney', L('תפקוד כליות'), L('eGFR מחושב ') + Math.round(g), function (a) { return lnG * attStd(a); });
    }

    // --- CRP: Emerging Risk Factors Collaboration, Lancet 2010 ---
    if (isNum(inp.crp)) {
      if (inp.crp > 10) notes.push(L('CRP מעל 10 מ"ג/ל׳ מעיד בדרך כלל על דלקת או זיהום חולפים, ולא על הסיכון ארוך הטווח. הערך הוגבל ל-10 בחישוב; מומלץ להזין תוצאה מבדיקה שנעשתה כשהיית בריא/ה.'));
      var crp = clamp(inp.crp, 0.2, 10);
      // 1.34 לכל עלייה של סטיית תקן אחת בלוג CRP (בערך פי 3), אחרי תקנון מלא
      var lnC = Math.log(1.34) * Math.log(crp / 1.5) / Math.log(3);
      if (pheno === null) add('crp', L('דלקתיות (CRP)'), 'CRP ' + inp.crp, function (a) { return lnC * attStd(a); });
    }

    // --- דופק במנוחה: Zhang et al., CMAJ 2016 ---
    if (isNum(inp.rhr)) {
      var lnHRt = Math.log(1.09) * (clamp(inp.rhr, 45, 110) - 70) / 10;
      add('rhr', L('דופק במנוחה'), inp.rhr + L(' פעימות בדקה'), function (a) { return lnHRt * attStd(a); });
    }

    // --- היקף מותניים: Cerhan et al., Mayo Clin Proc 2014 (מתוקנן ל-BMI) ---
    if (isNum(inp.waist)) {
      var wRef = sex === 'f' ? 88 : 97; // ממוצע אוכלוסייה משוער
      var lnW = Math.log(sex === 'f' ? 1.09 : 1.07) * clamp(inp.waist - wRef, -20, 30) / 5;
      add('waist', L('היקף מותניים'), inp.waist + L(' ס"מ'), function (a) { return lnW * attStd(a); });
    }

    // --- כושר אירובי (VO2max): Kodama et al., JAMA 2009; ערכי ייחוס: FRIEND, Kaminsky 2015 ---
    if (isNum(inp.vo2max)) {
      // חציון לפי גיל ומין: Kaminsky 2015 (FRIEND, הליכון), Table 3, אחוזון 50 לכל עשור (אומת מול המאמר)
      var vTab = sex === 'f' ? [37.6, 30.2, 26.7, 23.4, 20.0, 18.3] : [48.0, 42.4, 37.8, 32.6, 28.2, 24.4];
      var vExp = interp(vTab.map(function (v, i) { return [25 + 10 * i, v]; }), clamp(age, 25, 75));
      derived.vo2Expected = vExp;
      var lnV = Math.log(0.87) * clamp((inp.vo2max - vExp) / 3.5, -4, 4); // 13% פחות סיכון לכל MET
      add('fitness', L('כושר אירובי (VO2max)'), inp.vo2max + L(' (חציון לגילך: ') + Math.round(vExp) + ')', function (a) { return lnV * attStd(a); });
    }

    // --- ישיבה: Chau et al., PLoS One 2013 (מתוקנן לפעילות גופנית) ---
    if (isNum(inp.sitting)) {
      var h = inp.sitting;
      // 0% לשעה עד 3 שעות, 2% לשעה בין 3 ל-7, 5% לשעה מעל 7
      var lnSit = Math.log(1.02) * clamp(h - 3, 0, 4) + Math.log(1.05) * Math.max(h - 7, 0) - Math.log(1.106);
      var sitLbl = h <= 3 ? L('פחות מ-4 שעות ביום') : h <= 6 ? L('4–7 שעות ביום') : h <= 10 ? L('8–10 שעות ביום') : L('11 שעות ומעלה ביום');
      add('sitting', L('ישיבה'), sitLbl, function (a) { return lnSit * attStd(a); });
    }

    // --- מצב משפחתי: Wang et al., Glob Health Res Policy 2020 ---
    if (inp.marital) {
      var rrU = sex === 'f' ? 1.22 : 1.46;
      var lnM = Math.log((inp.marital === 'single' ? rrU : 1) / (1 + 0.4 * (rrU - 1))); // כ-40% מהמבוגרים אינם בזוגיות
      add('marital', L('מצב משפחתי'), inp.marital === 'single' ? L('ללא בן/בת זוג') : L('נשוי/אה או בזוגיות'), function (a) { return lnM * attStd(a); });
    }

    // --- טריגליצרידים: Liu et al., Lipids Health Dis 2013 ---
    if (isNum(inp.tg)) {
      var lnTG = Math.log(1.12) * clamp(inp.tg / 88.57 - 1.5, -1, 4);
      add('tg', L('טריגליצרידים'), inp.tg + L(' מ"ג/ד"ל'), function (a) { return lnTG * attStd(a); });
    }

    // --- Lp(a): Langsted et al., Eur Heart J 2019 ---
    if (isNum(inp.lpa)) {
      // 1.05 לתמותה כללית לכל 50 מ"ג/ד"ל; ייחוס 20 מ"ג/ד"ל (ממוצע אוכלוסייה משוער)
      var lnLp = Math.log(1.05) * (clamp(inp.lpa, 0, 250) - 20) / 50;
      add('lpa', L('ליפופרוטאין (a)'), 'Lp(a) ' + inp.lpa + L(' מ"ג/ד"ל'), function (a) { return lnLp * attStd(a); });
    }

    // --- GGT: Kunutsor et al., Int J Epidemiol 2014 ---
    if (isNum(inp.ggt)) {
      var lnGG = Math.log(1.07) * clamp(inp.ggt - 25, -15, 35) / 5; // מוגבל ל-1.6, היחס בין השליש העליון לתחתון במחקר
      add('ggt', L('אנזים כבד (GGT)'), 'GGT ' + inp.ggt, function (a) { return lnGG * attStd(a); });
    }

    // --- חלבון בשתן (ACR): CKD Prognosis Consortium, Lancet 2010 ---
    if (isNum(inp.acr)) {
      // לעומת 5 מ"ג/ג: 10 -> 1.20, 30 -> 1.63, 300 -> 2.22
      var lnAC = interp([[Math.log(5), 0], [Math.log(10), Math.log(1.20)], [Math.log(30), Math.log(1.63)], [Math.log(300), Math.log(2.22)]],
        Math.log(Math.max(inp.acr, 1))) - Math.log(1.05);
      add('acr', L('חלבון בשתן'), L('יחס אלבומין/קריאטינין ') + inp.acr, function (a) { return lnAC * attStd(a); });
    }

    // --- אריכות ימים במשפחה: Atkins et al., JACC 2016 ---
    var fam = familyLongevity(inp);
    if (fam) add('family', L('אריכות ימים במשפחה'), fam.detail, function (a) { return fam.ln * attStd(a); });

    // --- מחלת לב מוקדמת במשפחה: Lloyd-Jones et al., JAMA 2004 ---
    if (inp.famHeart) {
      var orV = inp.famHeart === 'yes' ? (sex === 'f' ? 1.7 : 2.0) : 1;
      var popFH = 1 + 0.12 * ASSUME.fracVascular * ((sex === 'f' ? 1.7 : 2.0) - 1);
      var lnFH = Math.log((1 + ASSUME.fracVascular * (orV - 1)) / popFH);
      add('famheart', L('מחלת לב מוקדמת במשפחה'), inp.famHeart === 'yes' ? L('הורה עם מחלת לב מוקדמת') : L('אין'),
        function (a) { return lnFH * attStd(a); });
    }

    return { factors: F, notes: notes, derived: derived };
  }

  function familyLongevity(inp) {
    function usable(p, minAlive) {
      if (!p || !isNum(p.age)) return null;
      if (p.status === 'dead') return p.cause === 'external' ? null : p.age;
      if (p.status === 'alive') return p.age >= minAlive ? p.age : null;
      return null;
    }
    var ln = 0, parts = [], any = false;
    // הורים: 17% פחות סיכון לכל עשור שלפחות הורה אחד חי מעבר לגיל 70
    var pa = [usable(inp.mother, 70), usable(inp.father, 70)].filter(function (x) { return x !== null; });
    var bothKnown = pa.length === 2;
    if (pa.length) {
      var Lmax = Math.max.apply(null, pa);
      // אם רק הורה אחד ידוע והוא נפטר לפני 70, ההורה השני עשוי לחיות יותר — לא מסיקים מסקנה
      if (Lmax >= 70 || bothKnown) {
        ln += Math.log(0.83) * (clamp(Lmax, 70, 100) - 80) / 10;
        parts.push(L('ההורה שהאריך ימים: ') + Lmax);
        any = true;
      }
    }
    // סבים וסבתות: הנחת מודל — חצי מהשפעת ההורים (קרבה גנטית של 25% לעומת 50%)
    var gp = (inp.grandparents || []).map(function (p) { return usable(p, 80); })
      .filter(function (x) { return x !== null; });
    if (gp.length >= 2) {
      var G = gp.reduce(function (s, x) { return s + x; }, 0) / gp.length;
      ln += 0.5 * Math.log(0.83) * (clamp(G, 60, 100) - 75) / 10;
      parts.push(L('ממוצע סבים/סבתות: ') + Math.round(G));
      any = true;
    }
    if (!any) return null;
    return { ln: clamp(ln, Math.log(0.65), Math.log(1.35)), detail: parts.join(' · ') };
  }

  // ---------- 4. חישוב מלא ----------

  // שילוב הגורמים: הגורם החזק ביותר נספר במלואו, והבאים אחריו במשקל מופחת,
  // משום שגורמי הסיכון מתואמים זה עם זה והמחקרים לא תקננו זה לזה באופן מלא.
  function combinedLogHR(factors, mask) {
    return function (a) {
      var v = [];
      for (var i = 0; i < factors.length; i++) if (!mask || mask[i]) v.push(factors[i].fn(a));
      v.sort(function (x, y) { return Math.abs(y) - Math.abs(x); });
      var s = 0;
      for (var k = 0; k < v.length; k++) s += v[k] * (ASSUME.weights[k] !== undefined ? ASSUME.weights[k] : ASSUME.weightRest);
      return clamp(s, Math.log(ASSUME.minHR), Math.log(ASSUME.maxHR));
    };
  }

  // חלוקת ההפרש בשנים בין הגורמים (קירוב לערכי שפלי): ממוצע התרומה השולית של כל
  // גורם על פני סדרי הוספה שונים. הסכום שווה בדיוק להפרש הכולל מול הממוצע.
  function attribute(mu, age, factors, baseRemaining) {
    var n = factors.length, tot = [], seed = 12345, i;
    for (i = 0; i < n; i++) tot.push(0);
    if (!n) return tot;
    function rnd() { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; }
    var perms = n === 1 ? 1 : 24;
    for (var p = 0; p < perms; p++) {
      var order = [];
      for (i = 0; i < n; i++) order.push(i);
      for (i = n - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)); var t = order[i]; order[i] = order[j]; order[j] = t; }
      // כל סדר נבדק גם בכיוון ההפוך
      for (var dir = 0; dir < 2; dir++) {
        var mask = [], prev = baseRemaining;
        for (i = 0; i < n; i++) mask.push(false);
        for (i = 0; i < n; i++) {
          var idx = dir ? order[n - 1 - i] : order[i];
          mask[idx] = true;
          var cur = survival(mu, age, combinedLogHR(factors, mask)).remaining;
          tot[idx] += cur - prev; prev = cur;
        }
      }
    }
    return tot.map(function (x) { return x / (perms * 2); });
  }

  /** תוחלת החיים בלבד, בלי פירוק לגורמים — מהיר, לשימוש בסרגלים ובתובנות */
  function estimate(inp) {
    var mu = baseHazard(inp.country, inp.sex), age = Math.floor(inp.age);
    return age + survival(mu, age, combinedLogHR(buildFactors(inp).factors, null)).remaining;
  }

  function compute(inp) {
    var mu = baseHazard(inp.country, inp.sex);
    var age = Math.floor(inp.age);
    var built = buildFactors(inp);
    var base = survival(mu, age, null);
    var fullFn = combinedLogHR(built.factors, null);
    var pers = survival(mu, age, fullFn);

    var years = attribute(mu, age, built.factors, base.remaining);
    var contributions = built.factors.map(function (f, i) {
      return { id: f.id, label: f.label, detail: f.detail, years: years[i] };
    }).sort(function (x, y) { return y.years - x.years; });

    function summary(sv) {
      return {
        remaining: sv.remaining,
        expectedAge: age + sv.remaining,
        p10: ageAtSurvival(sv, 0.9), p25: ageAtSurvival(sv, 0.75), median: ageAtSurvival(sv, 0.5),
        p75: ageAtSurvival(sv, 0.25), p90: ageAtSurvival(sv, 0.1),
        reach80: probReach(sv, 80), reach90: probReach(sv, 90), reach100: probReach(sv, 100),
        curve: sv.S
      };
    }

    return {
      age: age,
      baseline: summary(base),
      personal: summary(pers),
      hrNow: Math.exp(fullFn(age)),
      contributions: contributions,
      notes: built.notes,
      derived: built.derived
    };
  }

  return { phenoAge: phenoAge, estimate: estimate, compute: compute, baseHazard: baseHazard, survival: survival, egfr: egfr, ASSUME: ASSUME };
})();

if (typeof module !== 'undefined') module.exports = LifeModel;
