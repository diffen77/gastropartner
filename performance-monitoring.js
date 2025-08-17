/**
 * Performance Monitoring and Alerting System
 * Comprehensive performance monitoring with baseline tracking and alerting
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  // Performance baselines (in milliseconds)
  baselines: {
    api_response_time: 200,
    page_load_time: 3000,
    first_contentful_paint: 1500,
    largest_contentful_paint: 2500,
    cumulative_layout_shift: 0.1,
    first_input_delay: 100,
  },
  
  // Alert thresholds (percentage degradation)
  alertThresholds: {
    warning: 0.20,   // 20% slower than baseline
    critical: 0.50,  // 50% slower than baseline
  },
  
  // Monitoring endpoints
  endpoints: [
    { name: 'health', url: '/health', baseline: 100, critical: true },
    { name: 'auth_login', url: '/api/v1/auth/login', baseline: 300, critical: true },
    { name: 'ingredients_list', url: '/api/v1/ingredients/', baseline: 200, critical: false },
    { name: 'recipes_list', url: '/api/v1/recipes/', baseline: 250, critical: false },
    { name: 'menu_items_list', url: '/api/v1/menu-items/', baseline: 200, critical: false },
    { name: 'organizations_list', url: '/api/v1/organizations/', baseline: 150, critical: false },
  ],
  
  // K6 test configurations
  k6Tests: {
    smoke: {
      script: 'performance/basic-load-test.js',
      schedule: '*/30 * * * *', // Every 30 minutes
    },
    load: {
      script: 'performance/stress-test.js',
      schedule: '0 */4 * * *', // Every 4 hours
    },
    database: {
      script: 'performance/database-performance.js',
      schedule: '0 2 * * *', // Daily at 2 AM
    },
  },
  
  // Alert channels
  alerts: {
    slack: {
      enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
      webhook: process.env.SLACK_WEBHOOK_URL || '',
      channel: '#alerts',
    },
    email: {
      enabled: process.env.ALERT_EMAIL ? true : false,
      recipient: process.env.ALERT_EMAIL || '',
    },
    console: {
      enabled: true,
    },
  },
  
  // Data storage
  dataDir: 'reports/performance',
  historyFile: 'reports/performance/history.json',
  baselinesFile: 'reports/performance/baselines.json',
};

/**
 * Performance monitoring class
 */
class PerformanceMonitor {
  constructor() {
    this.ensureDirectories();
    this.loadBaselines();
    this.loadHistory();
  }
  
