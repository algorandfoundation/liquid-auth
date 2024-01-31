import {Message} from './connect.js'
import qrcode from 'qrcode'

const DEFAULTS = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
}


async function connectOptions(origin: URL,requestId: number): Promise<Response> {
    return fetch(`${origin}connect/request`, {
        ...DEFAULTS,
        body: JSON.stringify({requestId}),
    })
}

async function connectResult(origin: URL, message: Message): Promise<any> {
    return await fetch(`${origin}connect/response`, {
        ...DEFAULTS,
        body: message.toString(),
    }).then((r) => r.json());
}

/**
 *
 */
async function attestationOptions(options?: any, parse = true): Promise<any> {
    console.log(this.origin)
    return await fetch(`${this.origin}attestation/request`, {
        ...DEFAULTS,
        body: JSON.stringify(typeof options === 'undefined' ? {} : options),
    }).then((r) => r.json());

}

