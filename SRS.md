# Software Requirements Specification (SRS) for AI Code Review Bot

## 1. Introduction

### 1.1 Purpose
This document specifies the software requirements for the AI Code Review Bot project. The purpose is to provide a detailed description of the system's functionality, performance, and interfaces to guide development and ensure alignment with user needs.

### 1.2 Project Overview
The AI Code Review Bot is a Node.js based tool that automates the review of code changes between branches using the Sourcegraph Cody AI assistant. It analyzes code diffs, sends them to an AI model for review, and collects suggestions and issues to assist developers in improving code quality.

## 2. Overall Description

### 2.1 Product Perspective
The product is a standalone Node.js application that interacts with Git repositories and the Sourcegraph Cody API. It automates the manual process of code review by leveraging AI to provide feedback on code changes.

### 2.2 Technology Stack
- Node.js runtime environment
- dotenv for environment variable management
- child_process module for executing Git commands
- https module for making API requests
- Sourcegraph Cody API for AI-powered code review

### 2.3 Workflow Overview
1. Clone the target Git repository if not already present.
2. Checkout the target branch.
3. Identify changed files between the target branch and feature branch.
4. Generate diffs for each changed file.
5. Build AI review prompts based on the diffs.
6. Send prompts to the Sourcegraph Cody API and receive review feedback.
7. Parse and aggregate AI review issues.
8. Save the review results to an output file.
9. Handle retries and concurrency limits during API calls.

## 3. Functional Requirements

### 3.1 Repository Management
- Clone the repository if it does not exist locally.
- Fetch all remote branches.

### 3.2 Branch Management
- Checkout the specified target branch.
- Compare changes against the specified feature branch.

### 3.3 Change Detection
- Retrieve the list of files changed between the target and feature branches.
- Generate diffs for each changed file.

### 3.4 AI Review Prompt Construction
- Build structured review messages including file paths and diffs.
- Format prompts to request JSON-formatted issue reports from the AI.

### 3.5 AI Review Execution
- Send review prompts to the Sourcegraph Cody API.
- Handle streaming API responses.
- Parse JSON arrays of issues or extract issues from markdown if JSON parsing fails.

### 3.6 Result Aggregation and Storage
- Aggregate review issues per file.
- Save aggregated results to a JSON file in the output directory.

### 3.7 Error Handling and Retry
- Detect API rate limits or concurrency errors.
- Retry failed requests up to a maximum number of attempts with delay intervals.

### 3.8 Concurrency Control
- Limit the number of concurrent review requests to a configurable maximum.

## 4. Non-Functional Requirements

### 4.1 Performance
- Support configurable maximum concurrency for parallel review tasks to optimize throughput.

### 4.2 Reliability
- Implement retry logic for transient API errors such as rate limiting.

### 4.3 Configuration
- Use environment variables for sensitive configuration such as API tokens.

## 5. External Interfaces

### 5.1 Command Line Interface
- Usage: `node review.js <feature-branch> <target-branch>`
- Accepts feature branch and target branch names as arguments.

### 5.2 Environment Variables
- `CODY_API_TOKEN`: Token for authenticating with the Sourcegraph Cody API.

## 6. Assumptions and Dependencies

- Node.js runtime is installed and accessible.
- Git is installed and available in the system PATH.
- Network access to the Sourcegraph Cody API endpoint.
- Valid API token for Sourcegraph Cody API is provided via environment variables.
