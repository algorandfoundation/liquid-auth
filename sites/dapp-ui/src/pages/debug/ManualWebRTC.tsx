import {useEffect, useState} from "react";
import algosdk from 'algosdk';
import {fetchConnectResponse} from "@liquid/auth-client";
import {Message} from "@liquid/auth-client/connect";
import {useMessageStore, usePeerStore} from "../../store.ts";
import {ChatList} from "../../components/Chat.tsx";
import {useDataChannel, useDataChannelMessages} from "../../hooks/useDataChannel.ts";
import {usePeerConnection, usePeerConnectionState} from "../../hooks/usePeerConnection.ts";
import Button from "@mui/material/Button";
import {useUserState} from "../../components/user/useUserState.ts";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import Card from "@mui/material/Card/Card";
import CardContent from "@mui/material/CardContent";
import Box from "@mui/material/Box";
import {useSocket} from "../../hooks/useSocket.ts";

const acct = algosdk.mnemonicToSecretKey('lab surge abandon artist moon keen license bronze rebuild wing surge apart basket teach deposit patch snow paper sting rural negative logic cousin above gym')

type SessionDescriptionProps = {
    type: string,
    description: RTCSessionDescriptionInit
}

/**
 * Session Description Component
 *
 * Display the state of a RTCSessionDescriptionInit
 *
 * @param type
 * @param description
 * @constructor
 */
function SessionDescription({type, description}: SessionDescriptionProps) {
    return (
        <div>
            <h2>{type}: Session Description</h2>
            <pre>{description.sdp}</pre>
        </div>
    )
}

type HandshakeProps = {
    local: RTCSessionDescriptionInit | null,
    remote: RTCSessionDescriptionInit | null,
    candidates: RTCIceCandidateInit[]
}

/**
 * Debugging View for WebRTC Handshake
 *
 * Handles the SDP negotiation between two peers manually
 *
 * @param local
 * @param remote
 * @param candidates
 * @constructor
 */
function Handshake({local, remote, candidates}: HandshakeProps) {
    return (
        <Box sx={{maxWidth: 500}}>
            {local && <SessionDescription type="Local" description={local}/>}
            {remote && <SessionDescription type="Remote" description={remote}/>}
            <Box>
                <h1>Local Candidates</h1>
                {candidates?.map((candidate, i) => {
                        return (
                            <pre key={i}>{JSON.stringify(candidate, null, 2)}</pre>
                        )
                    }
                )}
            </Box>
        </Box>
    )
}

/**
 * Remote Peer
 *
 * connect to an existing session
 *
 * @param peerConnection
 * @constructor
 */
function RemoteView({peerConnection}: { peerConnection: RTCPeerConnection }) {
    const {socket} = useSocket()
    const candidates = usePeerStore((state) => state.candidates)
    // Session Descriptions
    const [sdp, setSDP] = useState<string>()
    const [local, setLocal] = useState<RTCSessionDescriptionInit | null>(null)
    const [remote, setRemote] = useState<RTCSessionDescriptionInit | null>(null)

    // Handle Messages
    const addMessage = useMessageStore((state) => state.addMessage)
    useDataChannelMessages((event) => addMessage(JSON.parse(event.data)))

    // Handle the remote SDP
    useEffect(() => {
        if (!remote) return
        peerConnection.createAnswer()
            .then(async (answer) => {
                await peerConnection.setLocalDescription(answer)
                setLocal(answer)
            })
    }, [peerConnection, remote])

    return (
        <div style={{display: 'block'}}>
            <h1>Remote View</h1>
            <h2>Offer from Peer:</h2>
            <section>
                <textarea style={{width: 500, height: 500}} onChange={(e) => setSDP(e.target.value)}></textarea>
            </section>
            <Button onClick={() => {
                peerConnection.setRemoteDescription({type: 'offer', sdp: sdp + '\n'})
                    .then(() => setRemote({type: 'offer', sdp: sdp}))

            }}>Submit</Button>
            <Handshake candidates={candidates} local={peerConnection.localDescription || local}
                       remote={peerConnection.remoteDescription || remote}/>
        </div>
    )
}


/**
 * Local Peer
 *
 * create a new session
 *
 * @param peerConnection
 * @constructor
 */
