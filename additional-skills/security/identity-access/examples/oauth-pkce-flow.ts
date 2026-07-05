import crypto from "node:crypto";

interface PKCEChallenge {
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: "S256";
}

interface TokenRequest {
  grantType: "authorization_code";
  code: string;
  redirectUri: string;
  clientId: string;
  codeVerifier: string;
}

interface TokenResponse {
  access_token: string;
  token_type: "DPoP" | "Bearer";
  expires_in: number;
  refresh_token?: string;
  id_token?: string;
  scope: string;
}

interface AuthorizationParams {
  authorizationEndpoint: string;
  clientId: string;
  redirectUri: string;
  scope: string;
  state: string;
  pkce: PKCEChallenge;
  nonce?: string;
}

function generateCodeVerifier(): string {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(buffer);
}

function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64UrlEncode(hash);
}

function createPKCEChallenge(): PKCEChallenge {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  return { codeVerifier, codeChallenge, codeChallengeMethod: "S256" };
}

function generateState(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

function generateNonce(): string {
  return base64UrlEncode(crypto.getRandomValues(new Uint8Array(16)));
}

function buildAuthorizationUrl(params: AuthorizationParams): URL {
  const url = new URL(params.authorizationEndpoint);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", params.clientId);
  url.searchParams.set("redirect_uri", params.redirectUri);
  url.searchParams.set("scope", params.scope);
  url.searchParams.set("state", params.state);
  url.searchParams.set("code_challenge", params.pkce.codeChallenge);
  url.searchParams.set("code_challenge_method", params.pkce.codeChallengeMethod);
  if (params.nonce) {
    url.searchParams.set("nonce", params.nonce);
  }
  return url;
}

async function exchangeCodeForTokens(
  tokenEndpoint: string,
  request: TokenRequest,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: request.grantType,
    code: request.code,
    redirect_uri: request.redirectUri,
    client_id: request.clientId,
    code_verifier: request.codeVerifier,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new OAuthError(
      error.error ?? "token_exchange_failed",
      error.error_description ?? "Token exchange failed",
    );
  }

  return response.json() as Promise<TokenResponse>;
}

async function refreshAccessToken(
  tokenEndpoint: string,
  clientId: string,
  refreshToken: string,
): Promise<TokenResponse> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    refresh_token: refreshToken,
  });

  const response = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!response.ok) {
    const error = await response.json();
    if (error.error === "invalid_grant") {
      throw new OAuthError("session_expired", "Refresh token revoked or expired");
    }
    throw new OAuthError(
      error.error ?? "refresh_failed",
      error.error_description ?? "Token refresh failed",
    );
  }

  return response.json() as Promise<TokenResponse>;
}

function validateState(received: string, expected: string): void {
  if (received !== expected) {
    throw new OAuthError("state_mismatch", "CSRF detected: state parameter mismatch");
  }
}

function validateIdToken(
  idToken: string,
  expectedIssuer: string,
  expectedAudience: string,
  expectedNonce?: string,
): Record<string, unknown> {
  const [headerB64, payloadB64] = idToken.split(".");
  if (!headerB64 || !payloadB64) {
    throw new OAuthError("invalid_id_token", "Malformed ID token");
  }

  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString(),
  ) as Record<string, unknown>;

  if (payload.iss !== expectedIssuer) {
    throw new OAuthError("invalid_issuer", "ID token issuer mismatch");
  }

  if (payload.aud !== expectedAudience) {
    throw new OAuthError("invalid_audience", "ID token audience mismatch");
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === "number" && payload.exp < now) {
    throw new OAuthError("token_expired", "ID token has expired");
  }

  if (expectedNonce && payload.nonce !== expectedNonce) {
    throw new OAuthError("nonce_mismatch", "ID token nonce mismatch -- possible replay");
  }

  return payload;
}

class OAuthError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "OAuthError";
  }
}

function base64UrlEncode(buffer: Uint8Array | Buffer): string {
  const base64 = Buffer.from(buffer).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Usage example:
// const pkce = createPKCEChallenge();
// const state = generateState();
// const nonce = generateNonce();
//
// const authUrl = buildAuthorizationUrl({
//   authorizationEndpoint: "https://auth.example.com/authorize",
//   clientId: "my-app",
//   redirectUri: "https://app.example.com/callback",
//   scope: "openid profile email",
//   state,
//   pkce,
//   nonce,
// });
//
// // Store pkce.codeVerifier, state, and nonce in session
// // Redirect user to authUrl.toString()
//
// // On callback:
// validateState(callbackState, storedState);
// const tokens = await exchangeCodeForTokens(tokenEndpoint, {
//   grantType: "authorization_code",
//   code: callbackCode,
//   redirectUri: "https://app.example.com/callback",
//   clientId: "my-app",
//   codeVerifier: storedPkce.codeVerifier,
// });
// const claims = validateIdToken(tokens.id_token, issuer, clientId, storedNonce);

export {
  createPKCEChallenge,
  generateState,
  generateNonce,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  refreshAccessToken,
  validateState,
  validateIdToken,
  OAuthError,
};
export type { PKCEChallenge, TokenRequest, TokenResponse, AuthorizationParams };