  /**
   * Run comprehensive performance monitoring
   */
  async runMonitoring() {
    console.log('🚀 Starting performance monitoring...');
    
    const results = {
      timestamp: new Date().toISOString(),
      tests: {},
      alerts: [],
      summary: {},
    };
    
    try {
      // Run K6 smoke test
      console.log('📊 Running K6 smoke test...');
      results.tests.smoke = await this.runK6Test('smoke');
      
      // Run frontend bundle analysis
      console.log('📦 Analyzing frontend bundle...');
      results.tests.bundle = await this.analyzeFrontendBundle();
      
      // Check database performance
      console.log('🗄️ Checking database performance...');
      results.tests.database = await this.runK6Test('database');
      
      // Analyze results and generate alerts
      console.log('🔍 Analyzing results...');
      this.analyzeResults(results);
      
      // Save results
      this.saveResults(results);
      
      // Send alerts if needed
      await this.sendAlerts(results.alerts);
      
      // Generate summary report
      this.generateSummaryReport(results);
      
    } catch (error) {
      console.error('❌ Performance monitoring failed:', error.message);
      results.error = error.message;
      
      // Send critical alert
      await this.sendAlert({
        level: 'critical',
        title: 'Performance Monitoring Failed',
        message: `Performance monitoring system encountered an error: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
    
    return results;
  }
  
  /**
   * Run K6 performance test
   */
  async runK6Test(testType) {
    const testConfig = config.k6Tests[testType];
    if (!testConfig) {
      throw new Error(`Unknown test type: ${testType}`);
    }
    
    const scriptPath = path.join(process.cwd(), 'gastropartner-backend', testConfig.script);
    
    if (!fs.existsSync(scriptPath)) {
      throw new Error(`K6 script not found: ${scriptPath}`);
    }
    
    try {
      const command = `k6 run --out json=reports/performance/k6-${testType}-results.json ${scriptPath}`;
      const output = execSync(command, { 
        encoding: 'utf8',
        timeout: 600000, // 10 minutes timeout
      });
      
      // Parse K6 results
      const resultsFile = `reports/performance/k6-${testType}-results.json`;
      if (fs.existsSync(resultsFile)) {
        const results = this.parseK6Results(resultsFile);
        results.testType = testType;
        results.output = output;
        return results;
      }
      
      return { testType, status: 'completed', output };
      
    } catch (error) {
      return {
        testType,
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  /**
   * Parse K6 JSON results
   */
  parseK6Results(resultsFile) {
    const lines = fs.readFileSync(resultsFile, 'utf8').split('\n').filter(line => line.trim());
    const metrics = {};
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        if (data.type === 'Point' && data.metric) {
          if (!metrics[data.metric]) {
            metrics[data.metric] = [];
          }
          metrics[data.metric].push(data.data.value);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
    
    // Calculate aggregated metrics
    const aggregated = {};
    for (const [metric, values] of Object.entries(metrics)) {
      if (values.length > 0) {
        aggregated[metric] = {
          min: Math.min(...values),
          max: Math.max(...values),
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          p95: this.percentile(values, 95),
          p99: this.percentile(values, 99),
          count: values.length,
        };
      }
    }
    
    return {
      status: 'completed',
      metrics: aggregated,
      raw: metrics,
    };
  }
  
  /**
   * Analyze frontend bundle
   */
  async analyzeFrontendBundle() {
    try {
      const bundleAnalyzer = require('./gastropartner-frontend/performance/bundle-analyzer.js');
      const analysis = bundleAnalyzer.analyzeBundleSize();
      
      return {
        status: 'completed',
        totalSize: analysis.totalSize,
        assetCount: analysis.assets.length,
        warnings: analysis.warnings,
        recommendations: analysis.recommendations,
        comparison: analysis.comparison,
      };
      
    } catch (error) {
      return {
        status: 'failed',
        error: error.message,
      };
    }
  }
  
  /**
   * Analyze results and generate alerts
   */
  analyzeResults(results) {
    const alerts = [];
    
    // Analyze K6 smoke test results
    if (results.tests.smoke && results.tests.smoke.metrics) {
      const smokeAlerts = this.analyzeK6Metrics(results.tests.smoke.metrics, 'smoke');
      alerts.push(...smokeAlerts);
    }
    
    // Analyze database performance
    if (results.tests.database && results.tests.database.metrics) {
      const dbAlerts = this.analyzeK6Metrics(results.tests.database.metrics, 'database');
      alerts.push(...dbAlerts);
    }
    
    // Analyze bundle size
    if (results.tests.bundle) {
      const bundleAlerts = this.analyzeBundleResults(results.tests.bundle);
      alerts.push(...bundleAlerts);
    }
    
    results.alerts = alerts;
    
    // Generate summary
    results.summary = {
      totalAlerts: alerts.length,
      criticalAlerts: alerts.filter(a => a.level === 'critical').length,
      warningAlerts: alerts.filter(a => a.level === 'warning').length,
      overallStatus: alerts.some(a => a.level === 'critical') ? 'critical' : 
                     alerts.some(a => a.level === 'warning') ? 'warning' : 'healthy',
    };
  }
  
  /**
   * Analyze K6 metrics
   */
  analyzeK6Metrics(metrics, testType) {
    const alerts = [];
    
    // Check HTTP request duration
    if (metrics.http_req_duration) {
      const p95 = metrics.http_req_duration.p95;
      const baseline = config.baselines.api_response_time;
      
      const degradation = (p95 - baseline) / baseline;
      
      if (degradation > config.alertThresholds.critical) {
        alerts.push({
          level: 'critical',
          title: `Critical API Performance Degradation (${testType})`,
          message: `API response time P95 (${p95.toFixed(0)}ms) is ${(degradation * 100).toFixed(1)}% slower than baseline (${baseline}ms)`,
          metric: 'http_req_duration',
          value: p95,
          baseline,
          degradation,
          timestamp: new Date().toISOString(),
        });
      } else if (degradation > config.alertThresholds.warning) {
        alerts.push({
          level: 'warning',
          title: `API Performance Degradation (${testType})`,
          message: `API response time P95 (${p95.toFixed(0)}ms) is ${(degradation * 100).toFixed(1)}% slower than baseline (${baseline}ms)`,
          metric: 'http_req_duration',
          value: p95,
          baseline,
          degradation,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    // Check error rate
    if (metrics.http_req_failed) {
      const errorRate = metrics.http_req_failed.avg;
      
      if (errorRate > 0.05) { // 5% error rate
        alerts.push({
          level: 'critical',
          title: `High Error Rate (${testType})`,
          message: `HTTP request failure rate (${(errorRate * 100).toFixed(2)}%) exceeds threshold (5%)`,
          metric: 'http_req_failed',
          value: errorRate,
          threshold: 0.05,
          timestamp: new Date().toISOString(),
        });
      } else if (errorRate > 0.02) { // 2% error rate
        alerts.push({
          level: 'warning',
          title: `Elevated Error Rate (${testType})`,
          message: `HTTP request failure rate (${(errorRate * 100).toFixed(2)}%) is elevated (threshold: 2%)`,
          metric: 'http_req_failed',
          value: errorRate,
          threshold: 0.02,
          timestamp: new Date().toISOString(),
        });
      }
    }
    
    return alerts;
  }
  
  /**
   * Analyze bundle results
   */
  analyzeBundleResults(bundleResults) {
    const alerts = [];
    
    if (bundleResults.status === 'failed') {
      alerts.push({
        level: 'critical',
        title: 'Bundle Analysis Failed',
        message: `Frontend bundle analysis failed: ${bundleResults.error}`,
        timestamp: new Date().toISOString(),
      });
      return alerts;
    }
    
    // Check for critical bundle size
    const maxBundleSize = 2 * 1024 * 1024; // 2MB
    if (bundleResults.totalSize > maxBundleSize) {
      alerts.push({
        level: 'critical',
        title: 'Bundle Size Exceeded',
        message: `Frontend bundle size (${this.formatBytes(bundleResults.totalSize)}) exceeds maximum (${this.formatBytes(maxBundleSize)})`,
        metric: 'bundle_size',
        value: bundleResults.totalSize,
        threshold: maxBundleSize,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Check for bundle size increase
    if (bundleResults.comparison && bundleResults.comparison.significantChange && bundleResults.comparison.sizeIncreased) {
      const level = bundleResults.comparison.percentChange > 30 ? 'critical' : 'warning';
      alerts.push({
        level,
        title: 'Bundle Size Increased',
        message: `Frontend bundle size increased by ${bundleResults.comparison.percentChange.toFixed(1)}% (${this.formatBytes(bundleResults.comparison.sizeDiff)})`,
        metric: 'bundle_size_change',
        value: bundleResults.comparison.percentChange,
        threshold: 20,
        timestamp: new Date().toISOString(),
      });
    }
    
    return alerts;
  }
  
  /**
   * Send alerts to configured channels
   */
  async sendAlerts(alerts) {
    if (alerts.length === 0) return;
    
    for (const alert of alerts) {
      await this.sendAlert(alert);
    }
  }
  
  /**
   * Send individual alert
   */
  async sendAlert(alert) {
    // Console alert
    if (config.alerts.console.enabled) {
      const emoji = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
      console.log(`${emoji} [${alert.level.toUpperCase()}] ${alert.title}: ${alert.message}`);
    }
    
    // Slack alert
    if (config.alerts.slack.enabled) {
      try {
        await this.sendSlackAlert(alert);
      } catch (error) {
        console.error('Failed to send Slack alert:', error.message);
      }
    }
    
    // Email alert (would require email service integration)
    if (config.alerts.email.enabled) {
      console.log(`📧 Email alert would be sent to: ${config.alerts.email.recipient}`);
      console.log(`Subject: [${alert.level.toUpperCase()}] ${alert.title}`);
      console.log(`Body: ${alert.message}`);
    }
  }
  
  /**
   * Send Slack alert
   */
  async sendSlackAlert(alert) {
    const webhook = config.alerts.slack.webhook;
    if (!webhook) return;
    
    const color = alert.level === 'critical' ? 'danger' : alert.level === 'warning' ? 'warning' : 'good';
    const emoji = alert.level === 'critical' ? '🚨' : alert.level === 'warning' ? '⚠️' : 'ℹ️';
    
    const payload = {
      channel: config.alerts.slack.channel,
      username: 'Performance Monitor',
      icon_emoji: ':chart_with_upwards_trend:',
      attachments: [{
        color,
        title: `${emoji} ${alert.title}`,
        text: alert.message,
        fields: [
          {
            title: 'Level',
            value: alert.level.toUpperCase(),
            short: true,
          },
          {
            title: 'Time',
            value: new Date(alert.timestamp).toLocaleString(),
            short: true,
          },
        ],
        footer: 'GastroPartner Performance Monitor',
        ts: Math.floor(Date.parse(alert.timestamp) / 1000),
      }],
    };
    
    if (alert.metric) {
      payload.attachments[0].fields.push({
        title: 'Metric',
        value: alert.metric,
        short: true,
      });
    }
    
    if (alert.value !== undefined) {
      payload.attachments[0].fields.push({
        title: 'Value',
        value: typeof alert.value === 'number' ? alert.value.toFixed(2) : alert.value,
        short: true,
      });
    }
    
    // Send to Slack (would require HTTP client)
    console.log('Slack webhook payload:', JSON.stringify(payload, null, 2));
  }
  
  /**
   * Generate summary report
   */
  generateSummaryReport(results) {
    console.log(`
📊 Performance Monitoring Summary
Generated: ${results.timestamp}

🎯 Overall Status: ${results.summary.overallStatus.toUpperCase()}
📈 Total Alerts: ${results.summary.totalAlerts}
  - Critical: ${results.summary.criticalAlerts}
  - Warning: ${results.summary.warningAlerts}

🧪 Test Results:
${Object.entries(results.tests).map(([testType, result]) => {
  if (result.status === 'completed') {
    return `  ✅ ${testType}: Completed successfully`;
  } else {
    return `  ❌ ${testType}: ${result.error || 'Failed'}`;
  }
}).join('\n')}

${results.alerts.length > 0 ? `🚨 Active Alerts:
${results.alerts.map((alert, index) => 
  `  ${index + 1}. [${alert.level.toUpperCase()}] ${alert.title}`
).join('\n')}` : '✅ No alerts detected'}

📄 Full report saved to: ${config.dataDir}/monitoring-report-${Date.now()}.json
    `);
  }
  
  /**
   * Utility methods
   */
  ensureDirectories() {
    const dirs = [config.dataDir, path.dirname(config.historyFile), path.dirname(config.baselinesFile)];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
  }
  
  loadBaselines() {
    try {
      if (fs.existsSync(config.baselinesFile)) {
        const baselines = JSON.parse(fs.readFileSync(config.baselinesFile, 'utf8'));
        Object.assign(config.baselines, baselines);
      }
    } catch (error) {
      console.warn('Failed to load baselines:', error.message);
    }
  }
  
  loadHistory() {
    // Implementation for loading historical data
  }
  
  saveResults(results) {
    const filename = `monitoring-report-${Date.now()}.json`;
    const filepath = path.join(config.dataDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  }
  
  percentile(values, p) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((p / 100) * sorted.length) - 1;
    return sorted[index];
  }
  
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

/**
 * Main execution
 */
async function main() {
  const monitor = new PerformanceMonitor();
  const results = await monitor.runMonitoring();
  
  // Exit with appropriate code
  if (results.summary && results.summary.criticalAlerts > 0) {
    process.exit(1);
  }
  
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Performance monitoring failed:', error);
    process.exit(1);
  });
}

module.exports = { PerformanceMonitor, config };