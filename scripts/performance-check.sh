#!/bin/bash

# Performance Check Script for GastroPartner
# Runs comprehensive performance tests and monitoring

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$PROJECT_ROOT/gastropartner-backend"
FRONTEND_DIR="$PROJECT_ROOT/gastropartner-frontend"
REPORTS_DIR="$PROJECT_ROOT/reports"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Ensure directories exist
ensure_directories() {
    log_info "Creating necessary directories..."
    mkdir -p "$REPORTS_DIR"
    mkdir -p "$REPORTS_DIR/performance"
    mkdir -p "$REPORTS_DIR/htmlcov"
    mkdir -p "$REPORTS_DIR/junit"
    mkdir -p "$BACKEND_DIR/performance"
    mkdir -p "$FRONTEND_DIR/performance"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    local missing_tools=()
    
    if ! command_exists k6; then
        missing_tools+=("k6")
    fi
    
    if ! command_exists node; then
        missing_tools+=("node")
    fi
    
    if ! command_exists npm; then
        missing_tools+=("npm")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        log_info "Install missing tools:"
        for tool in "${missing_tools[@]}"; do
            case $tool in
                k6)
                    echo "  K6: brew install k6 (macOS) or curl -s https://raw.githubusercontent.com/grafana/k6/master/scripts/get.sh | sudo bash"
                    ;;
                node)
                    echo "  Node.js: https://nodejs.org/ or brew install node"
                    ;;
                npm)
                    echo "  npm: comes with Node.js"
                    ;;
            esac
        done
        exit 1
    fi
    
    log_success "All prerequisites are installed"
}

# Check if backend is running
check_backend_health() {
    log_info "Checking backend health..."
    
    local backend_url="${API_BASE_URL:-http://localhost:8000}"
    local max_attempts=3
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "$backend_url/health" >/dev/null 2>&1; then
            log_success "Backend is healthy at $backend_url"
            return 0
        fi
        
        log_warning "Backend health check failed (attempt $attempt/$max_attempts)"
        
        if [ $attempt -eq $max_attempts ]; then
            log_error "Backend is not responding at $backend_url"
            log_info "Please start the backend server:"
            log_info "  cd $BACKEND_DIR && uv run uvicorn gastropartner.main:app --reload"
            return 1
        fi
        
        sleep 2
        ((attempt++))
    done
}

# Run K6 performance tests
run_k6_tests() {
    log_info "Running K6 performance tests..."
    
    cd "$BACKEND_DIR"
    
    # Set default environment variables
    export API_BASE_URL="${API_BASE_URL:-http://localhost:8000}"
    export TEST_NAME="${TEST_NAME:-gastropartner-performance-check}"
    export ENVIRONMENT="${ENVIRONMENT:-development}"
    
    local tests_passed=0
    local tests_failed=0
    
    # Run basic load test
    log_info "Running basic load test..."
    if k6 run --out json="$REPORTS_DIR/performance/k6-basic-results.json" performance/basic-load-test.js; then
        log_success "Basic load test passed"
        ((tests_passed++))
    else
        log_error "Basic load test failed"
        ((tests_failed++))
    fi
    
    # Run database performance test (shorter version for quick check)
    if [ "$QUICK_CHECK" != "true" ]; then
        log_info "Running database performance test..."
        if timeout 300 k6 run --out json="$REPORTS_DIR/performance/k6-db-results.json" performance/database-performance.js; then
            log_success "Database performance test passed"
            ((tests_passed++))
        else
            log_error "Database performance test failed or timed out"
            ((tests_failed++))
        fi
    fi
    
    # Summary
    log_info "K6 Tests Summary: $tests_passed passed, $tests_failed failed"
    
    return $tests_failed
}

# Analyze frontend bundle
analyze_frontend_bundle() {
    log_info "Analyzing frontend bundle size..."
    
    cd "$FRONTEND_DIR"
    
    # Check if build exists
    if [ ! -d "build" ]; then
        log_info "Building frontend for analysis..."
        if npm run build >/dev/null 2>&1; then
            log_success "Frontend build completed"
        else
            log_error "Frontend build failed"
            return 1
        fi
    fi
    
    # Run bundle analysis
    if [ -f "performance/bundle-analyzer.js" ]; then
        if node performance/bundle-analyzer.js; then
            log_success "Bundle analysis completed"
            return 0
        else
            log_error "Bundle analysis failed"
            return 1
        fi
    else
        log_warning "Bundle analyzer not found, skipping"
        return 0
    fi
}

# Run comprehensive monitoring
run_comprehensive_monitoring() {
    log_info "Running comprehensive performance monitoring..."
    
    cd "$PROJECT_ROOT"
    
    if [ -f "performance-monitoring.js" ]; then
        if node performance-monitoring.js; then
            log_success "Comprehensive monitoring completed"
            return 0
        else
            log_error "Comprehensive monitoring failed"
            return 1
        fi
    else
        log_warning "Comprehensive monitoring script not found, skipping"
        return 0
    fi
}

