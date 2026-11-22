/*
 * תרגום: העברית היא שפת המקור, והיא כתובה ישירות בקוד בתוך L('...').
 * בשפות אחרות, L מחפשת את התרגום במילון I18N[LANG] לפי מפתח קצר שמחושב מהטקסט העברי.
 * המילונים נמצאים ב-i18n/<lang>.js ונוצרו בעזרת i18n-extract.js (שמפיק את רשימת הטקסטים והמפתחות).
 * טקסט שאין לו תרגום מוצג בעברית, ו-i18n-extract.js מדווח עליו.
 */
var LANG = (typeof LANG !== 'undefined' && LANG) ||
  (typeof document !== 'undefined' && document.documentElement.getAttribute('lang')) || 'he';
var I18N = (typeof I18N !== 'undefined' && I18N) || {};

function i18nKey(s) {
  var h = 5381;
  for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

function L(s) {
  if (LANG === 'he' || typeof s !== 'string') return s;
  var d = I18N[LANG];
  if (!d) return s;
  var t = d[i18nKey(s)];
  return t !== undefined ? t : s;
}

/* פרטים לכל שפה: כיוון, מדינת ברירת מחדל, תבנית תאריך, ומספרי חירום/תמיכה */
var LANGS = {
  he: { name: 'עברית', dir: 'rtl', locale: 'he-IL', country: 'ISR', path: '' },
  en: { name: 'English', dir: 'ltr', locale: 'en-US', country: 'USA', path: 'en/' },
  es: { name: 'Español', dir: 'ltr', locale: 'es-ES', country: 'ESP', path: 'es/' },
  fr: { name: 'Français', dir: 'ltr', locale: 'fr-FR', country: 'FRA', path: 'fr/' },
  de: { name: 'Deutsch', dir: 'ltr', locale: 'de-DE', country: 'DEU', path: 'de/' }
};

/* שמות המדינות בלוחות התמותה מגיעים בעברית; בשפות אחרות הדפדפן מתרגם אותם לפי קוד המדינה */
var ISO3_TO_2 = { ISR: 'IL', USA: 'US', GBR: 'GB', DEU: 'DE', FRA: 'FR', ITA: 'IT', ESP: 'ES', PRT: 'PT', NLD: 'NL', BEL: 'BE',
  CHE: 'CH', AUT: 'AT', SWE: 'SE', NOR: 'NO', DNK: 'DK', FIN: 'FI', IRL: 'IE', GRC: 'GR', CYP: 'CY', POL: 'PL', CZE: 'CZ',
  HUN: 'HU', ROU: 'RO', BGR: 'BG', RUS: 'RU', UKR: 'UA', BLR: 'BY', GEO: 'GE', TUR: 'TR', CAN: 'CA', AUS: 'AU', NZL: 'NZ',
  JPN: 'JP', KOR: 'KR', CHN: 'CN', IND: 'IN', THA: 'TH', BRA: 'BR', ARG: 'AR', MEX: 'MX', ZAF: 'ZA', ETH: 'ET', MAR: 'MA',
  EGY: 'EG', JOR: 'JO', ARE: 'AE' };
function i18nCountryNames(tables) {
  if (LANG === 'he' || !tables) return;
  var dn = null;
  try { dn = new Intl.DisplayNames([LANGS[LANG].locale], { type: 'region' }); } catch (e) { return; }
  Object.keys(tables).forEach(function (c) {
    var a2 = ISO3_TO_2[c];
    if (a2) { try { tables[c].name = dn.of(a2) || tables[c].name; } catch (e) { /* */ } }
  });
}

/* כתובת לעמוד באתר, יחסית לעמוד הנוכחי. ROOT נקבע בכל עמוד (למשל '../../') */
function SiteURL(page, id, lang) {
  var root = (typeof ROOT !== 'undefined') ? ROOT : '';
  var p = root + LANGS[lang || LANG].path;
  if (page === 'home') return p || './';
  if (page === 'topics') return (p || './') + '#topics';
  if (page === 'topic') return p + id + '/';
  if (page === 'about') return p + 'about/';
  if (page === 'sources') return p + 'sources/';
  if (page === 'calc') return p + 'calculator/';
  return p || './';
}

if (typeof module !== 'undefined') module.exports = { L: L, i18nKey: i18nKey, LANGS: LANGS };
