import { createContext, useContext, useEffect, useState } from 'react';

type PeerConnectionState = { peerConnection: RTCPeerConnection | null };
export const PeerConnectionContext = createContext({
  peerConnection: null,
} as PeerConnectionState);

export function usePeerConnectionState() {
  const { peerConnection } = useContext(PeerConnectionContext);
  const [connectionState, setConnectionState] = useState(
    peerConnection?.connectionState || null,
  );

  useEffect(() => {
    if (!peerConnection) return;
    function handleConnectionStateChange() {
      if (!peerConnection) return;
      console.log(`Connection state change: ${peerConnection.connectionState}`);
      setConnectionState(peerConnection.connectionState);
    }

    peerConnection.addEventListener(
      'connectionstatechange',
      handleConnectionStateChange,
    );
    return () => {
      peerConnection.removeEventListener(
        'connectionstatechange',
        handleConnectionStateChange,
      );
    };
  }, [peerConnection]);

  return connectionState;
}
export function usePeerConnection(
  onIceCandidate: (event: RTCPeerConnectionIceEvent) => void,
) {
  const { peerConnection } = useContext(PeerConnectionContext);
  window.peerConnection = peerConnection;
  useEffect(() => {
    if (!peerConnection) return;
    function handleICEGatheringStateChange() {
      console.log(`ICE gathering state: ${peerConnection?.iceGatheringState}`);
    }
    function handleConnectionStateChange() {
      console.log(`Connection state change: ${peerConnection.connectionState}`);
    }

    function handleSignalingStateChange() {
      console.log(`Signaling state change: ${peerConnection?.signalingState}`);
    }

    function handleICEConnectionStateChange() {
      console.log(
        `ICE connection state change: ${peerConnection?.iceConnectionState}`,
      );
    }

    function handleICECandidateError(event) {
      console.error('ICE Candidate Error', event);
    }
    peerConnection.addEventListener(
      'icegatheringstatechange',
      handleICEGatheringStateChange,
    );
    peerConnection.addEventListener(
      'connectionstatechange',
      handleConnectionStateChange,
    );
    peerConnection.addEventListener(
      'signalingstatechange',
      handleSignalingStateChange,
    );
    peerConnection.addEventListener(
      'iceconnectionstatechange ',
      handleICEConnectionStateChange,
    );
    peerConnection.addEventListener('icecandidate', onIceCandidate);
    peerConnection.addEventListener(
      'icecandidateerror',
      handleICECandidateError,
    );
    return () => {
      peerConnection.removeEventListener(
        'icegatheringstatechange',
        handleICEGatheringStateChange,
      );
      peerConnection.removeEventListener(
        'connectionstatechange',
        handleConnectionStateChange,
      );
      peerConnection.removeEventListener(
        'signalingstatechange',
        handleSignalingStateChange,
      );
      peerConnection.removeEventListener(
        'iceconnectionstatechange ',
        handleICEConnectionStateChange,
      );
      peerConnection.removeEventListener('icecandidate', onIceCandidate);
    };
  }, [peerConnection, onIceCandidate]);

  return peerConnection;
}
