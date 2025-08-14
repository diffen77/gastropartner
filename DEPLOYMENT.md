# GastroPartner Deployment Guide

This document describes the complete CI/CD pipeline and deployment process for GastroPartner.

## 🌊 Deployment Flow

```
develop → staging → main → production
```

### Branch Strategy
- `develop` - Active development branch
- `staging` - Staging environment deployment
- `main` - Production-ready code

## 🔄 Automated CI/CD Pipeline

### 1. Continuous Integration (`.github/workflows/ci.yml`)

**Triggers:**
- Push to `main`, `staging`, or `develop` branches
- Pull requests to `main` or `staging`

**Jobs:**
- **Backend Testing**: Python 3.11 + UV package manager
  - Dependency caching with UV
  - Test execution with coverage
  - Ruff linting and formatting
  - MyPy type checking
  - Coverage upload to Codecov

- **Frontend Testing**: Node.js 20
  - NPM dependency caching
  - ESLint linting
  - Jest testing with coverage
  - Production build verification
  - Bundle size analysis

- **Security Audit**: 
  - Backend: pip-audit for Python dependencies
  - Frontend: npm audit for Node dependencies

### 2. Staging Deployment (`.github/workflows/deploy-staging.yml`)

**Triggers:**
- Push to `staging` or `develop` branches
- Manual workflow dispatch

**Process:**
1. Deploy backend to Render staging service
2. Deploy frontend to Render staging service
3. Health check both services
4. Notify deployment status

## 🏗️ Infrastructure

### Production Environment (`render.yaml`)
- **Backend**: Python web service on Render
- **Frontend**: Static site on Render
- **Region**: Frankfurt
- **Plan**: Starter tier
- **Database**: Supabase (managed separately)

### Staging Environment (`render-staging.yaml`)
- **Backend**: Separate staging service
- **Frontend**: Separate staging static site
- **Environment**: Staging-specific configuration
- **Debugging**: Source maps enabled

## 📝 Environment Variables

### Backend Variables
```env
# Required for all environments
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key

# Environment-specific
ENVIRONMENT=production|staging|development
LOG_LEVEL=INFO|DEBUG
```

### Frontend Variables
```env
# Required for all environments
REACT_APP_API_URL=https://your-backend-url
REACT_APP_ENV=production|staging|development

# Build configuration
NODE_ENV=production
GENERATE_SOURCEMAP=true|false
```

## 🚀 Deployment Setup

### 1. Render Configuration

#### Production Setup
1. Connect GitHub repository to Render
2. Use `render.yaml` for automatic service configuration
3. Set environment variables in Render dashboard
4. Enable auto-deploy from `main` branch

#### Staging Setup
1. Create separate staging services in Render
2. Use `render-staging.yaml` configuration
3. Set staging environment variables
4. Enable auto-deploy from `staging` branch

### 2. GitHub Secrets

Add these secrets to your GitHub repository:

```
RENDER_API_KEY=your_render_api_key
RENDER_STAGING_BACKEND_SERVICE_ID=service_id
RENDER_STAGING_FRONTEND_SERVICE_ID=service_id
STAGING_BACKEND_URL=https://your-staging-backend-url
STAGING_FRONTEND_URL=https://your-staging-frontend-url
```

### 3. Supabase Projects

- **Production**: Main Supabase project
- **Staging**: Separate Supabase project for staging
- **Development**: Local Supabase or remote development project

## 🧪 Testing Strategy

### Automated Testing
- **Unit Tests**: Both backend (pytest) and frontend (Jest)
- **Integration Tests**: API endpoint testing
- **Type Checking**: MyPy for Python, TypeScript for frontend
- **Code Quality**: Ruff for Python, ESLint for TypeScript
- **Security**: Dependency auditing for vulnerabilities

### Manual Testing
- **Staging Environment**: Manual testing before production release
- **Feature Testing**: Test new features in isolation
- **User Acceptance**: Business stakeholder approval

## 🔍 Monitoring & Health Checks

### Health Endpoints
- Backend: `GET /health` - API health and database connectivity
- Frontend: Standard HTTP 200 response

### Monitoring
- **Render Dashboard**: Service health and metrics
- **Supabase Dashboard**: Database performance and usage
- **GitHub Actions**: CI/CD pipeline status
- **Codecov**: Code coverage trends

## 📋 Deployment Checklist

### Before Deploying to Production
- [ ] All CI tests pass
- [ ] Code review completed
- [ ] Staging deployment tested
- [ ] Environment variables updated
- [ ] Database migrations applied
- [ ] Performance testing completed
- [ ] Security audit clean

### Production Deployment
- [ ] Merge to `main` branch
- [ ] Auto-deployment triggered
- [ ] Health checks pass
- [ ] Smoke testing completed
- [ ] Monitor error rates
- [ ] Rollback plan ready

## 🚨 Rollback Strategy

### Automatic Rollback
- Health check failures trigger deployment failure
- Render automatic rollback to previous version

### Manual Rollback
1. Revert problematic commit
2. Push to `main` branch
3. Auto-deployment fixes issue
4. Alternative: Manual rollback via Render dashboard

## 💡 Best Practices

### Development Workflow
1. Create feature branch from `develop`
2. Write tests for new features
3. Submit PR to `develop`
4. Code review and CI validation
5. Merge to `develop`
6. Deploy to staging for testing
7. Merge to `main` for production

### Security
- Never commit secrets to repository
- Use environment variables for configuration
- Regular dependency updates
- Security audit monitoring
- SSL/HTTPS everywhere

### Performance
- Bundle size monitoring
- Database query optimization
- CDN usage for static assets
- Image optimization
- Caching strategies

## 🔧 Troubleshooting

### Common Issues
- **Build Failures**: Check dependency versions and lockfiles
- **Deploy Failures**: Verify environment variables and secrets
- **Health Check Failures**: Check database connectivity and service dependencies
- **Frontend Build Issues**: Clear node_modules and npm cache

### Support Resources
- Render Documentation: https://render.com/docs
- Supabase Documentation: https://supabase.com/docs
- GitHub Actions: https://docs.github.com/actions