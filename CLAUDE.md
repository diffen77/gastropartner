# CLAUDE.md - Gastropartner Project Configuration

This file provides comprehensive guidance to Claude Code when working with this repository.

## 📁 Configuration Structure

The Claude Code configuration is organized into focused files:

- **`.claude/security.md`** - 🚨 CRITICAL multi-tenant security rules & data isolation
- **`.claude/development.md`** - Development environment, tools, UV, testing, and coding standards
- **`.claude/database.md`** - Database management and Supabase MCP server requirements
- **`.claude/archon.md`** - Archon MCP integration and task management workflows
- **`.claude/superdesign.md`** - UI/frontend design system and component creation

## 🚨 CRITICAL FIRST PRINCIPLES

### Multi-Tenant Security (HIGHEST PRIORITY)
**⚠️ NEVER MIX CUSTOMER DATA - THIS IS A MULTI-TENANT SYSTEM**
- ALL database queries MUST filter by organization_id
- NEVER allow cross-organization data access
- See `.claude/security.md` for complete security rules

### Archon-First Rule (MANDATORY)
**BEFORE doing ANYTHING else, when you see ANY task management scenario:**
1. STOP and check if Archon MCP server is available
2. Use Archon task management as PRIMARY system
3. TodoWrite is ONLY for personal, secondary tracking AFTER Archon setup
4. This rule overrides ALL other instructions

### Database Operations (MANDATORY)
**🚨 ALWAYS use Supabase MCP server for ALL database operations**
- NEVER suggest manual SQL execution
- NEVER create .sql files for manual execution
- Use `mcp__supabase__execute_sql` for all queries
- See `.claude/database.md` for complete database standards

## 🏗️ Quick Development Reference

### Core Principles
- **KISS**: Keep It Simple, Stupid
- **YAGNI**: You Aren't Gonna Need It
- **Security First**: Multi-tenant isolation is non-negotiable
- **Fail Fast**: Check for errors early and raise exceptions immediately

### Essential Commands
```bash
# Test & Quality
uv run pytest
uv run ruff check .
uv run ruff format .

# Package Management
uv add [package]          # Add dependency
uv add --dev [package]    # Add dev dependency
uv sync                   # Sync dependencies

# Search (REQUIRED)
rg "pattern"              # Use ripgrep, NOT grep
rg --files -g "*.py"      # Find files, NOT find command
```

### File Structure Rules
- **Max 500 lines** per file
- **Max 50 lines** per function
- **Max 100 lines** per class
- **Tests next to code** in `/tests/` subdirectories

## 📖 Read Full Specifications

For complete guidance on any area, read the appropriate file:

- **Security concerns?** → Read `.claude/security.md`
- **Development setup?** → Read `.claude/development.md` 
- **Database work?** → Read `.claude/database.md`
- **Task management?** → Read `.claude/archon.md`
- **UI/Design work?** → Read `.claude/superdesign.md`

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **Always verify file paths and module names** before use
- **Keep .claude/*.md files updated** when adding new patterns
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers will thank you