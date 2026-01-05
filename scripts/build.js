#!/usr/bin/env node

/**
 * Build Orchestration Script
 * Nigerian Church Landing Page - Production Build System
 * 
 * Orchestrates all optimization tasks:
 * - CSS optimization and critical CSS extraction
 * - Image optimization and responsive image generation
 * - JavaScript minification
 * - HTML optimization
 * - Performance budget validation
 * - Build artifact verification
 * 
 * @generated-from: task-id:TASK-005 type:performance
 * @modifies: dist directory
 * @dependencies: ["scripts/optimize-css.js", "scripts/optimize-images.js"]
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Build configuration
const CONFIG = Object.freeze({
  ROOT_DIR: path.join(__dirname, '..'),
  DIST_DIR: path.join(__dirname, '..', 'dist'),
  SCRIPTS_DIR: path.join(__dirname),
  
  // Performance budgets (bytes)
  BUDGETS: Object.freeze({
    HTML: 50 * 1024,        // 50KB
    CSS: 30 * 1024,         // 30KB
    JS: 50 * 1024,          // 50KB per file
    IMAGES: 200 * 1024,     // 200KB per image
    TOTAL: 500 * 1024       // 500KB total
  }),
  
  // Build steps
  STEPS: Object.freeze([
    'clean',
    'optimize-css',
    'optimize-images',
    'minify-js',
    'optimize-html',
    'validate-budget',
    'generate-report'
  ])
});

// Logging utilities
const Logger = {
  info(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [INFO] ${message}`, ...args);
  },
  
  warn(message, ...args) {
    const timestamp = new Date().toISOString();
    console.warn(`[${timestamp}] [WARN] ${message}`, ...args);
  },
  
  error(message, ...args) {
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] [ERROR] ${message}`, ...args);
  },
  
  success(message, ...args) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SUCCESS] ${message}`, ...args);
  },
  
  step(stepName) {
    console.log('\n' + '='.repeat(60));
    console.log(`  ${stepName.toUpperCase()}`);
    console.log('='.repeat(60) + '\n');
  }
};

// Result type for error handling
const Result = {
  ok: (value) => ({ ok: true, value }),
  err: (error) => ({ ok: false, error })
};

/**
 * Ensures directory exists, creates if necessary
 * @param {string} dirPath - Directory path to ensure
 * @returns {Promise<void>}
 */
async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (_error) {
    await fs.mkdir(dirPath, { recursive: true });
    Logger.info(`Created directory: ${dirPath}`);
  }
}

/**
 * Cleans the dist directory
 * @returns {Promise<{ok: boolean, value?: void, error?: Error}>}
 */
async function cleanDistDirectory() {
  Logger.step('Cleaning dist directory');
  
  try {
    const distExists = await fs.access(CONFIG.DIST_DIR)
      .then(() => true)
      .catch(() => false);
    
    if (distExists) {
      await fs.rm(CONFIG.DIST_DIR, { recursive: true, force: true });
      Logger.info('Removed existing dist directory');
    }
    
    await ensureDirectory(CONFIG.DIST_DIR);
    Logger.success('Dist directory cleaned and ready');
    
    return Result.ok();
  } catch (error) {
    Logger.error('Failed to clean dist directory', error.message);
    return Result.err(error);
  }
}

