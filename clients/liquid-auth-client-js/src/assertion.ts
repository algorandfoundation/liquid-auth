import { fromBase64Url, toBase64URL } from '@liquid/core/encoding';
import { DEFAULT_FETCH_OPTIONS } from './constants.js';

interface SerializedAuthenticatorAssertionResponse {
  [k: string]: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string;
}
interface SerializedCredential {
  [k: string]: string | SerializedAuthenticatorAssertionResponse;
  id: string;
  type: string;
  response: SerializedAuthenticatorAssertionResponse;
  rawId: string;
}

export async function assertion(credId: string) {
  console.log(
    `%cFETCHING: %c/assertion/request/${credId}`,
    'color: yellow',
    'color: cyan',
  );
  const options = await fetch(`/assertion/request/${credId}`, {
    ...DEFAULT_FETCH_OPTIONS,
  }).then(async (r) => await r.json());

  if (options.allowCredentials.length === 0) {
    console.info('No registered credentials found.');
    return await Promise.resolve(null);
  }

  options.challenge = fromBase64Url(options.challenge as string);

  for (const cred of options.allowCredentials) {
    cred.id = fromBase64Url(cred.id as string);
  }

  console.log(
    '%cGET_CREDENTIAL:%c navigator.credentials.get',
    'color: yellow',
    'color: cyan',
    options,
  );
  const cred = (await navigator.credentials.get({
    publicKey: options,
  })) as PublicKeyCredential;

  if (!cred) throw new Error('Could not get credential');
  const response = cred.response as AuthenticatorAssertionResponse &
    Record<string, ArrayBuffer>;
  const credential: SerializedCredential = {
    id: cred.id,
    type: cred.type,
    rawId: toBase64URL(cred.rawId),
    response: Object.keys(
      response,
    ).reduce<SerializedAuthenticatorAssertionResponse>((prev, curr) => {
      prev[curr] = toBase64URL(response[curr]);
      return prev;
    }, {} as SerializedAuthenticatorAssertionResponse),
  };
  credential.id = cred.id;
  credential.type = cred.type;
  credential.rawId = toBase64URL(cred.rawId);

  if (cred.response) {
    const clientDataJSON = toBase64URL(response.clientDataJSON);
    const authenticatorData = toBase64URL(response.authenticatorData);
    const signature = toBase64URL(response.signature);
    const userHandle = toBase64URL(
      typeof response?.userHandle !== 'undefined' &&
        response.userHandle !== null
        ? response.userHandle
        : new Uint8Array(),
    );
    credential.response = {
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle,
    };
  }
  console.log(
    '%cPOSTING: %c/assertion/response',
    'color: yellow',
    'color: cyan',
    credential,
  );
  return await fetch('/assertion/response', {
    ...DEFAULT_FETCH_OPTIONS,
    body: JSON.stringify(credential),
  });
}
