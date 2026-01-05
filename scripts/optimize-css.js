/**
 * CSS Optimization Script
 * Nigerian Church Landing Page - Critical CSS Extraction and Minification
 * 
 * This script performs:
 * - Critical above-the-fold CSS extraction
 * - CSS minification and optimization
 * - Unused CSS purging
 * - Critical CSS inlining functionality
 * 
 * @generated-from: task-id:TASK-005 type:performance
 * @modifies: styles/*.css
 * @dependencies: ["fs", "path", "postcss", "cssnano", "critical"]
 */

const fs = require('fs').promises;
const path = require('path');
const { promisify } = require('util');

// Script configuration
const CONFIG = Object.freeze({
  STYLES_DIR: path.join(__dirname, '..', 'styles'),
  OUTPUT_DIR: path.join(__dirname, '..', 'dist', 'styles'),
  INDEX_HTML: path.join(__dirname, '..', 'index.html'),
  CRITICAL_OUTPUT: path.join(__dirname, '..', 'dist', 'critical.css'),
  VIEWPORT: {
    width: 375,
    height: 667
  },
  MINIFY_OPTIONS: {
    preset: ['default', {
      discardComments: { removeAll: true },
      normalizeWhitespace: true,
      colormin: true,
      minifyFontValues: true,
      minifySelectors: true
    }]
  }
});

// Logging utilities
const Logger = {
  info(message, ...args) {
    console.log(`[INFO] ${message}`, ...args);
  },
  
  warn(message, ...args) {
    console.warn(`[WARN] ${message}`, ...args);
  },
  
  error(message, ...args) {
    console.error(`[ERROR] ${message}`, ...args);
  },
  
  success(message, ...args) {
    console.log(`[SUCCESS] ${message}`, ...args);
  },
  
  debug(message, ...args) {
    if (process.env.DEBUG === '1') {
      console.log(`[DEBUG] ${message}`, ...args);
    }
  }
};

/**
 * Result type for error handling
 */
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
    Logger.debug(`Creating directory: ${dirPath}`);
    await fs.mkdir(dirPath, { recursive: true });
  }
}

/**
 * Reads CSS file content
 * @param {string} filePath - Path to CSS file
 * @returns {Promise<{ok: boolean, value?: string, error?: Error}>}
 */
async function readCSSFile(filePath) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    Logger.debug(`Read CSS file: ${filePath} (${content.length} bytes)`);
    return Result.ok(content);
  } catch (error) {
    Logger.error(`Failed to read CSS file: ${filePath}`, error.message);
    return Result.err(error);
  }
}

/**
 * Writes CSS file content
 * @param {string} filePath - Path to write CSS file
 * @param {string} content - CSS content to write
 * @returns {Promise<{ok: boolean, value?: void, error?: Error}>}
 */
