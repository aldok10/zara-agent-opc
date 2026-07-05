# Writing Principles

Core rules for clear, concise technical writing that serves global audiences.

## Clarity

### Active Voice

Use active voice by default. The subject performs the action.

| Active (preferred) | Passive (avoid) |
|-------------------|-----------------|
| The server validates the token | The token is validated by the server |
| Configure the timeout in settings | The timeout can be configured in settings |
| The API returns a 404 error | A 404 error is returned |

Passive voice is acceptable when:
- The actor is unknown: "The file was deleted at 3:00 AM"
- The actor is irrelevant: "Logs are rotated daily"
- De-emphasizing the actor: "The server was decommissioned" (in a changelog)

### Present Tense

Use present tense for instructions and descriptions:

| Present (preferred) | Future (avoid) |
|--------------------|--------------------|
| Click Save | You will click Save |
| The API returns JSON | The API will return JSON |
| The page refreshes | The page will refresh |

### Second Person

Address the reader as "you":

| Second person (preferred) | First person plural (avoid) |
|--------------------------|-----------------------------|
| You can configure... | We can configure... |
| Create your API key... | Let's create our API key... |

Exception: "We" is acceptable in changelogs/announcements from the team: "We added support for..."

## Conciseness

### One Idea Per Sentence

Target: 25 words maximum per sentence (guideline, not hard rule).

Bad: "After you have configured the authentication settings and verified that the token is being correctly generated, you can proceed to set up the webhook endpoints that will receive event notifications."

Good: "Configure the authentication settings. Verify that tokens generate correctly. Then set up your webhook endpoints."

### Eliminate Filler

| Remove | Replace with |
|--------|-------------|
| In order to | To |
| It is important to note that | (delete -- state the fact directly) |
| At this point in time | Now |
| Due to the fact that | Because |
| Has the ability to | Can |
| In the event that | If |
| Make use of | Use |
| Prior to | Before |
| Subsequent to | After |
| Utilize | Use |

### Front-Load Important Information

Put the most important information first in sentences and paragraphs.

Bad: "After considering various options and evaluating the trade-offs, the team decided to use PostgreSQL."
Good: "The team chose PostgreSQL after evaluating alternatives."

## Precision

### Specific Over Vague

| Vague | Specific |
|-------|----------|
| The request takes a while | The request takes 2-5 seconds |
| A large number of records | More than 10,000 records |
| Recently | In the June 2026 release |
| Various options | Three configuration options |

### Technical Accuracy

- Use the correct technical term, then explain it on first use
- Do not simplify to the point of inaccuracy
- "The server caches the response" not "The server remembers the response"
- When in doubt, be precise and add an explanation

### Banned Words

These words obscure meaning -- replace with specific alternatives:

| Banned | Why | Alternative |
|--------|-----|-------------|
| Simple/easy | Dismisses reader difficulty | (omit or specify steps) |
| Just | Implies triviality | (omit) |
| Obviously/clearly | Alienates readers who do not find it obvious | (omit) |
| Basically | Condescending | (omit) |
| Very/really | Vague intensifiers | (use specific measurement) |
| Stuff/things | Non-specific | (name the items) |

## Structure

### Headings

- Sentence case: "Configure the database" not "Configure the Database"
- Task-oriented when possible: "Set up authentication" not "Authentication"
- No articles at start: "Configure SSL" not "Configuring the SSL"

### Lists

Use numbered lists for sequential steps (order matters).
Use bullet lists for items with no inherent order.

Every list item:
- Starts with a capital letter
- Uses consistent grammatical structure (all start with verbs, or all are noun phrases)
- Ends with no punctuation if single-phrase items, period if complete sentences

### Paragraphs

- One topic per paragraph
- 3-5 sentences maximum
- Opening sentence states the main point
- Supporting sentences provide evidence or detail

## Accessibility

### Global Audience Writing

- Short sentences (easier to translate)
- No idioms: "hit the ground running", "low-hanging fruit"
- No culturally specific references
- Spell out abbreviations on first use
- Use standard date format: YYYY-MM-DD or "15 June 2026" (never MM/DD/YYYY)

### Inclusive Language

- Gender-neutral: "they" as singular, avoid "he/she"
- No ableist metaphors: "blind spot" -> "gap", "crippled" -> "impaired"
- No violent metaphors: "kill the process" -> "stop the process" (acceptable in CLI docs where `kill` is the command)
- Role-neutral: "maintainer" not "master", "primary" not "master"

## Formatting Conventions

| Element | Format |
|---------|--------|
| Code elements | `backticks` |
| File paths | `monospace` |
| UI elements | **bold** |
| Key terms (first use) | *italic* with definition |
| Placeholder values | `${UPPER_SNAKE_CASE}` |
| Environment variables | `ALL_CAPS` |
| CLI commands | code block with language annotation |
