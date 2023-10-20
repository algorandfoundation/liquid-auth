import QRCode from 'https://esm.sh/qrcode';
import { closeModal } from '/shared/modal-controls.js';
export async function handleModalOpen(requestId) {
  const socket = io('/');

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
    JSON.stringify({ origin: window.location.origin, requestId }),
    { scale },
  );

  if (socket.disconnected) {
    await socket.connect();
  }
  // await linkRequest(requestId)
  socket.emit('link', { requestId }, () => {
    console.log('On Link response');
    closeModal(document.getElementById('connect-qr-code-modal'));
    socket.close();
    window.location.reload();
  });
  return socket;
}
