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
import {useSocket} from "../../hooks/useSocket.ts";

const acct = algosdk.mnemonicToSecretKey('lab surge abandon artist moon keen license bronze rebuild wing surge apart basket teach deposit patch snow paper sting rural negative logic cousin above gym')

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

    useEffect(()=>{
        socket.emit('wait-for-offer', ({data})=>{
            peerConnection.setRemoteDescription({type: 'offer', sdp: data.sdp})
                .then(() => setRemote({type: 'offer', sdp: data.sdp}))
        })
    }, [socket])
    useEffect(()=>{
        if(candidates.length >= 1 && local){
            socket.emit('ice-candidate-answer', peerConnection.localDescription?.sdp || local.sdp)
        }
    },[socket, candidates, local, peerConnection])

    useEffect(()=>{
        if(!socket) return
        console.log('Running Ice Candidate effect')
        function onIceCandidate(e){
            console.log('!!!!!!!!!!!!!!!!1')
            console.log(e)
        }
        socket.on('lfgz', function(){
            console.log('!!!!!!!!!!!!!!!!1')

        })
        // return ()=>{
            // socket.off('lfgz', onIceCandidate)
        // }
    }, [socket])
    return (
        <div style={{display: 'block'}}>
            <h1>Remote View</h1>
            <h2>Waiting for Caller</h2>
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
    const [local, setLocal] = useState<RTCSessionDescriptionInit | null>(null)
    const [remote, setRemote] = useState<RTCSessionDescriptionInit | null>(null)

    // Emit the SDP Offer
    useEffect(()=>{
        if(candidates.length >= 1 && local && !remote){
            socket.emit('ice-candidate-offer', peerConnection.localDescription?.sdp || local.sdp, ({data})=>{
                // Server responds with the peer's answer
                peerConnection.setRemoteDescription({type: 'answer', sdp: data.sdp})
                    .then(() => setRemote({type: 'answer', sdp: data.sdp}))
            })
        }
    },[remote, socket, candidates, local, peerConnection])

    useEffect(() => {
        socket.on('lfg', (data)=>{
            console.log('lfg')
            console.log(data)
        })
    }, [socket]);

    // Create a call Offer
    async function handleCallButton() {
        socket.emit('lfg')
        // if (peerConnection.signalingState === 'stable') {
        //     const offer = await peerConnection.createOffer();
        //     await peerConnection.setLocalDescription(offer);
        //     setLocal(offer)
        // }
    }

    return (
        <div style={{display: 'block'}}>
            <h1>Local View</h1>
            <Button variant="contained" color="secondary" onClick={handleCallButton}>Start Call</Button>
        </div>
    )
}

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