function LocalView({peerConnection}: { peerConnection: RTCPeerConnection }) {
    const {socket} = useSocket()
    const candidates = usePeerStore((state) => state.candidates)
    // Session Description
    const [sdp, setSDP] = useState<string>()
    const [local, setLocal] = useState<RTCSessionDescriptionInit | null>(null)
    const [remote, setRemote] = useState<RTCSessionDescriptionInit | null>(null)

    // Handle SDP
    async function handleCallButton() {
        if (peerConnection.signalingState === 'stable') {
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            setLocal(offer)
        }
    }

    return (
        <div style={{display: 'block'}}>
            <h1>Local View</h1>
            <Button variant="contained" color="secondary" onClick={handleCallButton}>Start Call</Button>
            <h2>Remote Answer:</h2>
            <section>
                <textarea style={{width: 500, height: 500}} onChange={(e) => setSDP(e.target.value)}></textarea>
            </section>
            <Button onClick={() => {
                console.log(sdp)
                peerConnection.setRemoteDescription({type: 'answer', sdp: sdp + '\n'})
                    .then(() => setRemote({type: 'answer', sdp: sdp}))
            }}>Submit</Button>
            <Handshake candidates={candidates} local={peerConnection.localDescription || local}
                       remote={peerConnection.remoteDescription || remote}/>
        </div>
    )
}


/**
 * What does this thing need to do?
 *
 * Needs a relay for candidates and offers.
 *
 * After a connection is established, it should pass the ice-candidate-offer to the server.
 *
 * @constructor
 */
export function DebugWebRTC() {
    const state = useUserState()

    // Remote or Local Session
    const [type, setType] = useState<'local' | 'remote'>('local')

    // Store Hooks
    const addMessage = useMessageStore((state) => state.addMessage)
    const clearMessages = useMessageStore((state) => state.clearMessages)
    const addCandidate = usePeerStore((state) => state.addCandidate)
    const clearCandidates = usePeerStore((state) => state.clearCandidates)

    // Create a Peer Connection
    const peerConnection = usePeerConnection((event) => {
        if (event.candidate) {
            addCandidate(event.candidate.toJSON())
        }
    });
    const connectionState = usePeerConnectionState();
    // Create a Data Channel
    const dataChannel = useDataChannel(type, peerConnection);
    // Handle Messages
    useDataChannelMessages((event) => addMessage(JSON.parse(event.data)))
    if (state.isLoading) {
        return (
            <CircularProgress color="warning"/>
        )
    } else if (!state.data.user) {
        return (
            <Button variant="contained" color="secondary" onClick={async () => {
                const requestId = Math.floor(Math.random() * 1000000)
                await fetchConnectResponse(new Message('https://fido-home.telluric.guru', 'test', requestId).sign(acct.sk))

            }}>
                Sign-in
            </Button>
        )
    }

    if (dataChannel && connectionState === 'connected') {
        return (
            <ChatList/>
        )
    }

    return (
        <Card sx={{padding: 4}}>
            <CardContent>
                <Typography variant="h2">WebRTC Debug</Typography>
                <Typography variant="body1">
                    Connecting is a two step handshake, the first step is to create a <strong>local</strong> offer. The
                    <strong> local</strong> offer is sent to a <strong>remote</strong> peer.
                    The <strong>remote</strong> peer
                    adds the <strong>local</strong> offer to their <strong>remote</strong> session description.
                    The <strong>remote</strong> peer then creates an <strong>answer</strong> and sends it back to the
                    <strong> local</strong> peer.
                </Typography>
                <Button sx={{margin: '20px 0 20px 0'}} variant="contained" color="info" onClick={() => {
                    clearCandidates()
                    clearMessages()
                    setType(type === 'local' ? 'remote' : 'local')
                }}>
                    Switch to {type === 'local' ? 'Remote' : 'Local'}
                </Button>
                <Card raised>
                    <CardContent>
                        {type === 'local' && peerConnection && <LocalView peerConnection={peerConnection}/>}
                        {type === 'remote' && peerConnection && <RemoteView peerConnection={peerConnection}/>}
                    </CardContent>
                </Card>
            </CardContent>
        </Card>
    )
}
