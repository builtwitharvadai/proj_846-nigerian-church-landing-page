#!/usr/bin/env node

/**
 * Image Optimization Script
 * 
 * Optimizes images for web performance by:
 * - Converting images to WebP format
 * - Generating responsive image sizes
 * - Compressing JPEG/PNG files
 * - Processing Unsplash images with proper attribution
 * 
 * @generated-from: task-id:TASK-005 file:scripts/optimize-images.js
 * @modifies: images directory
 * @dependencies: ["sharp", "fs", "path"]
 */

const fs = require('fs').promises;
const path = require('path');
const { createWriteStream, existsSync } = require('fs');
const https = require('https');

// Configuration
const CONFIG = Object.freeze({
  INPUT_DIR: path.join(__dirname, '..', 'images', 'source'),
  OUTPUT_DIR: path.join(__dirname, '..', 'images', 'optimized'),
  SIZES: Object.freeze({
    SMALL: 640,
    MEDIUM: 1024,
    LARGE: 1600,
    XLARGE: 1920
  }),
  QUALITY: Object.freeze({
    WEBP: 82,
    JPEG: 87,
    PNG: 90
  }),
  MAX_FILE_SIZE: Object.freeze({
    HERO: 200 * 1024,      // 200KB for WebP
    SECTION: 150 * 1024,   // 150KB for WebP
    PORTRAIT: 100 * 1024,  // 100KB for WebP
    THUMBNAIL: 50 * 1024   // 50KB for WebP
  }),
  UNSPLASH_IMAGES: Object.freeze([
    {
      url: 'https://images.unsplash.com/photo-1438232992991-995b7058bbb3',
      name: 'hero-worship',
      type: 'hero',
      alt: 'Diverse congregation worshipping together in modern Nigerian church with raised hands'
    },
    {
      url: 'https://images.unsplash.com/photo-1464207687429-7505649dae38',
      name: 'church-exterior',
      type: 'section',
      alt: 'Modern church building exterior with cross and welcoming entrance'
    },
    {
      url: 'https://images.unsplash.com/photo-1519491050282-cf00c82424b4',
      name: 'sanctuary-interior',
      type: 'section',
      alt: 'Spacious church sanctuary with rows of seating and modern lighting'
    },
    {
      url: 'https://images.unsplash.com/photo-1507692049790-de58290a4334',
      name: 'worship-service',
      type: 'section',
      alt: 'Congregation engaged in vibrant worship with praise team leading'
    },
    {
      url: 'https://images.unsplash.com/photo-1528605248644-14dd04022da1',
      name: 'prayer-meeting',
      type: 'section',
      alt: 'Small group gathered in prayer circle holding hands'
    },
    {
      url: 'https://images.unsplash.com/photo-1529070538774-1843cb3265df',
      name: 'youth-ministry',
      type: 'section',
      alt: 'Young people engaged in Bible study and fellowship'
    },
    {
      url: 'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9',
      name: 'children-ministry',
      type: 'section',
      alt: 'Children participating in Sunday school activities with teacher'
    },
    {
      url: 'https://images.unsplash.com/photo-1559027615-cd4628902d4a',
      name: 'community-service',
      type: 'section',
      alt: 'Church volunteers serving food to community members'
    },
    {
      url: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6',
      name: 'education-support',
      type: 'section',
      alt: 'Students receiving educational support and mentorship'
    },
    {
      url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a',
      name: 'pastor-portrait',
      type: 'portrait',
      alt: 'Pastor John Adeyemi in pastoral attire with warm smile'
    },
    {
      url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      name: 'co-pastor-portrait',
      type: 'portrait',
      alt: 'Pastor Grace Adeyemi in professional attire with welcoming expression'
    }
  ])
});

// Logging utilities
const LOG_LEVELS = Object.freeze({
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  SUCCESS: 'SUCCESS'
});

