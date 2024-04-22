import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client';
import QRCodeStyling, { Options as QRCodeOptions } from 'qr-code-styling';
import { EventEmitter } from 'eventemitter3';
import { toBase64URL } from '@liquid/core';
import nacl from 'tweetnacl';

export type LinkMessage = {
  credId?: string;
  requestId: string | number;
  wallet: string;
};
export const REQUEST_IS_MISSING_MESSAGE = 'Request id is required';
export const REQUEST_IN_PROCESS_MESSAGE = 'Request in process';
export const UNAUTHENTICATED_MESSAGE = 'Not authenticated';

export const DEFAULT_QR_CODE_OPTIONS: QRCodeOptions = {
  width: 500,
  height: 500,
  data: 'algorand://',
  margin: 25,
  imageOptions: { hideBackgroundDots: true, imageSize: 0.4, margin: 15 },
  dotsOptions: {
    type: 'extra-rounded',
    gradient: {
      type: 'radial',
      rotation: 0,
      colorStops: [
        { offset: 0, color: '#9966ff' },
        { offset: 1, color: '#332257' },
      ],
    },
  },
  backgroundOptions: { color: '#ffffff', gradient: null },
  // TODO: Host logo publicly
  image: '/logo.png',
  cornersSquareOptions: {
    color: '#000000',
    gradient: {
      type: 'linear',
      rotation: 0,
      colorStops: [
        { offset: 0, color: '#332257' },
        { offset: 1, color: '#040908' },
      ],
    },
  },
  cornersDotOptions: {
    type: 'dot',
    color: '#000000',
    gradient: {
      type: 'linear',
      rotation: 0,
      colorStops: [
        { offset: 0, color: '#000000' },
        { offset: 1, color: '#000000' },
      ],
    },
  },
};

export async function generateQRCode(
  { requestId, url }: { requestId: any; url: string },
  qrCodeOptions: QRCodeOptions = DEFAULT_QR_CODE_OPTIONS,
) {
  if (requestId === 'undefined') throw new Error(REQUEST_IS_MISSING_MESSAGE);
  // TODO: Serialize data to standard URL for Deep-Links
  qrCodeOptions.data = JSON.stringify({
    requestId: requestId,
    origin: url,
    // TODO: Remove challenge from QR Code
    challenge: toBase64URL(nacl.randomBytes(nacl.sign.seedLength)),
  });

  // @ts-expect-error, figure out call signature issue
  const qrCode = new QRCodeStyling(qrCodeOptions);
  return qrCode.getRawData('png').then((blob) => {
    if (!blob) throw new TypeError('Could not get qrcode blob');
    return URL.createObjectURL(blob);
  });
}

/**
 *
 */
export class SignalClient extends EventEmitter {
  private url: string;
  type: 'offer' | 'answer';
  private authenticated: boolean = false;
  private requestId: any | undefined;
  peerClient: RTCPeerConnection | undefined;
  private qrCodeOptions: QRCodeOptions = DEFAULT_QR_CODE_OPTIONS;
  socket: Socket;

  /**
   *
   * @param url
   * @param options
   */
  constructor(
    url: string,
    options: Partial<ManagerOptions & SocketOptions> = { autoConnect: true },
  ) {
    super();
    this.url = url;
    this.socket = io(url, options);
    globalThis.socket = this.socket;
    this.socket.on('connect', () => {
      this.emit('connect', this.socket.id);
    });

    this.socket.on('disconnect', () => {
      this.emit('disconnect', this.socket.id);
    });
  }

  static generateRequestId() {
    //TODO: replace with toBase64URL(nacl.randomBytes(nacl.sign.seedLength)
    return Math.random();
  }

  /**
   * Create QR Code
   */
  async qrCode() {
    if (typeof this.requestId === 'undefined')
      throw new Error(REQUEST_IS_MISSING_MESSAGE);
    // TODO: Serialize data to standard URL for Deep-Links
    this.qrCodeOptions.data = JSON.stringify({
      requestId: this.requestId,
      origin: this.url,
      // TODO: Remove challenge from QR Code
      challenge: toBase64URL(nacl.randomBytes(nacl.sign.seedLength)),
    });
    return generateQRCode(
      { requestId: this.requestId, url: this.url },
      this.qrCodeOptions,
    );
  }

