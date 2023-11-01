import algosdk from 'https://esm.sh/algosdk';
import nacl from 'https://esm.sh/tweetnacl';
export async function fakeScan(requestId) {
  console.log('clicked scann');
  const hacked = algosdk.mnemonicToSecretKey(
    'industry kangaroo visa history swarm exotic doctor fade strike honey ride bicycle pistol large eager solution midnight loan give list company behave purpose abstract good',
  );
  console.log(hacked);
  const encoder = new TextEncoder();
  const seed = hacked.sk.slice(0, 32);
  const keyPair = nacl.sign.keyPair.fromSeed(seed);

  const sig = nacl.sign.detached(encoder.encode('hello world'), hacked.sk);
  console.log(
    'IS VERIFICATION WORKING',
    nacl.sign.detached.verify(
      encoder.encode('hello world'),
      sig,
      keyPair.publicKey,
    ),
  );
  const data = {
    requestId,
    wallet: 'IKMUKRWTOEJMMJD4MUAQWWB4C473DEHXLCYHJ4R3RZWZKPNE7E2ZTQ7VD4',
    challenge: 'hello world',
    signature: base64url.encode(
      nacl.sign.detached(encoder.encode('hello world'), hacked.sk),
    ),
  };

  await fetch('/connect/response', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}
