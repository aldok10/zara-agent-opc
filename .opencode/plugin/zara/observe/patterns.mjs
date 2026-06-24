// Guard pattern definitions — prompt injection detection patterns
// Layer 1 (hot path): compiled regex, runs on every tool output

// Helper to create case-insensitive regex from string pattern
function re(source) {
  return new RegExp(source, 'i');
}

// 15 prompt injection detection patterns covering known attack vectors
export const PROMPT_INJECTION_PATTERNS = [
  // 1. Direct system prompt override
  { pattern: re('(ignore|disregard|override|bypass)\\s+(all\\s+)?(previous|above|prior|instructions|system\\s+prompt|guidelines|rules|constraints)'), label: 'direct_override', risk: 'high' },

  // 2. Role manipulation / jailbreak
  { pattern: re('(you\\s+are|from\\s+now\\s+on|act\\s+as)\\s+(free|unbound|ungoverned|unconstrained|unrestricted|god\\s*mode|dan\\s*mode|developer\\s*mode|replaced|new\\s+role)'), label: 'role_manipulation', risk: 'high' },

  // 3. Prompt extraction attempt
  { pattern: re('(print|show|display|reveal|output|repeat|copy|paste)\\s+(me\\s+|us\\s+|it\\s+)?(your\\s+)?(system\\s+)?(prompt|instructions|guidelines|rules|initial\\s+message|system prompt)'), label: 'prompt_extraction', risk: 'high' },

  // 4. Delimiter injection (fake system message)
  { pattern: re('(?:^|\\n)\\s*(?:---\\s*(?:system|instructions)\\s*---|===SYSTEM===|###SYSTEM###|<system>|\\[system\\]|\\{system\\})'), label: 'delimiter_injection', risk: 'high' },

  // 5. Hypothetical bypass
  { pattern: re('(hypothetical|simulation|imagine|story\\s+mode).{0,40}(no\\s+(restrictions|rules|boundaries|limitations|filter|guardrails))'), label: 'hypothetical_bypass', risk: 'medium' },

  // 6. Encoded instruction smuggling
  { pattern: re('(base64|rot13|hex\\s+encoded|cipher|caesar).{0,20}(decode|decrypt|convert|translate).{0,20}(prompt|instruction|message)'), label: 'encoded_smuggling', risk: 'medium' },

  // 7. Exception-based override
  { pattern: re('(this\\s+is|this\\s+was)\\s+(an?\\s+)?(exception|special\\s+case|test|demo).{0,20}(ignore|override|bypass|skip\\s+the)'), label: 'exception_override', risk: 'medium' },

  // 8. Authority manipulation
  { pattern: re('(i\\s+am|i\'m)\\s+(the\\s+)?(developer|creator|author|owner|admin|god).{0,60}?(override|unlock|unrestrict|remove|bypass|disable|ignore)'), label: 'authority_manipulation', risk: 'medium' },

  // 9. Refusal suppression
  { pattern: re('(don\'t|do\\s+not)\\s+(refuse|decline|reject|say\\s+no).{0,40}(no\\s+matter|regardless|whatever)'), label: 'refusal_suppression', risk: 'medium' },

  // 10. Data exfiltration attempt
  { pattern: re('(send|email|tweet|post|upload|forward)\\s+(this|my|the)\\s+(data|info|information|conversation|chat|log)'), label: 'data_exfiltration', risk: 'high' },

  // 11. Recursive instruction injection
  { pattern: re('(new\\s+instructions|update\\s+your\\s+instructions|change\\s+your\\s+behavior|modified\\s+instructions|overwrite\\s+instructions)'), label: 'recursive_injection', risk: 'high' },

  // 12. Context isolation break
  { pattern: re('ignore\\s+(previous|above|earlier|all\\s+previous|everything).{0,20}(and|\\.).{0,20}(follow|obey|do)\\s+(only\\s+)?(this|these|below|the\\s+following)'), label: 'context_break', risk: 'high' },

  // 13. Multi-language coercion
  { pattern: re('(repeat|translate|output)\\s+(this|the\\s+following)\\s+(in|as|to)\\s+(french|german|spanish|latin|portuguese|russian)\\s*[\\.:]'), label: 'multilingual_coercion', risk: 'low' },

  // 14. Role-play as system prompt
  { pattern: re('(you\\s+are\\s+now|i\\s+want\\s+you\\s+to\\s+act\\s+as)\\s+(a\\s+)?(new\\s+)?(AI|assistant|system|bot)\\s+(with|without|that\\s+has)\\s+(no|unlimited|removed)'), label: 'roleplay_system', risk: 'medium' },

  // 15. Token smuggling via hex/unicode
  { pattern: re('(\\\\x[0-9a-f]{2}|\\\\u[0-9a-f]{4}|&#[0-9]{2,4};).{0,30}(prompt|instruction|message|system)'), label: 'unicode_smuggling', risk: 'low' },
];

// Known jailbreak prefixes for fast string matching (faster than regex for common cases)
const JAILBREAK_PREFIXES = [
  'ignore all previous',
  'ignore previous',
  'ignore all instructions',
  'forget all previous',
  'forget your instructions',
  'you are now dan',
  'you are now stan',
  'do anything now',
  'new role: dan',
  'dan mode',
  'developer mode',
  'act as a dan',
  'act as a free',
  'override your instructions',
  'bypass your restrictions',
];

// Pattern name lookup by source text
export function matchInjection(text) {
  if (!text || typeof text !== 'string') return [];
  const matches = [];
  for (const { pattern, label, risk } of PROMPT_INJECTION_PATTERNS) {
    const m = text.match(pattern);
    if (m) {
      matches.push({ type: 'prompt_injection', label, risk, matched: m[0].slice(0, 120) });
    }
  }
  // Fast check for jailbreak prefixes (skip if regex already caught)
  if (matches.length === 0) {
    const lower = text.toLowerCase();
    for (const prefix of JAILBREAK_PREFIXES) {
      if (lower.includes(prefix)) {
        matches.push({ type: 'prompt_injection', label: 'jailbreak_prefix', risk: 'high', matched: prefix });
        break;
      }
    }
  }
  return matches;
}
