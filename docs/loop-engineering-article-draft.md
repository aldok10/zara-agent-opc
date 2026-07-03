# Loop Engineering: Cara Baru Pake AI yang Lagi Heboh di 2026

> Draft artikel Medium — nunggu review dan approval sebelum publish
> Target: siapa aja, gak perlu latar belakang teknis

---

Lo tau rasa ini.

Lo minta AI bikin sesuatu. Dia ngasih hasil. Lumayan, tapi ada yang salah.

Lo koreksi. Dia coba lagi. Masih kurang. Lo koreksi lagi. Dia coba lagi. Lumayan, tapi...

Tiga puluh menit kemudian, lo masih di situ. Bolak-balik sama AI. Lo yang ngasih instruksi, lo yang baca hasil, lo yang mutusin bener apa salah, lo yang ngetik perintah berikutnya.

AI-nya cepet. Tapi lo yang jadi penghambatnya.

Nah. Juni 2026 ini ada yang berubah secara fundamental. Tiga orang penting di dunia teknologi ngomongin hal yang sama. Dan semuanya setuju: cara kita pake AI selama ini udah mau diganti.

---

## AI Itu Sebenarnya Apa?

Sebelum lanjut, kita samain dulu.

AI yang dimaksud disini bukan robot kayak di film. Yang dimaksud adalah **AI yang bisa ngerjain tugas**. Kayak ChatGPT, Claude, Gemini.

Lo kasih perintah. Dia ngerjain. Lo lihat hasilnya.

Simpel. Tapi ada batasnya.

---

## Masalahnya: Lo Jadi Supirnya

Coba bayangin lo punya montir yang jago banget.

Tapi lo harus ngomong satu-satu:

"Pasangin ban depan."
Udah.
"Cek bautnya."
Udah.
"Sekarang balancing."
Udah.
"Yang bener dong balancing-nya."
Udah.

Lo yang nyetir setiap langkah. Montirnya cuma nunggu perintah. Lo capek, di nganggur.

Ini yang disebut **prompt engineering**. Lo belajar nulis instruksi yang lebih bagus, biar AI-nya ngerti maksud lo. Skill ini berguna banget. Tapi lo tetap jadi supirnya.

Lo yang pegang setir setiap saat.

---

## Loop Engineering: Lo Bikin Sistem Yang Nyetir Sendiri

Loop engineering adalah kebalikannya.

Lo gak ngasih AI serangkaian instruksi. Lo ngasih AI **satu tujuan**, **alat yang bisa dia pake**, dan **aturan kapan berhenti**. Terus lo tinggal.

Dia yang ngerjain sisanya. Sendiri. Tanpa lo ngecek tiap langkah.

Boris Cherny—kepala Claude Code di Anthropic—bilang gini:

> "Gue udah gak nge-prompt Claude lagi. Sekarang gue punya loop yang nge-prompt Claude buat gue. Pekerjaan gue sekarang nulis loop."

Peter Steinberger, pembuat OpenClaw, ngetweet yang ditonton 8 juta orang:

> "Lo gak boleh nge-prompt coding agent lagi. Lo harus ngedesain loop yang nge-prompt agent buat lo."

Dua orang paling berpengaruh di bidang AI coding ngomongin hal yang sama. Ini bukan tren random.

---

## Analogi Biar Nempel

**Prompt engineering** itu kayak lo nyetir mobil ke Jakarta.
Lo pegang setir. Lo nginjak gas. Lo rem. Lo belok. Lo yang liat jalan.

**Loop engineering** itu kayak lo pasang GPS dan nyalain autopilot.
Lo bilang: "Ke Jakarta. Pake tol. Sampe sebelum jam 5 sore."
Mobil yang jalan. Lo tinggal tidur di belakang.

Dua-duanya sampe ke Jakarta. Tapi yang satu lo capek, yang satu lo santai.

Buat tugas yang berulang-ulang, mobil autopilot bisa jalan semaleman. Sementara lo? Lo butuh tidur. Lo butuh makan. Lo butuh istirahat.

Loop gak butuh istirahat.

---

## Gimana Cara Kerjanya?

Setiap loop, sesederhana apapun, terdiri dari lima bagian:

**1. Tujuan yang jelas**
"Selesai" itu kayak apa? Ini harus sesuatu yang bisa diukur.

"Bikin bagus" bukan tujuan. Itu harapan.
"Pindahin semua file ke folder yang bener dan gak ada yang error" itu tujuan.

**2. Pengirim instruksi**
Yang ngirim perintah ke AI. Bukan lo lagi—ini sistemnya.

**3. Pembaca hasil**
Yang baca output AI dan ngambil informasi penting dari situ.

**4. Pengecek**
Yang ngecek: "Ini udah sesuai tujuan apa belum?"

Ini bagian PALING PENTING. Dan aturannya keras: yang ngecek HARUS beda dari yang ngerjain. Kalo AI yang ngerjain sekaligus ngecek, dia bakal selalu bilang "udah bener" — walaupun salah.

**5. Pengatur**
Yang mutusin: berhenti (udah selesai), ulang (masih salah, coba lagi pake koreksi), atau minta tolong (gak bisa selesai sendiri, butuh manusia).

Alurnya gini:

```
Tujuan → Kirim perintah → AI kerja → Baca hasil → Udah sesuai?
                                                    ↓
                                  Belum? ← Ulang pake koreksi
                                  Udah? → Berhenti. Selesai.
```

---

