# Loop Engineering: Berhenti Nyetir, Biarin AI yang Kerja

*Dari sudut pandang backend developer yang tiap hari hidup di Go dan PHP.*

---

Jadi gini. Minggu lalu saya habiskan hampir satu jam bolak-balik sama Claude buat refactor satu service kecil di Go. Satu file. Yang isinya cuma handler sama repository pattern biasa.

Dan bukan karena AI-nya bodoh, karena memang enggak. Tapi karena setiap kali dia kasih hasil, saya harus review line by line, mikir "ini error handling-nya gak idiomatic," terus revisi promptnya, tunggu lagi, review lagi. Yang bikin capek bukan nulis code-nya, tapi proses jadi code reviewer untuk AI yang ternyata lebih nguras energi dari ngoding sendiri.

Yang bikin frustrasi: saya tau AI bisa bantu. Saya tau kalo prompt-nya pas hasilnya bisa hemat waktu berjam-jam. Tapi kenyataannya saya duduk di depan terminal lebih lama dari yang seharusnya, dan energi mental saya habis bukan buat mikirin arsitektur atau logic, tapi buat mikirin cara nge-prompt AI-nya biar output-nya sesuai convention yang kita pakai di project. Kayak punya junior developer yang jago tapi harus di-review super detail di setiap PR, sampe kadang mikir "mending gue ketik sendiri dari awal."

Kalo lo backend developer, pasti pernah ngerasain ini. Minta AI generate migration script, hasilnya pake raw SQL padahal project lo pakai GORM. Minta bikin endpoint baru, dia generate pake framework yang beda dari yang udah ada di codebase. Minta refactor, dia malah ubah interface yang udah dipake 15 service lain. Bolak-balik revisi, bolak-balik konteks hilang, bolak-balik capek.

---

## Ternyata Ini Masalah Semua Engineer

Saya kira cuma saya yang gini. Ternyata enggak.

LA Times baru publish artikel soal ini bulan Juni 2026. Datanya bikin saya agak lega sekaligus kesel: rata-rata pekerja yang pakai AI memang hemat 11 jam seminggu, tapi mereka juga habiskan lebih dari 6 jam buat apa yang reporter-nya sebut "botsitting." Enam jam seminggu cuma buat ngecek output AI, benerin kesalahan, dan nulis ulang prompt yang gagal. Jadi net saving-nya cuma 5 jam, bukan 11 — dan itu pun dengan tambahan kelelahan mental yang sebelumnya gak ada.

Harvard Business Review kasih nama buat kelelahan ini: **AI brain fry.** Survei BCG ke 1.488 pekerja di Amerika nunjukin ini beneran bikin orang mengalami mental fog, decision fatigue, dan in some cases pengen resign. Bukan karena kerjaan mereka berat, tapi karena proses bolak-balik supervisi AI yang gak ada habisnya ternyata nguras otak dengan cara yang berbeda dari ngoding biasa.

Appfire nemuin angka yang lebih specific buat kita: **68% engineers habiskan 4 jam lebih per minggu** cuma buat fixing output AI. Empat jam. Itu setengah hari kerja yang hilang buat benerin sesuatu yang harusnya bikin kerjaan lebih cepet.

Dan kalo dipikir sebagai backend developer, ini masuk akal banget. Kita udah punya cognitive load tinggi dari daily work: mikirin concurrency, database query optimization, error propagation, interface design. Terus ditambah load baru: jadi full-time prompt editor dan AI output reviewer. Otak kita bukan multi-threaded — context switch antara "mikir arsitektur" dan "mikir cara ngomong ke AI" itu mahal.

Ini model yang kebanyakan developer pakai sekarang. Namanya: **prompt engineering.** Dan batas terbesarnya adalah kita sendiri.

---

## Juni 2026: Tiga Orang Bilang Hal yang Sama

