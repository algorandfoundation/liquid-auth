import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwind from "@astrojs/tailwind";
import {createStarlightTypeDocPlugin } from 'starlight-typedoc'
import starlightOpenAPI, { openAPISidebarGroups } from 'starlight-openapi'
const [coreTypeDoc, coreTypeDocSidebarGroup] = createStarlightTypeDocPlugin()
const [authTypeDoc, authCoreTypeDocSidebarGroup] = createStarlightTypeDocPlugin()

// https://astro.build/config
export default defineConfig({
  site: 'https://liquid-auth.algorand.foundation',
  integrations: [
    starlight({
      title: 'Liquid\nAuth',
      plugins: [
        starlightOpenAPI([
          {
            base: 'reference/api',
            label: '@liquid/auth-server',
            schema: '../openapi.yaml',
          },
        ]),
        authTypeDoc({
          tsdoc: {},
          sidebar: {
            label: '@liquid/auth-client'
          },
          output: "reference/typescript/auth",
          entryPoints: [
            '../clients/liquid-auth-client-js/src/signal.ts',
            '../clients/liquid-auth-client-js/src/assertion.ts',
            '../clients/liquid-auth-client-js/src/attestation.ts',
            '../clients/liquid-auth-client-js/src/client/index.ts',
          ],
          tsconfig: '../clients/liquid-auth-client-js/tsconfig.json',
        }),
        coreTypeDoc({
          sidebar: {
            label: '@liquid/auth-core'
          },
          output: "reference/typescript/core",
          entryPoints: [
            '../clients/liquid-auth-core/src/encoding.ts',
            '../clients/liquid-auth-core/src/sha512.ts',
            '../clients/liquid-auth-core/src/hi-base32.ts',
          ],
          tsconfig: '../clients/liquid-auth-core/tsconfig.json',
        }),
      ],
      logo: {
        src: './public/logo.svg'
      },
      social: {
        github: 'https://github.com/algorandfoundation/liquid-auth'
      },
      sidebar: [
        {
          label: "Introduction",
          link: "/introduction/"
        },
        {
        label: 'Guides',
        items:[
          {
            label: "Getting Started",
            link: "/guides/getting-started"
          },
          {
            label: "Passkey Registration",
            link: "/guides/registration"
          },
          {
            label: "Passkey Authentication",
            link: "/guides/authentication"
          },
          {
            label: "P2P Signalling",
            link: "/guides/signalling"
          }
        ]
      },
        {
          label: "Server",
          collapsed: true,
          items: [
            {
              "label": "Introduction",
              "link": "/server/introduction"
            },
            {
              "label": "Configuration",
              "link": "/server/configuration"
            },
            {
              "label": "Proxy",
              "link": "/server/proxy"
            },
            {
              "label": "Deploying",
              "link": "/server/deploying"
            }
          ],
          // autogenerate: { directory: 'server' }
        },
        {
          label: "Clients",
          collapsed: true,
          autogenerate: { directory: 'clients' }
        },
        {
          label: "Reference",
          collapsed: true,
          items: [
            authCoreTypeDocSidebarGroup,
            coreTypeDocSidebarGroup,
            ...openAPISidebarGroups
          ]
        },
      ]
    }),
    tailwind()]
});
