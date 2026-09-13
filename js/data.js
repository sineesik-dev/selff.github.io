/* SELF — sabit veriler
   Bağımlılık listesi (Bağımlılık Listesi Açıklama.docx) ve
   bütçe planı (Kişisel aylık bütçe1.xlsx) buradan okunur.
   Güncellemek için sadece bu dosyayı düzenle. */

// Bağımlılık butonları. `icon` alanı ileride emoji/resim için boş bırakıldı.
const ADDICTIONS = [
  { id: "sigara",     name: "Sigara",        level: "yoğun", icon: "" },
  { id: "oyun",       name: "Oyun",          level: "yoğun", icon: "" },
  { id: "cikolata",   name: "Çikolata",      level: "orta",  icon: "" },
  { id: "icecek",     name: "İçecek",        level: "az",    icon: "" },
  { id: "icedonukluk",name: "İçe dönüklük",  level: "orta",  icon: "" },
  { id: "ismarlama",  name: "Ismarlama",     level: "orta",  icon: "",
    fullName: "Birilerine bir şey ısmarlama" },
];

// 2 aylık harcama bütçesi dönemi (Eylül–Ekim 2026).
const PERIOD = {
  start: "2026-09-13",   // verilerin girildiği gün
  end:   "2026-10-20",   // Excel'deki "37 gün" hesabına göre bitiş
  total: 11501,          // ₺11.501,00 — 2 aylık harcama bütçesi
};

// Excel: "Ödeme Planı 2026" sayfası, birebir.
const BUDGET = {
  title: "Ödeme Planı",
  year: 2026,
  months: ["Eylül", "Ekim", "Kasım", "Aralık"],

  debts: {
    title: "Garanti Bankası Mevcut Borç Durumu",
    rows: [
      { name: "Avans Hesap",  values: [20504, 0,     0,     0]     },
      { name: "Kredi Kartı",  values: [18786, 0,     0,     0]     },
      { name: "Kredi Taksit", values: [0,     3726,  0,     0]     },
      { name: "Avans Taksit", values: [0,     15483, 15483, 15483] },
    ],
    total: 89465,
  },

  incomes: {
    title: "Gelirler",
    rows: [
      { name: "Maaş", values: [20000, 50000, 35000, 35000] },
    ],
    total: 140000,
  },

  summary: {
    twoMonthDebt:   58499,  // Eylül-Ekim borç toplamı
    twoMonthIncome: 70000,  // Eylül-Ekim gelir toplamı
    twoMonthBudget: 11501,  // artan bütçe
  },

  notes: [
    "Eylül-Ekim ayları güncel borç durumu toplamı: ₺58.499,00",
    "Eylül-Ekim ayları toplam gelir: ₺70.000,00",
    "Şimdiden itibaren Ekim ayının sonunda ilk iki aylık borcumun bitmesine 37 gün var ve bu 37 gün için toplam artan bütçe ₺11.501,00",
    "Yani bu ₺11.501,00'den ne kadar artırırsam sonraki aylardaki ödememe aktarabilirim. Bu parayı hem ihtiyaçlarıma kullanacak hem de borç için devredeceğim.",
  ],
};
