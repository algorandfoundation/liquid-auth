package foundation.algorand.auth.connect

import android.content.Context
import android.util.Log
import org.webrtc.*
import java.nio.ByteBuffer

class PeerApi(context: Context) {
    companion object {
        const val TAG = "connect.PeerApi"
    }
    // Data Channel to send and receive messages
    private var dataChannel: DataChannel? = null

    private lateinit var peerConnectionFactory: PeerConnectionFactory
    init {
        PeerConnectionFactory.initialize(
            PeerConnectionFactory.InitializationOptions.builder(context)
            .setEnableInternalTracer(true)
            .createInitializationOptions())
        peerConnectionFactory = PeerConnectionFactory
            .builder()
            .setOptions(PeerConnectionFactory.Options().apply {
                disableEncryption = false
                disableNetworkMonitor = false
            })
            .createPeerConnectionFactory()
    }
    // Create the Peer Connection Factory


    private var peerConnection: PeerConnection? = null

    fun createPeerConnection(onIceCandidate: (IceCandidate) -> Unit, iceServers: List<PeerConnection.IceServer>? = listOf(
        PeerConnection.IceServer.builder("stun:stun.l.google.com:19302")
            .createIceServer()
    )){
        if(peerConnection !== null){
            peerConnection?.close()
        }
        peerConnection = peerConnectionFactory.createPeerConnection(
            iceServers,
            object : PeerConnection.Observer {
                override fun onIceCandidate(p0: IceCandidate?) {
                    p0?.let {
                        onIceCandidate(it)
                    }
                }

                override fun onDataChannel(p0: DataChannel?) {
                    Log.d(TAG, "onDataChannel($p0)")
                }

                override fun onIceConnectionChange(p0: PeerConnection.IceConnectionState?) {
                    Log.d(TAG, "onIceConnectionChange($p0)")
                }

                override fun onIceConnectionReceivingChange(p0: Boolean) {
                    Log.d(TAG, "onIceConnectionReceivingChange($p0)")
                }

                override fun onIceGatheringChange(p0: PeerConnection.IceGatheringState?) {
                    Log.d(TAG, "onIceGatheringChange($p0)")
                }

                override fun onAddStream(p0: MediaStream?) {
                    Log.d(TAG, "onAddStream($p0)")
                }

                override fun onSignalingChange(p0: PeerConnection.SignalingState?) {
                    Log.d(TAG, "onSignalingChange($p0)")
                }

                override fun onIceCandidatesRemoved(p0: Array<out IceCandidate>?) {
                    Log.d(TAG, "onIceCandidatesRemoved($p0)")
                }

                override fun onRemoveStream(p0: MediaStream?) {
                    Log.d(TAG, "onRemoveStream($p0)")
                }

                override fun onRenegotiationNeeded() {
                    Log.d(TAG, "onRenegotiationNeeded()")
                }

                override fun onAddTrack(p0: RtpReceiver?, p1: Array<out MediaStream>?) {
                    Log.d(TAG, "onAddTrack($p0, $p1)")
                }
            }
        )
    }
    fun addIceCandidate(candidate: IceCandidate){
        if(peerConnection === null){
            throw Exception("peerConnection is null, ensure you are connected")
        }
        peerConnection?.addIceCandidate(candidate)
    }
    fun setRemoteDescription(description: SessionDescription){
        if(peerConnection === null){
            throw Exception("peerConnection is null, ensure you are connected")
        }

        peerConnection?.setRemoteDescription(object : SdpObserver {
            override fun onSetFailure(p0: String?) {
                Log.e(TAG, "onSetFailure: $p0")
            }

            override fun onSetSuccess() {
                Log.e(TAG, "onSetSuccessRemoteSession")
            }

            override fun onCreateSuccess(p0: SessionDescription?) {
                Log.e(TAG, "onCreateSuccess")
            }

            override fun onCreateFailure(p0: String?) {
                Log.e(TAG, "onCreateFailure: $p0")
            }
        }, description)
    }
    fun createOffer(callback: (SessionDescription?) -> Unit){
        if(peerConnection === null){
            throw Exception("peerConnection is null")
        }
        peerConnection?.createOffer(object : SdpObserver {
            override fun onSetFailure(p0: String?) {
                Log.e(TAG, "onSetFailure: $p0")
            }

            override fun onSetSuccess() {
                Log.e(TAG, "onSetSuccess")
            }

            override fun onCreateSuccess(p0: SessionDescription?) {
                Log.e(TAG, "onCreateSuccess")
                peerConnection?.setLocalDescription(object : SdpObserver {
                    override fun onSetFailure(p0: String?) {
                        Log.e(TAG, "onSetFailure: $p0")
                    }

                    override fun onSetSuccess() {
                        Log.e(TAG, "onSetSuccess")
                        callback(p0)
                    }

                    override fun onCreateSuccess(p0: SessionDescription?) {
                        Log.e(TAG, "onCreateSuccess")
                    }

                    override fun onCreateFailure(p0: String?) {
                        Log.e(TAG, "onCreateFailure: $p0")
                    }
                }, p0)
            }

            override fun onCreateFailure(p0: String?) {
                Log.e(TAG, "onCreateFailure: $p0")
            }
        }, MediaConstraints())
    }
    fun createDataChannel(label: String, onStateChange: (String)-> Unit, onMessage: (String) ->Unit ){
        if(peerConnection === null){
            throw Exception("peerConnection is null")
        }
        dataChannel?.close()
        dataChannel = peerConnection?.createDataChannel(label, DataChannel.Init())
        dataChannel?.registerObserver(object : DataChannel.Observer {
            override fun onBufferedAmountChange(p0: Long) {
                Log.d(TAG, "onBufferedAmountChange($p0)")
            }

            override fun onStateChange() {
                Log.d(TAG, "onStateChange")
                onStateChange(dataChannel?.state().toString())
            }

            override fun onMessage(p0: DataChannel.Buffer?) {
                Log.d(TAG, "onMessage($p0)")
                p0?.data?.let {
                    val bytes = ByteArray(it.remaining())
                    p0.data.get(bytes)
                    val payload = String( bytes)
                    onMessage(payload)
                }
            }
        })
    }
    fun send(message: String){
        if(dataChannel === null){
            throw Exception("dataChannel is null")
        }
        dataChannel?.state()?.let {
            if(it !== DataChannel.State.OPEN){
                throw Exception("dataChannel is not open")
            }
        }
        val buffer = ByteBuffer.wrap(message.toByteArray())
        dataChannel?.send(DataChannel.Buffer(buffer, false))
    }
    fun destroy(){
        dataChannel?.close()
//        dataChannel?.dispose()
        peerConnection?.close()
        peerConnection?.dispose()
        peerConnection = null
        dataChannel = null
    }
}
