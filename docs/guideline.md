Phase 1: Create Project Documentation First

Before generating any code, create these files.

1. PRD.md (Product Requirements Document)

This is the most important file.

Example:

# Project Overview

A dashboard for managing customers, invoices, and analytics.

# Users

- Admin
- Manager
- Staff

# Features

## Authentication
- Login
- Register
- Forgot password

## Customer Management
- Create customer
- Edit customer
- Delete customer
- Search customer

## Dashboard
- Revenue chart
- Customer statistics

# Non Functional Requirements

- Mobile responsive
- Dark mode
- Fast loading

Prompt:

Read PRD.md and ask me questions until requirements are crystal clear.
Do not generate code.
Identify missing requirements and edge cases.
2. ARCHITECTURE.md

Ask AI:

Based on PRD.md create ARCHITECTURE.md

Include:
- Folder structure
- Database design
- API design
- Authentication flow
- State management
- Deployment architecture
3. DATABASE.md

Example:

Users
- _id
- name
- email
- password

Customers
- _id
- companyName
- phone
- createdBy

Prompt:

Review DATABASE.md as a senior database architect.
Normalize where necessary.
Identify future scaling issues.
4. API.md

Example:

POST /api/auth/login
POST /api/auth/register

GET /api/customers
POST /api/customers

PUT /api/customers/:id
DELETE /api/customers/:id

Prompt:

Review API.md.
Find security issues.
Suggest REST improvements.
Suggest validation requirements.
Phase 2: Create AI Rules

Create:

AI_RULES.md

Example:

# Coding Standards

- Typescript only
- No any types
- Functional components only
- Tailwind CSS
- Zod validation
- React Query
- Error handling everywhere
- Mobile first design

# Architecture

- Feature based folders
- Reusable components
- No duplicated code

# Security

- Validate all inputs
- Sanitize outputs
- Never expose secrets

Now every prompt becomes:

Read:
- PRD.md
- ARCHITECTURE.md
- AI_RULES.md

Follow them strictly.

This dramatically improves consistency.

Phase 3: Generate Feature-by-Feature

Bad:

Build my entire app.

Good:

Implement authentication module.

Requirements:
- Read PRD.md
- Read ARCHITECTURE.md
- Read AI_RULES.md

Tasks:
1. Backend routes
2. Mongo schema
3. Validation
4. JWT auth
5. Frontend pages

Return implementation plan first.
Phase 4: Use Multiple Models

Since you mentioned:

DeepSeek (OpenCode)
Kimi (Cloudflare)
Claude (GitLab Duo)

A powerful workflow is:

Claude

Use for:

Architecture
Planning
Refactoring
Large code reviews

Prompt:

Act as a principal software architect.
Review this feature implementation.
Find design flaws.
DeepSeek

Use for:

Writing code
CRUD APIs
Database logic
Backend features

Prompt:

Implement according to existing architecture.
Do not change structure.
Kimi

Use for:

Large context
Reading multiple files
Documentation
Debugging

Prompt:

Analyze entire repository.
Find inconsistencies between PRD and implementation.
Phase 5: AI Code Review

Never merge AI-generated code directly.

After generating:

Review this code.

Check:
- Bugs
- Security
- Performance
- Edge cases
- Typescript issues
- Scalability issues

Give severity:
Critical
High
Medium
Low
Phase 6: AI QA Testing

Create:

TEST_CASES.md

Prompt:

Generate exhaustive test cases.

Include:
- Happy paths
- Validation errors
- Security tests
- Edge cases
- Mobile tests

Then:

Act as a QA engineer.

Try to break this feature.
List all possible failure scenarios.
Phase 7: AI Debugging

Instead of:

Fix this bug.

Use:

Root-cause analyze this issue.

Symptoms:
...

Relevant files:
...

Explain:
1. Cause
2. Evidence
3. Fix
4. Alternative fixes

Do not write code yet.

This usually gives much better results.

Phase 8: Before Deployment

Ask AI:

Act as a senior security engineer.

Review entire application.

Check:
- Authentication
- Authorization
- API security
- Rate limiting
- XSS
- CSRF
- Mongo injection
- Secrets management

Then:

Act as a senior DevOps engineer.

Create deployment checklist.
Recommended Project Folder
project/
│
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── DATABASE.md
│   ├── API.md
│   ├── AI_RULES.md
│   ├── TEST_CASES.md
│
├── frontend/
├── backend/
│
├── tasks/
│   ├── current-task.md
│   ├── backlog.md
│
└── prompts/
    ├── feature-prompt.md
    ├── review-prompt.md
    └── debug-prompt.md

For an intermediate-to-advanced dashboard/web app, a highly effective pattern is:

Define requirements in PRD.md
Generate architecture
Generate database design
Generate API contracts
Generate one feature at a time
Run AI code review
Run AI QA review
Commit to Git
Move to next feature