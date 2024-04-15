import test from 'node:test';
import assert from 'node:assert';

import * as encoding from '../lib/encoding.js';
import base64UrlFixtures from './__fixtures__/encoding.base64url.fixtures.json' assert {type: 'json'};
import walletKeysFixtures from './__fixtures__/wallet.keys.fixtures.json' assert {type: 'json'};


// Invalid Inputs
test(`fromBase64URL(*) throws ${encoding.INVALID_BASE64URL_INPUT}`, function(){
    assert.throws(()=>encoding.fromBase64Url(12345), new Error(encoding.INVALID_BASE64URL_INPUT));
})
base64UrlFixtures.forEach((fixture, i)=>{
    const encoder = new TextEncoder();

    test(`toBase64URL(${fixture.origin})`, () => {
        assert.equal(fixture.toBase64Url, encoding.toBase64URL(i % 2 ? encoder.encode(fixture.origin) : fixture.fromBase64Url));
    })
    test(`fromBase64URL(${fixture.origin})`, () => {
        assert.deepEqual(new Uint8Array(fixture.fromBase64Url), encoding.fromBase64Url(fixture.toBase64Url));
    });
})




// Test Basic Inputs
test(`decodeAddress(*) throws ${encoding.MALFORMED_ADDRESS_ERROR_MSG}`, function(){
    assert.throws(()=>encoding.decodeAddress(12345), new Error(encoding.MALFORMED_ADDRESS_ERROR_MSG));
})
// Algorand Address Tests
walletKeysFixtures.forEach(function (fixture){
    test(`decodeAddress(${fixture.encoded})`, function(){
        const decoded = encoding.decodeAddress(fixture.encoded);
        assert.deepEqual(new Uint8Array(fixture.publicKey), decoded);
    })
    test(`encodeAddress(${fixture.encoded})`, function() {
        const address = encoding.encodeAddress(new Uint8Array(fixture.publicKey));
        assert.equal(fixture.encoded, address);
    })

    test(`decodeAddress(${fixture.encoded.slice(0, -4) + "===="}) throws ${encoding.ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG}`, function(){
        assert.throws(()=>encoding.decodeAddress(fixture.encoded.slice(0, -4) + "===="), new Error(encoding.ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG))
    })

})
