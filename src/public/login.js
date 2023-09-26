/**
 * Landing Page
 *
 * Create a Session if the Client Supports FIDO2/WebAuthn
 */

/**
 *
 * @param {object} user - User Data
 * @param {string} user.wallet - Algorand Wallet Address
 */
export async function createSession(user) {
  if (typeof user.wallet !== 'string') {
    throw new TypeError('Wallet must be a string');
  }

  return fetch('/auth/session', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(user),
  }).then(() => {
    localStorage.setItem('wallet', user.wallet);
    window.location.href = '/dashboard';
  });
}

/**
 * Get User Session
 * @param wallet
 * @return {Promise<any>}
 */
export async function getUserSession(wallet) {
  if (typeof wallet !== 'string') {
    throw new TypeError('Wallet must be a string');
  }
  return fetch(`/auth/session`).then((res) => res.json());
  // .then((res) => {
  // Create a session using the wallet
  // if (res.status !== 404) {
  //   return createSession(res);
  // }
  // });
}

/**
 * Render Page
 */
export async function render() {
  const form = document.getElementById('form');
  const notSupported = document.getElementById('not-supported');
  const walletInput = document.getElementById('wallet-input');

  /*
   * Keep track of the wallet to avoid re-entering it
   * every time the session is expired, it will check if
   * the user exists and create a new session if it does.
   *
   * This is just for demo purposes,
   *
   */
  const wallet = localStorage.getItem('wallet');
  if (wallet) {
    walletInput.value = wallet;
    await getUserSession(wallet);
  }

  /*
   * Check for WebAuthn support
   *
   * If the device can use PublicKeyCredentials, the login form will be visible
   */
  if (window.PublicKeyCredential) {
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
      (uvpaa) => {
        if (uvpaa) {
          form.classList.remove('hidden');
          notSupported.classList.add('hidden');
        }
      },
    );
  }

  /*
   * Listen to Form Submission
   *
   * If the wallet is a string, create a session
   */
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const { wallet } = Object.fromEntries(formData);
    if (typeof wallet === 'string') {
      await createSession({ wallet });
    }
  });
}
