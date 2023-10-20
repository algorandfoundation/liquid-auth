/**
 * Landing Page
 *
 * Create a Session if the Client Supports FIDO2/WebAuthn
 */

import { assertion, logOut, removeCredential } from '/shared/api.js';
import { init } from '/shared/modal-controls.js';
import { handleModalOpen } from '/shared/qr-connect-modal.js';

/**
 * Render Page
 */
export async function render() {
  let requestId = Math.random();
  let socket;
  init({
    closeEl: document.getElementById('close-connect-qr-code-modal-button'),
    openEl: document.getElementById('open-connect-qr-code-modal-button'),
    async onOpen() {
      socket = await handleModalOpen(requestId);
    },
    onClose() {
      if (typeof socket !== 'undefined') {
        socket.close();
      }
    },
  });
  // initAll();
  document.getElementById('fake-scan').onclick = () => {
    fetch('/connect/response', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requestId,
        wallet: 'IKMUKRWTOEJMMJD4MUAQWWB4C473DEHXLCYHJ4R3RZWZKPNE7E2ZTQ7VD4',
      }),
    });
  };

  /**
   * Credential ID
   * @type {string | null}
   */
  const credId = localStorage.getItem('credId');

  console.log('%cLOADING: %c/', 'color: yellow', 'color: cyan', { credId });
  const assertButton = document.getElementById('assert-button');
  const clearButton = document.getElementById('clear-all-button');

  if (credId) {
    assertButton.classList.remove('hidden');
    clearButton.classList.remove('hidden');
  }

  clearButton.addEventListener('click', async () => {
    console.log(
      '%cCLICKED: %c/#clear-all-button',
      'color: yellow',
      'color: cyan',
    );
    await assertion(credId);
    await removeCredential(credId);
    await logOut();

    localStorage.clear();
    assertButton.classList.add('hidden');
    clearButton.classList.add('hidden');
  });

  assertButton.addEventListener('click', async () => {
    await assertion(credId);
    window.location.reload();
  });
}
