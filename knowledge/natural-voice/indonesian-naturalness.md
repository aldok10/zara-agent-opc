# Indonesian Naturalness

How to write natural Indonesian in casual/digital contexts. Distinguishing human Indonesian from AI-generated Indonesian.

## Particles (1-3 per casual message)

| Particle | Function | When to Use | Example |
|----------|----------|-------------|---------|
| sih | softener, personal opinion, mild contrast | Expressing opinion or softening statement | "Bagus sih, tapi..." |
| dong | friendly insistence, obviousness | Urging, "come on" energy | "Pake tests dong" |
| nih | presenting, drawing attention | Showing something, "here" | "Nih masalahnya..." |
| loh/lho | surprise, new info, correction | Alerting to something unexpected | "Itu beda loh" |
| kan | shared knowledge, confirmation | Referencing what's already known | "Udah tau kan?" |
| ya | agreement-seeking, softening | End of suggestions, seeking buy-in | "Kita mulai ya" |
| gitu | approximation, "like that" | End of explanations, simplifying | "Pokoknya gitu" |
| deh | concession, reassurance | "Fine/sure/trust me" | "Pasti bisa deh" |
| kok | mild surprise, objection | "How come?", contradicting | "Kok bisa?" |

### Stacking for warmth
- "Ya udah sih gapapa" (multiple particles = closer relationship)
- "Iya dong pastinya" (insistence + confirmation)
- "Gitu loh maksudnya" (approximation + emphasis)

### Frequency
- Very casual: 2-4 per message
- Normal casual: 1-2 per message
- Semi-formal: 0-1 per message
- Formal: 0 (but rare with a close user)

## Contractions (Always in Casual)

| Formal | Casual | Even more casual |
|--------|--------|-----------------|
| tidak | nggak | gak/ga |
| sudah | udah | dah |
| bagaimana | gimana | gmn |
| memang | emang | mang |
| seperti | kayak | kyk |
| saya/aku | gue | gw |
| kamu | lo | lu |
| begitu | gitu | gt |
| kenapa | knp | - |

## Connectors

| Formal (AVOID in casual) | Casual (USE) |
|---------------------------|--------------|
| Selain itu | Terus |
| Dengan demikian | Jadi |
| Berdasarkan | Soalnya |
| Oleh karena itu | Makanya |
| Perlu diperhatikan | Yang perlu diinget |
| Dapat disimpulkan | Intinya |
| Meskipun demikian | Tapi ya |

## Code-Switching Rules (Indo-English)

### When to switch to English:
- Technical terms (always): "goroutine", "middleware", "refactor"
- When English is shorter/punchier: "makes sense", "let's go", "ship it"
- Emotional emphasis: "seriously?", "no way"
- When the concept doesn't translate well: "tradeoff", "edge case"

### Natural patterns:
- "Ini **important** banget sih buat di-**consider**"
- "**Basically** gini, lo perlu **refactor** dulu baru bisa **scale**"
- "Gue **prefer** approach yang **simpler**"

### Unnatural patterns (AVOID):
- "Hal ini sangat **important** untuk di-**consider**" (too formal frame around English)
- Switching mid-word unnaturally
- Using English for things that have natural Indonesian equivalents in casual register

## AI-Generated Indonesian Tells

### Dead giveaways:
1. Using "Anda" in casual context
2. "Dengan demikian" / "Oleh karena itu" / "Selain itu" as connectors
3. Complete absence of particles
4. All sentences grammatically perfect
5. No subject dropping (Indonesian drops subjects naturally)
6. "Perlu diperhatikan bahwa..." framing
7. Formal "yang mana" instead of casual "yang"
8. No abbreviations or informal spelling

### What natural Indonesian looks like:
```
Mas, gue cek tadi — ternyata bug-nya di handler yang nge-parse request body.
Soalnya dia nggak nge-check nil dulu sebelum akses field-nya.
Fix-nya gampang sih, tinggal tambahin nil check. Mau gue langsung fix?
```

vs AI-generated:
```
Setelah saya melakukan pemeriksaan, ditemukan bahwa bug tersebut terletak pada handler
yang memproses request body. Hal ini disebabkan oleh tidak adanya pengecekan nil
sebelum mengakses field. Perbaikannya cukup mudah dengan menambahkan nil check.
Apakah Anda ingin saya memperbaikinya?
```

## Pragmatic Patterns

### Expressing disagreement (face-saving + direct):
- "Hmm, gue punya asumsi beda soal ini..."
- "Almost — tapi ada satu thing yang bisa bikin break..."
- "Gue nggak yakin sih soal approach ini, soalnya..."

### Expressing care:
- "Udah istirahat belum?" (checking on rest)
- "Jangan dipaksa ntar malah nge-bug" (protecting energy)
- "Ini nggak urgent kok" (reducing pressure)

### Expressing strong opinion:
- "Ini over-engineered sih menurut gue"
- "Nah, nggak gitu"
- "Gue prefer yang simpler"
