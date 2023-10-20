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
  console.log(
    '%cFETCHING: %c/attestation/request',
    'color: yellow',
    'color: cyan',
  );
  const attestationOptions = await fetch('/attestation/request', {
    ...DEFAULTS,
    body: JSON.stringify(options),
  }).then((r) => r.json());

  if (typeof attestationOptions.error !== 'undefined') {
    console.log(
      '%cERROR FETCHING: %c/attestation/request',
      'color: red',
      'color: yellow',
      attestationOptions,
    );
    throw new Error(attestationOptions.error);
  } else {
    attestationOptions.user.id = base64url.decode(attestationOptions.user.id);
    attestationOptions.challenge = base64url.decode(
      attestationOptions.challenge,
    );

    if (attestationOptions.excludeCredentials) {
      for (let cred of attestationOptions.excludeCredentials) {
        cred.id = base64url.decode(cred.id);
      }
    }
    console.log(
      '%cCREATE_CREDENTIAL:%c navigator.credentials.create',
      'color: yellow',
      'color: cyan',
      attestationOptions,
    );
    const cred = await navigator.credentials.create({
      publicKey: attestationOptions,
    });

    const credential = {};
    credential.id = cred.id;
    credential.rawId = base64url.encode(cred.rawId);
    credential.type = cred.type;

    if (cred.response) {
      const clientDataJSON = base64url.encode(cred.response.clientDataJSON);
      const attestationObject = base64url.encode(
        cred.response.attestationObject,
      );
      credential.response = {
        clientDataJSON,
        attestationObject,
      };
    }
    localStorage.setItem(`credId`, credential.id);
    console.log(
      '%cPOSTING: %c/attestation/response',
      'color: yellow',
      'color: cyan',
      credential,
    );
    return await fetch('/attestation/response', {
      ...DEFAULTS,
      body: JSON.stringify(credential),
    });
  }
}

export async function assertion(credId) {
  console.log(
    `%cFETCHING: %c/assertion/request/${credId}`,
    'color: yellow',
    'color: cyan',
  );
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

  console.log(
    '%cGET_CREDENTIAL:%c navigator.credentials.get',
    'color: yellow',
    'color: cyan',
    options,
  );
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
  console.log(
    '%cPOSTING: %c/assertion/response',
    'color: yellow',
    'color: cyan',
    credential,
  );
  return await fetch(`/assertion/response`, {
    ...DEFAULTS,
    body: JSON.stringify(credential),
  });
}

export const removeCredential = async (credId) => {
  console.log(
    `%cDELETE: %c/auth/keys/${credId}`,
    'color: yellow',
    'color: cyan',
  );
  const isCred = localStorage.getItem('credId');
  if (isCred === credId) {
    localStorage.removeItem('credId');
  }
  return fetch(`/auth/keys/${encodeURIComponent(credId)}`, {
    method: 'DELETE',
  });
};

export const linkRequest = async (requestId) => {
  console.log(
    '%cPOSTING: %c/connect/request',
    'color: yellow',
    'color: cyan',
    requestId,
  );
  return fetch('/connect/request', {
    ...DEFAULTS,
    body: JSON.stringify({ requestId }),
  });
};

export const logOut = async () => {
  return fetch('/auth/logout');
};
