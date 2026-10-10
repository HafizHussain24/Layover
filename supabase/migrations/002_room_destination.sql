-- Migration 002: Add trip destination fields to rooms table
-- Run this in Supabase SQL Editor:

ALTER TABLE rooms
  ADD COLUMN IF NOT EXISTS destination_name TEXT,
  ADD COLUMN IF NOT EXISTS destination_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS destination_lng DOUBLE PRECISION;
