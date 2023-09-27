const DEFAULTS = {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
};

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
  options = {
    attestationType: 'none',
    authenticatorSelection: {
      authenticatorAttachment: 'platform',
      userVerification: 'required',
      requireResidentKey: false,
    },
  },
) {
  const attestationOptions = await fetch('/attestation/request', {
    ...DEFAULTS,
    body: JSON.stringify(options),
  }).then((r) => r.json());

  attestationOptions.user.id = base64url.decode(attestationOptions.user.id);
  attestationOptions.challenge = base64url.decode(attestationOptions.challenge);

  if (attestationOptions.excludeCredentials) {
    for (let cred of attestationOptions.excludeCredentials) {
      cred.id = base64url.decode(cred.id);
    }
  }

  const cred = await navigator.credentials.create({
    publicKey: attestationOptions,
  });

  const credential = {};
  credential.id = cred.id;
  credential.rawId = base64url.encode(cred.rawId);
  credential.type = cred.type;

  if (cred.response) {
    const clientDataJSON = base64url.encode(cred.response.clientDataJSON);
    const attestationObject = base64url.encode(cred.response.attestationObject);
    credential.response = {
      clientDataJSON,
      attestationObject,
    };
  }
  localStorage.setItem(`credId`, credential.id);

  return await fetch('/attestation/response', {
    ...DEFAULTS,
    body: JSON.stringify(credential),
  });
}

export async function assertion(credId) {
  const options = await fetch(`/assertion/request/${credId}`, {
    ...DEFAULTS,
  }).then((r) => r.json());

  if (options.allowCredentials.length === 0) {
    console.info('No registered credentials found.');
    return Promise.resolve(null);
  }

  options.challenge = base64url.decode(options.challenge);

  for (let cred of options.allowCredentials) {
    cred.id = base64url.decode(cred.id);
  }

  const cred = await navigator.credentials.get({
    publicKey: options,
  });

  const credential = {};
  credential.id = cred.id;
  credential.type = cred.type;
  credential.rawId = base64url.encode(cred.rawId);

  if (cred.response) {
    const clientDataJSON = base64url.encode(cred.response.clientDataJSON);
    const authenticatorData = base64url.encode(cred.response.authenticatorData);
    const signature = base64url.encode(cred.response.signature);
    const userHandle = base64url.encode(cred.response.userHandle);
    credential.response = {
      clientDataJSON,
      authenticatorData,
      signature,
      userHandle,
    };
  }

  return await fetch(`/assertion/response`, {
    ...DEFAULTS,
    body: JSON.stringify(credential),
  });
}

export const removeCredential = async (credId) => {
  localStorage.removeItem('credId');
  return fetch(`/auth/keys/${encodeURIComponent(credId)}`, {
    method: 'DELETE',
  });
};