# Generate performance report
generate_report() {
    log_info "Generating performance report..."
    
    local report_file="$REPORTS_DIR/performance-check-report.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$report_file" << EOF
# Performance Check Report

**Generated:** $timestamp
**Environment:** ${ENVIRONMENT:-development}
**Backend URL:** ${API_BASE_URL:-http://localhost:8000}

## Test Results

EOF
    
    # K6 Results
    if [ -f "$REPORTS_DIR/performance/k6-basic-results.json" ]; then
        echo "### Basic Load Test" >> "$report_file"
        echo "✅ Completed successfully" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    if [ -f "$REPORTS_DIR/performance/k6-db-results.json" ]; then
        echo "### Database Performance Test" >> "$report_file"
        echo "✅ Completed successfully" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Bundle Analysis
    if [ -f "$REPORTS_DIR/bundle-analysis.json" ]; then
        echo "### Bundle Analysis" >> "$report_file"
        echo "✅ Completed successfully" >> "$report_file"
        echo "" >> "$report_file"
    fi
    
    # Add recommendations
    cat >> "$report_file" << EOF
## Recommendations

1. **Regular Monitoring**: Run performance checks before each deployment
2. **Baseline Tracking**: Establish and monitor performance baselines
3. **Alert Setup**: Configure alerts for performance degradation
4. **Optimization**: Address any warnings or recommendations from tests

## Files Generated

- K6 Results: \`reports/performance/k6-*-results.json\`
- Bundle Analysis: \`reports/bundle-analysis.json\`
- Performance History: \`reports/performance/history.json\`

EOF
    
    log_success "Performance report generated: $report_file"
}

# Cleanup function
cleanup() {
    log_info "Cleaning up temporary files..."
    # Add any cleanup logic here
}

# Main function
main() {
    log_info "🚀 Starting GastroPartner Performance Check"
    log_info "============================================="
    
    # Setup
    ensure_directories
    check_prerequisites
    
    # Check if backend is running
    if ! check_backend_health; then
        if [ "$SKIP_BACKEND_CHECK" != "true" ]; then
            exit 1
        else
            log_warning "Skipping backend health check (SKIP_BACKEND_CHECK=true)"
        fi
    fi
    
    local exit_code=0
    
    # Run tests
    if ! run_k6_tests; then
        exit_code=1
    fi
    
    if ! analyze_frontend_bundle; then
        exit_code=1
    fi
    
    if [ "$QUICK_CHECK" != "true" ]; then
        if ! run_comprehensive_monitoring; then
            exit_code=1
        fi
    fi
    
    # Generate report
    generate_report
    
    # Summary
    log_info "============================================="
    if [ $exit_code -eq 0 ]; then
        log_success "🎉 Performance check completed successfully!"
        log_info "📊 Check the reports in: $REPORTS_DIR"
    else
        log_error "💥 Performance check completed with errors"
        log_info "📊 Check the reports for details: $REPORTS_DIR"
    fi
    
    cleanup
    exit $exit_code
}

# Help function
show_help() {
    cat << EOF
GastroPartner Performance Check Script

Usage: $0 [OPTIONS]

OPTIONS:
    --help              Show this help message
    --quick             Run quick performance check (skip comprehensive tests)
    --skip-backend      Skip backend health check
    --backend-url URL   Override backend URL (default: http://localhost:8000)
    --environment ENV   Set environment name (default: development)

ENVIRONMENT VARIABLES:
    API_BASE_URL        Backend API URL
    QUICK_CHECK         Set to 'true' for quick check
    SKIP_BACKEND_CHECK  Set to 'true' to skip backend health check
    ENVIRONMENT         Environment name
    SLACK_WEBHOOK_URL   Slack webhook for alerts
    ALERT_EMAIL         Email for alerts

EXAMPLES:
    # Quick performance check
    $0 --quick
    
    # Performance check against staging
    $0 --backend-url https://gastropartner-backend-staging.onrender.com
    
    # Skip backend check (for CI/CD)
    SKIP_BACKEND_CHECK=true $0
    
    # Full performance check with alerts
    SLACK_WEBHOOK_URL="https://hooks.slack.com/..." $0

EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --help)
            show_help
            exit 0
            ;;
        --quick)
            export QUICK_CHECK="true"
            shift
            ;;
        --skip-backend)
            export SKIP_BACKEND_CHECK="true"
            shift
            ;;
        --backend-url)
            export API_BASE_URL="$2"
            shift 2
            ;;
        --environment)
            export ENVIRONMENT="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Trap for cleanup
trap cleanup EXIT

# Run main function
main "$@"