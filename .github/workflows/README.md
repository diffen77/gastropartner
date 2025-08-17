# GastroPartner CI/CD Pipeline Documentation

This directory contains comprehensive GitHub Actions workflows for the GastroPartner project, providing automated testing, quality assurance, security auditing, and deployment capabilities.

## 🔄 Workflow Overview

### 1. **CI Workflow** (`ci.yml`)
**Triggers:** Push to `main`, `staging`, `develop` | Pull requests to `main`, `staging`

**Purpose:** Comprehensive continuous integration with quality gates

**Jobs:**
- **Backend Tests** (`test-backend`)
  - Python 3.11 with UV package manager
  - Dependencies installation and caching
  - Pytest with coverage reporting
  - Ruff linting and formatting checks
  - MyPy type checking
  - Coverage upload to Codecov

- **Frontend Tests** (`test-frontend`)
  - Node.js 20 with npm caching
  - ESLint linting
  - Jest test suite with coverage
  - Production build validation
  - Bundle size analysis

- **Security Audit** (`security-audit`)
  - Backend: `pip-audit` for Python dependencies
  - Frontend: `npm audit` for Node.js dependencies
  - High-severity vulnerability detection

- **Integration Tests** (`integration-tests`)
  - Starts local backend server
  - Tests frontend build against running backend
  - Validates API connectivity
  - Full-stack integration validation

- **Performance Tests** (`performance-tests`)
  - Lighthouse CI for performance metrics
  - Core Web Vitals measurement
  - Performance regression detection

### 2. **Staging Deployment** (`deploy-staging.yml`)
**Triggers:** Push to `staging`, `develop` | Manual dispatch

**Purpose:** Automated deployment to staging environment

**Process:**
1. Deploys backend to Render staging service
2. Deploys frontend to Render staging service
3. Health checks for both services
4. Success/failure notifications

### 3. **Production Deployment** (`deploy-production.yml`)
**Triggers:** Push to `main` | Manual dispatch

**Purpose:** Controlled production deployment with safeguards

**Process:**
1. **Pre-deployment Checks**
   - Configuration validation
   - Changelog verification
   - Deployment readiness assessment

2. **Production Deployment** (Requires manual approval)
   - Environment-specific builds
   - Render production deployment
   - Extended health checks with retry logic
   - Deployment tagging

3. **Post-deployment Monitoring**
   - Monitoring setup
   - Team notifications
   - Success tracking

### 4. **E2E Tests** (`e2e-tests.yml`)
**Triggers:** Pull requests affecting frontend/backend code

**Purpose:** Comprehensive end-to-end testing with Playwright

**Features:**
- **Multi-browser Testing:** Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Full Environment Setup:** Backend server + Frontend served
- **Comprehensive Test Coverage:** Authentication, navigation, business logic
- **Rich Reporting:** HTML reports, screenshots, videos, JUnit XML
- **PR Integration:** Automatic test result comments on PRs
- **Artifact Management:** Test results, reports, and debugging materials

**Test Structure:**
```
gastropartner-test-suite/tests/e2e/
├── auth.spec.ts              # Authentication flows
├── navigation.spec.ts        # Navigation and routing  
└── recipe-management.spec.ts # Core business workflows
```

### 5. **Claude Code Review** (`claude-code-review.yml`)
**Triggers:** Pull request opened/synchronized

**Purpose:** AI-powered code review

**Features:**
- Automated code quality assessment
- Security concern detection
- Performance analysis
- Best practices validation
- Constructive feedback provision

## 🔧 Required Secrets

Configure these secrets in your GitHub repository settings:

### Render Deployment
```
RENDER_API_KEY                          # Render API key
RENDER_STAGING_BACKEND_SERVICE_ID       # Staging backend service ID
RENDER_STAGING_FRONTEND_SERVICE_ID      # Staging frontend service ID
RENDER_PRODUCTION_BACKEND_SERVICE_ID    # Production backend service ID
RENDER_PRODUCTION_FRONTEND_SERVICE_ID   # Production frontend service ID
```

### Environment URLs
```
STAGING_BACKEND_URL                     # https://api-staging.gastropartner.nu
STAGING_FRONTEND_URL                    # https://staging.gastropartner.nu
PRODUCTION_BACKEND_URL                  # https://api.gastropartner.nu
PRODUCTION_FRONTEND_URL                 # https://gastropartner.nu
```

### Supabase Configuration
```
STAGING_SUPABASE_URL                    # Staging Supabase project URL
STAGING_SUPABASE_ANON_KEY              # Staging Supabase anonymous key
PRODUCTION_SUPABASE_URL                 # Production Supabase project URL
PRODUCTION_SUPABASE_ANON_KEY           # Production Supabase anonymous key
```

