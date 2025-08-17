# Performance Testing Setup for GastroPartner

This directory contains K6 performance testing scripts and configuration for the GastroPartner API.

## 🚀 Quick Start

### 1. Install K6

```bash
# macOS
brew install k6

# Ubuntu/Debian
curl -s https://raw.githubusercontent.com/grafana/k6/master/scripts/get.sh | sudo bash

# Windows
choco install k6

# Docker
docker run --rm -i grafana/k6 run - <script.js
```

### 2. Run Tests

```bash
# Basic load test (recommended for development)
k6 run basic-load-test.js

# Stress test (identify breaking points)
k6 run stress-test.js

# Database performance test
k6 run database-performance.js

# Run with custom environment
API_BASE_URL=http://localhost:8000 k6 run basic-load-test.js

# Run against staging
API_BASE_URL=https://gastropartner-backend-staging.onrender.com k6 run basic-load-test.js
```

### 3. Environment Variables

Create a `.env` file or set environment variables:

```bash
# API Configuration
export API_BASE_URL="http://localhost:8000"
export API_AUTH_TOKEN=""  # Optional authentication token

# Alert Configuration
export SLACK_WEBHOOK_URL=""  # Slack alerts
export ALERT_EMAIL=""        # Email alerts
export ALERT_WEBHOOK_URL=""  # Custom webhook for alerts

# Test Configuration
export TEST_NAME="gastropartner-performance-test"
export ENVIRONMENT="development"
```

## 📊 Test Scripts

### basic-load-test.js
- **Purpose**: Light load testing for smoke tests
- **VUs**: 2 virtual users
- **Duration**: 2 minutes
- **Target**: Validate basic functionality under light load
- **Schedule**: Run before deployments

### stress-test.js
- **Purpose**: Identify system breaking points
- **VUs**: Ramps from 10 to 100 users
- **Duration**: 21 minutes with various load stages
- **Target**: Find maximum capacity and failure modes
- **Schedule**: Run weekly or before major releases

### database-performance.js
- **Purpose**: Monitor database query performance
- **VUs**: 15 virtual users
- **Duration**: 10 minutes
- **Target**: Detect slow queries and N+1 problems
- **Schedule**: Run daily

## 🎯 Performance Baselines

Current performance targets:

| Metric | Target | Critical Threshold |
|--------|--------|--------------------|
| API Response Time (P95) | <200ms | >500ms |
| API Response Time (P99) | <500ms | >1000ms |
| Error Rate | <1% | >5% |
| Database Query Time (P95) | <300ms | >800ms |
| Bundle Size | <2MB | >3MB |

## 📈 Metrics and Monitoring

### K6 Metrics
- `http_req_duration`: Request response time
- `http_req_failed`: Request failure rate
- `http_reqs`: Total requests per second
- `vus`: Virtual users active
- `vus_max`: Maximum virtual users
- `iterations`: Total iterations completed

### Custom Metrics
- `error_rate`: Application-specific error tracking
- `response_time`: Enhanced response time tracking
- `db_query_time`: Database query performance
- `slow_queries`: Count of queries >500ms

### Alerts
Performance degradation alerts are triggered when:
- Response time increases >20% from baseline (Warning)
- Response time increases >50% from baseline (Critical)
- Error rate exceeds 2% (Warning) or 5% (Critical)
- Database queries exceed 800ms P95 (Critical)

## 🔧 Configuration

### config.js
Central configuration for all tests including:
- Base URLs for different environments
- Performance thresholds and SLAs
- Test scenarios and load patterns
- Alert configuration
- API endpoints to test

### utils.js
Utility functions for:
- HTTP request handling with metrics
- Response validation and assertions
- Test data generation
- Alert dispatch
- Performance monitoring

## 📋 CI/CD Integration

### GitHub Actions Example

