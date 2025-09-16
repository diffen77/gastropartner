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

### Quality Intelligence System (REVOLUTIONARY UPGRADE)
**🚀 NEXT-GENERATION AI-POWERED QUALITY CONTROL WITH ARCHON INTEGRATION**

**🧠 INTELLIGENT QUALITY SYSTEM - NOW FULLY OPERATIONAL WITH 2,074 PATTERNS:**
```bash
# Real-time intelligent feedback system (PRIMARY)
uv run python quality-control/quality-control/claude_archon_feedback.py --mode hook --files [changed_files]

# Generate intelligence report  
uv run python quality-control/quality-control/claude_archon_feedback.py --mode report

# Proactive quality scanning
uv run python quality-control/quality-control/claude_archon_feedback.py --mode scan

# Legacy bridge system (secondary)
uv run python quality-control/claude_archon_bridge.py --mode hook --files [changed_files]
```

**✅ LIVE SYSTEM STATUS - FULLY OPERATIONAL:**
- **📊 2,074 Code Patterns Indexed** - Complete GastroPartner codebase patterns analyzed
- **🛡️ 664 Security Patterns** - Multi-tenant organization_id filtering, BaseRepository usage
- **⚛️ 561 React/TypeScript Patterns** - Context, hooks, components, accessibility compliance
- **🐍 849 Python/FastAPI Patterns** - Repositories, API endpoints, error handling
- **🧠 ML-Based Pattern Recognition** - Real-time analysis against proven patterns
- **🔄 Archon-Claude Feedback Loop** - Instant knowledge base integration
- **📈 Continuous Learning** - System improves with every code change

**🎯 REVOLUTIONARY FEATURES NOW ACTIVE:**
- **🚨 Proactive Security Detection** - Catches multi-tenant violations before deployment
- **💡 Context-Aware Suggestions** - Fix recommendations based on 2,074 analyzed patterns
- **📚 Historical Success Patterns** - "Files using BaseRepository have 90% fewer security issues"
- **🔍 Real-Time Pattern Matching** - Instant feedback during development
- **⚡ Intelligent Auto-Fix** - Specific code examples and proven solutions
- **📊 Risk Classification** - CRITICAL/HIGH/MEDIUM/LOW with confidence scoring

**LEGACY SYSTEM (deprecated but functional):**
```bash
python3 claude_auto_qc.py  # Old system - use only if new system unavailable
```

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

## 🧠 Quality Intelligence System (AI-Powered Code Assistant)
**🚀 REVOLUTIONARY UPGRADE: Quality Control is now powered by AI and machine learning**

### 🎯 System Architecture - Next Generation

The new Quality Intelligence System represents a quantum leap in code quality:

1. **🧠 Machine Learning Pattern Recognition** - Learns from validation history
2. **🔄 Archon Knowledge Integration** - Real-time pattern storage and retrieval  
3. **📊 Predictive Quality Analysis** - Prevents issues before they occur
4. **🎯 Intelligent Auto-Fix Suggestions** - Context-aware recommendations
5. **📈 Continuous Learning Loop** - Gets smarter with every code change

### 🚀 Revolutionary Components

**🧠 INTELLIGENT QUALITY SYSTEM** (`intelligent_quality_system.py`):
- **ML-based Risk Classification** - Critical, High, Medium, Low
- **Pattern-based Learning** - Learns from successful fixes
- **Multi-language Support** - Python/FastAPI, React/TypeScript, JavaScript
- **Confidence Scoring** - 0.0 to 1.0 reliability metrics

**🔄 ARCHON INTEGRATION** (`archon_integration.py`):
- **Knowledge Base Storage** - All patterns stored in Archon
- **Historical Pattern Analysis** - RAG queries for similar code
- **Success Rate Tracking** - Measures improvement over time
- **Intelligent Suggestions Enhancement** - Combines current + historical data

