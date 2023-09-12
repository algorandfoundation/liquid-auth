# nest-fido2

See the [Vision Document](VISION.md), [Sequence Diagram](SEQUENCE.md) and [Decisions](decisions/README.md) for more information.

## Installation

```bash
$ npm install
```

## Develop

Start monodb in a separate terminal
```bash
docker-compose up
```
Run the Authentication Service then open http://localhost:3000 in your browser.

```bash
$ npm run start:debug
```

Make sure to enable a valid WebAuthn device in your browser. See [WebAuthn Devtools](https://developer.chrome.com/docs/devtools/webauthn/) for more information.
