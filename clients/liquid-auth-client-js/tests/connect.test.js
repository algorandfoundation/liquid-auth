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

test("ensure rekeyed accounts work", async () => {
    const msg = new Message("hello", "1234", 1234);
    assert(msg instanceof Message);
    const acct = algosdk.generateAccount();
    const acct2 = algosdk.generateAccount();

    const algodClient = new algosdk.Algodv2(
      process.env.ALGOD_TOKEN,
      process.env.ALGOD_SERVER,
      process.env.ALGOD_PORT,
    );

    const suggestedParams = await algodClient.getTransactionParams().do();  
    const rekeyTxn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
      suggestedParams,
      from: acct.addr,
      to: acct.addr,
      amount: 0,
      rekeyTo: acct2.addr
    });

    // rekey the first account to the second
    const signedRekeyTxn = rekeyTxn.signTxn(acct2.sk);

    const { txId } = await algodClient.sendRawTransaction(signedRekeyTxn).do();
    const result = await algosdk.waitForConfirmation(algodClient, txId, 4);
    console.log(`Transaction Information: ${result.txn}`);
    
    // now we need to connect acct with the post connect response endpoint
    const response = await fetch(
      'http://',
      {
      }
    )
})