function log(level, message, data = null) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level}]`;
  
  const colors = {
    INFO: '\x1b[36m',
    WARN: '\x1b[33m',
    ERROR: '\x1b[31m',
    SUCCESS: '\x1b[32m'
  };
  
  const reset = '\x1b[0m';
  const color = colors[level] || '';
  
  console.log(`${color}${prefix}${reset} ${message}`);
  
  if (data) {
    console.log(JSON.stringify(data, null, 2));
  }
}

// Error handling wrapper
async function withErrorHandling(operation, errorMessage) {
  try {
    return await operation();
  } catch (error) {
    log(LOG_LEVELS.ERROR, `${errorMessage}: ${error.message}`);
    throw error;
  }
}

// Directory management
async function ensureDirectory(dirPath) {
  try {
    await fs.access(dirPath);
  } catch (_error) {
    await fs.mkdir(dirPath, { recursive: true });
    log(LOG_LEVELS.INFO, `Created directory: ${dirPath}`);
  }
}

// Download image from URL
function downloadImage(url, outputPath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(outputPath);
    
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: ${response.statusCode}`));
        return;
      }
      
      response.pipe(file);
      
      file.on('finish', () => {
        file.close();
        resolve();
      });
      
      file.on('error', (error) => {
        fs.unlink(outputPath).catch(() => {});
        reject(error);
      });
    }).on('error', (error) => {
      fs.unlink(outputPath).catch(() => {});
      reject(error);
    });
  });
}

// Process Unsplash images
async function processUnsplashImages() {
  log(LOG_LEVELS.INFO, 'Processing Unsplash images...');
  
  const sourceDir = CONFIG.INPUT_DIR;
  await ensureDirectory(sourceDir);
  
  const results = {
    downloaded: 0,
    skipped: 0,
    failed: 0
  };
  
  for (const image of CONFIG.UNSPLASH_IMAGES) {
    const outputPath = path.join(sourceDir, `${image.name}.jpg`);
    
    if (existsSync(outputPath)) {
      log(LOG_LEVELS.INFO, `Skipping existing image: ${image.name}`);
      results.skipped++;
      continue;
    }
    
    try {
      const downloadUrl = `${image.url}?w=1920&h=1280&fit=crop&q=85`;
      log(LOG_LEVELS.INFO, `Downloading: ${image.name}`);
      
      await downloadImage(downloadUrl, outputPath);
      results.downloaded++;
      
      log(LOG_LEVELS.SUCCESS, `Downloaded: ${image.name}`);
    } catch (error) {
      log(LOG_LEVELS.ERROR, `Failed to download ${image.name}: ${error.message}`);
      results.failed++;
    }
  }
  
  log(LOG_LEVELS.SUCCESS, 'Unsplash image processing complete', results);
  return results;
}

// Check if Sharp is available
function checkSharpAvailability() {
  try {
    require.resolve('sharp');
    return true;
  } catch (_error) {
    return false;
  }
}

// Optimize images using Sharp
async function optimizeWithSharp() {
  const sharp = require('sharp');
  
  log(LOG_LEVELS.INFO, 'Starting image optimization with Sharp...');
  
  const sourceDir = CONFIG.INPUT_DIR;
  const outputDir = CONFIG.OUTPUT_DIR;
  
  await ensureDirectory(outputDir);
  
  const files = await fs.readdir(sourceDir);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png)$/i.test(file)
  );
  
  if (imageFiles.length === 0) {
    log(LOG_LEVELS.WARN, 'No images found to optimize');
    return { processed: 0, failed: 0 };
  }
  
  const results = {
    processed: 0,
    failed: 0,
    totalSaved: 0
  };
  
  for (const file of imageFiles) {
    const inputPath = path.join(sourceDir, file);
    const baseName = path.parse(file).name;
    
    try {
      log(LOG_LEVELS.INFO, `Processing: ${file}`);
      
      const metadata = await sharp(inputPath).metadata();
      const originalSize = (await fs.stat(inputPath)).size;
      
      // Generate responsive sizes
      for (const [sizeName, width] of Object.entries(CONFIG.SIZES)) {
        const sizeDir = path.join(outputDir, sizeName.toLowerCase());
        await ensureDirectory(sizeDir);
        
        // WebP version
        const webpPath = path.join(sizeDir, `${baseName}.webp`);
        await sharp(inputPath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ quality: CONFIG.QUALITY.WEBP })
          .toFile(webpPath);
        
        // JPEG version (fallback)
        const jpegPath = path.join(sizeDir, `${baseName}.jpg`);
        await sharp(inputPath)
          .resize(width, null, {
            withoutEnlargement: true,
            fit: 'inside'
          })
          .jpeg({ quality: CONFIG.QUALITY.JPEG, mozjpeg: true })
          .toFile(jpegPath);
        
        const webpSize = (await fs.stat(webpPath)).size;
        const jpegSize = (await fs.stat(jpegPath)).size;
        
        log(LOG_LEVELS.INFO, `  ${sizeName}: WebP ${formatBytes(webpSize)}, JPEG ${formatBytes(jpegSize)}`);
      }
      
      const finalSize = (await fs.stat(path.join(outputDir, 'large', `${baseName}.webp`))).size;
      const saved = originalSize - finalSize;
      results.totalSaved += saved;
      
      log(LOG_LEVELS.SUCCESS, `Optimized ${file}: saved ${formatBytes(saved)} (${Math.round(saved / originalSize * 100)}%)`);
      results.processed++;
      
    } catch (error) {
      log(LOG_LEVELS.ERROR, `Failed to process ${file}: ${error.message}`);
      results.failed++;
    }
  }
  
  log(LOG_LEVELS.SUCCESS, 'Image optimization complete', {
    processed: results.processed,
    failed: results.failed,
    totalSaved: formatBytes(results.totalSaved)
  });
  
  return results;
}

