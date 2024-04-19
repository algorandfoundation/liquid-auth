---
title: Introduction
category: Service
---

The service is a Nest.js express application with a Socket.io gateway.
It can be run in one of two ways, Proxy or Standalone.

## Proxy

The proxy mode is the default mode for the service.
It is designed to be run in front of a service and proxy requests to it.

All unmatched requests will be forwarded to the `PROXY_URL` environment variable.
