# Authentication Patterns

Technical reference for modern authentication: OAuth 2.1, WebAuthn, session management, tokens, MFA, and password hashing.

---

## OAuth 2.1

OAuth 2.1 consolidates OAuth 2.0 best practices into a single specification. Key changes from 2.0:

- PKCE is mandatory for all clients (not just public)
- Implicit grant is removed
- Resource Owner Password Credentials grant is removed
- Bearer tokens in query strings are prohibited
- Refresh token rotation is recommended

### Authorization Code + PKCE Flow

```typescript
import crypto from "node:crypto";

function generatePKCE(): { verifier: string; challenge: string } {
  const verifier = crypto.randomBytes(32).toString("base64url");
  const challenge = crypto
    .createHash("sha256")
    .update(verifier)
    .digest("base64url");
  return { verifier, challenge };
}

// Step 1: Authorization request
const { verifier, challenge } = generatePKCE();
const authUrl = new URL("https://auth.example.com/authorize");
authUrl.searchParams.set("response_type", "code");
authUrl.searchParams.set("client_id", CLIENT_ID);
authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
authUrl.searchParams.set("scope", "openid profile email");
authUrl.searchParams.set("state", crypto.randomBytes(16).toString("hex"));
authUrl.searchParams.set("code_challenge", challenge);
authUrl.searchParams.set("code_challenge_method", "S256");

// Step 2: Token exchange (server-side)
async function exchangeCode(code: string, verifier: string): Promise<TokenSet> {
  const response = await fetch("https://auth.example.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: CLIENT_ID,
      code_verifier: verifier,
    }),
  });
  return response.json();
}
```

---

## WebAuthn / Passkeys

Replaces passwords with public-key cryptography. The private key never leaves the authenticator.

### Registration Flow

```typescript
// Server: generate challenge
function generateRegistrationOptions(user: User): PublicKeyCredentialCreationOptions {
  return {
    challenge: crypto.randomBytes(32),
    rp: { name: "Example App", id: "example.com" },
    user: {
      id: Buffer.from(user.id),
      name: user.email,
      displayName: user.name,
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256
      { alg: -257, type: "public-key" }, // RS256
    ],
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "preferred",
    },
    timeout: 60000,
  };
}

// Server: verify registration response
async function verifyRegistration(
  credential: RegistrationCredential,
  expectedChallenge: Buffer,
): Promise<VerifiedCredential> {
  const { attestationObject, clientDataJSON } = credential.response;
  const clientData = JSON.parse(Buffer.from(clientDataJSON).toString());

  if (clientData.type !== "webauthn.create") throw new Error("Invalid type");
  if (!timingSafeEqual(Buffer.from(clientData.challenge, "base64url"), expectedChallenge)) {
    throw new Error("Challenge mismatch");
  }

  // Parse attestation, extract public key, store credential
  const publicKey = parseAttestationObject(attestationObject);
  return { credentialId: credential.id, publicKey, counter: 0 };
}
```

### Authentication Flow

1. Server sends challenge
2. Browser calls `navigator.credentials.get()` with challenge
3. Authenticator signs challenge with private key
4. Server verifies signature with stored public key
5. Server checks counter is strictly increasing (cloning detection)

---

## Session Management

### Best Practices

| Property | Recommendation |
|---|---|
| ID generation | 128+ bits of cryptographic randomness |
| Storage | Server-side (Redis/DB), NOT in JWT alone |
| Transport | HttpOnly, Secure, SameSite=Lax cookie |
| Lifetime | Idle timeout: 15-30 min. Absolute: 8-24h |
| Rotation | New session ID on privilege change (login, role change) |
| Invalidation | Server-side delete on logout. Invalidate all on password change |

```typescript
import { randomBytes } from "node:crypto";

interface Session {
  id: string;
  userId: string;
  createdAt: number;
  lastActivity: number;
  ipAddress: string;
  userAgent: string;
}

function createSession(userId: string, req: Request): Session {
  return {
    id: randomBytes(32).toString("hex"),
    userId,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipAddress: req.headers.get("x-forwarded-for") ?? "unknown",
    userAgent: req.headers.get("user-agent") ?? "unknown",
  };
}

function setSessionCookie(res: Response, sessionId: string): void {
  res.headers.set(
    "Set-Cookie",
    `sid=${sessionId}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`,
  );
}
```

