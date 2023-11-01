import QRCode from 'https://esm.sh/qrcode';
import { closeModal } from '/shared/modal-controls.js';
import nacl from 'https://esm.sh/tweetnacl';
import { attestation } from './api.js';
// import base64url from 'base64url';
export async function handleModalOpen(requestId) {
  const socket = io('/');
  const challenge = base64url.encode(nacl.randomBytes(nacl.sign.seedLength));
  console.log(challenge);
  socket.on('connect', function () {
    console.log('Connected');
  });
  socket.on('events', function (data) {
    console.log('event', data);
  });
  socket.on('link', function (data) {
    console.log('link', data);
  });
  socket.on('exception', function (data) {
    console.log('event', data);
  });
  socket.on('disconnect', function () {
    console.log('Disconnected');
  });
  socket.on('auth', function (data) {
    console.log('auth', data);
  });

  let scale = 12;
  if (window.innerWidth < 780) {
    scale = 10;
  }
  if (window.innerWidth < 525) {
    scale = 8;
  }
  if (window.innerWidth < 400) {
    scale = 5;
  }
  QRCode.toCanvas(
    document.getElementById('connect-qr-code-canvas'),
    JSON.stringify({ origin: window.location.origin, requestId, challenge }),
    { scale },
  );

  if (socket.disconnected) {
    await socket.connect();
  }
  // await linkRequest(requestId)
  socket.emit('link', { requestId }, async () => {
    console.log('On Link response');
    closeModal(document.getElementById('connect-qr-code-modal'));
    socket.close();
    const credId = window.localStorage.getItem('credId');
    console.log(
      '%cCLICK: %c/dashboard/#register',
      'color: yellow',
      'color: cyan',
      credId,
    );
    if (window.location.pathname === '/') {
      if (!credId || credId.length === 0) {
        await attestation().catch((e) => {
          console.error(e);
        });
      }
    }
    if (window.location.pathname === '/') window.location.reload();
  });
  return socket;
}