/**
 * Runs CSS optimization script
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function runCSSOptimization() {
  Logger.step('Optimizing CSS');
  
  try {
    const cssScriptPath = path.join(CONFIG.SCRIPTS_DIR, 'optimize-css.js');
    
    // Check if script exists
    await fs.access(cssScriptPath);
    
    // Run the CSS optimization script
    execSync(`node "${cssScriptPath}"`, {
      cwd: CONFIG.ROOT_DIR,
      stdio: 'inherit'
    });
    
    Logger.success('CSS optimization completed');
    
    return Result.ok({ step: 'css-optimization' });
  } catch (error) {
    Logger.error('CSS optimization failed', error.message);
    return Result.err(error);
  }
}

/**
 * Runs image optimization script
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function runImageOptimization() {
  Logger.step('Optimizing images');
  
  try {
    const imageScriptPath = path.join(CONFIG.SCRIPTS_DIR, 'optimize-images.js');
    
    // Check if script exists
    await fs.access(imageScriptPath);
    
    // Run the image optimization script
    execSync(`node "${imageScriptPath}"`, {
      cwd: CONFIG.ROOT_DIR,
      stdio: 'inherit'
    });
    
    Logger.success('Image optimization completed');
    
    return Result.ok({ step: 'image-optimization' });
  } catch (error) {
    Logger.error('Image optimization failed', error.message);
    return Result.err(error);
  }
}

/**
 * Minifies JavaScript files
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function minifyJavaScript() {
  Logger.step('Minifying JavaScript');
  
  try {
    const jsDir = path.join(CONFIG.ROOT_DIR, 'js');
    const distJsDir = path.join(CONFIG.DIST_DIR, 'js');
    
    await ensureDirectory(distJsDir);
    
    // Get all JS files recursively
    const jsFiles = await findJavaScriptFiles(jsDir);
    
    Logger.info(`Found ${jsFiles.length} JavaScript files to minify`);
    
    const results = [];
    
    for (const filePath of jsFiles) {
      const relativePath = path.relative(jsDir, filePath);
      const outputPath = path.join(distJsDir, relativePath);
      
      await ensureDirectory(path.dirname(outputPath));
      
      const result = await minifyJSFile(filePath, outputPath);
      
      if (result.ok) {
        results.push(result.value);
        Logger.info(`Minified: ${relativePath} (${result.value.compressionRatio})`);
      } else {
        Logger.warn(`Failed to minify: ${relativePath}`);
      }
    }
    
    Logger.success(`Minified ${results.length} JavaScript files`);
    
    return Result.ok({ files: results });
  } catch (error) {
    Logger.error('JavaScript minification failed', error.message);
    return Result.err(error);
  }
}

/**
 * Finds all JavaScript files in directory recursively
 * @param {string} dir - Directory to search
 * @returns {Promise<string[]>}
 */
async function findJavaScriptFiles(dir) {
  const files = [];
  
  async function traverse(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory()) {
        await traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.js')) {
        files.push(fullPath);
      }
    }
  }
  
  await traverse(dir);
  return files;
}

/**
 * Minifies a single JavaScript file
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function minifyJSFile(inputPath, outputPath) {
  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    const originalSize = content.length;
    
    // Basic minification
    let minified = content;
    
    // Remove comments
    minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
    minified = minified.replace(/\/\/.*/g, '');
    
    // Remove unnecessary whitespace
    minified = minified.replace(/\s+/g, ' ');
    minified = minified.replace(/\s*([{}();,:])\s*/g, '$1');
    
    // Trim
    minified = minified.trim();
    
    await fs.writeFile(outputPath, minified, 'utf-8');
    
    const compressionRatio = ((1 - minified.length / originalSize) * 100).toFixed(2);
    
    return Result.ok({
      inputPath,
      outputPath,
      originalSize,
      minifiedSize: minified.length,
      compressionRatio: `${compressionRatio}%`
    });
  } catch (error) {
    return Result.err(error);
  }
}