Bulan Juni 2026 kemarin, hampir bersamaan, tiga orang dari tiga perusahaan beda mulai ngomongin pendekatan yang berbeda.

**Peter Steinberger**, developer yang bikin OpenClaw (dan dulu di balik IntelliJ IDEA), nulis di X:

> "You shouldn't be prompting coding agents anymore. You should be designing loops that prompt your agents."

Tweet itu dilihat lebih dari 5 juta orang dalam 24 jam.

**Boris Cherny**, kepala tim Claude Code di Anthropic, bilang ke wartawan CNBC:

> "I don't prompt Claude anymore. I have loops running that prompt Claude and figuring out what to do. My job is to write loops."

Dan **Addy Osmani**, engineering lead di Google, yang akhirnya kasih nama formal buat pendekatan ini lewat blog post-nya di O'Reilly Radar:

> "Loop engineering is replacing yourself as the person who prompts the agent. You design the system that does it instead."

Tiga orang, tiga perusahaan, kesimpulan yang sama: **berhenti jadi orang yang ngetik ke AI, mulai jadi orang yang bikin sistem yang ngetik ke AI.**

Nama yang mereka kasih: **loop engineering.**

Dan sebagai backend developer, begitu saya paham konsepnya, saya langsung ngeliat paralel-nya: ini basically event-driven architecture tapi buat AI workflows. Kita udah familiar sama pattern ini — message queue, consumer, retry mechanism, dead letter queue. Loop engineering itu konsep yang sama, cuma diterapin ke interaksi sama AI.

---

## Penjelasan Buat Sesama Backend Dev

Kalo mau analogi yang lebih relate daripada nyetir mobil, bayangin gini:

**Prompt engineering** = lo nulis script yang jalanin satu task, lo run manual dari terminal, lo baca outputnya, lo tweak, lo run lagi. Kayak development workflow jaman dulu sebelum ada CI/CD. Semuanya manual, semuanya lo yang trigger.

**Loop engineering** = lo setup CI/CD pipeline. Push code, pipeline jalan otomatis: build, test, lint, deploy. Kalo gagal, retry. Kalo tetep gagal, notify. Lo gak perlu duduk nunggu tiap step selesai. Lo define rules-nya sekali, sisanya sistem yang handle.

Atau kalo mau lebih teknis:

```
// Prompt engineering (pseudo)
for {
    output := callAI(manualPrompt)
    // kita MANUAL review di sini
    // kita MANUAL decide next step
    // kita MANUAL tulis prompt berikutnya
}

// Loop engineering (pseudo)
for {
    output := callAI(autoGeneratedPrompt)
    result := validator.Check(output, goal)
    if result.Done {
        break
    }
    if result.Stuck || budget.Exceeded() {
        notifyHuman()
        break
    }
    autoGeneratedPrompt = feedbackLoop.Next(output, result)
}
```

Bedanya jelas: di yang pertama, manusia ada di dalam loop. Di yang kedua, manusia yang **design** loop-nya tapi gak perlu ada di dalamnya selama runtime.

---

## Lima Komponen (Bahasa Engineer)

Kalo lo familiar sama message queue architecture, ini gak asing:

### 1. Goal (Acceptance Criteria)

Sama kayak definition of done di ticket Jira. Harus testable, harus automatable. "Bikin API bagus" bukan goal. "Migrate semua endpoint dari REST ke gRPC, semua existing test harus pass, zero downtime" — itu goal.

### 2. Dispatcher (Producer)

Yang trigger AI buat kerja. Bisa cron job, bisa event listener, bisa webhook. Yang penting: bukan tangan kita yang ngetik prompt di terminal.

### 3. Parser (Consumer)

Baca output AI, extract yang relevan. Kalo lo pernah nulis consumer buat Kafka message, ini persis sama — terima payload, parse, ambil yang perlu.

### 4. Validator (The Critical One)

Ini equivalent-nya integration test di CI/CD pipeline. Setelah AI produce output, validator ngecek: apakah cocok sama goal?

