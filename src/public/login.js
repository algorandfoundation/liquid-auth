/**
 * Landing Page
 *
 * Create a Session if the Client Supports FIDO2/WebAuthn
 */

import { assertion } from '/shared/api.js';

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
  console.log('rendering Login');
  // const form = document.getElementById('form');
  const submitButton = document.getElementById('submit-button');
  const clearButton = document.getElementById('clear-all-button');
  const notSupported = document.getElementById('not-supported');
  // const walletFieldSet = document.getElementById('wallet-fieldset');
  // const walletInput = document.getElementById('wallet-input');
  // const welcomeText = document.getElementById('welcome-text');

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

  if (credId) {
    submitButton.innerText = 'Assert';
    submitButton.classList.remove('hidden');
  } else {
    // walletInput.required = true;
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
          notSupported.classList.add('hidden');
        }
      },
    );
  }
  clearButton.addEventListener('click', () => {
    localStorage.clear();
    window.location.reload();
  });

  submitButton.addEventListener('click', async () => {
    await assertion(credId);
    window.location.reload();
  });
}
