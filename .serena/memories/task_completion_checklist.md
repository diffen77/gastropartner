# Task Completion Checklist

## Before Marking Any Task Complete

### Code Quality Checks
- [ ] **Run linting**: `uv run ruff check .` (backend) or `npm run lint` (frontend)
- [ ] **Format code**: `uv run ruff format .` (backend) or `npm run format` (frontend)
- [ ] **Type checking**: `uv run mypy src/` (backend) or TypeScript compilation
- [ ] **Tests pass**: `uv run pytest` (backend) or `npm test` (frontend)
- [ ] **Coverage maintained**: 80%+ test coverage on critical paths

### Database Operations (if applicable)
- [ ] **Use Supabase MCP server** for all database operations
- [ ] **Apply migrations**: Use `mcp__supabase__apply_migration` for schema changes
- [ ] **Run advisors**: Use `mcp__supabase__get_advisors` after schema changes
- [ ] **Test queries**: Verify with `mcp__supabase__execute_sql`

### Documentation
- [ ] **Update docstrings** for new/modified functions
- [ ] **Update type hints** for all function signatures
- [ ] **Document breaking changes** in code comments
- [ ] **Update CLAUDE.md** if new patterns/dependencies added

### Integration Testing
- [ ] **Local testing**: Verify functionality works in development environment
- [ ] **API testing**: Test endpoints with FastAPI auto-docs (backend)
- [ ] **UI testing**: Verify components render correctly (frontend)
- [ ] **Cross-module testing**: Check integration points

### Git Workflow
- [ ] **Clean commit history**: Squash/rebase if necessary
- [ ] **Descriptive commit messages**: Follow conventional commits
- [ ] **No sensitive data**: Ensure no secrets or keys committed
- [ ] **Branch is up to date**: Rebase with main if needed

### Performance Considerations
- [ ] **Bundle size**: Check frontend build size
- [ ] **Query optimization**: Review database query efficiency
- [ ] **Memory usage**: Check for potential memory leaks
- [ ] **Error handling**: Proper exception handling implemented

## Security Checklist
- [ ] **Input validation**: All user inputs validated with Pydantic
- [ ] **Authentication**: Proper auth checks implemented
- [ ] **Environment variables**: Sensitive data in .env files
- [ ] **SQL injection**: Use parameterized queries only

## Architecture Compliance
- [ ] **Modular design**: Code follows vertical slice architecture
- [ ] **SOLID principles**: Single responsibility, dependency inversion
- [ ] **File limits**: Under 500 lines per file, 50 lines per function
- [ ] **Naming conventions**: Consistent with project standards

## Pre-Deployment (if applicable)
- [ ] **Environment configuration**: Staging/production configs ready
- [ ] **Migration scripts**: Database migrations tested
- [ ] **Rollback plan**: Consider how to undo changes if needed
- [ ] **Monitor setup**: Logging and error tracking configured