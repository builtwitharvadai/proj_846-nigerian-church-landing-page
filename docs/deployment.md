# Deployment Guide

## GitHub Pages Deployment

This guide covers deploying the Nigerian Church Landing Page to GitHub Pages, including configuration, domain setup, SSL, and ongoing maintenance.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial GitHub Pages Setup](#initial-github-pages-setup)
3. [Automated Deployment with GitHub Actions](#automated-deployment-with-github-actions)
4. [Custom Domain Configuration](#custom-domain-configuration)
5. [SSL/HTTPS Setup](#sslhttps-setup)
6. [Performance Monitoring](#performance-monitoring)
7. [Ongoing Maintenance](#ongoing-maintenance)
8. [Troubleshooting](#troubleshooting)
9. [Rollback Procedures](#rollback-procedures)

---

## Prerequisites

Before deploying, ensure you have:

- GitHub account with repository access
- Completed local build successfully (`npm run build`)
- All tests passing (`npm run test`)
- Performance budgets met (check `dist/build-report.json`)
- Repository pushed to GitHub

---

## Initial GitHub Pages Setup

### Step 1: Enable GitHub Pages

1. Navigate to your repository on GitHub
2. Click **Settings** tab
3. Scroll to **Pages** section in the left sidebar
4. Under **Source**, select:
   - Branch: `main` (or your default branch)
   - Folder: `/ (root)` or `/dist` (if using build output)
5. Click **Save**

### Step 2: Configure Build Settings

GitHub Pages will automatically detect and serve static HTML files. For this project: