# GastroPartner Project Overview

## Project Purpose
GastroPartner is a modular SaaS platform designed for small-scale food producers, restaurants, and food service operators. The system helps customers easily get an overview of their business performance, identify areas that don't generate sufficient value, and provide suggestions for improvements.

## Key Features
- **Modular Architecture**: Each module can contain free and paid tiers (freemium model)
- **Multi-tenant System**: Designed to serve many types of businesses
- **Easy Onboarding**: Customers should be able to start quickly without background knowledge
- **Example Modules**: Cost control for dishes, staff management, online orders, sales forecasting

## Tech Stack
- **Backend**: Python 3.11+, FastAPI, Supabase (cloud database)
- **Frontend**: React, TypeScript
- **Package Management**: UV (backend), npm (frontend)
- **Database**: Supabase (staging and production in cloud)
- **Testing**: Playwright Intelligent Test Suite
- **Domain**: gastropartner.nu

## Project Structure
```
gastropartner/
├── gastropartner-backend/     # Python/FastAPI backend
├── gastropartner-frontend/    # React/TypeScript frontend
├── playwright-intelligent/    # Intelligent test suite
└── .github/workflows/        # CI/CD pipelines
```

## Development Philosophy
- Always maintain local → staging → production flow
- Automated testing for rapid development
- Never let technology or heavy processes prevent agile development
- Clean, simple, modern design suitable for users with limited computer experience
- Mobile and desktop responsive