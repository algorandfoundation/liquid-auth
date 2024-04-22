package foundation.algorand.demo

import android.widget.Toast
import androidx.biometric.BiometricPrompt
import androidx.lifecycle.LiveData
import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel
import com.algorand.algosdk.account.Account
import com.google.android.gms.fido.fido2.api.common.PublicKeyCredential
import foundation.algorand.auth.connect.AuthMessage

/**
 * Demo View Model
 *
 * Minimal state to handle FIDO2 PublicKeyCredentials and Proof of Knowledge
 */
class MainViewModel: ViewModel() {
    private val _account = MutableLiveData<Account>().apply {
        value = Account()
    }
    val account: LiveData<Account> = _account

    private val _session = MutableLiveData<String>().apply {
        value = "Logged Out"
    }

    val session: LiveData<String> = _session

    fun setSession(cookie: String?){
        if(cookie !== null){
            _session.value = cookie
        }
    }

    private val _message = MutableLiveData<AuthMessage?>().apply {
        value = null
    }

    val message: LiveData<AuthMessage?> = _message

    fun setMessage(msg: AuthMessage?){
        _message.value = msg
    }


    private val _credential = MutableLiveData<PublicKeyCredential?>().apply {
        value = null
    }

    val credential: LiveData<PublicKeyCredential?> = _credential

    fun setCredential(cred: PublicKeyCredential?){
        _credential.value = cred
    }

    private val _count = MutableLiveData<Int>().apply {
        value = 0
    }

    val count = _count

    fun setCount(i: Int){
        _count.value = i
    }
}