**Rule paling penting:** validator WAJIB terpisah dari worker. Ini bukan opsional — ini prinsip yang sama kayak kenapa kita gak boleh deploy straight to production tanpa review.

Tim Claude Code nemuin empiris bahwa AI yang diminta ngerjain sekaligus self-evaluate akan hampir selalu bilang hasilnya udah oke. Sama kayak developer yang review PR sendiri — pasti LGTM. Makanya mereka bikin prinsip "maker-checker": yang bikin harus beda dari yang cek.

Di Go, ini kayak separation antara handler dan middleware. Di PHP, kayak pake separate validation layer (pake Laravel Validator misalnya) instead of validasi di dalam controller.

### 5. Orchestrator (Circuit Breaker + Retry Logic)

Decide next step. Mirip retry policy di HTTP client kita:
- Success? Return.
- Retriable error? Retry with exponential backoff.
- Fatal error? Dead letter queue (a.k.a. notify human).
- Budget exceeded? Stop.

Kalo lo pernah implement circuit breaker pattern (Sony's gobreaker di Go, atau Laravel's rate limiter), lo udah ngerti konsepnya.

---

## Contoh yang Lebih Relate Buat Kita

Sebagai backend dev, contoh "rapiin folder Downloads" kurang ngena. Ini contoh yang lebih kena:

**Scenario 1: Database Migration**

Lo punya legacy PHP monolith yang mau di-migrate ke Go microservices. Ada 200+ table, ratusan stored procedure, dan business logic yang scattered di mana-mana.

Dengan prompt engineering: buka satu table, prompt AI "convert ini ke Go struct + repository," review hasilnya, fix yang salah, commit. Next table. Repeat 200 kali. Realistis? Lo bakal burnout di table ke-20.

Dengan loop engineering: define rules sekali (naming convention, struct tag pattern, repository interface template, error handling standard), set AI buat process satu table per iterasi, validator cek apakah generated code compile dan pass existing tests, loop sampe semua table selesai atau budget habis. Lo review hasilnya besok pagi — bukan tiap 5 menit.

**Scenario 2: Boilerplate Generation**

Setiap bikin service baru di Go, kita butuh: handler, service layer, repository, DTO, migration, test file, Dockerfile, Makefile. Pattern-nya sama, cuma entity-nya beda.

Prompt engineering: copy-paste dari service sebelumnya, minta AI adjust, review, fix. Tiap kali.

Loop engineering: define template rules, kasih AI entity definition, dia generate semua layer sekaligus, validator jalanin `go build` dan `go test`, kalo pass ya udah. Kalo gagal, loop back dengan error message sebagai feedback.

**Scenario 3: API Documentation**

Lo punya 50 endpoint yang belum ada Swagger/OpenAPI doc-nya. Semua orang males ngerjain.

Loop engineering: AI baca handler code satu-satu, generate OpenAPI spec, validator jalanin `oapi-codegen` buat pastiin spec valid, loop sampe semua endpoint ke-cover. Besok pagi lo tinggal review final output dan merge.

---

## Bahayanya (Dari Pengalaman Orang Lain)

Ini bagian yang wajib dibaca sebelum excited.

Loop tanpa batas itu kayak goroutine leak — gak keliatan sampe production kena OOM. Bedanya ini bukan memory yang bocor, tapi duit.

Satu artikel dari RapidFlow Automation nyeritain kasus dua AI agent yang stuck dalam loop ngobrol satu sama lain selama **11 hari**. Gak ada yang matiin. Tagihan: **$47.000.**

Data dari CryptoBriefing: agent loop systems rata-rata habiskan **4 sampai 15 kali** lebih banyak token dibanding chat biasa.

Analisis dari Tianpan.co: satu API call $0.03 bisa compound jadi ratusan dolar kalo loop-nya naively append full context setiap iterasi (kayak goroutine yang terus allocate memory tanpa release).

