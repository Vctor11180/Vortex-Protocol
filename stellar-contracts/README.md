# 🚀 Vortex Protocol - Soroban Smart Contracts (Stellar Network)

This directory contains the production-grade **Soroban Smart Contract** implementation for the **Stellar Network**, written in **Rust** and compiled to **WebAssembly (WASM)**.

---

## 🏗️ Architecture & Soroban Philosophy

Unlike Ethereum/EVM contracts (written in Solidity and executed on an account-based bytecode VM), Vortex on Stellar is built on **Soroban**:

| Feature | Ethereum (EVM) | Stellar (Soroban) |
|---|---|---|
| **Language** | Solidity | **Rust** (`soroban-sdk`) |
| **Execution Target** | EVM Bytecode | **WebAssembly (WASM)** |
| **Fees** | Dynamic Gas (Spikes up to $50+) | **Predictable Micro-Fees** (~0.00001 XLM) |
| **Storage Model** | Permanent Global State (High Bloat) | **State Expiration & TTL (Rent Management)** |
| **Authentication** | `msg.sender` | Cryptographic Explicit Signatures (`require_auth()`) |

---

## 📦 Project Structure

```
stellar-contracts/
├── Cargo.toml            # Rust dependencies & optimization profiles
├── README.md             # Architecture & deployment manual
└── src/
    ├── lib.rs            # Main VortexSorobanAmm smart contract
    └── test.rs           # Unit tests with Soroban Test Environment
```

---

## ⚙️ Contract Interface

### 1. `initialize(admin: Address, token_a: Address, token_b: Address, fee_bps: Option<u32>)`
Initializes the constant product liquidity pool, registers tokens, and sets storage TTL expiration rules.

### 2. `swap(user: Address, token_in: Address, amount_in: i128, min_out: i128) -> i128`
Executes an $x \cdot y = k$ token swap, updates pool reserves, and awards loyalty points to the user.

### 3. `add_liquidity(user: Address, amount_a: i128, amount_b: i128) -> i128`
Transfers both assets into the pool and mints proportional LP pool shares.

### 4. `get_reserves() -> (i128, i128)`
Returns the current liquidity reserves of Token A and Token B.

---

## 🛠️ Build and Deploy Instructions

### Prerequisites
* Rust toolchain with `wasm32-unknown-unknown` target:
  ```bash
  rustup target add wasm32-unknown-unknown
  ```
* Stellar CLI:
  ```bash
  cargo install --locked stellar-cli --features opt
  ```

### Compiling to WASM
```bash
cargo build --target wasm32-unknown-unknown --release
```

### Deploying to Stellar Testnet
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/vortex_soroban_amm.wasm \
  --source <IDENTITY_NAME> \
  --network testnet
```
