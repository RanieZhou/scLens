use rand::Rng;
use sha2::{Digest, Sha256};

/// Generate a random pair code like "K7Q4-M9XA"
pub fn generate_pair_code() -> String {
    const CHARS: &[u8] = b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut rng = rand::thread_rng();
    let part = |n: usize| -> String {
        (0..n).map(|_| CHARS[rng.gen_range(0..CHARS.len())] as char).collect()
    };
    format!("{}-{}", part(4), part(4))
}

/// Generate a random nonce (hex string)
pub fn generate_nonce() -> String {
    let mut rng = rand::thread_rng();
    let bytes: Vec<u8> = (0..16).map(|_| rng.gen()).collect();
    hex::encode(bytes)
}

/// sha256(pair_code + nonce) as hex
pub fn hash_pair_code(pair_code: &str, nonce: &str) -> String {
    let mut h = Sha256::new();
    h.update(pair_code.as_bytes());
    h.update(nonce.as_bytes());
    hex::encode(h.finalize())
}

/// sha256(secret) as hex
pub fn hash_secret(secret: &str) -> String {
    let mut h = Sha256::new();
    h.update(secret.as_bytes());
    hex::encode(h.finalize())
}
