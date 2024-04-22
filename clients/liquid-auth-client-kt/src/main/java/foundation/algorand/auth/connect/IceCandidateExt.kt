package foundation.algorand.auth.connect

import org.json.JSONObject
import org.webrtc.IceCandidate

fun IceCandidate.toJSON(): JSONObject {
//    "serverUrl" to candidate?.serverUrl,
//    "sdpMid" to candidate?.sdpMid,
//    "sdpMLineIndex" to candidate?.sdpMLineIndex,
//    "sdpCandidate" to candidate?.sdp,
//    "type" to type
    return JSONObject().apply {
//        put("type", "offer")
//        put("serverUrl", serverUrl)
        put("candidate", sdp)
        put("sdpMid", sdpMid)
        put("sdpMLineIndex", sdpMLineIndex)
    }
}

