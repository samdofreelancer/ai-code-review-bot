# ai-code-review-bot

## Project Overview

This project is a Node.js based AI code review bot that compares code changes between branches and provides review feedback using the Sourcegraph Cody AI assistant.

It automates the process of reviewing code diffs by sending them to an AI model and collecting suggestions and issues.

## Technology Stack

- Node.js
- dotenv for environment variable management
- child_process for executing git commands
- https module for making API requests
- Sourcegraph Cody API for AI-powered code review

## How to Run

To run this project, use the following command:

```
node review.js <your-feature-branch> <base-branch>
```

Replace `<your-feature-branch>` and `<base-branch>` with the appropriate branch names.

Example: node review.js feature/add-logging main

## Workflow

```mermaid
flowchart TD
    A[Checkout feature branch] --> B[Run review script]
    B --> C[Generate review report]
    C --> D[Review AI suggestions]
    D --> E[Update code]
    E --> F{Code meets quality standards?}
    F -- No --> B
    F -- Yes --> G[Complete pull request review]
