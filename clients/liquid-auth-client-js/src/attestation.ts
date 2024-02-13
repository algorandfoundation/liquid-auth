import {fromBase64Url, toBase64URL} from "./encoding.js";
import {DEFAULT_FETCH_OPTIONS} from './constants.js'

const DEFAULT_ATTESTATION_OPTIONS = {
    attestationType: 'none',
    authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        requireResidentKey: false,
    },
}
export type EncodedAuthenticatorAttestationResponse = {
    [k: string]: string
    clientDataJSON: string,
    attestationObject: string,
    signature?: string,
    userHandle?: string,
}
export type EncodedAttestationCredential = {
    [k: string]: string | EncodedAuthenticatorAttestationResponse
    id: string
    type: string
    response: EncodedAuthenticatorAttestationResponse
    rawId: string
}

/**
 * Encode a PublicKeyCredential
 *
 * @param credential - PublicKeyCredential from navigator.credentials.create
 */
function encodeAttestationCredential(credential: PublicKeyCredential): EncodedAttestationCredential {
    const response = credential.response as AuthenticatorAttestationResponse
    return {
        id: credential.id,
        rawId: toBase64URL(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: toBase64URL(response.clientDataJSON),
            attestationObject: toBase64URL(response.attestationObject)
        }
    };
}

/**
 * Decoding an Encoded Attestation Credential
 * @param credential - Encoded Attestation Credential
 */
function decodeAttestationCredential(credential: EncodedAttestationCredential){
    return {
        id: credential.id,
        rawId: fromBase64Url(credential.rawId),
        type: credential.type,
        response: {
            clientDataJSON: fromBase64Url(credential.response.clientDataJSON),
            attestationObject: fromBase64Url(credential.response.attestationObject)
        }
    }
}

function decodeAttestationOptions(options){
    const attestationOptions = {...options}
    attestationOptions.user.id = fromBase64Url(options.user.id);
    attestationOptions.challenge = fromBase64Url(
        options.challenge,
    );

    if (attestationOptions.excludeCredentials) {
        for (let cred of attestationOptions.excludeCredentials) {
            cred.id = fromBase64Url(cred.id);
        }
    }

    return attestationOptions
}

/**
 * Fetch interface for Attestation Options
 *
 * @param origin
 * @param options
 */
export async function fetchAttestationRequest(origin: string, options = DEFAULT_ATTESTATION_OPTIONS){
    return fetch(`${origin}/attestation/request`, {
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify(options),
    });
}

/**
 * Fetch interface for Attestation Response
 *
 * @param origin
 * @param credential
 */
export async function fetchAttestationResponse(origin: string, credential: EncodedAttestationCredential){
    return fetch(`${origin}/attestation/response`, {
        ...DEFAULT_FETCH_OPTIONS,
        body: JSON.stringify(credential),
    });
}

/**
 * Attestation
 *
 * The process of creating a new credential. It has two parts:
 *
 * - The server creates a challenge and sends it to the client
 * - The client creates a credential and sends it to the server
 *
 * @return {Promise<Response>}
 */
export async function attestation(
    origin: string,
    options = DEFAULT_ATTESTATION_OPTIONS,
) {
    const encodedAttestationOptions = await fetchAttestationRequest(origin, options)
        .then((r) => r.json());

    if (typeof encodedAttestationOptions.error !== 'undefined') {
        throw new Error(encodedAttestationOptions.error);
    }

    const credential = encodeAttestationCredential(
        (await navigator.credentials.create({
        publicKey: decodeAttestationOptions(encodedAttestationOptions),
    }) as PublicKeyCredential)
    );

    return fetchAttestationResponse(origin, credential);
}
