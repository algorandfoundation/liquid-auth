import {Message} from './connect.js'
import qrcode from 'qrcode'
const DEFAULTS = {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
    },
}

export class HTTPClient{
    origin: URL;
    token?: string;
    /**
     * Create an HTTP Client
     */
    constructor(token: string|undefined, server: string, port?: number) {
        this.origin = new URL(typeof port === 'number' ? `${server}:${port}` : server)
        this.token = token;
    }

    async connectOptions(requestId: number): Promise<Response>{
        return fetch('/connect/request', {
            ...DEFAULTS,
            body: JSON.stringify({ requestId }),
        })
    }
    async connectResult(message: Message): Promise<any>{
        return await fetch('/connect/response', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: message.toString(),
        }).then((r)=>r.json());
    }
    /**
     *
     */
    async attestationOptions(options?: any, parse= true): Promise<any> {
        console.log(this.origin)
        return await fetch(`${this.origin}attestation/request`, {
            ...DEFAULTS,
            body: JSON.stringify(typeof options === 'undefined' ? {} : options),
        }).then((r) => r.json());

    }
}
