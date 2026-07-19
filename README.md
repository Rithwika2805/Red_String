# 🧵 Red String - Detective Mystery Puzzle Engine

**Red String** is a data-driven detective investigation puzzle game engine built with React, TypeScript, Node.js, Express, and PostgreSQL. The game revolves around manual deduction: players explore crime scenes, collect physical evidence, interview suspects, solve contradictions during cross-examinations, and present their case to a judge via a drag-and-drop table.

---

## 🏛️ Game Architecture & Mechanics

### 1. Unified 2D Detective Office Dashboard
Instead of standard page tabs, players navigate the game by clicking physical items in a skeuomorphic 2D detective office:
- **The Corkboard**: Accesses the zoomable, pannable, thread-linking Investigation Board.
- **Manila Folders**: Opens the Case selector folder.
- **Map & Clipboard**: Opens the Room exploration point-and-click navigator.
- **Leather Journal**: Accesses the typewriter notebook containing custom entries and system thoughts.
- **Cabinet Drawers**: Displays the categorized Inventory item dossier inspector.
- **Accusation Plate**: Reaches the final drag-and-drop case presentation slots.

### 2. Pure Data-Driven Mystery Design
The game engine does not hardcode clues or suspect logic. All content is driven by structured JSON assets inside `backend/src/data/cases/<case-id>/data/`:
- `case.json`: Handles metadata, time limits, starting locations.
- `evidence.json`: Declares clue descriptors, reliability tiers, tags, search costs, and suspicion impacts.
- `suspects.json`: Houses character descriptors, schedules, secrets, and suspicion thresholds.
- `dialogues.json`: Models deep conditional dialogue trees with unlocking flags and contradiction mappings.
- `investigation.json`: Represents hierarchical rooms, containers, locks, key requirements, and search rewards.
- `endings.json`: Outlines scoring metrics and evaluation parameters for 4 endings.

### 3. State Management & Persistency
- **PostgreSQL Database**: Persists user authentication (`users`), board pins & strings (`board_state`), text journal entries (`journal_entries`), and progression variables (`user_progress`).
- **Dynamic Suspicion Engine**: Character suspicion levels are calculated dynamically on the server based on discovered clues and contradictions, unlocking their suspect badge and suspicion meter once threshold limits are met.
- **NPC Memory**: Suspects change dialogue coldness and behavior based on historical gameplay paths (e.g. accusing a butler falsely triggers cold/dismissive remarks later).
- **Procedural Sound Design**: Incorporates typewriter ticks, paper rustles, thread pins, and stamp thuds generated procedurally via the browser's Web Audio API.

---

## 🛠️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL database

### Local Setup
1. Clone the repository and navigate to the project directory:
   ```bash
   cd red-string
   ```
2. Install monorepo dependencies:
   ```bash
   npm install
   npm run install:all
   ```
3. Setup PostgreSQL Environment:
   Create a `.env` file in the `backend/` directory based on `backend/.env.example` and set your database connection:
   ```env
   DATABASE_URL=postgresql://your_db_user:password@localhost:5432/your_database_name
   JWT_SECRET=your_jwt_secret_key
   ```
4. Run Seeding & Schema Setup:
   Initialize the database schema:
   ```bash
   npm run db:seed
   ```
5. Run Development Servers:
   Run both frontend client and backend API concurrently:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` to play.