/**
 * Frontend Bundle Size Analysis and Monitoring
 * Tracks bundle size, identifies large dependencies, and monitors performance
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const config = {
  buildDir: 'build',
  thresholds: {
    maxBundleSize: 2 * 1024 * 1024, // 2MB max total
    maxChunkSize: 500 * 1024,       // 500KB max per chunk
    maxAssetSize: 100 * 1024,       // 100KB max per asset
  },
  alerts: {
    sizeIncrease: 0.20, // Alert if bundle grows by >20%
    newLargeAssets: 50 * 1024, // Alert for new assets >50KB
  },
  reportPath: 'reports/bundle-analysis.json',
  historyPath: 'reports/bundle-history.json',
};

/**
 * Analyze bundle size and generate report
 */
function analyzeBundleSize() {
  console.log('🔍 Analyzing frontend bundle size...');
  
  const buildPath = path.join(process.cwd(), config.buildDir);
  
  if (!fs.existsSync(buildPath)) {
    console.error('❌ Build directory not found. Please run npm run build first.');
    process.exit(1);
  }
  
  const analysis = {
    timestamp: new Date().toISOString(),
    totalSize: 0,
    assets: [],
    chunks: {},
    dependencies: {},
    warnings: [],
    recommendations: [],
  };
  
  // Analyze all files in build directory
  analyzeDirectory(buildPath, buildPath, analysis);
  
  // Calculate totals and identify issues
  processAnalysis(analysis);
  
  // Compare with previous analysis
  const previousAnalysis = loadPreviousAnalysis();
  if (previousAnalysis) {
    compareWithPrevious(analysis, previousAnalysis);
  }
  
  // Generate recommendations
  generateRecommendations(analysis);
  
  // Save analysis
  saveAnalysis(analysis);
  
  // Generate report
  generateReport(analysis);
  
  return analysis;
}

/**
 * Recursively analyze directory contents
 */
function analyzeDirectory(dirPath, basePath, analysis) {
  const items = fs.readdirSync(dirPath);
  
  for (const item of items) {
    const itemPath = path.join(dirPath, item);
    const relativePath = path.relative(basePath, itemPath);
    const stats = fs.statSync(itemPath);
    
    if (stats.isDirectory()) {
      analyzeDirectory(itemPath, basePath, analysis);
    } else if (stats.isFile()) {
      const asset = analyzeAsset(itemPath, relativePath, stats);
      analysis.assets.push(asset);
      analysis.totalSize += asset.size;
      
      // Categorize by type
      if (asset.type === 'js') {
        analysis.chunks[asset.name] = asset;
      }
    }
  }
}

/**
 * Analyze individual asset
 */
function analyzeAsset(filePath, relativePath, stats) {
  const ext = path.extname(filePath).toLowerCase();
  const name = path.basename(filePath);
  const size = stats.size;
  
  const asset = {
    name,
    path: relativePath,
    size,
    sizeFormatted: formatBytes(size),
    type: getAssetType(ext),
    gzipSize: null,
    isLarge: size > config.thresholds.maxAssetSize,
  };
  
  // Calculate gzip size for text assets
  if (['js', 'css', 'html'].includes(asset.type)) {
    try {
      const gzipSize = execSync(`gzip -c "${filePath}" | wc -c`, { encoding: 'utf8' });
      asset.gzipSize = parseInt(gzipSize.trim());
      asset.gzipSizeFormatted = formatBytes(asset.gzipSize);
      asset.compressionRatio = asset.gzipSize / asset.size;
    } catch (error) {
      console.warn(`Failed to calculate gzip size for ${relativePath}: ${error.message}`);
    }
  }
  
  return asset;
}

/**
 * Get asset type from extension
 */
function getAssetType(ext) {
  const typeMap = {
    '.js': 'js',
    '.css': 'css',
    '.html': 'html',
    '.png': 'image',
    '.jpg': 'image',
    '.jpeg': 'image',
    '.gif': 'image',
    '.svg': 'image',
    '.webp': 'image',
    '.woff': 'font',
    '.woff2': 'font',
    '.ttf': 'font',
    '.eot': 'font',
    '.json': 'data',
    '.txt': 'text',
    '.md': 'text',
  };
  
  return typeMap[ext] || 'other';
}

/**
 * Process analysis results
 */
