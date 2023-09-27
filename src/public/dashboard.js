import { attestation, removeCredential } from './api.js';
import QRCode from 'https://esm.sh/qrcode';
import cbor from 'https://esm.sh/cbor';

import {
  makePaymentTxnWithSuggestedParams,
  Algodv2,
} from 'https://esm.sh/algosdk';

const isAndroid = navigator.userAgent.match(/Android/i);
console.log(isAndroid);
async function getCredentials() {
  const user = await fetch('/auth/keys').then((r) => r.json());
  return typeof user.credentials !== 'undefined'
    ? user.credentials.map((cred) => {
        return `
            <tr>
              <th scope="row">${cred.credId}</th>
              <td>${cred.prevCounter}</td>
              <td>${cred.publicKey}</td>
              <td><button class="remove-credential" id="${cred.credId}">X</button></td>
            </tr>
            `;
      })
    : [];
}

async function renderCredentials(element) {
  const creds = await getCredentials();
  element.innerHTML = `
<h3>Credentials</h3>
             <figure>
                <table>
                  <thead>
                    <tr>
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
  const transactionForm = document.getElementById('transaction-form');
  const canvas = document.getElementById('qrcode');

  transactionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    canvas.classList.remove('hidden');
    console.log({ cbor: cbor.encode('hello world') });
    const algodClient = new Algodv2(
      '',
      'https://testnet-api.algonode.cloud/',
      443,
    );
    algodClient
      .getTransactionParams()
      .do()
      .then((params) => {
        const txn = makePaymentTxnWithSuggestedParams(
          fromInput.value,
          toInput.value,
          parseInt(amountInput.value, 10),
          undefined,
          undefined,
          params,
        );
        console.log(txn);
        QRCode.toDataURL('I am a pony!')
          .then((url) => {
            console.log(url);
          })
          .catch((err) => {
            console.error(err);
          });
        QRCode.toCanvas(canvas, [
          {
            data: cbor.encode(txn),
            mode: 'byte',
          },
        ]);
        return txn;
      });
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