### Claude Code Review
```
CLAUDE_CODE_OAUTH_TOKEN                 # Claude Code OAuth token
```

### Optional Integrations
```
VERCEL_TOKEN                           # If using Vercel for frontend
VERCEL_ORG_ID                          # Vercel organization ID
VERCEL_PROJECT_ID                      # Vercel project ID
```

## 🚀 Deployment Strategy

### Branch Strategy
```
main (production)     ← Production deployments
  ↑
staging               ← Staging deployments + testing
  ↑
develop               ← Development integration
  ↑
feature/*             ← Feature development
```

### Deployment Flow
1. **Development:** Feature branches → `develop`
2. **Testing:** `develop` → `staging` (automatic deployment)
3. **Production:** `staging` → `main` → production (manual approval required)

## 📊 Quality Gates

### Automated Checks
- ✅ **Unit Tests:** Backend (pytest) + Frontend (Jest)
- ✅ **End-to-End Tests:** Playwright multi-browser testing
- ✅ **Linting:** Ruff (Python) + ESLint (TypeScript)
- ✅ **Type Checking:** MyPy (Python) + TypeScript
- ✅ **Security Audit:** pip-audit + npm audit
- ✅ **Integration Tests:** Full-stack connectivity
- ✅ **Performance Tests:** Lighthouse CI
- ✅ **Code Review:** Claude AI analysis

### Coverage Requirements
- **Backend:** Minimum 80% code coverage
- **Frontend:** Minimum 80% code coverage
- **Critical Paths:** 100% coverage required

## 🔒 Security Features

### Dependency Scanning
- **Python:** `pip-audit` scans for known vulnerabilities
- **Node.js:** `npm audit` checks package security
- **Automated:** Runs on every commit and PR

### Access Control
- **Production Environment:** Requires manual approval
- **Secrets Management:** GitHub Secrets for sensitive data
- **Branch Protection:** Required status checks

## 📈 Monitoring and Observability

### CI/CD Metrics
- **Build Success Rate:** Track deployment reliability
- **Test Coverage:** Maintain quality standards
- **Security Scan Results:** Monitor vulnerability trends
- **Performance Metrics:** Track Core Web Vitals

### Deployment Tracking
- **Deployment Tags:** Automatic tagging on production deploys
- **Health Checks:** Automated post-deployment validation
- **Rollback Capability:** Quick revert mechanisms

## 🛠️ Local Development

### Running Tests Locally

**Backend:**
```bash
cd gastropartner-backend
uv sync --all-extras
uv run pytest --cov=src
uv run ruff check .
uv run mypy src/
```

**Frontend:**
```bash
cd gastropartner-frontend
npm ci
npm test
npm run lint
npm run build

# E2E Tests (requires both backend and frontend running)
npm run playwright:install  # First time only
npm run test:e2e
npm run test:e2e:ui  # Interactive mode
```

### Simulating CI Environment

**Start local integration test:**
```bash
# Terminal 1: Start backend
cd gastropartner-backend
uv run uvicorn gastropartner.main:app --reload

# Terminal 2: Test frontend against local backend
cd gastropartner-frontend
REACT_APP_API_URL=http://localhost:8000 npm start
```

## 🚨 Troubleshooting

### Common Issues

**1. Build Failures**
- Check dependency versions in `uv.lock` and `package-lock.json`
- Verify environment variables are set correctly
- Review test failures in GitHub Actions logs

**2. Deployment Failures**
- Verify Render service IDs are correct
- Check that secrets are properly configured
- Ensure health check endpoints are accessible

**3. Test Failures**
- Run tests locally to reproduce issues
- Check for environment-specific configurations
- Verify mock data and test fixtures

### Debug Commands

**Check workflow status:**
```bash
gh run list --workflow=ci.yml
gh run view <run-id> --log
```

**Manual deployment trigger:**
```bash
gh workflow run deploy-staging.yml
gh workflow run deploy-production.yml
```

## 📚 Best Practices

### Code Quality
- All PRs must pass CI checks
- Maintain test coverage above 80%
- Follow linting and formatting standards
- Include meaningful commit messages

### Security
- Regular dependency updates
- Security audit monitoring
- Secrets rotation schedule
- Branch protection enforcement

### Performance
- Monitor bundle sizes
- Regular Lighthouse audits
- Performance regression alerts
- Optimization tracking

---

**Last Updated:** August 2024  
**Maintainer:** GastroPartner Development Team

For questions or improvements to this CI/CD pipeline, please create an issue or submit a pull request.