# Deployment Instructions for Hostinger

## Repository Information
- **GitHub Repository**: https://github.com/D0tP1r4t3/dotpiratesblog
- **Branch**: main
- **Domain**: hack.com.cy

## Hostinger Git Deployment Setup

### 1. Access Hostinger Git Deployment
1. Log in to your Hostinger control panel (hPanel)
2. Navigate to **Websites** → Select your domain (hack.com.cy)
3. Go to **Git** section (or "Website" → "Git Version Control")

### 2. Connect Your Repository
Fill in the following details:

**Repository URL (SSH)**:
```
git@github.com:D0tP1r4t3/dotpiratesblog.git
```

**Repository URL (HTTPS - if SSH doesn't work)**:
```
https://github.com/D0tP1r4t3/dotpiratesblog.git
```

**Branch**: `main`

### 3. Configure Build Settings

**Build Command**:
```bash
hugo --minify
```

**Output Directory/Public Path**:
```
public
```

**Install Command** (if required):
```bash
# Hugo is typically pre-installed on Hostinger
# If not, you may need to contact support
```

### 4. Add Deploy Key (SSH Method)

If using SSH authentication:

1. Hostinger will generate an SSH public key
2. Copy this key
3. Go to GitHub: https://github.com/D0tP1r4t3/dotpiratesblog/settings/keys
4. Click "Add deploy key"
5. Paste the key from Hostinger
6. Give it a title like "Hostinger Deploy Key"
7. **Check "Allow write access"** if Hostinger needs it (usually not required)
8. Click "Add key"

### 5. Personal Access Token (HTTPS Method - Alternative)

If using HTTPS authentication:

1. Go to GitHub: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Give it a name: "Hostinger Deployment"
4. Select scopes: `repo` (full control of private repositories)
5. Click "Generate token"
6. **Copy the token** (you won't see it again!)
7. Paste it into Hostinger's Git setup when prompted

### 6. Set Web Root

In Hostinger, set the **Document Root** to:
```
public_html/public
```
OR
```
domains/hack.com.cy/public_html/public
```

(The exact path depends on your Hostinger setup - typically the repo clones to `public_html`)

### 7. Test Deployment

1. Click "Deploy" or "Pull" in Hostinger Git interface
2. Hostinger will:
   - Clone the repository
   - Run `hugo --minify`
   - Deploy files from `/public/` to your web root
3. Visit https://hack.com.cy to verify

## Future Updates

After initial setup, whenever you push to GitHub:

```bash
git add .
git commit -m "Your commit message"
git push origin main
```

Then in Hostinger:
- Click "Pull" to fetch latest changes
- The build will run automatically

## Troubleshooting

### Hugo Not Found
If Hostinger doesn't have Hugo installed:
- Contact Hostinger support to install Hugo
- Or use Hostinger's "Build on local machine" option (build locally, push `/public/` folder)

### Submodule Issues (Terminal Theme)
The theme is a git submodule. Ensure Hostinger pulls submodules:
```bash
git submodule update --init --recursive
```

### Build Fails
Check Hostinger build logs for errors. Common issues:
- Hugo version mismatch
- Missing theme files
- Incorrect base URL in `hugo.toml`

## Manual Deployment (Fallback)

If Git deployment doesn't work:

1. Build locally:
   ```bash
   hugo --minify
   ```

2. Upload `/public/` folder contents via:
   - Hostinger File Manager
   - FTP/SFTP client
   - Upload to your document root

## Support

- Hostinger Git Docs: https://support.hostinger.com/en/articles/4513892-how-to-use-git-version-control
- Hugo Docs: https://gohugo.io/documentation/
