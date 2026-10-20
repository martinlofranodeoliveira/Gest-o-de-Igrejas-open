# Database Schema Documentation

This document describes the unified SQLite database schema for local persistence in the ZelloLife application.

## Table: `members`
Stores information about church members and leadership.
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `name` (TEXT NOT NULL): Member's full name.
- `date` (TEXT NOT NULL): Registration or birth date.
- `type` (TEXT NOT NULL): Role/type of member (e.g., 'pastor', 'member', 'admin').
- `photo` (TEXT): File name of the member's photo stored in the uploads directory.

## Table: `finances`
Stores financial transactions (tithes, offerings, expenses).
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `name` (TEXT NOT NULL): Description of the transaction.
- `type` (TEXT NOT NULL): Transaction type (e.g., 'income', 'expense').
- `amount` (REAL NOT NULL): Value of the transaction.
- `method` (TEXT NOT NULL): Payment method (e.g., 'PIX', 'Cash', 'Card').
- `date` (TEXT NOT NULL): Date of the transaction.

## Table: `events`
Stores church events.
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `title` (TEXT NOT NULL): Title of the event.
- `date` (TEXT NOT NULL): Date of the event.
- `time` (TEXT NOT NULL): Time of the event.

## Table: `prayers`
Stores prayer requests.
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `category` (TEXT NOT NULL): Category of the prayer request.
- `author` (TEXT NOT NULL): Who submitted the request.
- `time` (TEXT NOT NULL): Time/Date submitted.
- `content` (TEXT NOT NULL): The prayer request content.
- `count` (INTEGER DEFAULT 0): Number of times people have prayed for this request.

## Table: `branches`
Stores church branches/locations.
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `name` (TEXT NOT NULL): Name of the branch.

## Table: `users`
Stores administrative users.
- `id` (TEXT PRIMARY KEY): Unique identifier (UUID).
- `email` (TEXT UNIQUE NOT NULL): User email.
- `password` (TEXT NOT NULL): User password.
- `displayName` (TEXT): User's display name.
- `role` (TEXT DEFAULT 'member'): System role (e.g., 'admin').

## Architecture Changes (GH-20)
- **ID Generation:** UUID generation has been moved from the Main process (`electron/main.cjs`) to the Renderer process service (`src/services/sqliteRepository.ts`). This ensures that the object has its final `id` before it hits the IPC bridge, allowing for synchronous use of the generated ID in the frontend and a more atomic IPC insert layer.
- **Completeness:** All domain properties defined in `IDataRepository` interface types (`src/types.ts`) such as `photo` in `Member`, `method` in `Finance`, and `count` in `PrayerRequest` are explicitly typed and successfully mapped to the persistent schema.