**🌉 CLAUDE-ARCHON BRIDGE** (`claude_archon_bridge.py`):
- **Real-time Feedback Loop** - Between Claude Code and Archon
- **Proactive Quality Scanning** - Continuous codebase monitoring  
- **Intelligence Reporting** - Comprehensive quality metrics
- **CLI Integration** - Easy command-line operation

### 🧠 Intelligent Feedback Loop Process

**🚀 REVOLUTIONARY WORKFLOW - Machine Learning Powered:**

1. **📁 File Change Detection** - System detects Claude Code modifications
2. **🔍 Historical Pattern Analysis** - RAG query to Archon for similar code patterns  
3. **🧠 ML-based Risk Assessment** - Intelligent classification (Critical/High/Medium/Low)
4. **📊 Enhanced Suggestions** - Combines current analysis + historical success patterns
5. **💾 Knowledge Storage** - Results stored in Archon for future learning
6. **📈 Continuous Learning Update** - System gets smarter with each validation

**🎯 EXAMPLE INTELLIGENT FEEDBACK:**
```
🧠 CLAUDE-ARCHON QUALITY INTELLIGENCE FEEDBACK

📊 ANALYSIS RESULTS:
Risk Level: HIGH (0.85 confidence)
Issues Found: 2 
Auto-fixable: Yes

❌ ISSUES DETECTED:
1. 📁 user_service.py:45
   🚨 Missing organization_id filter - SECURITY BREACH RISK  
   💡 Fix: Add .eq('organization_id', str(organization_id))
   
2. 📁 UserForm.tsx:28
   ♿ Missing accessibility label
   💡 Fix: Add aria-label="User name input"

🎯 ENHANCED SUGGESTIONS (Historical Success):
  • 🎯 Historical success: BaseRepository pattern prevents 90% of similar issues
  • 📊 Most common fix: Add proper organization_id filtering  
  • 🧠 Learning insight: Similar files fixed with dependency injection pattern

⚡ NEXT ACTIONS:
  → 🚨 IMMEDIATE: Fix critical security issue before continuing
  → 🔐 Review all database queries for organization_id filtering
  → 🧪 Add integration tests for multi-tenant scenarios
```

### 🛡️ Advanced Security Intelligence

**🚨 AI-POWERED MULTI-TENANT SECURITY:**
- **🧠 Pattern Recognition** - Detects security anti-patterns automatically
- **📊 Risk Scoring** - ML-based confidence levels for security issues
- **🔄 Historical Learning** - Learns from past security fixes
- **⚡ Auto-Fix Suggestions** - Intelligent recommendations for security hardening
- **🎯 Predictive Analysis** - Prevents issues before they occur

### 📈 Continuous Learning & Performance

**🧠 MACHINE LEARNING METRICS:**
- **Pattern Recognition Accuracy** - Learning success rate over time
- **Security Issue Prevention** - Critical issues caught before deployment  
- **Auto-Fix Success Rate** - How often suggestions work
- **Knowledge Base Growth** - Patterns added to Archon daily
- **Claude Code Performance** - Validation speed and accuracy

### Manual Validation (if needed)

If automatic validation fails, you can manually run:
```bash
# Validate specific files
python quality-control/claude_integration.py file1.py file2.ts

# Validate all changed files  
python auto-quality-wrapper.py

# Monitor quality control system
python quality-control/main.py status
```

### Integration Status

✅ **Claude Code Hook** - Installed at `~/.claude/hooks/post-edit.sh`  
✅ **Quality Agents** - 5 PydanticAI agents active
✅ **Feedback Processing** - Structured error reporting  
✅ **Change Detection** - Real-time file monitoring
✅ **Retry Logic** - Automatic error correction loops

**IMPORTANT: This system is ALWAYS ACTIVE when you work on code. Let it help you write better, more secure code!**

## ⚠️ Important Notes