**Solusi: circuit breaker. Sama persis kayak yang kita implement di service-to-service communication.**

Sebelum deploy loop ke production, wajib define:

1. **Done condition** — kayak exit condition di for loop. Tanpa ini, infinite loop.
2. **Stuck detection** — kayak health check. 3x gagal berturut-turut? Stop.
3. **Budget cap** — kayak rate limiter. Max Rp 100.000 atau max 50 iterasi per run.
4. **Human escalation** — kayak alerting. Situation gak bisa di-handle? PagerDuty.

Kalo di Go, mental model-nya gini:

```go
ctx, cancel := context.WithTimeout(ctx, maxDuration)
defer cancel()

for attempts := 0; attempts < maxRetries; attempts++ {
    select {
    case <-ctx.Done():
        notifyHuman("budget/time exceeded")
        return
    default:
        result := runAgent(ctx, task)
        if validator.IsComplete(result) {
            return result
        }
        task = feedbackLoop.Adjust(task, result)
    }
}
notifyHuman("max retries exceeded")
```

Familiar kan? Ini pattern yang kita udah pakai tiap hari. Cuma sekarang applied ke AI workflows.

---

## Cocok Buat Apa di Daily Work Kita?

**Yang cocok (output-nya verifiable by machine):**
- Boilerplate generation (struct, handler, test skeleton)
- Database migration scripting
- API documentation generation
- Code formatting dan linting fixes
- Dependency upgrade yang pattern-nya jelas
- Log analysis dan alerting rules

**Yang gak cocok (butuh engineering judgment):**
- System design decisions
- Performance optimization yang butuh profiling
- Security audit
- Architectural refactoring
- Anything yang ada trade-off tanpa jawaban "benar" yang jelas

Rule of thumb: kalo `go test` atau `php artisan test` bisa bilang output-nya valid, loop works. Kalo butuh lo liat dan mikir "hmm ini make sense gak ya secara arsitektur," jangan diserahin ke loop.

---

## Comprehension Debt: Warning Buat Kita Semua

Ini konsep yang bikin saya personally was-was dan menurut saya tiap engineer perlu tau.

Namanya **comprehension debt** — dan ini beda dari technical debt yang udah kita familiar.

Technical debt: code-nya works tapi strukturnya jelek, susah di-maintain. Kita tau ada masalah, kita cuma belum sempet fix.

Comprehension debt: code-nya works, strukturnya mungkin bagus, tapi **kita gak ngerti gimana cara kerjanya** karena yang nulis bukan kita. Dan kalo yang nulis itu AI agent dalam loop yang jalan semaleman, bisa-bisa kita punya ratusan file baru di codebase yang gak satupun kita baca.

Paper dari ArXiv April 2026 formally define ini: *"The growing gap between what a team knows about its system and what it actually needs to understand to maintain it effectively."*

Studi internal Anthropic bikin angka yang lebih concerning: developer yang heavy user AI ternyata **scoring 17% lebih rendah** di tes pemahaman terhadap codebase mereka sendiri.

Addy Osmani nulis soal ini dan satu kalimat yang stuck sama saya:

> "Build the loop. But stay the engineer. Don't just become the person who hits run."

Ini relevant banget buat kita. Sebagai backend developer, codebase kita itu lifeline production. Kalo ada incident jam 3 pagi dan kita gak ngerti flow service yang kena karena yang nulis AI agent yang jalan otomatis bulan lalu, itu bukan cuma teknikal problem — itu operational risk.

Jadi ya, pakai loop engineering. Tapi tetap baca output-nya. Tetap review PR-nya. Tetap paham apa yang terjadi di system kita. Comprehension debt itu utang yang bunganya muncul waktu production down jam 3 pagi.

---

## Penutup

