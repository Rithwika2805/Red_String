-- PostgreSQL Database Schema for Red String Detective Engine

-- Clean Reset
DROP TABLE IF EXISTS journal_entries CASCADE;
DROP TABLE IF EXISTS board_state CASCADE;
DROP TABLE IF EXISTS user_progress CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Progress Table
-- Tracks state variables, clues, inventory, and suspicion scores.
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(100) NOT NULL,
    case_type VARCHAR(100) NOT NULL,
    elapsed_time INT DEFAULT 0, -- minutes passed since case start (e.g. 9:00 PM = 0)
    randomized_variables JSONB NOT NULL DEFAULT '{}'::jsonb, -- e.g. safe codes, keys placement
    inventory JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ['pocket_watch', 'drawer_key']
    discovered_evidence JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ['broken_watch']
    discovered_contradictions JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. ['james_lies_study']
    unlocked_dialogues JSONB NOT NULL DEFAULT '[]'::jsonb, -- accessed choice paths
    unlocked_people JSONB NOT NULL DEFAULT '[]'::jsonb, -- people discovered (name, suspect: boolean)
    revealed_suspicion_meters JSONB NOT NULL DEFAULT '[]'::jsonb, -- names of suspects whose meter is visible
    unlocked_scenes JSONB NOT NULL DEFAULT '[]'::jsonb, -- list of rooms/nodes visible
    hints_used INT DEFAULT 0,
    completed BOOLEAN DEFAULT FALSE,
    score INT DEFAULT 0,
    ending_reached VARCHAR(100),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, case_id)
);

-- Board State Table
-- Tracks coordinates and red string threads of the detective pinboard.
CREATE TABLE IF NOT EXISTS board_state (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(100) NOT NULL,
    cards JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{id, type, x, y}]
    connections JSONB NOT NULL DEFAULT '[]'::jsonb, -- e.g. [{id, sourceId, targetId, note, color}]
    zoom FLOAT DEFAULT 1.0,
    pan JSONB NOT NULL DEFAULT '{"x": 0, "y": 0}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (user_id, case_id)
);

-- Journal Entries Table
-- Detective manual entries and system-generated Sherlock thoughts.
CREATE TABLE IF NOT EXISTS journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    case_id VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    pinned BOOLEAN DEFAULT FALSE,
    is_system BOOLEAN DEFAULT FALSE, -- True: Sherlock's internal monologue, False: Player manual notes
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
