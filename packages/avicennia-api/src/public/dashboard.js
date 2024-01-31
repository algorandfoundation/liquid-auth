import { removeCredential } from '/shared/api.js';
import { initAll } from '/shared/modal-controls.js';
import QRCode from 'https://esm.sh/qrcode';
import { handleModalOpen } from '/shared/qr-connect-modal.js';
import { fakeScan } from '/shared/fake-wallet.js';

async function getCredentials() {
  const user = await fetch('/auth/keys').then((r) => r.json());
  const credId = localStorage.getItem('credId');
  if (!Array.isArray(user.credentials) || user.credentials.length === 0)
    return typeof user.credentials !== 'undefined'
      ? user.credentials.map((cred) => {
          return `
            <tr>
              <th scope="row">${cred.credId === credId}</th>
              <th>${cred.credId}</th>
              <td>${cred.prevCounter}</td>
              <td>
              <div role="group">
              <button class="set-active-credential" data-id="${
                cred.credId
              }">Set Active</button>
              <button class="remove-credential secondary" data-id="${
                cred.credId
              }">X</button>
              </div></td>
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
  // showHideRegisterButton();
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
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${creds}
                  </tbody>
                  </table>
                  </figure>`;
  const setActiveButtons = document.getElementsByClassName(
    'set-active-credential',
  );
  for (let button of setActiveButtons) {
    if (button.dataset.id === localStorage.getItem('credId')) {
      button.setAttribute('disabled', '');
    }
    button.addEventListener('click', () => {
      localStorage.setItem('credId', button.dataset.id);
      renderCredentials(element);
    });
  }
  const removeButtons = document.getElementsByClassName('remove-credential');
  for (let button of removeButtons) {
    button.addEventListener('click', () => {
      removeCredential(button.dataset.id).then(() => {
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
  let requestId = Math.random();
  let socket;
  initAll([
    {
      closeEl: 'close-create-transaction-modal-button',
      openEl: 'create-transaction-button',
    },
    {
      closeEl: 'close-transaction-qr-code-modal-button',
      openEl: 'create-transaction-qr-code-button',
    },
    {
      closeEl: document.getElementById('close-connect-qr-code-modal-button'),
      openEl: document.getElementById('open-connect-qr-code-modal-button'),
      async onOpen() {
        socket = await handleModalOpen(requestId);
      },
      onClose() {
        if (typeof socket !== 'undefined') {
          console.log(socket);
          socket.close();
        }
      },
    },
  ]);
  document.getElementById('fake-scan').onclick = () => {
    fakeScan(requestId);
    // fetch('/connect/response', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //   },
    //   body: JSON.stringify({
    //     requestId,
    //     wallet: 'IKMUKRWTOEJMMJD4MUAQWWB4C473DEHXLCYHJ4R3RZWZKPNE7E2ZTQ7VD4',
    //   }),
    // });
  };
  /**
   * Content Section
   * @type {HTMLElement}
   */
  const content = document.getElementById('content');
  const list = document.getElementById('list');
  const toInput = document.getElementById('to');
  const fromInput = document.getElementById('from');
  const amountInput = document.getElementById('amount');
  const canvas = document.getElementById('transaction-qr-code-canvas');
  const qrCreateButton = document.getElementById(
    'create-transaction-qr-code-button',
  );
  const credId = localStorage.getItem('credId');

  console.log('%cLOADING: %c/dashboard', 'color: yellow', 'color: cyan', {
    credId,
  });
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
    console.log(
      '%CLICK: %c/dashboard/#logout',
      'color: yellow',
      'color: cyan',
      credId,
    );
    localStorage.removeItem('wallet');
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
    PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable().then(
      (uvpaa) => {
        if (!uvpaa) {
          content.innerText = UNSUPPORTED;
        } else {
          renderCredentials(list).then(() => {
            // showHideRegisterButton();
            content.innerText = `You have a session and your device supports PublicKeyCredential. 
              
              Add a credential
              
              `;
          });
        }
      },
    );
  }
}
