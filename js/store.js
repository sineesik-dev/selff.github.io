/* SELF — veri katmanı
   Tüm kişisel veri (bağımlılık tıklamaları, harcamalar) telefonda
   localStorage içinde tutulur. Firebase'e geçerken yalnızca bu dosya değişir;
   dışarıya sunulan arayüz aynı kalır. */

const Store = (() => {
  const KEY = "self.data.v1";
  const BAK = "self.data.v1.bak";   // her yazımdan önce alınan kopya

  let data = null;

  // ---- yardımcılar ----------------------------------------------------

  const pad = (n) => String(n).padStart(2, "0");

  // Cihazın yerel saatine göre ISO benzeri damga: 2026-09-13T22:46:14+03:00
  function localISO(d = new Date()) {
    const off = -d.getTimezoneOffset();
    const sign = off >= 0 ? "+" : "-";
    const a = Math.abs(off);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
           `T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` +
           `${sign}${pad(Math.floor(a / 60))}:${pad(a % 60)}`;
  }

  // Yerel tarihe göre YYYY-MM-DD ("bugün" UTC'ye göre değil, telefona göre)
  function localDate(d = new Date()) {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  function uid(prefix) {
    return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  function empty() {
    const now = localISO();
    return {
      version: 1,
      taps: [],       // { id, ts }
      expenses: [],   // { id, date, ts, amount, note }
      meta: { createdAt: now, updatedAt: now, lastExportAt: null },
    };
  }

  function isValid(obj) {
    return obj && typeof obj === "object" &&
           Array.isArray(obj.taps) && Array.isArray(obj.expenses);
  }

  // ---- yükleme / kaydetme ----------------------------------------------

  function load() {
    if (data) return data;
    let parsed = null;
    try { parsed = JSON.parse(localStorage.getItem(KEY)); } catch (_) {}
    if (!isValid(parsed)) {
      // Ana kayıt bozuksa yedekten dön.
      try { parsed = JSON.parse(localStorage.getItem(BAK)); } catch (_) {}
    }
    data = isValid(parsed) ? parsed : empty();
    if (!data.meta) data.meta = empty().meta;
    return data;
  }

  function save() {
    data.meta.updatedAt = localISO();
    const json = JSON.stringify(data);
    try {
      const prev = localStorage.getItem(KEY);
      if (prev) localStorage.setItem(BAK, prev);
      localStorage.setItem(KEY, json);
      return true;
    } catch (e) {
      console.error("Kaydetme hatası", e);
      return false;
    }
  }

  // Tarayıcının depolamayı temizlememesi için kalıcılık iste.
  async function persist() {
    try {
      if (navigator.storage && navigator.storage.persist) {
        return await navigator.storage.persist();
      }
    } catch (_) {}
    return false;
  }

  // ---- bağımlılık tıklamaları ----------------------------------------

  function addTap(id) {
    load();
    data.taps.push({ id, ts: localISO() });
    save();
  }

  // { sigara: 3, oyun: 1, ... } — verilen gün için
  function tapCounts(date = localDate()) {
    load();
    const counts = {};
    for (const t of data.taps) {
      if (t.ts.slice(0, 10) === date) counts[t.id] = (counts[t.id] || 0) + 1;
    }
    return counts;
  }

  // Gün gün özet, en yeni üstte: [{ date, counts: {...}, total }]
  function tapHistory() {
    load();
    const byDate = {};
    for (const t of data.taps) {
      const d = t.ts.slice(0, 10);
      byDate[d] = byDate[d] || {};
      byDate[d][t.id] = (byDate[d][t.id] || 0) + 1;
    }
    return Object.keys(byDate).sort().reverse().map((date) => {
      const counts = byDate[date];
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { date, counts, total };
    });
  }

  // ---- harcamalar ---------------------------------------------------

  function addExpense(amount, note = "", date = localDate()) {
    load();
    const e = { id: uid("e"), date, ts: localISO(), amount: Number(amount), note: note.trim() };
    data.expenses.push(e);
    save();
    return e;
  }

  function removeExpense(id) {
    load();
    data.expenses = data.expenses.filter((e) => e.id !== id);
    save();
  }

  function totalSpent() {
    load();
    return data.expenses.reduce((s, e) => s + e.amount, 0);
  }

  // Güne göre gruplu, en yeni üstte: [{ date, items: [...], total }]
  function expensesByDay() {
    load();
    const byDate = {};
    for (const e of data.expenses) {
      (byDate[e.date] = byDate[e.date] || []).push(e);
    }
    return Object.keys(byDate).sort().reverse().map((date) => {
      const items = byDate[date].slice().sort((a, b) => (a.ts < b.ts ? 1 : -1));
      return { date, items, total: items.reduce((s, e) => s + e.amount, 0) };
    });
  }

  // ---- yedek ----------------------------------------------------------

  function exportJSON() {
    load();
    data.meta.lastExportAt = localISO();
    save();
    return JSON.stringify(data, null, 2);
  }

  // Yedek dosyasını geri yükler. Başarılıysa true.
  function importJSON(text) {
    let parsed;
    try { parsed = JSON.parse(text); } catch (_) { return false; }
    if (!isValid(parsed)) return false;
    data = parsed;
    if (!data.meta) data.meta = empty().meta;
    save();
    return true;
  }

  function markExported() {
    load();
    data.meta.lastExportAt = localISO();
    save();
  }

  function raw() { return load(); }

  return {
    load, save, persist, localISO, localDate,
    addTap, tapCounts, tapHistory,
    addExpense, removeExpense, totalSpent, expensesByDay,
    exportJSON, importJSON, markExported, raw,
  };
})();