```yaml
name: Performance Testing
on:
  push:
    branches: [main, staging]
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Install K6
        run: |
          curl -s https://raw.githubusercontent.com/grafana/k6/master/scripts/get.sh | sudo bash
      
      - name: Run Performance Tests
        env:
          API_BASE_URL: ${{ secrets.API_BASE_URL }}
          SLACK_WEBHOOK_URL: ${{ secrets.SLACK_WEBHOOK_URL }}
        run: |
          cd gastropartner-backend/performance
          k6 run basic-load-test.js
          
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: reports/
```

### Render Deployment Hook

```bash
# Add to render.yaml build command
npm run test:performance || echo "Performance tests completed with warnings"
```

## 🚨 Alerting

### Slack Integration
Configure Slack webhook for real-time alerts:

```bash
export SLACK_WEBHOOK_URL="https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK"
```

Alert types:
- 🚨 **Critical**: Service degradation >50%, error rate >5%
- ⚠️ **Warning**: Performance degradation >20%, error rate >2%
- ℹ️ **Info**: Test completion, baseline updates

### Email Alerts
Configure email notifications:

```bash
export ALERT_EMAIL="team@gastropartner.com"
```

### Custom Webhooks
Integrate with monitoring systems:

```bash
export ALERT_WEBHOOK_URL="https://your-monitoring-system.com/webhooks/alerts"
```

## 📊 Bundle Size Monitoring

Frontend performance monitoring with bundle analysis:

```bash
# Run frontend bundle analysis
cd gastropartner-frontend
npm run build
node performance/bundle-analyzer.js

# Integrate with performance monitoring
node ../../performance-monitoring.js
```

## 🎛️ Advanced Configuration

### Load Test Scenarios

Customize load patterns in `config.js`:

```javascript
scenarios: {
  // Gradual ramp-up
  ramp_up: {
    executor: 'ramping-vus',
    stages: [
      { duration: '5m', target: 50 },
      { duration: '10m', target: 50 },
      { duration: '5m', target: 0 },
    ],
  },
  
  // Constant load
  steady_load: {
    executor: 'constant-vus',
    vus: 20,
    duration: '30m',
  },
  
  // Spike testing
  spike_test: {
    executor: 'ramping-vus',
    stages: [
      { duration: '1m', target: 200 },
      { duration: '2m', target: 200 },
      { duration: '1m', target: 0 },
    ],
  },
}
```

### Custom Thresholds

```javascript
thresholds: {
  // Custom SLA requirements
  'http_req_duration{name:auth_login}': ['p(95)<300'],
  'http_req_duration{name:ingredients_list}': ['p(95)<200'],
  'http_req_failed{name:critical_endpoints}': ['rate<0.001'],
  
  // Database-specific thresholds
  'db_query_time': ['p(95)<300', 'p(99)<800'],
  'slow_queries': ['count<10'],
}
```

## 🔍 Troubleshooting

### Common Issues

**K6 not found**:
```bash
# Verify installation
k6 version
# Reinstall if needed
brew reinstall k6
```

**High error rates**:
- Check API server is running
- Verify authentication tokens
- Review rate limiting settings
- Check database connectivity

**Slow response times**:
- Monitor database query performance
- Check for N+1 query patterns
- Review API server resources
- Analyze network latency

**Bundle size alerts**:
- Run `npm run analyze` to identify large dependencies
- Implement code splitting for large components
- Optimize images and assets
- Review third-party library usage

### Debug Mode

Run tests with verbose output:

```bash
# Enable debug logging
K6_LOG_LEVEL=debug k6 run basic-load-test.js

# Save detailed output
k6 run --out json=results.json basic-load-test.js
```

## 📚 Resources

- [K6 Documentation](https://grafana.com/docs/k6/)
- [Performance Testing Best Practices](https://grafana.com/docs/k6/latest/testing-guides/)
- [Render Performance Monitoring](https://render.com/docs/monitoring)
- [Web Performance Metrics](https://web.dev/metrics/)

## 🤝 Contributing

To add new performance tests:

1. Create test script in `performance/` directory
2. Follow naming convention: `{purpose}-test.js`
3. Add configuration to `config.js`
4. Update this README with test description
5. Include in CI/CD pipeline if appropriate

Performance testing is critical for maintaining service quality. All changes should maintain or improve performance baselines.