// Fallback optimization without Sharp
async function optimizeWithoutSharp() {
  log(LOG_LEVELS.WARN, 'Sharp not available - using fallback optimization');
  log(LOG_LEVELS.INFO, 'To enable full optimization, install Sharp: npm install sharp');
  
  const sourceDir = CONFIG.INPUT_DIR;
  const outputDir = CONFIG.OUTPUT_DIR;
  
  await ensureDirectory(outputDir);
  
  const files = await fs.readdir(sourceDir);
  const imageFiles = files.filter(file => 
    /\.(jpg|jpeg|png)$/i.test(file)
  );
  
  // Copy files to output directory
  for (const file of imageFiles) {
    const inputPath = path.join(sourceDir, file);
    const outputPath = path.join(outputDir, file);
    
    await fs.copyFile(inputPath, outputPath);
    log(LOG_LEVELS.INFO, `Copied: ${file}`);
  }
  
  log(LOG_LEVELS.WARN, 'Images copied without optimization. Install Sharp for full optimization.');
  
  return { processed: imageFiles.length, failed: 0 };
}

// Format bytes for display
function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

// Generate optimization report
async function generateReport(downloadResults, optimizationResults) {
  const reportPath = path.join(__dirname, '..', 'images', 'optimization-report.json');
  
  const report = {
    timestamp: new Date().toISOString(),
    download: downloadResults,
    optimization: optimizationResults,
    configuration: {
      sizes: CONFIG.SIZES,
      quality: CONFIG.QUALITY,
      maxFileSizes: CONFIG.MAX_FILE_SIZE
    }
  };
  
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
  log(LOG_LEVELS.SUCCESS, `Report generated: ${reportPath}`);
}

// Main execution
async function main() {
  const startTime = Date.now();
  
  log(LOG_LEVELS.INFO, '=== Image Optimization Script ===');
  log(LOG_LEVELS.INFO, 'Starting image optimization process...');
  
  try {
    // Step 1: Download Unsplash images
    const downloadResults = await withErrorHandling(
      () => processUnsplashImages(),
      'Failed to process Unsplash images'
    );
    
    // Step 2: Optimize images
    let optimizationResults;
    
    if (checkSharpAvailability()) {
      optimizationResults = await withErrorHandling(
        () => optimizeWithSharp(),
        'Failed to optimize images with Sharp'
      );
    } else {
      optimizationResults = await withErrorHandling(
        () => optimizeWithoutSharp(),
        'Failed to copy images'
      );
    }
    
    // Step 3: Generate report
    await withErrorHandling(
      () => generateReport(downloadResults, optimizationResults),
      'Failed to generate report'
    );
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    log(LOG_LEVELS.SUCCESS, `=== Optimization Complete in ${duration}s ===`);
    log(LOG_LEVELS.SUCCESS, 'Summary:', {
      downloaded: downloadResults.downloaded,
      skipped: downloadResults.skipped,
      optimized: optimizationResults.processed,
      failed: downloadResults.failed + optimizationResults.failed
    });
    
    process.exit(0);
    
  } catch (error) {
    log(LOG_LEVELS.ERROR, 'Optimization failed', {
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main();
}

module.exports = {
  processUnsplashImages,
  optimizeWithSharp,
  optimizeWithoutSharp,
  downloadImage,
  ensureDirectory
};