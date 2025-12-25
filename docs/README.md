# Liquid Auth Documentation

[![Built with Starlight](https://astro.badg.es/v2/built-with-starlight/tiny.svg)](https://starlight.astro.build)

This directory contains the documentation site for Liquid Auth, built with [Astro](https://astro.build) and [Starlight](https://starlight.astro.build).

## 🚀 Getting Started

### Prerequisites

- Node.js 20 or higher
- npm (comes with Node.js)

### Installation

From the `docs/` directory, install dependencies:

```bash
npm install
```

Install Playwright (required for rendering Mermaid diagrams):

```bash
npx playwright-core install --with-deps chromium
```

**Note**: Playwright is used by `rehype-mermaid` to render Mermaid diagrams during the build process. It's required for building the site and recommended for development if you're working with Mermaid diagrams.

### Development

Start the local development server with HTTPS enabled:

```bash
npm run dev
```

The site will be available at `https://localhost:4321`. Note that HTTPS is enabled by default for local development to match the production environment.

### Building

Build the production site:

```bash
npm run build
```

The built site will be output to `./dist/`.

### Preview

Preview the production build locally:

```bash
npm run preview
```

## 📁 Project Structure

```
docs/
├── public/              # Static assets (images, logos, etc.)
├── src/
│   ├── assets/          # Optimized images and assets
│   ├── components/      # Custom Astro components
│   │   ├── GTMBody.astro
│   │   └── PageFrame.astro
│   ├── content/
│   │   └── docs/        # Documentation markdown/MDX files
│   │       ├── guides/
│   │       ├── clients/
│   │       ├── server/
│   │       └── ...
│   ├── pages/           # Custom pages (landing page, etc.)
│   └── styles/          # Global styles and theme customization
├── astro.config.mjs     # Astro & Starlight configuration
├── package.json
└── tsconfig.json
```

## 📝 Writing Documentation

### Content Location

All documentation pages are located in `src/content/docs/`. The file structure mirrors the URL structure of the site.

Example:
- `src/content/docs/guides/getting-started.md` → `/guides/getting-started`
- `src/content/docs/clients/browser/introduction.mdx` → `/clients/browser/introduction`

### File Formats

- `.md` - Standard Markdown files
- `.mdx` - MDX files (Markdown with JSX components)

### Frontmatter

Each documentation page should include frontmatter:

```yaml
---
title: Page Title
description: Brief description of the page content
---
```

### Adding Images

1. Place images in `public/` for static assets
2. Or use `src/assets/` for optimized images
3. Reference in Markdown:
   ```markdown
   ![Alt text](/image.png)
   ```

## 🔧 Configuration

### Astro Configuration

The main configuration is in `astro.config.mjs`. Key features:

- **Starlight**: Documentation theme and layout
- **OpenAPI**: Auto-generated API documentation from OpenAPI spec
- **Tailwind CSS**: Styling framework
- **React**: For interactive components
- **MDX**: Enhanced Markdown with component support

### Custom Components

#### PageFrame Override

The `PageFrame.astro` component is overridden to inject Google Tag Manager tracking code. When modifying this component, ensure that named slots (`header`, `sidebar`) are properly passed through to maintain site navigation.

#### GTM Integration

Google Tag Manager is integrated via:
1. Script tag in `astro.config.mjs` head configuration
2. Noscript fallback in `PageFrame.astro`

## 🚢 Deployment

### Production (GitHub Pages)

The production site is automatically deployed to GitHub Pages when changes are merged to the `develop` branch.

Workflow: `.github/workflows/publish-docs.yml`

- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Site URL**: https://liquidauth.com

### Preview (Cloudflare Pages)

Preview deployments are automatically created for pull requests via Cloudflare Pages.

- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Root Directory**: `docs`

## 🧞 Available Commands

All commands are run from the `docs/` directory:

| Command                   | Action                                           |
| :------------------------ | :----------------------------------------------- |
| `npm install`             | Install dependencies                             |
| `npm run dev`             | Start local dev server at `https://localhost:4321` |
| `npm run build`           | Build production site to `./dist/`               |
| `npm run preview`         | Preview production build locally                 |
| `npm run astro ...`       | Run Astro CLI commands                           |
| `npm run astro -- --help` | Get help with Astro CLI                          |

## 🔍 Key Technologies

- **[Astro](https://astro.build)** - Static site generator
- **[Starlight](https://starlight.astro.build)** - Documentation theme
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[starlight-openapi](https://github.com/HiDeoo/starlight-openapi)** - OpenAPI documentation integration
- **[Rehype Mermaid](https://github.com/remcohaszing/rehype-mermaid)** - Mermaid diagram support

## 📚 Resources

- [Starlight Documentation](https://starlight.astro.build/)
- [Astro Documentation](https://docs.astro.build)
- [Liquid Auth Repository](https://github.com/algorandfoundation/liquid-auth)

## 🐛 Troubleshooting

### HTTPS Certificate Warnings

The local development server uses a self-signed certificate. Your browser will show a warning - this is expected. Click "Advanced" and "Proceed" to continue.

### Port Already in Use

If port 4321 is already in use, you can specify a different port:

```bash
npm run dev -- --port 3000
```

### Build Errors

If you encounter build errors:

1. Clear the Astro cache: `rm -rf node_modules/.astro`
2. Reinstall dependencies: `rm -rf node_modules && npm install`
3. Try building again: `npm run build`