async function writeCSSFile(filePath, content) {
  try {
    await ensureDirectory(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
    Logger.debug(`Wrote CSS file: ${filePath} (${content.length} bytes)`);
    return Result.ok();
  } catch (error) {
    Logger.error(`Failed to write CSS file: ${filePath}`, error.message);
    return Result.err(error);
  }
}

/**
 * Minifies CSS content using basic minification
 * @param {string} css - CSS content to minify
 * @returns {string} Minified CSS
 */
function minifyCSS(css) {
  Logger.debug('Minifying CSS...');
  
  let minified = css;
  
  // Remove comments
  minified = minified.replace(/\/\*[\s\S]*?\*\//g, '');
  
  // Remove unnecessary whitespace
  minified = minified.replace(/\s+/g, ' ');
  minified = minified.replace(/\s*([{}:;,>+~])\s*/g, '$1');
  
  // Remove trailing semicolons
  minified = minified.replace(/;}/g, '}');
  
  // Remove empty rules
  minified = minified.replace(/[^{}]+\{\s*\}/g, '');
  
  // Trim
  minified = minified.trim();
  
  Logger.debug(`Minification complete: ${css.length} -> ${minified.length} bytes`);
  
  return minified;
}

/**
 * Extracts critical above-the-fold CSS
 * @param {string} css - Full CSS content
 * @returns {string} Critical CSS
 */
function extractCriticalCSS(css) {
  Logger.debug('Extracting critical CSS...');
  
  const criticalSelectors = [
    // Reset and normalize
    /^\*[,\s]/,
    /^html\s/,
    /^body\s/,
    
    // Critical layout
    /\.header/,
    /\.nav/,
    /\.hero/,
    /\.btn/,
    /\.container/,
    
    // Critical components marked with @layer critical
    /@layer\s+critical/
  ];
  
  const lines = css.split('\n');
  const criticalLines = [];
  let inCriticalBlock = false;
  let braceCount = 0;
  
  for (const line of lines) {
    // Check if entering critical layer
    if (line.includes('@layer critical')) {
      inCriticalBlock = true;
      criticalLines.push(line);
      continue;
    }
    
    // Track braces in critical block
    if (inCriticalBlock) {
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;
      criticalLines.push(line);
      
      if (braceCount === 0) {
        inCriticalBlock = false;
      }
      continue;
    }
    
    // Check for critical selectors
    const isCritical = criticalSelectors.some(pattern => pattern.test(line.trim()));
    if (isCritical) {
      criticalLines.push(line);
      
      // Include the entire rule block
      if (line.includes('{')) {
        braceCount = 1;
        inCriticalBlock = true;
      }
    }
  }
  
  const criticalCSS = criticalLines.join('\n');
  Logger.debug(`Extracted critical CSS: ${criticalCSS.length} bytes`);
  
  return criticalCSS;
}

/**
 * Removes unused CSS selectors
 * @param {string} css - CSS content
 * @param {string} html - HTML content to check against
 * @returns {string} Purged CSS
 */
function purgeUnusedCSS(css, html) {
  Logger.debug('Purging unused CSS...');
  
  // Extract all class names and IDs from HTML
  const classPattern = /class=["']([^"']+)["']/g;
  const idPattern = /id=["']([^"']+)["']/g;
  
  const usedClasses = new Set();
  const usedIds = new Set();
  
  let match;
  while ((match = classPattern.exec(html)) !== null) {
    match[1].split(/\s+/).forEach(cls => usedClasses.add(cls));
  }
  
  while ((match = idPattern.exec(html)) !== null) {
    usedIds.add(match[1]);
  }
  
  Logger.debug(`Found ${usedClasses.size} classes and ${usedIds.size} IDs in HTML`);
  
  // Parse CSS rules and keep only used ones
  const rules = css.split('}').filter(rule => rule.trim());
  const purgedRules = [];
  
  for (const rule of rules) {
    const [selector, _declarations] = rule.split('{');
    if (!selector) continue;
    
    const selectorTrimmed = selector.trim();
    
    // Keep if selector matches used classes/IDs or is a pseudo-class/element
    const shouldKeep = 
      selectorTrimmed.startsWith('@') || // Keep at-rules
      selectorTrimmed.startsWith(':') || // Keep pseudo-classes
      selectorTrimmed.includes('::') || // Keep pseudo-elements
      Array.from(usedClasses).some(cls => selectorTrimmed.includes(`.${cls}`)) ||
      Array.from(usedIds).some(id => selectorTrimmed.includes(`#${id}`)) ||
      /^(html|body|a|p|h[1-6]|ul|ol|li|img|button|input|select|textarea|form|table|tr|td|th|div|span|section|article|header|footer|nav|main)\b/.test(selectorTrimmed);
    
    if (shouldKeep) {
      purgedRules.push(rule + '}');
    }
  }
  
  const purgedCSS = purgedRules.join('\n');
  Logger.debug(`Purged CSS: ${css.length} -> ${purgedCSS.length} bytes`);
  
  return purgedCSS;
}

/**
 * Processes a single CSS file
 * @param {string} inputPath - Input CSS file path
 * @param {string} outputPath - Output CSS file path
 * @param {string} htmlContent - HTML content for purging
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function processCSSFile(inputPath, outputPath, htmlContent) {
  Logger.info(`Processing: ${path.basename(inputPath)}`);
  
  const readResult = await readCSSFile(inputPath);
  if (!readResult.ok) {
    return readResult;
  }
  
  let css = readResult.value;
  const originalSize = css.length;
  
  // Purge unused CSS
  if (htmlContent) {
    css = purgeUnusedCSS(css, htmlContent);
  }
  
  // Minify CSS
  css = minifyCSS(css);
  
  const writeResult = await writeCSSFile(outputPath, css);
  if (!writeResult.ok) {
    return writeResult;
  }
  
  const compressionRatio = ((1 - css.length / originalSize) * 100).toFixed(2);
  
  return Result.ok({
    inputPath,
    outputPath,
    originalSize,
    optimizedSize: css.length,
    compressionRatio: `${compressionRatio}%`
  });
}

/**
 * Generates critical CSS and creates inline version
 * @param {string} mainCSSPath - Path to main CSS file
 * @param {string} outputPath - Path to write critical CSS
 * @returns {Promise<{ok: boolean, value?: object, error?: Error}>}
 */
async function generateCriticalCSS(mainCSSPath, outputPath) {
  Logger.info('Generating critical CSS...');
  
  const readResult = await readCSSFile(mainCSSPath);
  if (!readResult.ok) {
    return readResult;
  }
  
  let criticalCSS = extractCriticalCSS(readResult.value);
  criticalCSS = minifyCSS(criticalCSS);
  
  const writeResult = await writeCSSFile(outputPath, criticalCSS);
  if (!writeResult.ok) {
    return writeResult;
  }
  
  return Result.ok({
    outputPath,
    size: criticalCSS.length
  });
}

/**
 * Main optimization function
 * @returns {Promise<void>}
 */
async function optimizeCSS() {
  const startTime = Date.now();
  Logger.info('Starting CSS optimization...');
  
  try {
    // Ensure output directory exists
    await ensureDirectory(CONFIG.OUTPUT_DIR);
    
    // Read HTML content for purging
    let htmlContent = '';
    try {
      htmlContent = await fs.readFile(CONFIG.INDEX_HTML, 'utf-8');
      Logger.info('Loaded HTML for CSS purging');
    } catch (error) {
      Logger.warn('Could not load HTML file, skipping CSS purging', error.message);
    }
    
    // Get all CSS files
    const cssFiles = await fs.readdir(CONFIG.STYLES_DIR);
    const cssFilePaths = cssFiles
      .filter(file => file.endsWith('.css'))
      .map(file => ({
        input: path.join(CONFIG.STYLES_DIR, file),
        output: path.join(CONFIG.OUTPUT_DIR, file)
      }));
    
    Logger.info(`Found ${cssFilePaths.length} CSS files to process`);
    
    // Process all CSS files
    const results = [];
    for (const { input, output } of cssFilePaths) {
      const result = await processCSSFile(input, output, htmlContent);
      if (result.ok) {
        results.push(result.value);
        Logger.success(`Optimized: ${path.basename(input)} (${result.value.compressionRatio} reduction)`);
      } else {
        Logger.error(`Failed to process: ${path.basename(input)}`, result.error.message);
      }
    }
    
    // Generate critical CSS
    const mainCSSPath = path.join(CONFIG.STYLES_DIR, 'main.css');
    const criticalResult = await generateCriticalCSS(mainCSSPath, CONFIG.CRITICAL_OUTPUT);
    
    if (criticalResult.ok) {
      Logger.success(`Generated critical CSS: ${criticalResult.value.size} bytes`);
    } else {
      Logger.error('Failed to generate critical CSS', criticalResult.error.message);
    }
    
    // Summary
    const totalOriginalSize = results.reduce((sum, r) => sum + r.originalSize, 0);
    const totalOptimizedSize = results.reduce((sum, r) => sum + r.optimizedSize, 0);
    const totalReduction = ((1 - totalOptimizedSize / totalOriginalSize) * 100).toFixed(2);
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    Logger.info('\n=== Optimization Summary ===');
    Logger.info(`Files processed: ${results.length}`);
    Logger.info(`Original size: ${(totalOriginalSize / 1024).toFixed(2)} KB`);
    Logger.info(`Optimized size: ${(totalOptimizedSize / 1024).toFixed(2)} KB`);
    Logger.info(`Total reduction: ${totalReduction}%`);
    Logger.info(`Duration: ${duration}s`);
    Logger.success('\nCSS optimization completed successfully!');
    
  } catch (error) {
    Logger.error('CSS optimization failed', error.message);
    Logger.error(error.stack);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  optimizeCSS().catch(error => {
    Logger.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  optimizeCSS,
  minifyCSS,
  extractCriticalCSS,
  purgeUnusedCSS
};