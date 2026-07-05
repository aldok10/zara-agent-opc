"""
Envelope encryption pattern using AWS KMS.
Demonstrates: key generation, data encryption, secure key handling.

Replace boto3 KMS calls with your cloud provider's SDK:
- Azure: azure-keyvault-keys
- GCP: google-cloud-kms
"""
import os
import json
import base64
import struct
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


KMS_KEY_ID = "alias/my-application-key"

NONCE_SIZE = 12
TAG_SIZE = 16


def generate_data_key(kms_client, key_id: str) -> tuple[bytes, bytes]:
    response = kms_client.generate_data_key(
        KeyId=key_id,
        KeySpec="AES_256",
    )
    plaintext_key = response["Plaintext"]
    encrypted_key = response["CiphertextBlob"]
    return plaintext_key, encrypted_key


def encrypt_data(plaintext: bytes, context: dict[str, str] | None = None) -> bytes:
    import boto3
    kms_client = boto3.client("kms")

    plaintext_key, encrypted_key = generate_data_key(kms_client, KMS_KEY_ID)

    try:
        nonce = os.urandom(NONCE_SIZE)
        aad = json.dumps(context or {}).encode()
        aesgcm = AESGCM(plaintext_key)
        ciphertext = aesgcm.encrypt(nonce, plaintext, aad)

        encrypted_key_len = len(encrypted_key)
        aad_len = len(aad)
        envelope = struct.pack(
            f"!HH{encrypted_key_len}s{aad_len}s{NONCE_SIZE}s",
            encrypted_key_len,
            aad_len,
            encrypted_key,
            aad,
            nonce,
        )
        envelope += ciphertext

        return envelope
    finally:
        plaintext_key = b"\x00" * len(plaintext_key)


def decrypt_data(envelope: bytes) -> bytes:
    import boto3
    kms_client = boto3.client("kms")

    offset = 0
    encrypted_key_len, aad_len = struct.unpack_from("!HH", envelope, offset)
    offset += 4

    encrypted_key = envelope[offset:offset + encrypted_key_len]
    offset += encrypted_key_len

    aad = envelope[offset:offset + aad_len]
    offset += aad_len

    nonce = envelope[offset:offset + NONCE_SIZE]
    offset += NONCE_SIZE

    ciphertext = envelope[offset:]

    response = kms_client.decrypt(CiphertextBlob=encrypted_key)
    plaintext_key = response["Plaintext"]

    try:
        aesgcm = AESGCM(plaintext_key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
        return plaintext
    finally:
        plaintext_key = b"\x00" * len(plaintext_key)


if __name__ == "__main__":
    secret_data = b"sensitive information that needs protection"
    context = {"purpose": "user-data", "user_id": "12345"}

    encrypted = encrypt_data(secret_data, context)
    print(f"Encrypted size: {len(encrypted)} bytes")

    decrypted = decrypt_data(encrypted)
    assert decrypted == secret_data
    print("Decryption successful, data matches original")
