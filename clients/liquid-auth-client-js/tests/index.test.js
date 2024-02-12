import test from 'node:test';
import assert from 'node:assert';
import { HTTPClient } from '../lib/api.js';
test("stuff works", () => {
    assert.equal(1, 1);
});
test("create instance", async () => {
    const client = new HTTPClient(undefined, "https://nest-fido2.onrender.com");
    assert(client instanceof HTTPClient);
    const options = await client.attestationOptions();
    console.log(options);
});
