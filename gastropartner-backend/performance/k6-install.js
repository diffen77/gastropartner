/**
 * K6 Installation and Setup Script
 * Provides automated installation of K6 performance testing tool
 */

// Install instructions for different platforms
console.log(`
# K6 Installation Instructions

## macOS (via Homebrew)
brew install k6

## Ubuntu/Debian
curl -s https://raw.githubusercontent.com/grafana/k6/master/scripts/get.sh | sudo bash

## Windows (via Chocolatey)
choco install k6

## Docker (recommended for CI/CD)
docker run --rm -v ${process.cwd()}:/workspace -w /workspace grafana/k6 run script.js

## Verify Installation
k6 version

## Quick Start
k6 run basic-load-test.js

For detailed documentation: https://grafana.com/docs/k6/
`);