import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

import tailwind from "@astrojs/tailwind";

// https://astro.build/config
export default defineConfig({
  site: 'https://liquid-auth.algorand.foundation',
  integrations: [
    starlight({
      title: 'Liquid\nAuth',
      favicon: './public/logo.svg',
      logo: {
        src: './public/logo.svg'
      },
      social: {
        github: 'https://github.com/algorandfoundation/liquid-auth'
      },
      sidebar: [{
        label: 'Deep Dive',
        items: [
        // Each item here is one entry in the navigation menu
        {
          label: 'Example Guide',
          link: '/guides/example/'
        }]
      }, {
        label: 'Reference',
        autogenerate: {
          directory: 'reference'
        }
      }]
    }),
    tailwind()]
});
