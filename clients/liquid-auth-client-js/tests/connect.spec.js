import test from 'node:test';
import assert from 'node:assert';
import algosdk from 'algosdk';
import nacl from "tweetnacl";

import { Message } from '../lib/connect.js';
import { fromBase64Url } from "../lib/encoding.js";
const encoder = new TextEncoder;


test("create instance", async () => {
    const msg = new Message("hello", "1234", 1234);
    assert(msg instanceof Message);
    const acct = algosdk.generateAccount();
    // Get KeyPair
    const seed = acct.sk.slice(0, 32);
    const keyPair = nacl.sign.keyPair.fromSeed(seed);
    // Sign with sdk secret key
    msg.sign(acct.sk);
    assert(nacl.sign.detached.verify(encoder.encode("1234"), fromBase64Url(msg.signature), keyPair.publicKey));
    // Sign with Seed
    msg.sign(seed);
    assert(nacl.sign.detached.verify(encoder.encode("1234"), fromBase64Url(msg.signature), keyPair.publicKey));
    // Sign with NACL keypair
    msg.sign(keyPair);
    assert(nacl.sign.detached.verify(encoder.encode("1234"), fromBase64Url(msg.signature), keyPair.publicKey));
    // Sign with algosdk Account
    msg.sign(acct);
    assert(nacl.sign.detached.verify(encoder.encode("1234"), fromBase64Url(msg.signature), keyPair.publicKey));
});
