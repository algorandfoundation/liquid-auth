/**
 * This module is only for browser and currently not used in the project.
 * However, it could be useful for extension wallets or other browser-based wallets.
 */
import { fromBase64Url, toBase64URL } from '@liquid/core/encoding';
import { DEFAULT_FETCH_OPTIONS } from './constants.js';
import {
  isValidResponse,
  INVALID_INPUT_MESSAGE,
  CREDENTIAL_ACTION_FAILURE,
} from './errors.js';

export type EncodedPublicKeyCredentialDescriptor =
  PublicKeyCredentialDescriptor & {
    id: string;
  };
export type EncodedPublicKeyCredentialRequestOptions =
  PublicKeyCredentialRequestOptions & {
    allowCredentials?: EncodedPublicKeyCredentialDescriptor[];
    challenge: string;
  };
/**
 * Fetch Assertion Options
 *
 * POST Authenticator Selector to the REST API
 * to receive the PublicKeyCredentialRequestOptions
 *
 * @param origin
 * @param credId
 * @todo: Generate Typed JSON-RPC clients from Swagger/OpenAPI
 */
export async function fetchAssertionRequestOptions(
  origin: string,
  credId: string,
) {
  if (typeof origin !== 'string' || typeof credId !== 'string') {
    throw new TypeError(INVALID_INPUT_MESSAGE);
  }
  return await fetch(`/assertion/request/${credId}`, {
    ...DEFAULT_FETCH_OPTIONS,
  }).then((r) => {
    if (!isValidResponse(r)) {
      throw new Error(r.statusText);
    }
    return r.json() as Promise<EncodedPublicKeyCredentialRequestOptions>;
  });
}
/**
 * Decode Assertion Request Options
 *
 * @param options
 */
export function decodeAssertionRequestOptions(
  options: EncodedPublicKeyCredentialRequestOptions,
) {
  if (typeof options !== 'object' || typeof options.challenge !== 'string')
    throw new TypeError(INVALID_INPUT_MESSAGE);

  const decodedOptions: PublicKeyCredentialRequestOptions = { ...options };
  decodedOptions.challenge = fromBase64Url(options.challenge as string);
  decodedOptions.allowCredentials =
    options.allowCredentials?.map(
      (cred: EncodedPublicKeyCredentialDescriptor) => {
        return {
          ...cred,
          id: fromBase64Url(cred.id as string),
        } as PublicKeyCredentialDescriptor;
      },
    ) || [];
  return decodedOptions;
}

export type EncodedAuthenticatorAssertionResponse = {
  [k: string]: string;
  clientDataJSON: string;
  authenticatorData: string;
  signature: string;
  userHandle: string;
};
export type EncodedCredential = {
  [k: string]: string | EncodedAuthenticatorAssertionResponse;
  id: string;
  type: string;
  response: EncodedAuthenticatorAssertionResponse;
  rawId: string;
};

/**
 * Fetch Assertion Response
 *
 * POST an Authenticator Assertion Response to the REST API
 *
 * @param origin
 * @param credential
 * @todo: Generate Typed JSON-RPC clients from Swagger/OpenAPI
 */
export async function fetchAssertionResponse(
  origin: string,
  credential: EncodedCredential,
) {
  if (typeof origin !== 'string' || typeof credential !== 'object') {
    // TODO: instance check for SerializedCredential
    throw new TypeError(INVALID_INPUT_MESSAGE);
  }
  return await fetch(`${origin}/assertion/response`, {
    ...DEFAULT_FETCH_OPTIONS,
    body: JSON.stringify(credential),
  }).then((r) => {
    if (!isValidResponse(r)) {
      throw new Error(r.statusText);
    }
    return r.json();
  });
}
/**
 *
 * @param response
 */
export function encodeAuthenticatorAssertionResponse(
  response: AuthenticatorAssertionResponse & Record<string, ArrayBuffer>,
) {
  return Object.keys(
    AuthenticatorAssertionResponse.prototype,
  ).reduce<EncodedAuthenticatorAssertionResponse>(
    (prev, curr) => {
      prev[curr] = toBase64URL(response[curr]);
      return prev;
    },
    {
      clientDataJSON: toBase64URL(response.clientDataJSON),
    } as EncodedAuthenticatorAssertionResponse,
  );
}

/**
 *
 * @param credential
 */
export function encodeCredential(
  credential: PublicKeyCredential,
): EncodedCredential {
  if (!credential) throw new Error(INVALID_INPUT_MESSAGE);
  const response = credential.response as AuthenticatorAssertionResponse &
    Record<string, ArrayBuffer>;
  if (!response) throw new Error(CREDENTIAL_ACTION_FAILURE);
  return {
    id: credential.id,
    type: credential.type,
    rawId: toBase64URL(credential.rawId),
    response: encodeAuthenticatorAssertionResponse(response),
  };
}

/**
 * Assert a known credential
 * @param origin
 * @param credId
 * @param debug
 */
export async function assertion(
  origin: string,
  credId: string,
  debug: boolean = false,
) {
  if (typeof credId !== 'string') {
    throw new TypeError(INVALID_INPUT_MESSAGE);
  }
  debug &&
    console.log(
      `%cFETCHING: %c/assertion/request/${credId}`,
      'color: yellow',
      'color: cyan',
    );

  const options = await fetchAssertionRequestOptions(origin, credId).then(
    decodeAssertionRequestOptions,
  );

  if (options.allowCredentials.length === 0) {
    debug && console.info('No registered credentials found.');
    return null;
  }

  debug &&
    console.log(
      '%cGET_CREDENTIAL:%c navigator.credentials.get',
      'color: yellow',
      'color: cyan',
      options,
    );

  const credential = await navigator.credentials
    .get({
      publicKey: options,
    })
    .then(encodeCredential);

  debug &&
    console.log(
      '%cPOSTING: %c/assertion/response',
      'color: yellow',
      'color: cyan',
      credential,
    );

  return fetchAssertionResponse(origin, credential);
}
