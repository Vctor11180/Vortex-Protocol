#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, contracttype, token, Address, Env, IntoVal,
};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidToken = 3,
    InsufficientAmount = 4,
    InsufficientOutput = 5,
    InsufficientLiquidity = 6,
    Unauthorized = 7,
}

#[derive(Clone)]
#[contracttype]
pub enum DataKey {
    Admin,
    TokenA,
    TokenB,
    ReserveA,
    ReserveB,
    TotalShares,
    Shares(Address),
    FeeBps,
    Points(Address),
}

const DEFAULT_FEE_BPS: u32 = 5; // 0.05% fee (Stellar micro-fee philosophy)
const TTL_THRESHOLD: u32 = 100;
const TTL_EXTEND: u32 = 1000;

#[contract]
pub struct VortexSorobanAmm;

#[contractimpl]
impl VortexSorobanAmm {
    /// Initialize the AMM contract with trading pair tokens and administrator.
    pub fn initialize(
        env: Env,
        admin: Address,
        token_a: Address,
        token_b: Address,
        fee_bps: Option<u32>,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }

        admin.require_auth();

        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::TokenA, &token_a);
        env.storage().instance().set(&DataKey::TokenB, &token_b);
        env.storage().instance().set(&DataKey::ReserveA, &0i128);
        env.storage().instance().set(&DataKey::ReserveB, &0i128);
        env.storage().instance().set(&DataKey::TotalShares, &0i128);
        env.storage()
            .instance()
            .set(&DataKey::FeeBps, &fee_bps.unwrap_or(DEFAULT_FEE_BPS));

        // State Expiration: Extend storage TTL
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);

        Ok(())
    }

    /// Perform a Constant Product Swap (x * y = k) between Token A and Token B.
    pub fn swap(
        env: Env,
        user: Address,
        token_in: Address,
        amount_in: i128,
        min_out: i128,
    ) -> Result<i128, Error> {
        user.require_auth();

        if amount_in <= 0 {
            return Err(Error::InsufficientAmount);
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();

        let is_a_to_b = if token_in == token_a {
            true
        } else if token_in == token_b {
            false
        } else {
            return Err(Error::InvalidToken);
        };

        let mut reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let mut reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();

        if reserve_a <= 0 || reserve_b <= 0 {
            return Err(Error::InsufficientLiquidity);
        }

        let fee_bps: u32 = env.storage().instance().get(&DataKey::FeeBps).unwrap();

        let (reserve_in, reserve_out) = if is_a_to_b {
            (reserve_a, reserve_b)
        } else {
            (reserve_b, reserve_a)
        };

        // Mathematical formulation: (amount_in * (10000 - fee_bps))
        let amount_in_with_fee = amount_in * (10000 - fee_bps as i128);
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * 10000) + amount_in_with_fee;
        let amount_out = numerator / denominator;

        if amount_out < min_out || amount_out <= 0 {
            return Err(Error::InsufficientOutput);
        }

        let token_out = if is_a_to_b { token_b } else { token_a };

        // 1. Transfer token_in from user to contract
        token::Client::new(&env, &token_in).transfer(
            &user,
            &env.current_contract_address(),
            &amount_in,
        );

        // 2. Transfer token_out from contract to user
        token::Client::new(&env, &token_out).transfer(
            &env.current_contract_address(),
            &user,
            &amount_out,
        );

        // 3. Update Reserves
        if is_a_to_b {
            reserve_a += amount_in;
            reserve_b -= amount_out;
        } else {
            reserve_b += amount_in;
            reserve_a -= amount_out;
        }

        env.storage().instance().set(&DataKey::ReserveA, &reserve_a);
        env.storage().instance().set(&DataKey::ReserveB, &reserve_b);

        // 4. Award Loyalty Points (Cross-ecosystem loyalty mechanism)
        let points_key = DataKey::Points(user.clone());
        let current_points: i128 = env
            .storage()
            .persistent()
            .get(&points_key)
            .unwrap_or(0i128);
        env.storage()
            .persistent()
            .set(&points_key, &(current_points + (amount_in / 100)));

        // 5. Extend instance and persistent TTL
        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
        env.storage()
            .persistent()
            .extend_ttl(&points_key, TTL_THRESHOLD, TTL_EXTEND);

        Ok(amount_out)
    }

    /// Add liquidity to the AMM pool and mint LP shares.
    pub fn add_liquidity(
        env: Env,
        user: Address,
        amount_a: i128,
        amount_b: i128,
    ) -> Result<i128, Error> {
        user.require_auth();

        if amount_a <= 0 || amount_b <= 0 {
            return Err(Error::InsufficientAmount);
        }

        let token_a: Address = env.storage().instance().get(&DataKey::TokenA).unwrap();
        let token_b: Address = env.storage().instance().get(&DataKey::TokenB).unwrap();
        let mut reserve_a: i128 = env.storage().instance().get(&DataKey::ReserveA).unwrap();
        let mut reserve_b: i128 = env.storage().instance().get(&DataKey::ReserveB).unwrap();
        let mut total_shares: i128 = env
            .storage()
            .instance()
            .get(&DataKey::TotalShares)
            .unwrap();

        let shares_to_mint = if total_shares == 0 {
            // Initial liquidity share minting
            amount_a
        } else {
            let share_a = (amount_a * total_shares) / reserve_a;
            let share_b = (amount_b * total_shares) / reserve_b;
            if share_a < share_b {
                share_a
            } else {
                share_b
            }
        };

        if shares_to_mint <= 0 {
            return Err(Error::InsufficientAmount);
        }

        // Transfer tokens into contract
        token::Client::new(&env, &token_a).transfer(
            &user,
            &env.current_contract_address(),
            &amount_a,
        );
        token::Client::new(&env, &token_b).transfer(
            &user,
            &env.current_contract_address(),
            &amount_b,
        );

        reserve_a += amount_a;
        reserve_b += amount_b;
        total_shares += shares_to_mint;

        let user_shares_key = DataKey::Shares(user.clone());
        let user_shares: i128 = env
            .storage()
            .persistent()
            .get(&user_shares_key)
            .unwrap_or(0i128);

        env.storage().instance().set(&DataKey::ReserveA, &reserve_a);
        env.storage().instance().set(&DataKey::ReserveB, &reserve_b);
        env.storage()
            .instance()
            .set(&DataKey::TotalShares, &total_shares);
        env.storage()
            .persistent()
            .set(&user_shares_key, &(user_shares + shares_to_mint));

        env.storage()
            .instance()
            .extend_ttl(TTL_THRESHOLD, TTL_EXTEND);
        env.storage()
            .persistent()
            .extend_ttl(&user_shares_key, TTL_THRESHOLD, TTL_EXTEND);

        Ok(shares_to_mint)
    }

    /// Read reserves of Token A and Token B.
    pub fn get_reserves(env: Env) -> (i128, i128) {
        let r_a: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveA)
            .unwrap_or(0i128);
        let r_b: i128 = env
            .storage()
            .instance()
            .get(&DataKey::ReserveB)
            .unwrap_or(0i128);
        (r_a, r_b)
    }

    /// Read user loyalty points balance.
    pub fn get_points(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Points(user))
            .unwrap_or(0i128)
    }

    /// Read protocol swap fee basis points.
    pub fn get_fee_bps(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::FeeBps)
            .unwrap_or(DEFAULT_FEE_BPS)
    }
}