function processAnalysis(analysis) {
  // Sort assets by size
  analysis.assets.sort((a, b) => b.size - a.size);
  
  // Check thresholds
  if (analysis.totalSize > config.thresholds.maxBundleSize) {
    analysis.warnings.push({
      type: 'bundle_size',
      message: `Total bundle size (${formatBytes(analysis.totalSize)}) exceeds threshold (${formatBytes(config.thresholds.maxBundleSize)})`,
      severity: 'error',
    });
  }
  
  // Check individual chunks
  for (const asset of analysis.assets) {
    if (asset.type === 'js' && asset.size > config.thresholds.maxChunkSize) {
      analysis.warnings.push({
        type: 'chunk_size',
        message: `Chunk ${asset.name} (${asset.sizeFormatted}) exceeds threshold (${formatBytes(config.thresholds.maxChunkSize)})`,
        severity: 'warning',
        asset: asset.name,
      });
    }
    
    if (asset.isLarge) {
      analysis.warnings.push({
        type: 'large_asset',
        message: `Asset ${asset.name} (${asset.sizeFormatted}) is larger than recommended (${formatBytes(config.thresholds.maxAssetSize)})`,
        severity: 'info',
        asset: asset.name,
      });
    }
  }
  
  // Group by type
  analysis.byType = analysis.assets.reduce((acc, asset) => {
    if (!acc[asset.type]) {
      acc[asset.type] = { count: 0, totalSize: 0, assets: [] };
    }
    acc[asset.type].count++;
    acc[asset.type].totalSize += asset.size;
    acc[asset.type].assets.push(asset);
    return acc;
  }, {});
}

/**
 * Compare with previous analysis
 */
function compareWithPrevious(current, previous) {
  const sizeDiff = current.totalSize - previous.totalSize;
  const percentChange = (sizeDiff / previous.totalSize) * 100;
  
  current.comparison = {
    sizeDiff,
    percentChange,
    sizeIncreased: sizeDiff > 0,
    significantChange: Math.abs(percentChange) > config.alerts.sizeIncrease * 100,
  };
  
  if (current.comparison.significantChange) {
    current.warnings.push({
      type: 'size_change',
      message: `Bundle size ${sizeDiff > 0 ? 'increased' : 'decreased'} by ${Math.abs(percentChange).toFixed(1)}% (${formatBytes(Math.abs(sizeDiff))})`,
      severity: sizeDiff > 0 ? 'warning' : 'info',
    });
  }
  
  // Check for new large assets (only if previous analysis has detailed asset info)
  if (previous.assets && Array.isArray(previous.assets)) {
    const previousAssetNames = new Set(previous.assets.map(a => a.name));
    const newLargeAssets = current.assets.filter(
      asset => !previousAssetNames.has(asset.name) && asset.size > config.alerts.newLargeAssets
    );
    
    if (newLargeAssets.length > 0) {
      for (const asset of newLargeAssets) {
        current.warnings.push({
          type: 'new_large_asset',
          message: `New large asset detected: ${asset.name} (${asset.sizeFormatted})`,
          severity: 'warning',
          asset: asset.name,
        });
      }
    }
  } else {
    // Previous analysis doesn't have detailed asset info, skip asset comparison
    console.log('Previous analysis lacks detailed asset info, skipping asset comparison');
  }
}

/**
 * Generate optimization recommendations
 */
function generateRecommendations(analysis) {
  const recommendations = [];
  
  // Large JavaScript chunks
  const largeJsAssets = analysis.assets.filter(
    asset => asset.type === 'js' && asset.size > 200 * 1024
  );
  
  if (largeJsAssets.length > 0) {
    recommendations.push({
      type: 'code_splitting',
      priority: 'high',
      message: 'Consider implementing code splitting for large JavaScript chunks',
      details: `Large chunks: ${largeJsAssets.map(a => a.name).join(', ')}`,
      action: 'Implement React.lazy() or dynamic imports for route-based code splitting',
    });
  }
  
  // Large images
  const largeImages = analysis.assets.filter(
    asset => asset.type === 'image' && asset.size > 100 * 1024
  );
  
  if (largeImages.length > 0) {
    recommendations.push({
      type: 'image_optimization',
      priority: 'medium',
      message: 'Optimize large images to reduce bundle size',
      details: `Large images: ${largeImages.map(a => `${a.name} (${a.sizeFormatted})`).join(', ')}`,
      action: 'Use WebP format, implement lazy loading, or move to CDN',
    });
  }
  
  // Poor compression ratio
  const poorlyCompressed = analysis.assets.filter(
    asset => asset.compressionRatio && asset.compressionRatio > 0.8 && asset.size > 50 * 1024
  );
  
  if (poorlyCompressed.length > 0) {
    recommendations.push({
      type: 'compression',
      priority: 'low',
      message: 'Some assets have poor compression ratios',
      details: `Assets: ${poorlyCompressed.map(a => a.name).join(', ')}`,
      action: 'Review asset contents for optimizable code or data',
    });
  }
  
  // Too many small files
  const smallAssets = analysis.assets.filter(
    asset => asset.type === 'js' && asset.size < 10 * 1024
  );
  
  if (smallAssets.length > 10) {
    recommendations.push({
      type: 'bundling',
      priority: 'medium',
      message: `Many small JavaScript files (${smallAssets.length}) detected`,
      details: 'Small files can increase HTTP requests and reduce performance',
      action: 'Consider bundling small utilities or vendor libraries',
    });
  }
  
  analysis.recommendations = recommendations;
}

