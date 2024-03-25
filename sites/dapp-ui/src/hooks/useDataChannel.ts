import {createContext, useContext, useEffect} from "react";

type DataChannelState = {dataChannel: RTCDataChannel | null, setDataChannel: (_: RTCDataChannel) => void}
export const DataChannelContext = createContext({
    dataChannel: null, setDataChannel: (_: RTCDataChannel) => {}
} as DataChannelState);

/**
 * Hook to use data channel messages
 * @param onMessage
 */
export function useDataChannelMessages(onMessage: (event: MessageEvent)=>void){
    const {dataChannel} = useContext(DataChannelContext);
    useEffect(() => {
        if(!dataChannel) return
        dataChannel.addEventListener("message", onMessage);
        return () => {
            dataChannel.removeEventListener("message", onMessage);
        }
    }, [dataChannel, onMessage]);
}

/**
 * Hook to create a Data Channel
 *
 * Creates a RTCDataChannel if type is 'local'. If the type is 'remote', it listens for the 'datachannel' event
 *
 * @param type
 * @param peerConnection
 */
export function useDataChannel(type: 'local' | 'remote', peerConnection: RTCPeerConnection | null){
    const {dataChannel, setDataChannel} = useContext(DataChannelContext)
    useEffect(() => {
        if(!peerConnection) return
        function handleOnDataChannel(event: RTCDataChannelEvent){
            setDataChannel(event.channel)
        }
        if(type === 'local') {
            setDataChannel(peerConnection.createDataChannel('data'))
        } else {
            peerConnection.addEventListener('datachannel', handleOnDataChannel)
        }

        return ()=> {
            if(type === 'remote') {
                peerConnection.removeEventListener('datachannel', handleOnDataChannel)
            }
        }
    }, [peerConnection, setDataChannel, type]);

    return dataChannel;
}
