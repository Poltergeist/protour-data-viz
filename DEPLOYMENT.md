# GitHub Pages Deployment Setup

## Configuration Complete ✅

The site is configured to deploy to GitHub Pages with the custom domain:
**https://pro-tour-lorwyn-eclipsed.alles-standard.social**

## Setup Steps Required

### 1. Enable GitHub Pages in Repository Settings

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Pages**
3. Under "Build and deployment":
   - Source: **GitHub Actions**
4. The workflow will automatically deploy on push to `main`

### 2. Configure Custom Domain DNS

Add these DNS records in your domain provider (alles-standard.social):

```
Type: CNAME
Name: pro-tour-lorwyn-eclipsed
Value: <your-github-username>.github.io
```

Or if using an apex domain, add A records pointing to:
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

### 3. Verify Custom Domain

After DNS propagation (can take up to 24 hours):
1. Go to **Settings** → **Pages**
2. The custom domain should show as configured
3. Enable "Enforce HTTPS" (recommended)

## Workflow Details

- **Trigger**: Automatic on push to `main`, or manual via workflow_dispatch
- **Build**: Installs dependencies and builds Astro site
- **Deploy**: Uploads to GitHub Pages
- **Permissions**: Uses GitHub's OIDC token for secure deployment

## Manual Deployment

To manually trigger a deployment:
1. Go to **Actions** tab in GitHub
2. Select "Deploy to GitHub Pages"
3. Click "Run workflow"

## Local Testing

Test the production build locally:
```bash
cd web
npm run build
npm run preview
```

Visit http://localhost:4321 to preview the production build.