- **NEVER ASSUME OR GUESS** - When in doubt, ask for clarification
- **Always verify file paths and module names** before use
- **Keep .claude/*.md files updated** when adding new patterns
- **Test your code** - No feature is complete without tests
- **Document your decisions** - Future developers will thank you
- **Quality agents will catch your mistakes** - Let them help you improve

## 🧠 Quality Intelligence System (AI-Powered Code Assistant)

**🚀 REVOLUTIONARY UPGRADE: Quality Control is now powered by AI and machine learning**

The Quality Intelligence System transforms reactive validation into proactive, intelligent assistance that helps you write better code BEFORE problems occur.

### How to Leverage Quality Intelligence

#### 1. **Archon Knowledge Base Integration** (PRIMARY - Use This!)
```bash
# Search for established patterns before implementing (MOST IMPORTANT)
mcp__archon__perform_rag_query --query "organization_id database filtering patterns"
mcp__archon__search_code_examples --query "React Context state management"
mcp__archon__search_code_examples --query "FastAPI repository pattern organization filtering"

# Get live intelligence feedback during development
uv run python quality-control/quality-control/claude_archon_feedback.py --mode hook --files your_file.py

# Proactive scanning for pattern opportunities
uv run python quality-control/quality-control/claude_archon_feedback.py --mode scan
```

**🚀 INTELLIGENT DEVELOPMENT WORKFLOW (Use This Pattern!):**
1. **🔍 Search First**: Before writing ANY new code, search Archon knowledge base for proven patterns
2. **📊 Get Context**: Use RAG queries to understand how similar problems were solved in the codebase  
3. **💡 Apply Intelligence**: Follow suggested patterns with confidence scores and success rates
4. **🧠 Real-time Feedback**: System provides instant guidance as you code
5. **📈 Learn from History**: "Files using BaseRepository pattern have 90% fewer security issues"

**Example: Before Creating a New API Endpoint:**
```bash
# Step 1: Search for API patterns
mcp__archon__perform_rag_query --query "FastAPI endpoint organization_id authentication"
mcp__archon__search_code_examples --query "BaseRepository create method organization filtering"

# Step 2: Review security patterns
mcp__archon__search_code_examples --query "multi-tenant database security patterns"

# Step 3: Implement with confidence using proven patterns
# Step 4: Get real-time validation during development
uv run python quality-control/quality-control/claude_archon_feedback.py --mode hook --files your_new_endpoint.py
```

#### 2. **Proactive Error Prevention**
The system now **PREDICTS** potential problems based on:
- **Historical error patterns** from previous code changes
- **ML analysis** of common mistakes in the codebase
- **Real-time pattern matching** against known anti-patterns

**What you'll see:**
```
🚨 PROACTIVE WARNING: This code pattern often leads to multi-tenant data leakage
💡 SUGGESTION: Add .eq('organization_id', current_user.organization_id) filter
📖 EXAMPLE: See security patterns in knowledge base
```

#### 3. **Context-Aware Suggestions**
When the system detects you're working on specific areas:
- **Security contexts**: Automatic multi-tenant validation suggestions
- **React components**: TypeScript interface and accessibility recommendations  
- **API endpoints**: Authentication and error handling patterns
- **Database queries**: Performance and security optimization tips

#### 4. **Knowledge Base Integration**
Access the growing knowledge base of proven patterns:

**Critical Security Patterns:**
- Multi-tenant organization_id filtering (ALWAYS required)
- Repository pattern with automatic tenant isolation
- Authentication middleware patterns

**React/TypeScript Patterns:**
- Context provider implementations with error handling
- Form state management with loading/error states
- Component TypeScript interfaces with proper typing

**Python/FastAPI Patterns:**
- Repository pattern for database access
- Dependency injection for services
- Error handling and response patterns

### Commands for Quality Intelligence

#### Search Knowledge Base
```bash
# Find security patterns
mcp__archon__perform_rag_query --query "multi-tenant security database queries"

# Find React patterns  
mcp__archon__search_code_examples --query "React Context provider error handling"

# Find backend patterns
mcp__archon__perform_rag_query --query "FastAPI repository pattern organization filtering"
```

#### Quality Metrics
```bash
# View your code quality score
python quality-control/main.py status

# See improvement patterns
python quality-control/main.py patterns

# Check validation success rates
python quality-control/main.py metrics
```

### Understanding Quality Intelligence Feedback

#### Feedback Types:
1. **🚨 CRITICAL**: Security issues, data isolation violations
2. **⚠️ WARNING**: Code quality, performance concerns  
3. **💡 SUGGESTION**: Optimization opportunities, better patterns
4. **📚 KNOWLEDGE**: Related patterns, examples, documentation

#### Sample Intelligent Feedback:
```
🧠 QUALITY INTELLIGENCE ANALYSIS

✅ GOOD PATTERNS DETECTED:
- Proper TypeScript interfaces with organization_id
- Error handling with try-catch blocks
- Loading state management in React components

🚨 SECURITY CONCERN:
File: src/api/recipes.py, Line 45
Pattern: Database query without organization_id filter  
Risk: HIGH - Potential cross-tenant data access
Fix: Add .eq('organization_id', current_user.organization_id)
Example: See BaseRepository pattern in knowledge base

💡 PERFORMANCE OPPORTUNITY:
File: src/components/RecipeForm.tsx, Line 28
Pattern: Missing useCallback for event handler
Impact: Unnecessary re-renders in child components
Fix: Wrap handleInputChange with useCallback([formData])

📚 KNOWLEDGE SUGGESTION:
Based on your changes, you might find these patterns useful:
- "React form validation with error states" 
- "FastAPI dependency injection patterns"
- "Multi-tenant database security checklist"
```

### Quality Intelligence Workflow Integration

#### Before Writing Code:
1. **Search patterns first**: `mcp__archon__perform_rag_query` for established approaches
2. **Check examples**: `mcp__archon__search_code_examples` for similar implementations
3. **Review security**: Always verify multi-tenant compliance

#### During Development:
1. **Real-time feedback**: System suggests improvements as you code
2. **Pattern matching**: Automatic detection of anti-patterns
3. **Context suggestions**: Relevant examples based on current work

#### After Code Changes:
1. **Automatic validation**: Enhanced quality control with ML insights
2. **Learning integration**: System learns from your fixes and improvements
3. **Pattern contribution**: Good patterns automatically added to knowledge base

### Benefits of Quality Intelligence

#### For You (Claude):
- **Proactive guidance** instead of reactive error fixing
- **Pattern discovery** - learn best practices from codebase history
- **Context awareness** - suggestions relevant to current work
- **Continuous improvement** - system gets smarter over time

#### For the Codebase:
- **Consistent patterns** across all components
- **Reduced technical debt** through proactive pattern enforcement
- **Better security** through intelligent multi-tenant validation
- **Knowledge preservation** - patterns documented and searchable

### Quality Intelligence Best Practices

#### DO:
✅ **Search before implementing** - Use RAG queries to find established patterns
✅ **Follow ML suggestions** - The system learns from successful patterns  
✅ **Contribute patterns** - Good implementations automatically enhance the knowledge base
✅ **Use context awareness** - Pay attention to domain-specific suggestions
✅ **Learn from feedback** - Understand WHY certain patterns are recommended

#### DON'T:
❌ **Ignore proactive warnings** - These prevent problems before they occur
❌ **Skip pattern searches** - Reinventing solutions wastes time and introduces inconsistency
❌ **Dismiss security suggestions** - Multi-tenant violations are CRITICAL
❌ **Work in isolation** - The knowledge base contains proven solutions

### System Evolution

The Quality Intelligence System continuously improves:
- **Pattern Recognition**: Learns new patterns from successful implementations
- **Rule Adaptation**: Automatically adjusts validation rules based on success rates
- **Knowledge Expansion**: Grows knowledge base with proven solutions
- **Feedback Optimization**: Improves suggestion accuracy through ML training

**This is not just quality control - it's intelligent development assistance that makes you a better programmer while ensuring code quality, security, and consistency.**