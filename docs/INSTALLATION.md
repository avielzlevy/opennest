# Installing @anthropics/opennest

OpenNest is distributed as a private npm package via GitHub Package Registry. Follow these instructions to install and use it in your projects.

## Prerequisites

- Node.js 16.0.0 or higher
- npm 8.0.0 or higher
- GitHub account with access to the anthropics organization

## Quick Start (Local Development)

### Step 1: Create a Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click **Generate new token (classic)**
3. Set a descriptive name (e.g., "NPM Package Access")
4. Set expiration (recommended: 90 days)
5. Select scope: **`read:packages`** (minimum required)
6. Click **Generate token**
7. **Copy the token immediately** - you won't see it again!

### Step 2: Configure npm Authentication

**Option A: Using npm login (Recommended)**

```bash
npm login --scope=@anthropics --registry=https://npm.pkg.github.com --auth-type=legacy
```

When prompted:
- **Username:** Your GitHub username
- **Password:** The Personal Access Token you just created
- **Email:** Your GitHub email

**Option B: Manual .npmrc Configuration**

Create or edit `~/.npmrc` in your home directory:

```
@anthropics:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_TOKEN_HERE
```

Replace `YOUR_TOKEN_HERE` with your Personal Access Token.

### Step 3: Install OpenNest

In your project directory:

```bash
npm install @anthropics/opennest
```

Or add to your `package.json`:

```json
{
  "devDependencies": {
    "@anthropics/opennest": "^1.0.0"
  }
}
```

### Step 4: Verify Installation

```bash
npx @anthropics/opennest --help
```

You should see the OpenNest help output.

## CI/CD Configuration

### GitHub Actions

Add a step to configure npm authentication in your workflow:

```yaml
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://npm.pkg.github.com'
          scope: '@anthropics'

      - name: Install dependencies
        run: npm ci
        env:
          NODE_AUTH_TOKEN: ${{ secrets.GPR_TOKEN }}
```

**Required Secret:**

1. Go to your repository's Settings > Secrets and variables > Actions
2. Click **New repository secret**
3. Name: `GPR_TOKEN`
4. Value: A Personal Access Token with `read:packages` scope
5. Click **Add secret**

### Other CI/CD Systems

For Jenkins, CircleCI, GitLab CI, etc., set the `NPM_TOKEN` environment variable and use this `.npmrc`:

```
@anthropics:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${NPM_TOKEN}
```

Then run `npm ci` as usual.

## Using OpenNest

### As a CLI Tool

```bash
# Generate NestJS code from an OpenAPI spec
npx @anthropics/opennest ./api-spec.yaml --output ./src/generated

# With domain-based structure
npx @anthropics/opennest ./api-spec.yaml --output ./src/generated --structure domain-based

# Show all options
npx @anthropics/opennest --help
```

### As a Library (Programmatic API)

```typescript
import { DtoGenerator, ControllerGenerator } from '@anthropics/opennest';

// Use generators programmatically
const dtoGenerator = new DtoGenerator();
// ...
```

## Troubleshooting

### Error: 404 Not Found

```
npm ERR! 404 Not Found - GET https://npm.pkg.github.com/@anthropics%2fopennest
```

**Cause:** Authentication is missing or invalid.

**Solution:**
1. Verify your token has `read:packages` scope
2. Re-run `npm login --scope=@anthropics --registry=https://npm.pkg.github.com --auth-type=legacy`
3. Verify with `npm whoami --registry=https://npm.pkg.github.com`

### Error: 401 Unauthorized

```
npm ERR! 401 Unauthorized
```

**Cause:** Token is expired or doesn't have correct permissions.

**Solution:**
1. Generate a new token with `read:packages` scope
2. Update your ~/.npmrc or re-run npm login

### Error: Unable to authenticate

```
npm ERR! code ENEEDAUTH
```

**Cause:** .npmrc is not configured correctly.

**Solution:**
1. Ensure `~/.npmrc` contains the GPR configuration
2. Check for typos in the registry URL
3. Verify token is correctly placed (no extra spaces)

### npm install works but npx doesn't

**Cause:** Binary not linked correctly.

**Solution:**
```bash
# Reinstall with verbose output
npm install @anthropics/opennest --verbose

# Or run directly from node_modules
./node_modules/.bin/opennest --help
```

## Security Best Practices

1. **Never commit tokens to git** - Use environment variables or npm login
2. **Set token expiration** - 90 days is recommended for CI tokens
3. **Use minimal scopes** - `read:packages` is sufficient for installing
4. **Rotate tokens regularly** - Set calendar reminders for expiration
5. **Use bot accounts for CI** - Create a dedicated GitHub account for CI/CD

## Getting Help

- [OpenNest Documentation](https://github.com/anthropics/opennest#readme)
- [Report Issues](https://github.com/anthropics/opennest/issues)
- [GitHub Packages Documentation](https://docs.github.com/en/packages)
