# Test Suite Documentation

This document outlines the Jest-based testing setup for the JSON file sharing system's backend business logic.

## Test Structure

### 📁 `tests/utils/`
Unit tests for core business logic functions:

#### `shareCreation.test.ts` (17 tests)
- **File Size Validation**: Tests for 50MB file size limit enforcement
- **JSON Content Validation**: Validates proper JSON parsing and error handling
- **Expiry Date Calculation**: Tests date calculations for 1, 7, 30-day and permanent shares
- **User ID Validation**: Ensures proper user identification requirements
- **Database Operations**: Mocks share creation with various data scenarios

#### `expiryValidation.test.ts` (16 tests)
- **Share Expiry Logic**: Tests expiry detection for different scenarios
- **User Active Shares**: Validates filtering of non-expired shares
- **Database Queries**: Tests finding shares by ID with expiry checks
- **Date Boundary Handling**: Tests month boundaries and leap year calculations

### 📁 `tests/api/`
Integration tests for API endpoint business logic:

#### `shares.integration.test.ts` (12 tests)
- **POST /api/shares**: Share creation with validation
- **GET /api/shares/[id]**: Share retrieval with expiry checks
- **GET /api/my-shares**: User share listing with filtering
- **DELETE /api/my-shares/[id]**: Share deletion with ownership verification

## Key Test Scenarios

### ✅ Share Creation Logic
- File size validation (under/over 50MB limit)
- JSON format validation (valid/invalid JSON)
- Expiry date calculations (1/7/30 days, permanent)
- User authentication requirements

### ✅ Expiry Validation Logic
- Permanent shares (null expiresAt) never expire
- Non-expired shares remain accessible
- Expired shares are properly detected
- Exact expiry time handling (not expired at exact time, expired after)

### ✅ User-Based Operations
- Share creation requires valid user ID
- Share retrieval works for any user
- User share listing filters by userId and expiry
- Share deletion requires ownership verification

### ✅ Database Integration
- Proper Prisma client method calls
- Correct query parameters and filters
- Mock data scenarios for all operations

## Running Tests

```bash
# Run all tests
bun run test

# Run tests in watch mode
bun run test:watch

# Run tests with coverage
bun run test:coverage
```

## Test Results
✅ **45 tests passing**
- 17 tests for share creation logic
- 16 tests for expiry validation logic  
- 12 tests for API integration scenarios

## Configuration

- **Framework**: Jest with ts-jest preset
- **Environment**: Node.js
- **Mocking**: Prisma Client and Nuxt functions are mocked
- **Coverage**: Configured for server/**/*.ts files
- **Module Resolution**: Supports ~/path and @/path aliases