package foundation.algorand.demo

import android.app.Activity
import android.os.Build
import android.os.Bundle
import android.os.StrictMode
import android.util.Log
import android.view.View
import android.widget.Toast
import androidx.activity.result.ActivityResult
import androidx.activity.result.IntentSenderRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.biometric.BiometricPrompt
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import com.algorand.algosdk.kmd.client.model.SignTransactionRequest
import com.algorand.algosdk.transaction.SignedTransaction
import com.algorand.algosdk.transaction.Transaction
import com.algorand.algosdk.util.Encoder
import com.google.android.gms.fido.Fido
import com.google.android.gms.fido.fido2.Fido2ApiClient
import com.google.android.gms.fido.fido2.api.common.AuthenticatorErrorResponse
import com.google.android.gms.fido.fido2.api.common.PublicKeyCredential
import com.google.mlkit.vision.codescanner.GmsBarcodeScanner
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import foundation.algorand.auth.Cookie
import foundation.algorand.auth.connect.ConnectApi
import foundation.algorand.auth.connect.AuthMessage
import foundation.algorand.auth.crypto.KeyPairs
import foundation.algorand.auth.crypto.decodeBase64
import foundation.algorand.auth.crypto.toBase64
import foundation.algorand.auth.fido2.*
import foundation.algorand.demo.databinding.ActivityMainBinding
import kotlinx.coroutines.launch
import kotlinx.coroutines.tasks.await
import okhttp3.OkHttpClient
import org.apache.commons.codec.binary.Base64
import org.bouncycastle.jce.provider.BouncyCastleProvider
import org.json.JSONArray
import org.json.JSONObject
import org.webrtc.DataChannel
import ru.gildor.coroutines.okhttp.await
import java.io.IOException
import java.security.KeyPair
import java.security.Security
import java.util.concurrent.Executor
import kotlin.coroutines.resume
import kotlin.coroutines.suspendCoroutine


class MainActivity : AppCompatActivity() {
    companion object {
        private const val TAG = "MainActivity"
    }
    private val viewModel: MainViewModel by viewModels()
    private lateinit var binding: ActivityMainBinding

    private val cookieJar = Cookies()

