# Code Style and Conventions

## Python Backend (gastropartner-backend)

### Code Style
- **Line Length**: 100 characters (configured in pyproject.toml)
- **String Quotes**: Double quotes
- **Indentation**: 4 spaces
- **Import Style**: Follow PEP8, use `ruff` for import sorting

### Type Hints & Documentation
- **Always use type hints** for function signatures and class attributes
- **Google-style docstrings** for all public functions, classes, and modules
- **Pydantic v2** for data validation and settings management

### File Structure Limits
- **Files**: Never longer than 500 lines
- **Functions**: Under 50 lines with single responsibility
- **Classes**: Under 100 lines representing single concept
- **Modules**: Organize by feature/responsibility

### Design Principles
- **KISS**: Keep It Simple, Stupid - choose straightforward solutions
- **YAGNI**: You Aren't Gonna Need It - implement only when needed
- **Dependency Inversion**: High-level modules depend on abstractions
- **Single Responsibility**: Each function/class/module has one purpose
- **Fail Fast**: Check for errors early and raise exceptions immediately

### Database Conventions
- **Entity-specific primary keys**: `{entity}_id` (e.g., `lead_id`, `session_id`)
- **Foreign keys**: `{referenced_entity}_id`
- **Timestamps**: `{action}_at` (e.g., `created_at`, `updated_at`)
- **Booleans**: `is_{state}` (e.g., `is_active`, `is_qualified`)
- **Always use Supabase MCP server** for database operations

### Naming Conventions
- **Variables/functions**: `snake_case`
- **Classes**: `PascalCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private attributes**: `_leading_underscore`
- **Type aliases**: `PascalCase`

## Frontend (React/TypeScript)
- Standard Create React App conventions
- TypeScript for type safety
- Component-based architecture

## Testing
- **TDD Approach**: Write tests first, then implementation
- **Tests live next to code** they test
- **Descriptive test names** explaining behavior
- **80%+ coverage** focusing on critical paths
- **pytest** for backend, **Jest/React Testing Library** for frontend

## Quality Gates
- **Ruff**: Linting and formatting
- **MyPy**: Type checking
- **Pytest**: Testing with coverage reports
- **Pre-commit hooks**: Automated quality checks

## Git Conventions
- **Branch naming**: `feature/*`, `fix/*`, `docs/*`, `refactor/*`
- **Commit messages**: Conventional commits format
- **Never include "claude code" in commit messages**