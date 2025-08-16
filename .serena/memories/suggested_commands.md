# Essential Development Commands

## Backend Commands (gastropartner-backend/)
```bash
# Environment setup
uv venv                                    # Create virtual environment
uv sync                                    # Install dependencies
uv add package_name                        # Add new dependency
uv add --dev package_name                  # Add dev dependency

# Development
uv run uvicorn src.gastropartner.main:app --reload    # Start development server
uv run pytest                             # Run tests
uv run pytest --cov=src/gastropartner     # Run tests with coverage

# Code Quality
uv run ruff check .                        # Lint code
uv run ruff format .                       # Format code
uv run mypy src/                          # Type checking
```

## Frontend Commands (gastropartner-frontend/)
```bash
# Development
npm install                               # Install dependencies
npm start                                # Start development server (localhost:3000)
npm test                                 # Run tests
npm run build                            # Build for production
```

## Playwright Testing (playwright-intelligent/)
```bash
# Development
npm install                              # Install dependencies
npm run install-browsers                 # Install browser binaries
npm test                                # Run tests
npm run test:headed                     # Run tests with browser UI
npm run test:ui                         # Run with Playwright UI
npm run smart-test                      # Run intelligent test suite

# Docker commands
docker-compose --profile development up  # Start development environment
docker-compose up postgres intelligent-runner  # Production mode
```

## Git & Project Management
```bash
# Standard Git workflow
git checkout main && git pull origin main
git checkout -b feature/your-feature
# Make changes
git push origin feature/your-feature
# Create PR

# Darwin/macOS specific commands
rg "pattern"                            # Use ripgrep instead of grep
rg --files | rg "\.py$"                # Find files by pattern
```

## Environment Setup
- Backend requires `.env.development` with Supabase keys
- Frontend requires `.env` with API configuration
- Playwright requires database configuration in `.env`