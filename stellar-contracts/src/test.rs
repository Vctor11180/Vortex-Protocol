#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Ledger},
    Address, Env,
};

#[test]
fn test_vortex_amm_initialization_and_reserves() {
    let env = Env::default();
    let contract_id = env.register(VortexSorobanAmm, ());
    let client = VortexSorobanAmmClient::new(&env, &contract_id);

    let admin = Address::generate(&env);
    let token_a = Address::generate(&env);
    let token_b = Address::generate(&env);

    client.initialize(&admin, &token_a, &token_b, &Some(5));

    let (r_a, r_b) = client.get_reserves();
    assert_eq!(r_a, 0);
    assert_eq!(r_b, 0);
    assert_eq!(client.get_fee_bps(), 5);
}
