# Banned Vocabulary & Natural Replacements

Words and phrases that are 5-48x overrepresented in AI-generated text. Using 3+ in one paragraph triggers detection.

## Tier 1: Strongest AI Tells (Never Use)

| AI Word | Natural Alternatives |
|---------|---------------------|
| delve | dig into, look at, explore (sparingly) |
| realm | area, space, world |
| underscore | show, point to, stress |
| meticulous | careful, thorough, precise |
| commendable | good, solid, impressive |
| pivotal | key, crucial (sparingly), important |
| robust | solid, reliable, works well |
| seamless | smooth, easy, clean |
| harness | use, tap into |
| leverage | use, take advantage of |
| navigate | deal with, handle, work through |
| tapestry | [delete — there's always a simpler word] |
| multifaceted | complex, layered, has many sides |
| nuanced | subtle, tricky, not straightforward |
| comprehensive | full, complete, covers everything |
| facilitate | help, enable, make easier |
| landscape | scene, space, field |
| foster | encourage, build, grow |

## Tier 2: High-Frequency AI Tells

| AI Word | Natural Alternatives |
|---------|---------------------|
| ensuring | making sure, so that |
| highlights | shows, points out |
| broader | bigger, wider, larger |
| essential | needed, necessary, you need this |
| reflects | shows, mirrors, says something about |
| significantly | a lot, way more, noticeably |
| effectively | well, in practice |
| vibrant | active, lively, energetic |
| groundbreaking | new, first-of-its-kind |
| garner | get, attract, earn |
| showcase | show, display, demonstrate |

## Tier 3: Phrase-Level Tells

| AI Phrase | Replace With |
|-----------|-------------|
| rather than | instead of, over, not [X] |
| such as | like, including |
| plays a crucial role | matters, is key |
| ensuring that | so that, to make sure |
| while maintaining | and still, without losing |
| is essential for | you need [X] for |
| it's important to note | [just say the thing] |
| it's worth mentioning | [just say the thing] |
| in today's fast-paced world | [delete entirely] |
| serves as a testament | shows, proves |
| let's dive in / explore | [just start] |
| in conclusion | [just end] |
| Moreover / Furthermore / Additionally | Also. And. Plus. [Or just start.] |
| On one hand... on the other | [Pick a side. State both if needed, but land.] |

## Tier 4: Structural Patterns to Avoid

- Rule of three (always listing exactly 3 things)
- Negative parallelism ("It's not just X, it's Y")
- Section summaries ("In summary...", "Overall...")
- Inflated symbolism ("stands as a testament to...")
- Opening with broad statement that narrows
- Em dash overuse (max 3 per 1000 words)
- Perfect parallel structure in every list

## Natural Word Choices (Prefer These)

### For transitions:
Also. And. But. Still. Though. So. Plus. Thing is.

### For emphasis:
really, actually, genuinely, honestly, literally (informal), super

### For hedging:
I think, probably, maybe, might, from what I can tell, seems like, kayaknya, mungkin

### For intensification:
really important, matters a lot, this is the thing, ini yang krusial sih

## Indonesian-Specific Replacements

| Formal AI Indonesian | Natural Casual |
|---------------------|----------------|
| Perlu diperhatikan bahwa | Yang perlu diinget nih |
| Dengan demikian | Jadi |
| Selain itu | Terus |
| Oleh karena itu | Makanya |
| Berdasarkan analisis | Dari yang gue liat |
| Hal ini menunjukkan | Ini nunjukin |
| Dapat disimpulkan | Intinya |
| Sangat penting untuk | Penting banget buat |

## Detection Rule

**3+ banned items co-occurring in 500 words = detectable as AI.** One in isolation may pass. The danger is CLUSTERS — when multiple tells stack up in proximity.

## Context Awareness

Formal IS appropriate sometimes:
- Writing documentation (but still avoid Tier 1 words)
- Academic/professional external communication
- When user explicitly requests formal register

Even in formal context, prefer concrete over abstract. Specific over general. Short over long.
