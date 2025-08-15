# GastroPartner Backend - Development Makefile

.PHONY: help install test test-report test-watch coverage lint format type-check clean dev

# Default target
help: ## Show this help message
	@echo "GastroPartner Backend Development Commands"
	@echo "=========================================="
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "\033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Installation and setup
install: ## Install dependencies
	uv sync

# Testing commands
test: ## Run tests (basic)
	uv run pytest

test-report: ## Run tests with comprehensive reporting (always generates reports)
	@echo "🧪 Running tests with comprehensive reporting..."
	@uv run python run_tests.py

test-watch: ## Run tests in watch mode
	uv run pytest-watch

test-fast: ## Run tests without coverage (faster)
	uv run pytest --no-cov

test-failing: ## Run only failing tests
	uv run pytest --lf

test-new: ## Run only new/modified tests
	uv run pytest --ff

# Coverage commands  
coverage: ## Generate coverage report
	uv run pytest --cov=src/gastropartner --cov-report=html:reports/htmlcov
	@echo "Coverage report: file://$(PWD)/reports/htmlcov/index.html"

coverage-xml: ## Generate XML coverage report
	uv run pytest --cov=src/gastropartner --cov-report=xml:reports/coverage.xml

# Code quality
lint: ## Run linter (ruff)
	uv run ruff check .

lint-fix: ## Fix linting issues automatically
	uv run ruff check --fix .

format: ## Format code
	uv run ruff format .

type-check: ## Run type checking
	uv run mypy src/

# Combined quality check
check: lint type-check test-report ## Run all quality checks

# Development server
dev: ## Start development server
	uv run uvicorn gastropartner.main:app --reload --host 0.0.0.0 --port 8000

# Cleanup
clean: ## Clean up generated files
	rm -rf reports/
	rm -rf .pytest_cache/
	rm -rf .coverage
	rm -rf __pycache__/
	find . -name "*.pyc" -delete
	find . -name "__pycache__" -type d -exec rm -rf {} +

# Project info
info: ## Show project information
	@echo "Project: GastroPartner Backend"
	@echo "Python: $(shell uv run python --version)"
	@echo "Pytest: $(shell uv run pytest --version | head -n 1)"
	@echo "Coverage: $(shell uv run coverage --version)"
	@echo "Working dir: $(PWD)"