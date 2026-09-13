# SELF

Bağımlılıklarla mücadele ve bütçe takibi için kişisel PWA. Tüm kişisel veriler (bağımlılık basışları, harcamalar) yalnızca telefonda saklanır; GitHub'a hiçbir kişisel veri gitmez.

## Bu klasördeki dosyalar

| Dosya | Görevi |
|---|---|
| `index.html` | Tüm ekranlar (açılış, ana ekran, bağımlılıklar, bütçe, kapanış) |
| `css/style.css` | Görünüm |
| `js/data.js` | **Bağımlılık listesi ve bütçe planı** — güncellemek için burayı düzenle |
| `js/store.js` | Verilerin telefonda saklanması (Firebase'e geçerken değişecek dosya) |
| `js/export.js` | Excel / JSON dışa aktarma |
| `js/app.js` | Uygulama akışı |
| `sw.js` | Çevrimdışı çalışma (önbellek). **Her güncellemede `CACHE` adını artır.** |
| `manifest.webmanifest` | Ana ekran kurulumu (isim, ikon, renk) |
| `media/` | Açılış, kapanış ve bağımlılık videoları |
| `icons/` | Uygulama ikonları |
| `lib/xlsx.full.min.js` | Excel üretmek için kütüphane (SheetJS) |

## 1. GitHub'a yükleme

1. GitHub'da yeni bir **public** depo aç (örnek ad: `SELF`). README/.gitignore ekleme, boş kalsın.
2. Depo sayfasında **Add file → Upload files**.
3. Bu klasörün içindeki **her şeyi** (klasörler dahil: `css`, `js`, `lib`, `media`, `icons` ve kök dosyalar) sürükle-bırak. `index.html` deponun kökünde olmalı.
4. **Commit changes**.

## 2. Yayına alma (GitHub Pages)

1. Depo → **Settings → Pages**.
2. **Source:** Deploy from a branch · **Branch:** `main` · **Folder:** `/ (root)` → **Save**.
3. 1–2 dakika sonra adres: `https://<kullanıcı-adın>.github.io/SELF/`

## 3. Telefona kurma (Android / Chrome)

1. Chrome ile yukarıdaki adresi aç.
2. Sağ üst **⋮ → Ana ekrana ekle** (veya "Uygulamayı yükle") → **Yükle**.
3. Uygulamayı **ana ekrandaki ikondan** aç. (Ana ekrandan açılınca açılış videosu sesli başlar; tarayıcı sekmesinden açılırsa önce "Dokun" ekranı gelir.)
4. İlk açılışta bütün dosyalar telefona indirilir; sonrasında internetsiz çalışır.

## 4. Güncelleme yayınlama

1. Değişen dosyaları GitHub'da aynı yolla yükle (üzerine yazar).
2. `sw.js` içindeki `const CACHE = "self-v1";` satırını `self-v2`, `self-v3`… diye artır. Bunu yapmazsan telefon eski sürümü göstermeye devam eder.
3. Telefonda uygulamayı kapatıp açınca yeni sürüm iner ("Uygulama güncellendi" bildirimi).

## 5. Veriler ve yedek

- Veriler telefonda `localStorage` içinde tutulur (`self.data.v1`), her yazımdan önce bir kopyası `self.data.v1.bak` anahtarına alınır.
- **Bütçe → Veri → Excel indir**: 4 sayfalık `.xlsx` (Harcamalar, Bağımlılık Tıklamaları, Günlük Özet, Bütçe Planı). Firebase'e taşırken bu dosya kullanılacak.
- **Yedek indir (.json)**: ham verinin birebir kopyası. **Yedek yükle** ile geri alınır.
- Uygulamayı telefondan **kaldırmak veya Chrome'un site verilerini temizlemek verileri siler** — önce yedek al.

## 6. Bağımlılık / bütçe verisini değiştirme

`js/data.js`:
- `ADDICTIONS` → buton listesi. `icon` alanına emoji yazılabilir (örn. `"🚬"`).
- `PERIOD` → 2 aylık bütçe (`total`) ve bitiş tarihi (`end`).
- `BUDGET` → Excel'deki borç/gelir tablosu ve notlar.

Değişiklikten sonra 4. adımdaki gibi yayınla.
