---
title: 'Server: Introduction'
prev: false
sidebar:
  order: 0
  label: 'Introduction'
---

Liquid Auth is a self-hosted authentication service designed to seamlessly associate Passkeys with KeyPairs, a concept commonly used in cryptocurrency ecosystems.


### Technical Details

- **Framework:** Built with the robust [NestJS](https://nestjs.com/) framework, providing a scalable and modular architecture.

- **Database Integration:** Utilizes [Mongoose](https://docs.nestjs.com/techniques/mongodb) for MongoDB interactions, ensuring efficient data handling.

- **Real-Time Signaling:** Implements [Socket.IO](https://docs.nestjs.com/websockets/gateways) for real-time communication, enhanced by a [Redis Adapter](https://socket.io/docs/v4/redis-adapter/) to handle distributed systems and scale.

### Deployment Configurations

For optimal performance, Liquid Auth should run on the same origin as your dApp. It's also recommended that your frontend service proxies authentication requests to the Liquid Auth backend.




