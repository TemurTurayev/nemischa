/**
 * Every Uzbek string of the interface, in one place for proofreading.
 * Write a plain apostrophe; `fixUzbekMarks` turns it into ʻ (oʻ, gʻ) or ʼ (sanʼat).
 */

import { fixUzbekMarks } from './text';
import type { Level, PartOfSpeech } from './types';

type Strings = { readonly [key: string]: string | Strings };

function polish<T extends Strings>(strings: T): T {
  return Object.fromEntries(
    Object.entries(strings).map(([key, value]) => [
      key,
      typeof value === 'string' ? fixUzbekMarks(value) : polish(value),
    ]),
  ) as T;
}

export const t = polish({
  site: {
    name: 'Nemischa',
    tagline: "Nemis tili lug'ati — o'zbek tilida",
    description:
      "Nemis tilining A1–C1 darajalari uchun bepul lug'at va so'z yodlash mashqlari: artikl, ko'plik shakli, talaffuz va o'zbekcha tarjima.",
  },
  nav: {
    levels: 'Darajalar',
    practice: 'Mashq',
    anki: 'Anki',
    about: 'Loyiha haqida',
    home: 'Bosh sahifa',
  },
  home: {
    title: "Nemis tili so'zlarini o'zbek tilida o'rganing",
    lead: "{count} ta so'z, A1 dan C1 gacha. Har bir so'z artikli, ko'plik shakli, talaffuzi va o'zbekcha tarjimasi bilan. Bepul, ro'yxatdan o'tmasdan.",
    start: 'Mashqni boshlash',
    searchLabel: "So'z qidirish",
    searchPlaceholder: "Nemischa yoki o'zbekcha so'z yozing…",
    searchEmpty: 'Hech narsa topilmadi',
    searchError: "Qidiruvni yuklab bo'lmadi. Sahifani yangilab ko'ring.",
    levelsTitle: 'Darajalar',
    howTitle: 'Qanday ishlaydi',
    how1Title: 'Mavzuni tanlang',
    how1Text: "So'zlar daraja va mavzular bo'yicha tartiblangan: oila, ish, sog'liq, sayohat va boshqalar.",
    how2Title: 'Mashq qiling',
    how2Text: "Kartochkalar, test va der/die/das mashqi. Xato qilgan so'zlaringiz qayta so'raladi.",
    how3Title: 'Takrorlang',
    how3Text: "Sayt har bir so'zni unutish arafasida qayta ko'rsatadi — shunda u uzoq esda qoladi.",
  },
  count: {
    words: "{n} ta so'z",
    themes: '{n} ta mavzu',
  },
  level: {
    title: '{level} darajasi',
    practice: "{level} so'zlarini mashq qilish",
    themesTitle: 'Mavzular',
    description: "Nemis tilining {level} darajasi uchun {n} ta so'z o'zbekcha tarjimasi bilan, mavzular bo'yicha.",
  },
  theme: {
    practice: 'Shu mavzuni mashq qilish',
    description: "«{title}» mavzusidagi nemischa so'zlar ({level}): artikl, ko'plik shakli, talaffuz va o'zbekcha tarjima.",
  },
  word: {
    translation: 'Tarjimasi',
    article: 'Artikl',
    plural: "Ko'plik shakli",
    pronunciation: 'Talaffuzi',
    pos: "So'z turkumi",
    level: 'Daraja',
    theme: 'Mavzu',
    english: 'Inglizcha',
    listen: 'Tinglash',
    noPlural: "ko'plikda ishlatilmaydi",
    pluralOnly: "faqat ko'plikda ishlatiladi",
    report: 'Xato topdingizmi? Xabar bering',
    previous: 'Oldingi',
    next: 'Keyingi',
    title: "{word} — {uz} | nemischa-o'zbekcha lug'at",
    description: "«{word}» so'zining o'zbekcha tarjimasi: {uz}. Artikl, ko'plik shakli va talaffuzi.",
  },
  trainer: {
    title: 'Mashq',
    intro: 'Daraja, mavzu va mashq turini tanlang. Natijalaringiz shu qurilmada saqlanadi.',
    level: 'Daraja',
    theme: 'Mavzu',
    allThemes: 'Barcha mavzular',
    mode: 'Mashq turi',
    cards: 'Kartochkalar',
    cardsHint: "So'zni ko'rib, tarjimasini eslang",
    choice: 'Test',
    choiceHint: "To'rtta javobdan to'g'risini tanlang",
    article: 'der / die / das',
    articleHint: 'Otning artiklini toping',
    statTotal: "Jami so'z",
    statLearned: "O'rganilgan",
    statDue: 'Bugun takrorlash',
    statStreak: 'Ketma-ket kun',
    start: 'Boshlash',
    loading: 'Yuklanmoqda…',
    loadError: "So'zlarni yuklab bo'lmadi. Internet aloqasini tekshirib, qayta urinib ko'ring.",
    retry: 'Qayta urinish',
    reveal: "Javobni ko'rsatish",
    again: 'Bilmadim',
    hard: 'Qiyin',
    good: 'Bildim',
    correct: "To'g'ri!",
    wrong: "Noto'g'ri",
    rightAnswer: "To'g'ri javob:",
    next: 'Keyingisi',
    chooseTranslation: 'Tarjimasini tanlang',
    chooseArticle: 'Artiklni tanlang',
    doneTitle: 'Mashq tugadi!',
    doneScore: "To'g'ri javoblar: {correct} / {total}",
    doneCards: "Takrorlangan so'zlar: {total}",
    nothingTitle: 'Bugunga hammasi bajarildi',
    nothingText: "Bu yerda yangi yoki takrorlash kerak bo'lgan so'z qolmadi. Boshqa mavzuni tanlang yoki shu so'zlarni yana bir bor takrorlang.",
    noNouns: "Bu mavzuda artikl mashqi uchun so'z yo'q. Boshqa mavzu yoki mashq turini tanlang.",
    practiceAnyway: 'Baribir takrorlash',
    more: 'Yana mashq qilish',
    back: 'Boshqa mavzu tanlash',
    quit: 'Tugatish',
    plural: "ko'plik",
    rightMark: "to'g'ri javob",
    wrongMark: "noto'g'ri javob",
    saveFailed: "Natijalarni bu qurilmada saqlab bo'lmadi. Brauzer xotirasi to'lgan yoki yopiq rejimda bo'lishi mumkin.",
  },
  anki: {
    title: "Anki uchun to'plamlar",
    intro: "Anki — so'zlarni oraliqli takrorlash usuli bilan yodlash uchun bepul dastur. Quyidagi to'plamlarni yuklab olib, Anki dasturida oching.",
    cards: "Har bir so'z uchun ikki kartochka bor: nemischadan o'zbekchaga va o'zbekchadan nemischaga.",
    download: 'Yuklab olish',
    all: 'Barcha darajalar',
    howTitle: "Qanday o'rnatiladi",
    step1: "Anki dasturini o'rnating (kompyuter va Android uchun bepul):",
    step2: "To'plam faylini yuklab oling va uni oching — Anki o'zi import qiladi.",
    step3: 'Har kuni bir oz takrorlang: kuniga 10–15 daqiqa yetarli.',
  },
  about: {
    title: 'Loyiha haqida',
    intro: "Nemischa — nemis tilini o'zbek tili orqali o'rganayotganlar uchun bepul va ochiq lug'at. Maqsad oddiy: Germaniyada o'qish yoki ishlashga tayyorlanayotgan har bir kishi kerakli so'zlarni ona tilida, reklamasiz va ro'yxatdan o'tmasdan o'rgana olsin.",
    dataTitle: "Ma'lumotlar qanday tayyorlangan",
    data1: "So'zlar A1–C1 darajalari bo'yicha mavzularga ajratilgan. Tarjimalar va talaffuz sun'iy intellekt yordamida tayyorlangan; ularning hammasi hali inson tomonidan to'liq tekshirilmagan.",
    data2: "Otlarning artikli va ko'plik shakli Vikilug'at (Wiktionary) ma'lumotlari bilan avtomatik solishtirilgan.",
    data3: "Xato topsangiz, so'z sahifasidagi havola orqali xabar bering — tuzatamiz.",
    licenseTitle: 'Litsenziya',
    license: "Ma'lumotlar CC BY-SA 4.0, dastur kodi MIT litsenziyasi ostida tarqatiladi. Lug'atdan o'z loyihalaringizda erkin foydalanishingiz mumkin — faqat manbani ko'rsating.",
    privacyTitle: 'Maxfiylik',
    privacy: "Sayt hech qanday shaxsiy ma'lumot to'plamaydi. O'rganish natijalaringiz faqat sizning qurilmangizda saqlanadi.",
    sourceTitle: 'Manba kodi',
    source: "Loyiha ochiq: kod, ma'lumotlar va ularni tayyorlash vositalari GitHub sahifasida.",
  },
  footer: {
    open: 'Ochiq manba',
    data: "Ma'lumotlar: CC BY-SA 4.0",
    code: 'Kod: MIT',
  },
  notFound: {
    title: 'Sahifa topilmadi',
    text: "Bu manzilda sahifa yo'q. Balki u ko'chirilgandir.",
    home: 'Bosh sahifaga qaytish',
  },
});

export const LEVEL_NAMES: Readonly<Record<Level, { name: string; text: string }>> = polish({
  A1: { name: "Boshlang'ich", text: "Tanishuv, oila, xarid, vaqt — eng kerakli so'zlar." },
  A2: { name: 'Asosiy', text: "Kundalik hayot, ish, sayohat va sog'liq." },
  B1: { name: "O'rta", text: "Ish, ta'lim, jamiyat va fikr bildirish." },
  B2: { name: "O'rtadan yuqori", text: 'Iqtisodiyot, siyosat, fan va media.' },
  C1: { name: 'Yuqori', text: 'Ilmiy va rasmiy uslub, murakkab iboralar.' },
});

export const POS_NAMES: Readonly<Record<PartOfSpeech, string>> = polish({
  noun: 'ot',
  verb: "fe'l",
  adjective: 'sifat',
  adverb: 'ravish',
  preposition: 'predlog',
  conjunction: "bog'lovchi",
  pronoun: 'olmosh',
  number: 'son',
  phrase: 'ibora',
  other: 'boshqa',
});

/** Fill {placeholders} in a string: fill('{n} ta', { n: 5 }) → '5 ta'. */
export function fill(template: string, values: Readonly<Record<string, string | number>>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(values[key] ?? match));
}