---

## Token Patterns

### JWT (JSON Web Tokens)

Use for: stateless authorization between services, short-lived access tokens.

Do NOT use for: session management (can't revoke), storing sensitive data.

```typescript
import { SignJWT, jwtVerify } from "jose";

const secret = new TextEncoder().encode(process.env.JWT_SECRET);

async function issueAccessToken(userId: string, roles: string[]): Promise<string> {
  return new SignJWT({ sub: userId, roles })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("15m")
    .setIssuer("https://api.example.com")
    .setAudience("https://app.example.com")
    .sign(secret);
}

async function verifyToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, secret, {
    issuer: "https://api.example.com",
    audience: "https://app.example.com",
  });
  return payload;
}
```

### Refresh Token Rotation

```typescript
async function rotateRefreshToken(oldToken: string): Promise<TokenPair> {
  const stored = await db.refreshToken.findUnique({ where: { token: oldToken } });

  if (!stored || stored.revoked) {
    // Token reuse detected -- revoke entire family
    await db.refreshToken.updateMany({
      where: { family: stored?.family },
      data: { revoked: true },
    });
    throw new Error("Token reuse detected");
  }

  // Revoke old token
  await db.refreshToken.update({
    where: { token: oldToken },
    data: { revoked: true },
  });

  // Issue new pair
  const newRefresh = randomBytes(32).toString("hex");
  await db.refreshToken.create({
    data: { token: newRefresh, userId: stored.userId, family: stored.family },
  });

  const accessToken = await issueAccessToken(stored.userId, stored.roles);
  return { accessToken, refreshToken: newRefresh };
}
```

---

## MFA Implementation

### TOTP (Time-Based One-Time Password)

```typescript
import { createHmac } from "node:crypto";

function generateTOTP(secret: Buffer, time: number = Date.now()): string {
  const counter = Math.floor(time / 30000);
  const buffer = Buffer.alloc(8);
  buffer.writeBigInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", secret).update(buffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const code = (hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000;
  return code.toString().padStart(6, "0");
}

function verifyTOTP(secret: Buffer, userCode: string): boolean {
  const now = Date.now();
  // Check current and adjacent time steps (clock skew tolerance)
  for (const offset of [-30000, 0, 30000]) {
    if (generateTOTP(secret, now + offset) === userCode) return true;
  }
  return false;
}
```

### MFA Method Comparison

| Method | Security | UX | Recovery |
|---|---|---|---|
| TOTP (authenticator app) | High | Medium | Backup codes |
| WebAuthn/Passkey | Highest | Best | Multiple keys |
| SMS OTP | Low (SIM swap) | Easy | Phone number |
| Push notification | Medium | Good | Alternative method |

---

## Password Hashing

### Argon2id (Recommended)

```typescript
import { hash, verify } from "@node-rs/argon2";

const ARGON2_OPTIONS = {
  memoryCost: 65536,  // 64 MB
  timeCost: 3,        // 3 iterations
  parallelism: 4,     // 4 threads
  outputLen: 32,
};

async function hashPassword(password: string): Promise<string> {
  return hash(password, ARGON2_OPTIONS);
}

async function verifyPassword(password: string, hashed: string): Promise<boolean> {
  return verify(hashed, password);
}
```

### bcrypt (Acceptable Alternative)

```typescript
import bcrypt from "bcrypt";

const ROUNDS = 12; // ~250ms on modern hardware

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, ROUNDS);
}
```

### Parameter Selection

| Algorithm | Memory | Time | When to Use |
|---|---|---|---|
| Argon2id | 64MB+ | 3+ iterations | New systems, memory available |
| bcrypt | N/A | 12+ rounds | Legacy compatibility, limited memory |
| scrypt | 64MB+ | N=2^17 | Alternative to Argon2, proven |

Target: hashing should take 250ms-1s on your server hardware. Adjust parameters to meet this target.