Buat sesama backend developer: loop engineering bukan konsep baru secara fundamental. Kita udah hidup di dunia event-driven architecture, message queues, CI/CD pipelines, retry mechanisms, dan circuit breakers. Loop engineering cuma nge-apply pattern yang sama ke cara kita interact sama AI.

Yang berubah bukan skillset kita. Yang berubah adalah: sekarang kita bisa pakai skill arsitektur yang udah kita punya buat bikin AI kerja lebih efektif tanpa kita harus jadi full-time prompt babysitter.

Skill paling valuable sekarang mungkin bukan nulis prompt yang sempurna. Tapi ngedesain sistem — sama kayak yang udah kita lakuin tiap hari — yang bikin prompt itu gak perlu kita tulis lagi tiap kali.

Kita udah architect. Sekarang tinggal apply ke domain baru.

---

## Sumber dan Referensi

**Konsep Loop Engineering:**
- Addy Osmani, *"Loop Engineering"* — O'Reilly Radar, Juni 2026: https://www.oreilly.com/radar/loop-engineering/
- Peter Steinberger, tweet viral (5M+ views) — 7 Juni 2026: https://substack.com/redirect/55e6408b-6bbf-4da1-9b5d-9967fc13b3cf
- Boris Cherny, wawancara TechTimes/CNBC — Juni 2026: https://www.techtimes.com/articles/318828/20260622/claude-code-loop-engineering-stop-prompting-start-designing-autonomous-agent-workflows.htm
- Simon Willison, *"Designing Agentic Loops"* — September 2025: https://simonwillison.net/2025/sep/30/designing-agentic-loops/
- Simon Willison, *"Agentic Engineering Patterns"* — Februari 2026: https://simonwillison.net/guides/agentic-engineering-patterns/

**Riset tentang Kelelahan AI:**
- Harvard Business Review, *"When Using AI Leads to Brain Fry"* — Maret 2026: https://hbr.org/2026/03/when-using-ai-leads-to-brain-fry
- Fortune/BCG study (1.488 pekerja) — Maret 2026: https://fortune.com/2026/03/10/ai-brain-fry-workplace-productivity-bcg-study/
- LA Times, *"AI babysitting"* survey — Juni 2026: https://www.latimes.com/business/story/2026-06-12/ai-saves-office-workers-hours-but-then-demands-hours-of-babysitting
- Appfire, *"68% engineers fix AI output 4+ hrs/week"*: https://appfire.com/resources/blog/ai-adoption-trends-report

**Bahaya Loop dan Biaya:**
- RapidFlow Automation, kasus agent loop $47K: https://rapidflowautomation.beehiiv.com/p/the-5-agent-failure-modes-bleeding-agency-retainers-in-2026-ranked-by-cost-which-are-you-sitting-on
- CryptoBriefing, loop costs 4-15x: https://cryptobriefing.com/anthropic-agent-loops-loop-engineering/
- Tianpan.co, token cost compounding: https://tianpan.co/blog/2026-04-20-token-economy-multi-turn-tool-use-agent-cost

**Comprehension Debt:**
- Addy Osmani, *"Comprehension Debt"*: https://addyosmani.com/blog/comprehension-debt/
- ArXiv paper — April 2026: https://arxiv.org/abs/2604.13277
- Allstacks, *"The Hidden Cost of AI-Generated Code"*: https://www.allstacks.com/blog/comprehension-debt-the-hidden-cost-of-ai-generated-code

**Bacaan Lanjutan:**
- Firecrawl, penjelasan teknis lengkap: https://www.firecrawl.dev/blog/loop-engineering
- WorkOS, takeaways dari Boris Cherny: https://workos.com/blog/boris-cherny-claude-code-acquired-interview-takeaways
- TechSpot, *"Meet Loop Engineering"*: https://www.techspot.com/news/112923-ai-developers-moving-beyond-prompts-loops-take-over.html
- NoCo MBA, *"What Are AI Loops?"*: https://www.nocode.mba/articles/what-are-ai-loops
