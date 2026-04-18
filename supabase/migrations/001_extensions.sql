-- Enable UUID generation and crypto if needed
-- Run first. Safe to run multiple times.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