    // Third Party APIs
    private var httpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar)
        .build()

    private lateinit var scanner: GmsBarcodeScanner

    // FIDO/Auth interfaces
    private var fido2Client: Fido2ApiClient? = null
    private val connectApi = ConnectApi(httpClient)
    private val attestationApi = AttestationApi(httpClient)
    private val assertionApi = AssertionApi(httpClient)

    private val userAgent = "${BuildConfig.APPLICATION_ID}/${BuildConfig.VERSION_NAME} " +
            "(Android ${Build.VERSION.RELEASE}; ${Build.MODEL}; ${Build.BRAND})"

    private lateinit var biometricPrompt: BiometricPrompt
    private lateinit var promptInfo: BiometricPrompt.PromptInfo
    private lateinit var executor: Executor
    private var signature: ByteArray? = null

    // Register/Attestation Intent Launcher
    private val attestationIntentLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult(),
        ::handleAuthenticatorAttestationResult
    )

    // Authenticate/Assertion Intent Channel
    private val assertionIntentLauncher = registerForActivityResult(
        ActivityResultContracts.StartIntentSenderForResult(),
        ::handleAuthenticatorAssertionResult
    )


    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // Set Security
        val policy = StrictMode.ThreadPolicy.Builder().permitAll().build()
        StrictMode.setThreadPolicy(policy)
        Security.removeProvider("BC")
        Security.insertProviderAt(BouncyCastleProvider(), 0)

        // Create FIDO Client, TODO: refactor to Credential Manager
        fido2Client = Fido2ApiClient(this@MainActivity)
        scanner = GmsBarcodeScanning.getClient(this@MainActivity)
        executor = ContextCompat.getMainExecutor(this)
        // View Bindings
        binding = ActivityMainBinding.inflate(layoutInflater)
        binding.lifecycleOwner = this
        setContentView(binding.root)
        binding.viewModel = viewModel

        binding.connectButton.setOnClickListener {
            connect()

        }

        binding.disconnectButton.setOnClickListener {
            cookieJar.clear()
            setSession(null)
            connectApi.disconnect()
        }
    }

    suspend fun biometrics(msg: AuthMessage, txn: Transaction):BiometricPrompt.AuthenticationResult? {
        return suspendCoroutine { continuation ->
            biometricPrompt = BiometricPrompt(this, executor,
                object : BiometricPrompt.AuthenticationCallback() {
                    override fun onAuthenticationError(errorCode: Int,
                                                       errString: CharSequence) {
                        super.onAuthenticationError(errorCode, errString)
                        continuation.resume(null)
                    }

                    override fun onAuthenticationSucceeded(
                        result: BiometricPrompt.AuthenticationResult) {
                        super.onAuthenticationSucceeded(result)
                        continuation.resume(result)
                    }

                    override fun onAuthenticationFailed() {
                        super.onAuthenticationFailed()
                        continuation.resume(null)
                    }
                })
            promptInfo = BiometricPrompt.PromptInfo.Builder()
                .setTitle("${txn.type} Transaction ${txn.assetIndex}")
                .setSubtitle("From: ${txn.sender.toString().substring(0, 4)} To: ${txn.receiver.toString().substring(0, 4)} Amount: ${txn.amount}")
                .setNegativeButtonText("Cancel")
                .build()
            biometricPrompt.authenticate(promptInfo)
        }
    }
    private fun decodeUnsignedTransaction(unsignedTxn: String): Transaction? {
       return  Encoder.decodeFromMsgPack(unsignedTxn.decodeBase64(), Transaction::class.java)
    }
    private fun handleMessages(authMessage: AuthMessage, msgStr: String, keyPair: KeyPair){
        // DataChannel Message Callback
        val message = JSONObject(msgStr)
        if(message.get("type") == "transaction") {
            lifecycleScope.launch {
                // Decode the Transaction
                val txn = decodeUnsignedTransaction(message.get("txn").toString())
                // Display a biometric prompt with some transaction details
                val biometricResult = biometrics(authMessage, txn!!)
                if(biometricResult !== null){
                    val bytes = txn.bytesToSign()
                    val signatureBytes = KeyPairs.rawSignBytes(bytes, keyPair.private)
                    val sig = Base64.encodeBase64URLSafeString(signatureBytes)
                    val responseObj = JSONObject()
                    responseObj.put("sig", sig)
                    responseObj.put("txId", txn.txID())
                    responseObj.put("type", "transaction-signature")
                    Log.d(TAG, "Sending: ${responseObj.toString()}")
                    connectApi.peerApi?.send(responseObj.toString())
                }
            }
        }
    }
    /**
     * Connect/Proof of Knowledge API
     *
     * Connects the Wallet/Android Application to a dApp/website using a Barcode.
     * The barcode includes a Message which includes the origin, requestId and challenge to be signed.
     * The wallet must sign the challenge and attach both the wallet address and
     */
    private fun connect() {
        val account = viewModel.account.value!!
        scanner.startScan()
            .addOnSuccessListener { barcode ->
                // Decode Barcode Message
                val msg = AuthMessage.fromBarcode(barcode)
                viewModel.setMessage(msg)
                // Connect to Service
                lifecycleScope.launch {
                    if(viewModel.credential.value === null){
                        register(msg)
                    } else {
                        authenticate(msg, viewModel.credential.value!!)
                    }
                }
            }
            .addOnCanceledListener {
                Toast.makeText(this@MainActivity, "Canceled", Toast.LENGTH_LONG).show()
            }
            .addOnFailureListener { e ->
                Toast.makeText(this@MainActivity, e.message, Toast.LENGTH_LONG).show()
            }
    }

    /**
     * Registration of a new Credential (Step 1 of 2)
     *
     * Receives PublicKeyCredentialCreationOptions from the FIDO2 Server and launches
     * the authenticator Intent using the handleAuthenticatorAttestationResult Handler
     */
    private suspend fun register(msg: AuthMessage, options: JSONObject = JSONObject()) {
        val account = viewModel.account.value!!
        Log.d(TAG, "Registering new Credential with ${account.address} at ${msg.origin}")

        // Create Options for FIDO2 Server
        options.put("username", account.address.toString())
        options.put("displayName",  "Liquid Auth User")
        options.put("authenticatorSelection", JSONObject().put("userVerification", "required"))
        // FIDO2 Server API Response for PublicKeyCredentialCreationOptions
        val response = attestationApi.postAttestationOptions(msg.origin, userAgent, options).await()
        val session = Cookie.fromResponse(response)
        session?.let {
            setSession(Cookie.getID(it))
        }
        // Convert ResponseBody to FIDO2 PublicKeyCredentialCreationOptions
        val pubKeyCredentialCreationOptions = response.body!!.toPublicKeyCredentialCreationOptions()
        // Sign the challenge with the algorand account, this is used in the liquid FIDO2 extension
        signature = KeyPairs.rawSignBytes(pubKeyCredentialCreationOptions.challenge, KeyPairs.getKeyPair(account.toMnemonic()).private)
        // Kick off FIDO2 Client Intent
        val pendingIntent = fido2Client!!.getRegisterPendingIntent(pubKeyCredentialCreationOptions).await()
        attestationIntentLauncher.launch(
            IntentSenderRequest.Builder(pendingIntent)
                .build()
        )
    }
    /**
     * Registration of a New Credential (Step 2 of 2)
     *
     * Handles the ActivityResult from a FIDO2 Intent and submits
     * the Authenticator's PublicKeyCredential to the FIDO2 Server
     */
    private fun handleAuthenticatorAttestationResult(activityResult: ActivityResult) {
        val bytes = activityResult.data?.getByteArrayExtra(Fido.FIDO2_KEY_CREDENTIAL_EXTRA)

        when {
            activityResult.resultCode != Activity.RESULT_OK ->
                Toast.makeText(this@MainActivity, "Canceled", Toast.LENGTH_LONG).show()

            bytes == null ->
                Toast.makeText(this@MainActivity, "Error", Toast.LENGTH_LONG)
                    .show()

            else -> {
                // Handle PublicKeyCredential Response from Authenticator
                val credential = PublicKeyCredential.deserializeFromBytes(bytes)
                val response = credential.response
                if (response is AuthenticatorErrorResponse) {
                    Toast.makeText(this@MainActivity, response.errorMessage, Toast.LENGTH_LONG)
                        .show()
                } else {
                    if (signature === null) {
                        Toast.makeText(this@MainActivity, "Signature is null", Toast.LENGTH_LONG).show()
                        return
                    }
                    val msg = viewModel.message.value!!
                    val account = viewModel.account.value!!
                    val liquidExtJSON = JSONObject()
                    liquidExtJSON.put("type", "algorand")
                    liquidExtJSON.put("requestId", msg.requestId)
                    liquidExtJSON.put("address", account.address.toString() )
                    liquidExtJSON.put("signature", Base64.encodeBase64URLSafeString(signature!!))
                    liquidExtJSON.put("device", android.os.Build.MODEL)
                    lifecycleScope.launch {
                        // POST Authenticator Results to FIDO2 API
                       attestationApi.postAttestationResult(
                            msg.origin,
                            userAgent,
                            credential,
                            liquidExtJSON
                        ).await()

                        // Create P2P Channel
                        val keyPair = KeyPairs.getKeyPair(account.toMnemonic())
                        // Connect to the service and if the message is unsigned, pass in a keypair
                        connectApi.connect(application, msg, {
                            Log.d(TAG, "onStateChange($it)")
                            if(it === "OPEN"){
                                Log.d(TAG, "Sending Credential")
                                val credMessage = JSONObject()
                                credMessage.put("device", android.os.Build.MODEL)
                                credMessage.put("origin", msg.origin)
                                credMessage.put("id", credential.id)
                                credMessage.put("prevCounter", 0)
                                credMessage.put("type", "credential")
                                connectApi.peerApi!!.send(credMessage.toString())
                            }
                        }) {
                            handleMessages(msg, it, keyPair)
                        }
                        // Update Render/State
                        viewModel.setCredential(credential)
                        Toast.makeText(this@MainActivity, "Registered Credentials!", Toast.LENGTH_LONG).show()
                    }

                }
            }
        }
    }

    /**
     * Authentication using a PublicKeyCredential (Step 1 of 2)
     *
     * Receives PublicKeyCredentialRequestOptions from the FIDO2 Server and launches
     * the authenticator Intent using the handleAuthenticatorAssertionResult Handler
     */
    private suspend fun authenticate(msg: AuthMessage, credential: PublicKeyCredential) {
        val response = assertionApi.postAssertionOptions(
            msg.origin,
            userAgent,
            credential.id
        ).await()
        val publicKeyCredentialRequestOptions = response.body!!.toPublicKeyCredentialRequestOptions()
        val pendingIntent = fido2Client!!.getSignPendingIntent(publicKeyCredentialRequestOptions).await()
        assertionIntentLauncher.launch(IntentSenderRequest.Builder(pendingIntent).build())
    }

    /**
     * Authentication using a PublicKeyCredential (Step 2 of 2)
     *
     * Handles the ActivityResult from a FIDO2 Intent and submits
     * the Authenticator's PublicKeyCredential to the FIDO2 Server
     */
    private fun handleAuthenticatorAssertionResult(activityResult: ActivityResult) {
        val bytes = activityResult.data?.getByteArrayExtra(Fido.FIDO2_KEY_CREDENTIAL_EXTRA)
        when {
            activityResult.resultCode != Activity.RESULT_OK ->
                Toast.makeText(this@MainActivity, "Canceled", Toast.LENGTH_LONG).show()

            bytes == null ->
                Toast.makeText(this@MainActivity, "Authenticate Error", Toast.LENGTH_LONG).show()

            else -> {
                // Handle PublicKeyCredential Response from Authenticator
                val credential = PublicKeyCredential.deserializeFromBytes(bytes)
                val pubKeyCredentialResponse = credential.response
                if (pubKeyCredentialResponse is AuthenticatorErrorResponse) {
                    Toast.makeText(this@MainActivity, pubKeyCredentialResponse.errorMessage, Toast.LENGTH_LONG)
                        .show()
                } else {
                    lifecycleScope.launch {
                        val liquidExtJSON = JSONObject()
                        liquidExtJSON.put("requestId", viewModel.message.value!!.requestId)
                        // POST Authenticator Results to FIDO2 API
                        val response = assertionApi.postAssertionResult(
                            viewModel.message.value!!.origin,
                            userAgent,
                            credential,
                            liquidExtJSON
                        ).await()

                        // Update Render/State
                        val data = response.body!!.string()
                        val json = JSONObject(data)
                        val creds = json.get("credentials") as JSONArray

                        if(creds.length() > 0) {
                            for (i in 0 until creds.length()) {
                                val cred: JSONObject = creds.getJSONObject(i)
                                if(cred.get("credId") == credential.id ){
                                    viewModel.setCount(cred.get("prevCounter") as Int)
                                }
                            }
                        } else {
                            viewModel.setCount(0)
                        }
                        val credMessage = JSONObject()
                        credMessage.put("device", android.os.Build.MODEL)
                        credMessage.put("origin", viewModel.message.value!!.origin)
                        credMessage.put("id", credential.id)
                        credMessage.put("prevCounter", viewModel.count.value!!)
                        credMessage.put("type", "credential")
                        connectApi.peerApi!!.send(credMessage.toString())
                    }
                }
            }
        }
    }


    /**
     * Update Render for demonstration purposes only
     */
    private fun setSession(s: String?) {
        if (s === null) {
            viewModel.setSession("Logged Out")
            viewModel.setMessage(null)
            binding.disconnectButton.visibility = View.INVISIBLE
            binding.connectButton.visibility = View.VISIBLE
        } else {
            viewModel.setSession(s)
            binding.disconnectButton.visibility = View.VISIBLE
            binding.connectButton.visibility = View.INVISIBLE
        }
    }
}
