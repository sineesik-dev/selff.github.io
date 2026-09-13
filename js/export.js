/* SELF — dışa aktarma
   Telefondaki verileri Excel (.xlsx) ve JSON yedek olarak dosyaya çevirir.
   Excel dosyası SheetJS (lib/xlsx.full.min.js) ile üretilir. */

const Exporter = (() => {

  function nameOf(id) {
    const a = ADDICTIONS.find((x) => x.id === id);
    return a ? a.name : id;
  }

  // "2026-09-13" -> "13.09.2026"
  function trDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${d}.${m}.${y}`;
  }

  // "2026-09-13T22:46:14+03:00" -> "22:46:14"
  function trTime(ts) {
    return ts.slice(11, 19);
  }

  // ---- .xlsx ----------------------------------------------------------

  function buildWorkbook() {
    const data = Store.raw();
    const wb = XLSX.utils.book_new();

    // 1) Harcamalar
    const expRows = [["Tarih", "Saat", "Tutar (TL)", "Not"]];
    data.expenses
      .slice()
      .sort((a, b) => (a.ts < b.ts ? -1 : 1))
      .forEach((e) => expRows.push([trDate(e.date), trTime(e.ts), e.amount, e.note || ""]));
    expRows.push([]);
    expRows.push(["Toplam", "", Store.totalSpent(), ""]);
    expRows.push(["Bütçe", "", PERIOD.total, `${trDate(PERIOD.start)} – ${trDate(PERIOD.end)}`]);
    expRows.push(["Kalan", "", PERIOD.total - Store.totalSpent(), ""]);
    const ws1 = XLSX.utils.aoa_to_sheet(expRows);
    ws1["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 12 }, { wch: 40 }];
    XLSX.utils.book_append_sheet(wb, ws1, "Harcamalar");

    // 2) Bağımlılık tıklamaları (her basış)
    const tapRows = [["Tarih", "Saat", "Bağımlılık", "Kod"]];
    data.taps
      .slice()
      .sort((a, b) => (a.ts < b.ts ? -1 : 1))
      .forEach((t) => tapRows.push([trDate(t.ts.slice(0, 10)), trTime(t.ts), nameOf(t.id), t.id]));
    const ws2 = XLSX.utils.aoa_to_sheet(tapRows);
    ws2["!cols"] = [{ wch: 12 }, { wch: 10 }, { wch: 18 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, ws2, "Bağımlılık Tıklamaları");

    // 3) Günlük özet
    const head = ["Tarih", ...ADDICTIONS.map((a) => a.name), "Toplam Tıklama", "Harcama (TL)"];
    const sumRows = [head];
    const spentByDay = {};
    data.expenses.forEach((e) => { spentByDay[e.date] = (spentByDay[e.date] || 0) + e.amount; });
    const tapDays = Store.tapHistory();
    const days = new Set([...tapDays.map((d) => d.date), ...Object.keys(spentByDay)]);
    [...days].sort().forEach((date) => {
      const day = tapDays.find((d) => d.date === date);
      const counts = day ? day.counts : {};
      sumRows.push([
        trDate(date),
        ...ADDICTIONS.map((a) => counts[a.id] || 0),
        day ? day.total : 0,
        spentByDay[date] || 0,
      ]);
    });
    const ws3 = XLSX.utils.aoa_to_sheet(sumRows);
    ws3["!cols"] = head.map(() => ({ wch: 13 }));
    XLSX.utils.book_append_sheet(wb, ws3, "Günlük Özet");

    // 4) Bütçe planı (Excel raporunun kopyası + güncel durum)
    const plan = [];
    plan.push([`${BUDGET.title} ${BUDGET.year}`]);
    plan.push([]);
    plan.push([BUDGET.debts.title, ...BUDGET.months]);
    BUDGET.debts.rows.forEach((r) => plan.push([r.name, ...r.values]));
    plan.push(["Toplam Borç", "", "", "", BUDGET.debts.total]);
    plan.push([]);
    plan.push([BUDGET.incomes.title, ...BUDGET.months]);
    BUDGET.incomes.rows.forEach((r) => plan.push([r.name, ...r.values]));
    plan.push(["Toplam Gelir", "", "", "", BUDGET.incomes.total]);
    plan.push([]);
    plan.push(["Eylül-Ekim borç toplamı", BUDGET.summary.twoMonthDebt]);
    plan.push(["Eylül-Ekim gelir toplamı", BUDGET.summary.twoMonthIncome]);
    plan.push(["2 aylık harcama bütçesi", BUDGET.summary.twoMonthBudget]);
    plan.push(["Harcanan", Store.totalSpent()]);
    plan.push(["Kalan bütçe", PERIOD.total - Store.totalSpent()]);
    plan.push(["Dönem", `${trDate(PERIOD.start)} – ${trDate(PERIOD.end)}`]);
    plan.push([]);
    plan.push(["Notlar"]);
    BUDGET.notes.forEach((n) => plan.push([n]));
    const ws4 = XLSX.utils.aoa_to_sheet(plan);
    ws4["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, ws4, "Bütçe Planı");

    return wb;
  }

  function xlsxBlob() {
    const wb = buildWorkbook();
    const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    return new Blob([out], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
  }

  // ---- dosyayı telefona verme ----------------------------------------

  // Önce Android paylaşım menüsü (Drive, WhatsApp, Dosyalar...),
  // olmazsa klasik indirme.
  async function deliver(blob, filename) {
    const file = new File([blob], filename, { type: blob.type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: filename });
        return "share";
      } catch (e) {
        if (e && e.name === "AbortError") return "cancel";
        // paylaşım başarısızsa indirmeye düş
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    return "download";
  }

  async function exportExcel() {
    const name = `SELF-veriler-${Store.localDate()}.xlsx`;
    const result = await deliver(xlsxBlob(), name);
    if (result !== "cancel") Store.markExported();
    return result;
  }

  async function exportBackup() {
    const json = Store.exportJSON();
    const name = `SELF-yedek-${Store.localDate()}.json`;
    return deliver(new Blob([json], { type: "application/json" }), name);
  }

  // Dosya seçiciden gelen JSON'u geri yükler.
  function importBackup(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(Store.importJSON(String(reader.result)));
      reader.onerror = () => resolve(false);
      reader.readAsText(file);
    });
  }

  return { exportExcel, exportBackup, importBackup };
})();