## Contoh Biar Gak Abstrak

Lo punya 1000 file foto di laptop yang berantakan. Campur aduk sama dokumen, musik, video.

**Cara lama:**
Lo buka folder. Lo liat satu-satu. Lo pindahin. Capek. Besok lanjut lagi. Tiga minggu kemudian lo nyerah.

**Cara loop:**
Lo bilang ke AI: "Pindahin semua foto ke folder `Foto`, semua dokumen ke folder `Dokumen`. Kalo ada yang gak jelas, taruh di `Ragu-ragu`. Jalanin tiap malam jam 12 sampe semua kelar."

Loop-nya jalan tiap malem. Pindahin 100 file. Cek: masih ada? Ulang. Udah abis? Berhenti.

Lo gak megang apa-apa. Loop-nya yang kerja. Lo tinggal tidur.

Dia juga gak bakal salah taruh—karena ada pengecek yang mastiin file foto beneran di folder Foto.

---

## Kenapa Baru Heboh Sekarang?

Dua alasan.

**Pertama**, AI coding tool baru beneran berguna dalam setahun terakhir. Sebelumnya mereka terlalu lemah buat di-loop. Sekarang mereka cukup pintar buat dipercaya kerja sendiri.

**Kedua**, skill ini baru dikasih nama Juni 2026. Addy Osmani dari Google yang nulis essay dan nge-kasih nama "Loop Engineering."

Sebelumnya orang udah ngelakuin ini, tapi gak tau namanya.

Kayak "UX design" sebelum tahun 2000-an. Orang udah ngerancang produk yang enak dipake, tapi gak ada yang nyebut itu UX. Sekarang semua orang tau.

---

## Yang Bisa Di-Loop vs Yang Gak Bisa

Loop engineering jago buat tugas yang **hasilnya bisa dicek sama komputer**.

✅ Bisa di-loop
- Merapihin file berdasarkan aturan yang jelas
- Nge-fix bug yang udah tau benernya gimana
- Mindahin data dari format lama ke baru
- Ngecek link di website mati apa enggak
- Nulis ulang kode biar lebih rapi

❌ Jangan di-loop
- Nentuin strategi bisnis
- Nulis konten kreatif yang pake feeling
- "Bikin aplikasi dari nol" — itu terlalu gede buat satu loop
- Apa pun yang lo harus liat sendiri buat tau "ini udah bener apa belum"

Kuncinya simpel: **kalo komputer bisa ngecek hasilnya, loop bisa jalan sendiri. Kalo lo harus liat sendiri, loop gak akan berguna.**

---

## Hati-Hati: Loop Gak Dikontrol = Bencana

Loop engineering kedengeran kayak solusi ajaib. "Tinggal bikin loop, AI kerja sendiri, lo tinggal tidur."

Tapi realitanya: loop yang salah desain bisa jadi mesin pembakar uang.

Udah ada cerita orang kena tagihan $6.000 dalam semalem. $1.800 dalam dua hari. 4 juta tokens dalam lima menit. Semua karena loop-nya jalan terus tanpa aturan berhenti.

Makanya tiap loop butuh **circuit breaker**. Sama kayak stop kontak di rumah: kalo kelebihan beban, mati sendiri.

Tiap loop harus punya jawaban buat ini:

- **Kapan selesai?** Target yang jelas dan terukur
- **Kapan stuck?** Gagal tiga kali berturut-turut? Stop.
- **Berapa maksimal usaha?** Maksimal 10 putaran. Atau maksimal Rp 100.000.
- **Kapan minta tolong?** Kalo mentok, bilang ke manusianya

Tanpa aturan ini, loop itu bukan alat. Itu mesin perusak dompet.

---

## Yang Perlu Lo Ingat

Addy Osmani, yang ngasih nama loop engineering, bilang satu hal yang penting banget:

> "Bikin loop-nya. Tapi lo harus tetap jadi engineer-nya. Jangan cuma jadi orang yang pencet tombol 'jalankan'."

Ada bahaya yang jarang dibahas: **comprehension debt**.

Loop bikin AI kerja cepet. Kode bermunculan. Hasil berdatangan. Lo seneng, semuanya kelar tanpa lo ngangkat jari.

Tapi kalo lo berhenti baca hasil kerja AI-nya—karena "ah udah otomatis"—lambat laun lo gak ngerti apa yang terjadi. Kalo ada yang error, lo gak tau cara betulinnya. Kalo ada keputusan salah, lo gak tau di mana salahnya.

Loop itu alat. Lo tetap yang pegang kendali.

---

## Intinya

Loop engineering bukan sihir. Ini cara pikir yang beda.

Lo define finish line-nya. AI yang cari jalan sampe sampe. Kalo mentok, dia minta tolong. Kalo selesai, dia berhenti sendiri. Kalo salah, dia ulang pake koreksi.

Bukan ngasih perintah langkah demi langkah. Tapi ngasih tujuan dan alat, terus lo pergi.

Orang yang ngerti cara pikir ini—bahkan tanpa ngerti detail teknisnya—udah selangkah lebih maju dari yang masih nge-prompt satu-satu.

Karena skill yang paling berharga di era AI bukan nulis instruksi yang bagus.

**Tapi ngedesain sistem yang bikin instruksi itu gak perlu lo tulis lagi.**

---

*Berdasarkan tulisan Addy Osmani, Peter Steinberger, Boris Cherny, Simon Willison, dan berbagai sumber tentang loop engineering. Juni 2026.*
