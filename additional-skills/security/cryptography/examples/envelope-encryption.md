---
type: example
title: "Envelope Encryption with AWS KMS"
---

# Envelope Encryption with AWS KMS

## Context
When encrypting data at rest where you need key rotation without re-encrypting all data, and where sending all data to KMS would be too slow or expensive. Envelope encryption: KMS encrypts a data key, you encrypt data locally with that key, store both together.

## Code/Template

```typescript
// src/crypto/envelope.ts
import {
  KMSClient,
  GenerateDataKeyCommand,
  DecryptCommand,
} from '@aws-sdk/client-kms';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

interface EncryptedPayload {
  /** Base64-encoded encrypted data key (decrypt via KMS) */
  encryptedDataKey: string;
  /** Base64-encoded IV + ciphertext + auth tag */
  ciphertext: string;
  /** KMS key ARN used for envelope */
  keyId: string;
  /** Algorithm identifier for future-proofing */
  algorithm: string;
}

export class EnvelopeEncryption {
  private kms: KMSClient;
  private keyArn: string;

  constructor(keyArn: string, region: string = 'us-east-1') {
    this.kms = new KMSClient({ region });
    this.keyArn = keyArn;
  }

  async encrypt(plaintext: Buffer): Promise<EncryptedPayload> {
    // Step 1: Generate a unique data key from KMS
    const { Plaintext, CiphertextBlob } = await this.kms.send(
      new GenerateDataKeyCommand({
        KeyId: this.keyArn,
        KeySpec: 'AES_256',
      })
    );

    if (!Plaintext || !CiphertextBlob) {
      throw new Error('KMS failed to generate data key');
    }

    // Step 2: Encrypt data locally with the plaintext data key
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, Buffer.from(Plaintext), iv);

    const encrypted = Buffer.concat([
      cipher.update(plaintext),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    // Step 3: Combine IV + ciphertext + auth tag
    const combined = Buffer.concat([iv, encrypted, authTag]);

    // Step 4: Immediately discard plaintext data key from memory
    Buffer.from(Plaintext).fill(0);

    return {
      encryptedDataKey: Buffer.from(CiphertextBlob).toString('base64'),
      ciphertext: combined.toString('base64'),
      keyId: this.keyArn,
      algorithm: ALGORITHM,
    };
  }

  async decrypt(payload: EncryptedPayload): Promise<Buffer> {
    // Step 1: Decrypt the data key via KMS
    const { Plaintext } = await this.kms.send(
      new DecryptCommand({
        CiphertextBlob: Buffer.from(payload.encryptedDataKey, 'base64'),
        KeyId: payload.keyId,
      })
    );

    if (!Plaintext) {
      throw new Error('KMS failed to decrypt data key');
    }

    // Step 2: Parse the combined ciphertext
    const combined = Buffer.from(payload.ciphertext, 'base64');
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(combined.length - TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH, combined.length - TAG_LENGTH);

    // Step 3: Decrypt locally with the plaintext data key
    const decipher = createDecipheriv(ALGORITHM, Buffer.from(Plaintext), iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    // Step 4: Clear plaintext key from memory
    Buffer.from(Plaintext).fill(0);

    return decrypted;
  }
}
```

```typescript
// Usage example: encrypting sensitive user documents
import { EnvelopeEncryption } from './crypto/envelope';

const envelope = new EnvelopeEncryption(
  'arn:aws:kms:us-east-1:123456789012:key/mrk-abc123'
);

// Encrypt
const document = Buffer.from(JSON.stringify({
  ssn: '123-45-6789',
  bankAccount: '9876543210',
}));

const encrypted = await envelope.encrypt(document);

// Store in database (only encrypted form)
await db.documents.insert({
  userId: 'user-123',
  encryptedPayload: JSON.stringify(encrypted),
  createdAt: new Date(),
});

// Decrypt when needed
const stored = await db.documents.findOne({ userId: 'user-123' });
const payload = JSON.parse(stored.encryptedPayload) as EncryptedPayload;
const decrypted = await envelope.decrypt(payload);
const data = JSON.parse(decrypted.toString());
```

```typescript
// Key rotation: KMS handles this transparently
// Old data keys can still be decrypted because KMS retains old key material
// New encryptions automatically use the latest key version
// No need to re-encrypt existing data on rotation

// To force re-encryption (e.g., after compromise):
async function reEncryptAll(envelope: EnvelopeEncryption) {
  const documents = await db.documents.find({});
  for (const doc of documents) {
    const payload = JSON.parse(doc.encryptedPayload);
    const plaintext = await envelope.decrypt(payload);
    const newPayload = await envelope.encrypt(plaintext);
    await db.documents.update(
      { _id: doc._id },
      { encryptedPayload: JSON.stringify(newPayload) }
    );
  }
}
```

## Key Points
- Never store the plaintext data key - generate, use, zero-out immediately; only the KMS-encrypted version persists
- AES-256-GCM provides both confidentiality and integrity (auth tag prevents tampering); always store IV with ciphertext
- KMS key rotation is transparent: old encrypted data keys remain decryptable, new operations use latest key version
