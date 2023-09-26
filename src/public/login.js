/**
 * Landing Page
 *
 * Create a Session if the Client Supports FIDO2/WebAuthn
 */

import { assertion } from './api.js';

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
}

/**
 * Render Page
 */
export async function render() {
  const form = document.getElementById('form');
  const submitButton = document.getElementById('submit-button');
  const clearButton = document.getElementById('clear-all-button');
  const notSupported = document.getElementById('not-supported');
  const walletFieldSet = document.getElementById('wallet-fieldset');
  const walletInput = document.getElementById('wallet-input');

  /**
   * Wallet Address
   * @type {string | null}
   */
  const wallet = localStorage.getItem('wallet');
  /**
   * Credential ID
   * @type {string | null}
   */
  const credId = localStorage.getItem('credId');

  if (wallet) {
    walletInput.value = wallet;
    await getUserSession(wallet);
  }
  if (credId) {
    submitButton.innerText = 'Assert';
  }

  if (credId && !wallet) {
    walletFieldSet.classList.add('hidden');
  }

  if (credId || wallet) {
    clearButton.classList.remove('hidden');
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
      console.log(credId);
      credId ? await assertion(credId) : await createSession({ wallet });
    }
  });
}