  /**
   * # Create a peer connection
   *
   * Send the nonce to the server and listen to a specified type.
   *
   * ## Offer
   *   - Will wait for an offer-description from the server
   *   - Will send an answer-description to the server
   *   - Will send candidates to the server
   *
   * ## Answer
   *  - Will send an offer-description to the server
   *  - Will wait for an answer-description from the server
   *  - Will send candidates to the server
   *
   * @param requestId
   * @param type
   * @param config
   */
  async peer(
    requestId: any,
    type: 'offer' | 'answer',
    config?: RTCConfiguration,
  ): Promise<RTCDataChannel> {
    if (typeof this.requestId !== 'undefined')
      throw new Error(REQUEST_IN_PROCESS_MESSAGE);

    return new Promise(async (resolve) => {
      // Create Peer Connection
      this.peerClient = new RTCPeerConnection(config);
      globalThis.peerClient = this.peerClient;
      this.type = type === 'offer' ? 'answer' : 'offer';
      // Wait for a link message
      await this.link(requestId);
      // Listen for Local Candidates
      this.peerClient.onicecandidate = (event) => {
        if (event.candidate) {
          console.log(event.candidate);
          this.socket.emit(`${this.type}-candidate`, event.candidate.toJSON());
        }
      };
      // Listen to Remote Candidates
      this.socket.on(
        `${type}-candidate`,
        async (candidate: RTCIceCandidateInit) => {
          await this.peerClient.addIceCandidate(new RTCIceCandidate(candidate));
        },
      );

      this.peerClient.onicecandidate = (event) => {
        if (event.candidate) {
          this.socket.emit(`${this.type}-candidate`, event.candidate.toJSON());
        }
      };

      // Listen for Remote DataChannel and Resolve
      this.peerClient.ondatachannel = (event) => {
        console.log(event);
        globalThis.dc = event.channel;
        this.emit('data-channel', event.channel);
        resolve(event.channel);
      };
      // Handle Session Descriptions
      if (type === 'offer') {
        const sdp = await this.signal(type);
        await this.peerClient.setRemoteDescription(sdp);
        const answer = await this.peerClient.createAnswer();
        await this.peerClient.setLocalDescription(answer);
        this.socket.emit(`${this.type}-description`, answer.sdp);
      } else {
        const localSdp = await this.peerClient.createOffer();
        const dataChannel = this.peerClient.createDataChannel('liquid');
        await this.peerClient.setLocalDescription(localSdp);
        this.socket.emit(`${this.type}-description`, localSdp.sdp);
        const sdp = await this.signal(type);
        await this.peerClient.setRemoteDescription(sdp);
        this.emit('data-channel', dataChannel);
        resolve(dataChannel);
      }
    });
  }

  /**
   * Await for a link message for a given requestId
   * @param requestId
   */
  async link(requestId: any) {
    if (typeof this.requestId !== 'undefined')
      throw new Error(REQUEST_IN_PROCESS_MESSAGE);
    this.requestId = requestId;
    this.emit('link', { requestId });

    return new Promise<LinkMessage>((resolve) => {
      this.socket.emit(
        'link',
        { requestId },
        ({ data }: { data: LinkMessage }) => {
          this.authenticated = true;
          delete this.requestId;

          this.emit('link-message', data);
          resolve(data);
        },
      );
    });
  }

  /**
   *
   * @param type
   */
  async signal(type: 'offer' | 'answer') {
    if (!this.authenticated) throw new Error(UNAUTHENTICATED_MESSAGE);
    this.emit('signal', { type });
    return new Promise<RTCSessionDescriptionInit>((resolve) => {
      this.socket.once(`${type}-description`, (sdp: string) => {
        const description = { type, sdp } as RTCSessionDescriptionInit;
        this.emit(`${type}-description`, description);
        resolve(description);
      });
    });
  }

  close(disconnect = false) {
    this.socket.removeAllListeners();
    delete this.requestId;
    this.authenticated = false;
    if (disconnect) this.socket.disconnect();
    this.emit('close');
  }
}
