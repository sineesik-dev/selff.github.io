/* SELF — uygulama akışı
   Açılış videosu → Ana ekran → (Bağımlılıklar | Bütçe) → Çıkış → Kapanış videosu */

(() => {
  "use strict";

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const screens = {
    intro: $("#screen-intro"),
    home: $("#screen-home"),
    addictions: $("#screen-addictions"),
    loop: $("#screen-loop"),
    budget: $("#screen-budget"),
    outro: $("#screen-outro"),
  };

  const videos = {
    intro: $("#intro-video"),
    loop: $("#loop-video"),
    outro: $("#outro-video"),
  };

  const fmtTL = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", minimumFractionDigits: 2 });
  const fmtInt = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
  const fmtDateLong = new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", year: "numeric", weekday: "long" });
  const fmtDateShort = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });
  const fmtTime = new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" });

  let current = null;     // şu anki ekran adı
  let closed = false;     // kapanış videosu bitti mi
  let loopOpenedAt = 0;   // döngü videoya girildiği an (yanlışlıkla hemen çıkmayı önler)

  // ---- ekran geçişleri --------------------------------------------------

  function show(name) {
    if (!screens[name]) name = "home";
    // Diğer ekranlardaki videoları durdur.
    for (const [key, v] of Object.entries(videos)) {
      if (key !== name) { v.pause(); }
    }
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name;
    current = name;
    window.scrollTo(0, 0);

    switch (name) {
      case "intro": playIntro(); break;
      case "home": renderHome(); break;
      case "addictions": renderAddictions(); break;
      case "loop": playLoop(); break;
      case "budget": renderBudget(); break;
      case "outro": playOutro(); break;
    }
  }

  // Yeni ekrana geç (geri tuşu ile dönülebilir).
  function go(name) {
    const depth = (history.state && history.state.depth) || 0;
    history.pushState({ screen: name, depth: depth + 1 }, "");
    show(name);
  }

  // Bir önceki ekrana dön.
  function back() {
    const depth = (history.state && history.state.depth) || 0;
    if (depth > 0) history.back();
    else show("home");
  }

  window.addEventListener("popstate", (e) => {
    if (closed) { location.reload(); return; }
    const name = (e.state && e.state.screen) || "home";
    show(name === "intro" ? "home" : name);
  });

  // ---- video yardımcıları ---------------------------------------------

  function playWithSound(video) {
    video.muted = false;
    video.volume = 1;
    try { video.currentTime = 0; } catch (_) {}
    const p = video.play();
    return p && p.catch ? p : Promise.resolve();
  }

  // ---- 1. açılış --------------------------------------------------------

  function playIntro() {
    const gate = $("#intro-tap");
    gate.hidden = true;
    playWithSound(videos.intro).catch(() => {
      // Tarayıcı sesli otomatik oynatmaya izin vermedi: tek dokunuş iste.
      gate.hidden = false;
    });
  }

  $("#intro-tap").addEventListener("pointerdown", () => {
    $("#intro-tap").hidden = true;
    playWithSound(videos.intro).catch(() => { $("#intro-tap").hidden = false; });
  });

  videos.intro.addEventListener("ended", () => {
    history.replaceState({ screen: "home", depth: 0 }, "");
    show("home");
  });

  // Video dosyası açılamazsa takılı kalma.
  videos.intro.addEventListener("error", () => {
    history.replaceState({ screen: "home", depth: 0 }, "");
    show("home");
  });

  // ---- 2. ana ekran -----------------------------------------------------

  function renderHome() {
    const counts = Store.tapCounts();
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    $("#home-tap-sub").textContent = `bugün ${total} basış`;
    $("#home-budget-sub").textContent = `kalan ${fmtTL.format(PERIOD.total - Store.totalSpent())}`;
  }

  $$("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go)));
  $$("[data-back]").forEach((b) => b.addEventListener("click", back));
  $$("[data-exit]").forEach((b) => b.addEventListener("click", () => go("outro")));

  // ---- saat -------------------------------------------------------------

  function tickClock() {
    const now = new Date();
    $("#clock-date").textContent = fmtDateLong.format(now);
    $("#clock-time").textContent = fmtTime.format(now);
    const short = `${fmtDateShort.format(now)} · ${fmtTime.format(now)}`;
    $$("[data-clock-short]").forEach((el) => (el.textContent = short));
  }
  tickClock();
  setInterval(tickClock, 1000);

  // Gün değişince "bugün" sayaçları sıfırdan başlasın.
  let lastDay = Store.localDate();
  setInterval(() => {
    const d = Store.localDate();
    if (d !== lastDay) {
      lastDay = d;
      if (current === "addictions") renderAddictions();
      if (current === "home") renderHome();
      if (current === "budget") renderBudget();
    }
  }, 30000);

  // ---- 3. bağımlılıklar -------------------------------------------------

  function renderAddictions() {
    const counts = Store.tapCounts();
    const list = $("#addiction-list");
    list.innerHTML = "";
    let total = 0;
    for (const a of ADDICTIONS) {
      const n = counts[a.id] || 0;
      total += n;
      const btn = document.createElement("button");
      btn.className = "addiction";
      btn.dataset.id = a.id;
      btn.innerHTML = `<span class="name">${a.icon ? a.icon + " " : ""}${a.name}</span>` +
                      `<span class="count"><strong>${n}</strong>bugün</span>`;
      btn.addEventListener("click", () => onAddictionTap(a.id));
      list.appendChild(btn);
    }
    $("#addiction-today-total").textContent = total;
    renderAddictionHistory();
  }

  function renderAddictionHistory() {
    const table = $("#addiction-history");
    const rows = Store.tapHistory();
    if (!rows.length) {
      table.innerHTML = `<tr><td class="zero">Henüz kayıt yok</td></tr>`;
      return;
    }
    let html = `<tr><th>Tarih</th>${ADDICTIONS.map((a) => `<th>${a.name}</th>`).join("")}<th>Toplam</th></tr>`;
    for (const r of rows) {
      html += `<tr><td>${trDate(r.date)}</td>` +
              ADDICTIONS.map((a) => {
                const n = r.counts[a.id] || 0;
                return `<td class="${n ? "" : "zero"}">${n}</td>`;
              }).join("") +
              `<td><strong>${r.total}</strong></td></tr>`;
    }
    table.innerHTML = html;
  }

  function onAddictionTap(id) {
    Store.addTap(id);
    go("loop");
  }

  // ---- 4. döngü video ---------------------------------------------------

  function playLoop() {
    loopOpenedAt = Date.now();
    videos.loop.loop = true;
    playWithSound(videos.loop).catch(() => {});
  }

  // "click" kullanılıyor (pointerdown değil): dokunuşun click'i burada tüketilsin,
  // liste ekranı geldiğinde altındaki butona düşüp yeniden video açmasın.
  screens.loop.addEventListener("click", () => {
    if (Date.now() - loopOpenedAt < 400) return;
    videos.loop.pause();
    back();
  });

  // ---- 5. bütçe ---------------------------------------------------------

  function trDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  function daysLeft() {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const [y, m, d] = PERIOD.end.split("-").map(Number);
    const end = new Date(y, m - 1, d);
    return Math.max(0, Math.round((end - today) / 86400000));
  }

  function renderBudget() {
    const spent = Store.totalSpent();
    const remaining = PERIOD.total - spent;
    const days = daysLeft();
    const ratio = Math.min(1, Math.max(0, spent / PERIOD.total));

    const big = $("#budget-remaining");
    big.textContent = fmtTL.format(remaining);
    big.classList.toggle("over", remaining < 0);

    const bar = $("#budget-bar");
    bar.style.width = `${(1 - ratio) * 100}%`;
    bar.classList.toggle("over", remaining < 0);

    $("#budget-spent").textContent = fmtTL.format(spent);
    $("#budget-total").textContent = fmtTL.format(PERIOD.total);
    $("#budget-days").textContent = `${days} gün`;
    $("#budget-daily").textContent = fmtTL.format(remaining > 0 ? remaining / Math.max(1, days) : 0);
    $("#budget-period").textContent = `${trDate(PERIOD.start)} – ${trDate(PERIOD.end)} dönemi · Eylül-Ekim artan bütçe`;

    if (!$("#expense-date").value) $("#expense-date").value = Store.localDate();

    renderExpenses();
    renderReport();
    renderDataInfo();
  }

  function renderExpenses() {
    const wrap = $("#expense-list");
    const days = Store.expensesByDay();
    if (!days.length) {
      wrap.innerHTML = `<p class="empty">Henüz harcama girilmedi.</p>`;
      return;
    }
    wrap.innerHTML = days.map((day) => `
      <div class="day">
        <div class="day-head"><span>${trDate(day.date)}</span><strong>${fmtTL.format(day.total)}</strong></div>
        ${day.items.map((e) => `
          <div class="expense" data-id="${e.id}">
            <span class="time">${e.ts.slice(11, 16)}</span>
            <span class="note">${escapeHTML(e.note) || "&nbsp;"}</span>
            <span class="amount">${fmtTL.format(e.amount)}</span>
            <button type="button" class="del" aria-label="Sil">×</button>
          </div>`).join("")}
      </div>`).join("");
  }

  $("#expense-list").addEventListener("click", (ev) => {
    const btn = ev.target.closest(".del");
    if (!btn) return;
    const row = btn.closest(".expense");
    const id = row.dataset.id;
    const amount = row.querySelector(".amount").textContent;
    if (confirm(`${amount} tutarındaki harcama silinsin mi?`)) {
      Store.removeExpense(id);
      renderBudget();
      toast("Silindi");
    }
  });

  // "150,50" / "150.50" / "1.500,50" / "1.200" (=1200) → sayı
  function parseAmount(text) {
    let s = String(text).trim().replace(/\s/g, "").replace(/₺|tl/gi, "");
    if (!s) return NaN;
    if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");
    else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");   // 1.200 → binlik ayracı
    const n = Number(s);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : NaN;
  }

  $("#expense-form").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const amountEl = $("#expense-amount");
    const noteEl = $("#expense-note");
    const dateEl = $("#expense-date");
    const amount = parseAmount(amountEl.value);
    if (!(amount > 0)) { toast("Geçerli bir tutar gir"); amountEl.focus(); return; }
    const date = /^\d{4}-\d{2}-\d{2}$/.test(dateEl.value) ? dateEl.value : Store.localDate();
    Store.addExpense(amount, noteEl.value, date);
    amountEl.value = "";
    noteEl.value = "";
    dateEl.value = Store.localDate();
    renderBudget();
    toast(`${fmtTL.format(amount)} eklendi`);
    amountEl.blur();
  });

  function renderReport() {
    // Tablo hücreleri ondalıksız (Excel'deki değerler tam sayı) — dar ekrana sığsın.
    const cell = (n) => (n ? `<td>${fmtInt.format(n)}</td>` : `<td class="zero">0</td>`);
    const head = `<tr><th>TL</th>${BUDGET.months.map((m) => `<th>${m}</th>`).join("")}</tr>`;

    $("#debts-title").textContent = BUDGET.debts.title;
    $("#debts-table").innerHTML = head +
      BUDGET.debts.rows.map((r) => `<tr><td>${r.name}</td>${r.values.map(cell).join("")}</tr>`).join("");
    $("#debts-total").innerHTML = `<span>Toplam Borç</span><strong>${fmtTL.format(BUDGET.debts.total)}</strong>`;

    $("#incomes-title").textContent = BUDGET.incomes.title;
    $("#incomes-table").innerHTML = head +
      BUDGET.incomes.rows.map((r) => `<tr><td>${r.name}</td>${r.values.map(cell).join("")}</tr>`).join("");
    $("#incomes-total").innerHTML = `<span>Toplam Gelir</span><strong>${fmtTL.format(BUDGET.incomes.total)}</strong>`;

    $("#summary-table").innerHTML =
      `<tr><td>Borç toplamı</td><td>${fmtTL.format(BUDGET.summary.twoMonthDebt)}</td></tr>` +
      `<tr><td>Gelir toplamı</td><td>${fmtTL.format(BUDGET.summary.twoMonthIncome)}</td></tr>` +
      `<tr><td>Artan (2 aylık bütçe)</td><td>${fmtTL.format(BUDGET.summary.twoMonthBudget)}</td></tr>`;

    $("#budget-notes").innerHTML = BUDGET.notes.map((n) => `<li>${escapeHTML(n)}</li>`).join("");
  }

  function renderDataInfo() {
    const last = Store.raw().meta.lastExportAt;
    $("#last-export").textContent = last
      ? `Son dışa aktarma: ${trDate(last.slice(0, 10))} ${last.slice(11, 16)}`
      : "Henüz dışa aktarılmadı.";
  }

  $("#btn-export-xlsx").addEventListener("click", async () => {
    try {
      const r = await Exporter.exportExcel();
      if (r !== "cancel") toast("Excel hazırlandı");
      renderDataInfo();
    } catch (e) { console.error(e); toast("Excel oluşturulamadı"); }
  });

  $("#btn-export-json").addEventListener("click", async () => {
    try {
      const r = await Exporter.exportBackup();
      if (r !== "cancel") toast("Yedek hazırlandı");
      renderDataInfo();
    } catch (e) { console.error(e); toast("Yedek oluşturulamadı"); }
  });

  $("#btn-import-json").addEventListener("click", () => $("#import-file").click());

  $("#import-file").addEventListener("change", async (ev) => {
    const file = ev.target.files && ev.target.files[0];
    ev.target.value = "";
    if (!file) return;
    if (!confirm("Yedek yüklenince telefondaki mevcut veriler bu dosyadakilerle DEĞİŞTİRİLİR. Devam edilsin mi?")) return;
    const ok = await Exporter.importBackup(file);
    toast(ok ? "Yedek yüklendi" : "Dosya okunamadı");
    if (ok) renderBudget();
  });

  // ---- 6. kapanış -------------------------------------------------------

  function playOutro() {
    $("#outro-closed").hidden = true;
    playWithSound(videos.outro).catch(() => {
      // Sesli oynatılamazsa sessiz dene; o da olmazsa doğrudan kapat.
      videos.outro.muted = true;
      videos.outro.play().catch(finishExit);
    });
  }

  videos.outro.addEventListener("ended", finishExit);
  videos.outro.addEventListener("error", finishExit);

  function finishExit() {
    closed = true;
    try { window.close(); } catch (_) {}
    // Web uygulamaları kendini zorla kapatamaz; kapanmadıysa kapanış ekranı kalır.
    setTimeout(() => { $("#outro-closed").hidden = false; }, 300);
  }

  // Kapanış ekranındayken tekrar dokunulursa veya uygulama öne gelirse yeniden başla.
  $("#outro-closed").addEventListener("pointerdown", () => location.reload());
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      if (closed) { location.reload(); return; }
      if (videos[current]) videos[current].play().catch(() => {});
    } else if (videos[current]) {
      videos[current].pause();
    }
  });

  // ---- toast ------------------------------------------------------------

  let toastTimer = null;
  function toast(msg) {
    const el = $("#toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (el.hidden = true), 2200);
  }

  function escapeHTML(s) {
    return String(s || "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  // ---- service worker ---------------------------------------------------

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch((e) => console.warn("SW kaydı başarısız", e));
      let hadController = !!navigator.serviceWorker.controller;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (hadController) toast("Uygulama güncellendi");
        hadController = true;
      });
    });
  }

  // ---- başlat -----------------------------------------------------------

  Store.load();
  Store.persist();
  history.replaceState({ screen: "intro", depth: 0 }, "");
  show("intro");
})();