/**
 * Optimizes HTML files
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function optimizeHTML() {
  Logger.step('Optimizing HTML');
  
  try {
    const htmlFiles = ['index.html'];
    const results = [];
    
    for (const file of htmlFiles) {
      const inputPath = path.join(CONFIG.ROOT_DIR, file);
      const outputPath = path.join(CONFIG.DIST_DIR, file);
      
      const result = await optimizeHTMLFile(inputPath, outputPath);
      
      if (result.ok) {
        results.push(result.value);
        Logger.info(`Optimized: ${file} (${result.value.compressionRatio})`);
      } else {
        Logger.warn(`Failed to optimize: ${file}`);
      }
    }
    
    Logger.success(`Optimized ${results.length} HTML files`);
    
    return Result.ok({ files: results });
  } catch (error) {
    Logger.error('HTML optimization failed', error.message);
    return Result.err(error);
  }
}

/**
 * Optimizes a single HTML file
 * @param {string} inputPath - Input file path
 * @param {string} outputPath - Output file path
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function optimizeHTMLFile(inputPath, outputPath) {
  try {
    const content = await fs.readFile(inputPath, 'utf-8');
    const originalSize = content.length;
    
    let optimized = content;
    
    // Remove HTML comments (except IE conditionals)
    optimized = optimized.replace(/<!--(?!\[if)[\s\S]*?-->/g, '');
    
    // Remove unnecessary whitespace
    optimized = optimized.replace(/\s+/g, ' ');
    optimized = optimized.replace(/>\s+</g, '><');
    
    // Inline critical CSS if available
    const criticalCSSPath = path.join(CONFIG.DIST_DIR, 'critical.css');
    try {
      const criticalCSS = await fs.readFile(criticalCSSPath, 'utf-8');
      
      // Replace stylesheet link with inline critical CSS
      optimized = optimized.replace(
        /<link[^>]*rel=["']stylesheet["'][^>]*>/,
        `<style>${criticalCSS}</style>`
      );
      
      Logger.info('Inlined critical CSS');
    } catch (_error) {
      Logger.warn('Critical CSS not found, skipping inline');
    }
    
    // Trim
    optimized = optimized.trim();
    
    await fs.writeFile(outputPath, optimized, 'utf-8');
    
    const compressionRatio = ((1 - optimized.length / originalSize) * 100).toFixed(2);
    
    return Result.ok({
      inputPath,
      outputPath,
      originalSize,
      optimizedSize: optimized.length,
      compressionRatio: `${compressionRatio}%`
    });
  } catch (error) {
    return Result.err(error);
  }
}

/**
 * Validates performance budget
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function validatePerformanceBudget() {
  Logger.step('Validating performance budget');
  
  try {
    const violations = [];
    let totalSize = 0;
    
    // Check HTML files
    const htmlFiles = await fs.readdir(CONFIG.DIST_DIR);
    for (const file of htmlFiles.filter(f => f.endsWith('.html'))) {
      const filePath = path.join(CONFIG.DIST_DIR, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
      
      if (stats.size > CONFIG.BUDGETS.HTML) {
        violations.push({
          file,
          size: stats.size,
          budget: CONFIG.BUDGETS.HTML,
          type: 'HTML'
        });
      }
    }
    
    // Check CSS files
    const cssDir = path.join(CONFIG.DIST_DIR, 'styles');
    try {
      const cssFiles = await fs.readdir(cssDir);
      for (const file of cssFiles.filter(f => f.endsWith('.css'))) {
        const filePath = path.join(cssDir, file);
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        if (stats.size > CONFIG.BUDGETS.CSS) {
          violations.push({
            file: `styles/${file}`,
            size: stats.size,
            budget: CONFIG.BUDGETS.CSS,
            type: 'CSS'
          });
        }
      }
    } catch (_error) {
      Logger.warn('CSS directory not found, skipping CSS budget check');
    }
    
    // Check JS files
    const jsDir = path.join(CONFIG.DIST_DIR, 'js');
    try {
      const jsFiles = await findJavaScriptFiles(jsDir);
      for (const filePath of jsFiles) {
        const stats = await fs.stat(filePath);
        totalSize += stats.size;
        
        if (stats.size > CONFIG.BUDGETS.JS) {
          violations.push({
            file: path.relative(CONFIG.DIST_DIR, filePath),
            size: stats.size,
            budget: CONFIG.BUDGETS.JS,
            type: 'JS'
          });
        }
      }
    } catch (_error) {
      Logger.warn('JS directory not found, skipping JS budget check');
    }
    
    // Check total size
    if (totalSize > CONFIG.BUDGETS.TOTAL) {
      violations.push({
        file: 'TOTAL',
        size: totalSize,
        budget: CONFIG.BUDGETS.TOTAL,
        type: 'TOTAL'
      });
    }
    
    if (violations.length > 0) {
      Logger.warn('Performance budget violations detected:');
      for (const violation of violations) {
        const overBudget = violation.size - violation.budget;
        const percentage = ((overBudget / violation.budget) * 100).toFixed(2);
        Logger.warn(
          `  ${violation.file}: ${formatBytes(violation.size)} ` +
          `(budget: ${formatBytes(violation.budget)}, ` +
          `over by ${formatBytes(overBudget)} / ${percentage}%)`
        );
      }
    } else {
      Logger.success('All files within performance budget');
    }
    
    Logger.info(`Total bundle size: ${formatBytes(totalSize)}`);
    
    return Result.ok({
      totalSize,
      violations,
      passed: violations.length === 0
    });
  } catch (error) {
    Logger.error('Budget validation failed', error.message);
    return Result.err(error);
  }
}

/**
 * Generates build report
 * @param {object} buildResults - Results from all build steps
 * @returns {Promise<{ok: boolean, value?: void, error?: Error}>}
 */
