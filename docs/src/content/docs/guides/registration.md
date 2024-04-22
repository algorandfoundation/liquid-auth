---
title: Passkey Registration
---

The service has two endpoints for Passkey registration with the following schema from the [OpenApi documentation](/reference/api):

<!-- todo: add the markdown from swagger -->

- `POST /attestation/request` - Fetch PublicKeyCredentialCreationOptions
- `POST /attestation/response` - Register a new Passkey using an AuthenticatorAttestationResponse


**There are currently two clients available for the service:**

### Android

```kotlin
//MainActivity.kt
import foundation.algorand.auth.fido2.*

class MainActivity {
    private var httpClient = OkHttpClient.Builder()
        .cookieJar(cookieJar) // Use Cookie jar to share cookies between requests
        .build()
    private var attestationApi = AttestationApi(httpClient)
    
    private fun onCreate(){
        val origin = "https://my-liquid-auth-service.com"
        
        val options = attestationApi.postAttestationOptions(
            origin, // Origin Server
            "User-Agent-String", // Required for checking the authenticator fingerprint
            JSONObject() // Additional Request Options
        )
        
        // Handle the FIDO2 Intent in FIDO2Client or CredentialManager
        // This is a simplified version of the code
        val credential = PublicKeyCredential()
        
        val response = attestationApi.postAttestationResponse(
            origin, // Origin Server
            "User-Agent-String", // Required for checking the authenticator fingerprint
            credential // PublicKeyCredential
        )
    }
    
}

```

Find out more in the [kotlin client](/clients/typescript/attestation) documentation.

### Browser

```typescript
//app.ts
import {fetchAttestationRequest, fetchAttestationResponse} from '@liquid/auth-client';

const origin = 'https://my-liquid-auth-service.com';
// Get Credential Options
const options = await fetchAttestationRequest(origin, {
  userVerification: 'required',
  extensions: {
    liquid: true
  }
})

// Create Credential
const credential = await navigator.credentials.create({
  publicKey: options
});

// Register Credential
const response = await fetchAttestationResponse(origin, credential)
```
Find out more in the [typescript client](/clients/typescript/attestation) documentation.
