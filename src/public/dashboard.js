import { attestation, removeCredential } from '/shared/api.js';
import QRCode from 'https://esm.sh/qrcode';

async function getCredentials() {
  const user = await fetch('/auth/keys').then((r) => r.json());
  const credId = localStorage.getItem('credId');
  return typeof user.credentials !== 'undefined'
    ? user.credentials.map((cred) => {
        return `
            <tr>
              <th scope="row">${cred.credId === credId}</th>
              <th>${cred.credId}</th>
              <td>${cred.prevCounter}</td>
              <td>${cred.publicKey}</td>
              <td><button class="remove-credential" id="${
                cred.credId
              }">X</button></td>
            </tr>
            `;
      })
    : [];
}

async function renderCredentials(element) {
  const transactionButton = document.getElementById(
    'create-transaction-button',
  );
  const creds = await getCredentials();
  if (creds.length > 0) {
    transactionButton.classList.remove('hidden');
  } else {
    transactionButton.classList.add('hidden');
  }
  element.innerHTML = `
<h3>Credentials</h3>
             <figure>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Active</th>
                      <th scope="col">ID</th>
                      <th scope="col">Counter</th>
                      <th scope="col">Public Key</th>
                      <th scope="col">Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${creds}
                  </tbody>
                  </table>
                  </figure>`;
  const removeButtons = document.getElementsByClassName('remove-credential');
  for (let button of removeButtons) {
    button.addEventListener('click', () => {
      removeCredential(button.id).then(() => {
        renderCredentials(element);
      });
    });
  }
}
/**
 *  Dashboard Page
 *
 * If the user has a session, they will be redirected here. This is where they can
 * add different credentials from WebAuthn/FIDO2 devices.
 *
 */
export function render() {
  /**
   * Content Section
   * @type {HTMLElement}
   */
  const content = document.getElementById('content');
  const list = document.getElementById('list');
  const error = document.getElementById('error');
  const toInput = document.getElementById('to');
  const fromInput = document.getElementById('from');
  const amountInput = document.getElementById('amount');
  const canvas = document.getElementById('transaction-qr-code-canvas');
  const qrCreateButton = document.getElementById(
    'create-transaction-qr-code-button',
  );

  /**
   * Create Transaction QR Code Button
   */
  qrCreateButton.addEventListener('click', (e) => {
    e.preventDefault();
    console.log('submitting transaction');
    // TODO encode payload and support multiple types
    const txn = {
      from: fromInput.value,
      to: toInput.value,
      amount: parseInt(amountInput.value, 10),
    };
    QRCode.toCanvas(canvas, JSON.stringify(txn));
  });

  /**
   * Logout Button
   * @type {HTMLElement}
   */
  const logoutButton = document.getElementById('logout');
  logoutButton.addEventListener('click', () => {
    localStorage.removeItem('wallet');
  });

  /**
   * Register a Credential
   * @type {HTMLElement}
   */
  const registerButton = document.getElementById('register');
  registerButton.addEventListener('click', () => {
    attestation()
      .then(() => {
        error.classList.add('hidden');
        return renderCredentials(list);
      })
      .catch((e) => {
        error.classList.add('error');
        error.innerText = e.message;
      });
  });

  /**
   * Unsupported Message
   * @type {string}
   */
  const UNSUPPORTED =
    'You have a session but your device does not support PublicKeyCredential.' +
    'Check the chrome devtools to make sure it is enabled';

  if (!window.PublicKeyCredential) {
    content.innerText = UNSUPPORTED;
    content.classList.add('error');
  }
  if (window.PublicKeyCredential) {
    console.log(window.PublicKeyCredential);
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
      (uvpaa) => {
        console.log(uvpaa);
        if (!uvpaa) {
          content.innerText = UNSUPPORTED;
        } else {
          renderCredentials(list).then(() => {
            registerButton.classList.remove('hidden');
            content.innerText =
              'You have a session and your device supports PublicKeyCredential';
          });
        }
      },
    );
  }
}