/**
 * Load previous analysis for comparison
 */
function loadPreviousAnalysis() {
  try {
    if (fs.existsSync(config.historyPath)) {
      const history = JSON.parse(fs.readFileSync(config.historyPath, 'utf8'));
      return history.length > 0 ? history[history.length - 1] : null;
    }
  } catch (error) {
    console.warn(`Failed to load previous analysis: ${error.message}`);
  }
  return null;
}

/**
 * Save analysis to history
 */
function saveAnalysis(analysis) {
  // Save current report
  ensureDirectoryExists(path.dirname(config.reportPath));
  fs.writeFileSync(config.reportPath, JSON.stringify(analysis, null, 2));
  
  // Add to history
  let history = [];
  try {
    if (fs.existsSync(config.historyPath)) {
      history = JSON.parse(fs.readFileSync(config.historyPath, 'utf8'));
    }
  } catch (error) {
    console.warn(`Failed to load history: ${error.message}`);
  }
  
  history.push({
    timestamp: analysis.timestamp,
    totalSize: analysis.totalSize,
    assetCount: analysis.assets.length,
    warnings: analysis.warnings.length,
    recommendations: analysis.recommendations.length,
  });
  
  // Keep only last 50 entries
  if (history.length > 50) {
    history = history.slice(-50);
  }
  
  ensureDirectoryExists(path.dirname(config.historyPath));
  fs.writeFileSync(config.historyPath, JSON.stringify(history, null, 2));
}

/**
 * Generate human-readable report
 */
function generateReport(analysis) {
  console.log(`
📊 Bundle Size Analysis Report
Generated: ${analysis.timestamp}

📦 Bundle Overview:
  Total Size: ${formatBytes(analysis.totalSize)}
  Total Assets: ${analysis.assets.length}
  Warnings: ${analysis.warnings.length}
  Recommendations: ${analysis.recommendations.length}
  
${analysis.comparison ? `📈 Comparison with Previous:
  Size Change: ${analysis.comparison.sizeDiff > 0 ? '+' : ''}${formatBytes(analysis.comparison.sizeDiff)} (${analysis.comparison.percentChange > 0 ? '+' : ''}${analysis.comparison.percentChange.toFixed(1)}%)
  Status: ${analysis.comparison.significantChange ? '⚠️ Significant change' : '✅ Normal change'}
` : ''}
🗂️ Assets by Type:`);

  for (const [type, info] of Object.entries(analysis.byType)) {
    console.log(`  ${type}: ${info.count} files, ${formatBytes(info.totalSize)}`);
  }

  console.log(`
🔝 Largest Assets:`);
  analysis.assets.slice(0, 10).forEach((asset, index) => {
    const gzipInfo = asset.gzipSizeFormatted ? ` (gzip: ${asset.gzipSizeFormatted})` : '';
    console.log(`  ${index + 1}. ${asset.name}: ${asset.sizeFormatted}${gzipInfo}`);
  });

  if (analysis.warnings.length > 0) {
    console.log(`
⚠️ Warnings:`);
    analysis.warnings.forEach((warning, index) => {
      console.log(`  ${index + 1}. [${warning.severity.toUpperCase()}] ${warning.message}`);
    });
  }

  if (analysis.recommendations.length > 0) {
    console.log(`
💡 Recommendations:`);
    analysis.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.message}`);
      console.log(`     Action: ${rec.action}`);
      if (rec.details) {
        console.log(`     Details: ${rec.details}`);
      }
    });
  }

  console.log(`
📄 Full report saved to: ${config.reportPath}
📊 History saved to: ${config.historyPath}
  `);
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Main execution
 */
if (require.main === module) {
  try {
    const analysis = analyzeBundleSize();
    
    // Exit with error code if there are critical issues
    const criticalWarnings = analysis.warnings.filter(w => w.severity === 'error');
    if (criticalWarnings.length > 0) {
      console.error(`❌ ${criticalWarnings.length} critical issue(s) found.`);
      process.exit(1);
    }
    
    console.log('✅ Bundle analysis completed successfully.');
  } catch (error) {
    console.error(`❌ Bundle analysis failed: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  analyzeBundleSize,
  config,
};