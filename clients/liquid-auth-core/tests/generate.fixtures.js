import {toBase64URL, } from "../lib/index.js";
import * as fs from "node:fs";
import algosdk from 'algosdk'

const data = [
    "9b1a1b53-0456-4fcd-b10a-4db40352d58a", //OWIxYTFiNTMtMDQ1Ni00ZmNkLWIxMGEtNGRiNDAzNTJkNThh - Validated
    "7646809", // Catch 7 Bits
    "b1338059", // Catch 8 Bits
    "582bd065-f280-4574-b315-3398c75296c5",
    "29572cc5-7c36-4016-9825-abcc9ba51dae",
    "2ce09bdf-69d1-4b08-b93e-3af4ca6a657a",
    "15210d8d-308c-4acd-843c-ba6babada62c",
    "cba26c96-51ad-40c0-b29f-6a46e0d88d43",
    "c13cdc12-c7ed-41db-a669-56a664f8127a",
    "8507cd12-1a02-4a48-92a5-23fbbe7ad5fe",
    "02b073e9-f33c-4f06-b3aa-d94101a06494",
    "064b6627-6dcb-439b-979d-a38c6a4e10f4",
    "f32a0d44-6d3c-4f68-ba4d-0bc26aed6c7f",
    "73b68c21-7bab-4608-ad9c-67d2fb954fa2",
    "d626dd1f-50c5-4438-b920-72b852bb89cd",
    "e598d7e0-282e-4ae9-909b-b18b9710b2b4",
    "84c50a1a-38bb-470b-8347-68d9e323f3d8",
    "53bae0ac-5462-438f-89c4-aa1204146eca",
    "4b487db9-abba-40c5-a0ad-b2250878a332",
    "d0941714-eae3-40db-a789-f21aa6401b0d",
    "efb79528-d0bd-433e-be9f-f1020cee08fa",
    "da2a799b-e1fe-460a-8f3f-0a5f4a124359",
    "822dc1c2-556c-4cee-8c37-411ac530a088",
    "d035ec77-dd78-4a51-8392-ad28870b0905",
    "c934cf59-56a9-45f6-bdbd-7273d2ae86c8",
    "b2c572bb-98e1-4d6b-b06c-865a749aacf6",
    "5f571217-335c-422e-8c76-0e8b4e1296cf"
]

const walletKeys = data.map(()=>{
    const address = algosdk.generateAccount()
    return {
        encoded: address.addr,
        checksum: new Array(...algosdk.decodeAddress(address.addr).checksum),
        publicKey: new Array(...algosdk.decodeAddress(address.addr).publicKey),
        privateKey: new Array(...address.sk),
        valid: true
    }
})


fs.writeFileSync('./tests/__fixtures__/wallet.keys.fixtures.json', JSON.stringify(walletKeys, null, 2))


const encodingBase64URL = data.map((d)=>{
    const encoder = new TextEncoder()
    return {
        origin: d,
        toBase64Url: toBase64URL(encoder.encode(d)),
        fromBase64Url: new Array(...encoder.encode(d)),
    }
})

fs.writeFileSync('./tests/__fixtures__/encoding.base64url.fixtures.json', JSON.stringify(encodingBase64URL, null, 2))

console.log(Buffer.from('hello', 'base32'))