async function generateBuildReport(buildResults) {
  Logger.step('Generating build report');
  
  try {
    const report = {
      timestamp: new Date().toISOString(),
      buildDuration: buildResults.duration,
      steps: buildResults.steps,
      performanceBudget: buildResults.budget,
      summary: {
        success: buildResults.success,
        totalFiles: buildResults.totalFiles,
        totalSize: buildResults.totalSize
      }
    };
    
    const reportPath = path.join(CONFIG.DIST_DIR, 'build-report.json');
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    Logger.success(`Build report generated: ${reportPath}`);
    
    return Result.ok();
  } catch (error) {
    Logger.error('Failed to generate build report', error.message);
    return Result.err(error);
  }
}

/**
 * Formats bytes for display
 * @param {number} bytes - Number of bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Main build function
 * @returns {Promise<void>}
 */
async function build() {
  const startTime = Date.now();
  
  console.log('\n' + '='.repeat(60));
  console.log('  NIGERIAN CHURCH LANDING PAGE - PRODUCTION BUILD');
  console.log('='.repeat(60) + '\n');
  
  const buildResults = {
    steps: {},
    success: true,
    totalFiles: 0,
    totalSize: 0
  };
  
  try {
    // Step 1: Clean
    const cleanResult = await cleanDistDirectory();
    if (!cleanResult.ok) {
      throw cleanResult.error;
    }
    buildResults.steps.clean = { success: true };
    
    // Step 2: Optimize CSS
    const cssResult = await runCSSOptimization();
    if (!cssResult.ok) {
      throw cssResult.error;
    }
    buildResults.steps.css = { success: true };
    
    // Step 3: Optimize Images
    const imageResult = await runImageOptimization();
    if (!imageResult.ok) {
      throw imageResult.error;
    }
    buildResults.steps.images = { success: true };
    
    // Step 4: Minify JavaScript
    const jsResult = await minifyJavaScript();
    if (!jsResult.ok) {
      throw jsResult.error;
    }
    buildResults.steps.js = { success: true, files: jsResult.value.files };
    buildResults.totalFiles += jsResult.value.files.length;
    
    // Step 5: Optimize HTML
    const htmlResult = await optimizeHTML();
    if (!htmlResult.ok) {
      throw htmlResult.error;
    }
    buildResults.steps.html = { success: true, files: htmlResult.value.files };
    buildResults.totalFiles += htmlResult.value.files.length;
    
    // Step 6: Validate Budget
    const budgetResult = await validatePerformanceBudget();
    if (!budgetResult.ok) {
      throw budgetResult.error;
    }
    buildResults.steps.budget = { success: true };
    buildResults.budget = budgetResult.value;
    buildResults.totalSize = budgetResult.value.totalSize;
    
    // Calculate duration
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    buildResults.duration = `${duration}s`;
    
    // Step 7: Generate Report
    const reportResult = await generateBuildReport(buildResults);
    if (!reportResult.ok) {
      throw reportResult.error;
    }
    
    // Final summary
    console.log('\n' + '='.repeat(60));
    console.log('  BUILD SUMMARY');
    console.log('='.repeat(60));
    Logger.info(`Duration: ${duration}s`);
    Logger.info(`Total files: ${buildResults.totalFiles}`);
    Logger.info(`Total size: ${formatBytes(buildResults.totalSize)}`);
    Logger.info(`Budget violations: ${buildResults.budget.violations.length}`);
    
    if (buildResults.budget.passed) {
      Logger.success('\n✓ Build completed successfully!');
      Logger.success('✓ All performance budgets met');
    } else {
      Logger.warn('\n⚠ Build completed with budget violations');
      Logger.warn('Review build-report.json for details');
    }
    
    console.log('='.repeat(60) + '\n');
    
    process.exit(buildResults.budget.passed ? 0 : 1);
    
  } catch (error) {
    buildResults.success = false;
    
    Logger.error('\n✗ Build failed', error.message);
    Logger.error(error.stack);
    
    console.log('='.repeat(60) + '\n');
    
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  build().catch(error => {
    Logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  build,
  cleanDistDirectory,
  runCSSOptimization,
  runImageOptimization,
  minifyJavaScript,
  optimizeHTML,
  validatePerformanceBudget
};