import {useEffect, useMemo} from "react";


const DEFAULT_CONFIG = {
    iceServers: [
        {
            urls: [
                'stun:stun.l.google.com:19302',
                'stun:stun1.l.google.com:19302',
                'stun:stun2.l.google.com:19302',
            ],
        },
    ],
    iceCandidatePoolSize: 10,
};

type PeerConnectionConfig = {
    onMessage: (event: MessageEvent)=>void;
    onIceCandidate: (event: RTCPeerConnectionIceEvent)=>void;
    channelName?: string;
    configuration?: RTCConfiguration;
}
export function usePeerConnection(onIceCandidate: (event: RTCPeerConnectionIceEvent)=>void, channelName = 'data', configuration = DEFAULT_CONFIG) {
    console.log(configuration)
    const peerConnection = useMemo(()=>new RTCPeerConnection(configuration), [configuration]);
    const dataChannel = useMemo(()=>peerConnection.createDataChannel(channelName), [channelName, peerConnection]);
    useEffect(() => {
        function handleICEGatheringStateChange() {
            console.log(`ICE gathering state: ${peerConnection.iceGatheringState}`);
        }
        function handleConnectionStateChange() {
            console.log(`Connection state change: ${peerConnection.connectionState}`);
        }

        function handleSignalingStateChange() {
            console.log(`Signaling state change: ${peerConnection.signalingState}`);
        }

        function handleICEConnectionStateChange() {
            console.log(`ICE connection state change: ${peerConnection.iceConnectionState}`);
        }
        peerConnection.addEventListener('icegatheringstatechange', handleICEGatheringStateChange);
        peerConnection.addEventListener('connectionstatechange', handleConnectionStateChange);
        peerConnection.addEventListener('signalingstatechange', handleSignalingStateChange);
        peerConnection.addEventListener('iceconnectionstatechange ', handleICEConnectionStateChange);
        peerConnection.addEventListener('icecandidate', onIceCandidate);

        dataChannel.addEventListener("open", (event) => {
            console.log(event)
        });

        return () => {
            peerConnection.removeEventListener('icegatheringstatechange', handleICEGatheringStateChange);
            peerConnection.removeEventListener('connectionstatechange', handleConnectionStateChange);
            peerConnection.removeEventListener('signalingstatechange', handleSignalingStateChange);
            peerConnection.removeEventListener('iceconnectionstatechange ', handleICEConnectionStateChange);
            peerConnection.removeEventListener('icecandidate', onIceCandidate);
        }
    }, [peerConnection, onIceCandidate]);

    return peerConnection;
}
