-- ============================================================
-- BENTO-DO: PostgreSQL Database Setup
-- Project: Bento-do — Group 6
-- ============================================================

-- Extension UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. TABEL: users
-- ============================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(100),
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    max_energy INTEGER NOT NULL DEFAULT 240,
    current_energy INTEGER NOT NULL DEFAULT 240,
    energy_reset_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- ============================================================
-- 1B. TABEL: password_reset_tokens
-- ============================================================
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_hash ON password_reset_tokens(token_hash) WHERE used_at IS NULL;
CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);

-- ============================================================
-- 2. TABEL: guest_sessions
-- ============================================================
CREATE TABLE guest_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_token VARCHAR(255) NOT NULL UNIQUE,
    synced_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- ============================================================
-- 3. TABEL: tasks
-- ============================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    guest_session_id UUID NULL REFERENCES guest_sessions(id) ON DELETE SET NULL,
    title VARCHAR(255) NOT NULL,
    energy_weight VARCHAR(20) NOT NULL CHECK (energy_weight IN ('Ringan', 'Sedang', 'Berat')),
    deadline TIMESTAMP NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
    completed_at TIMESTAMP NULL,
    used_timer BOOLEAN NOT NULL DEFAULT FALSE,
    timer_duration INTEGER NULL,
    source_template VARCHAR(100) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_tasks_user_status_deadline ON tasks(user_id, status, deadline) WHERE deleted_at IS NULL;
CREATE INDEX idx_tasks_guest_session ON tasks(guest_session_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 4. TABEL: task_templates
-- ============================================================
CREATE TABLE task_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(120) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    description TEXT NULL,
    created_by_user_id UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    visibility VARCHAR(20) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public', 'private')),
    level VARCHAR(20) NOT NULL DEFAULT 'Medium' CHECK (level IN ('Low', 'Medium', 'High')),
    is_official BOOLEAN NOT NULL DEFAULT FALSE,
    usage_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_task_templates_visibility ON task_templates(visibility, created_by_user_id) WHERE deleted_at IS NULL;

-- ============================================================
-- 5. TABEL: template_items
-- ============================================================
CREATE TABLE template_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES task_templates(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NULL,
    energy_weight VARCHAR(20) NOT NULL CHECK (energy_weight IN ('Ringan', 'Sedang', 'Berat')),
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- ============================================================
-- 6. TABEL: focus_sessions
-- ============================================================
CREATE TABLE focus_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    ended_at TIMESTAMP NULL,
    duration_minutes INTEGER NULL,
    end_reason VARCHAR(30) NULL CHECK (end_reason IN ('completed', 'escaped', 'zombie_limit', 'crash')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

-- ============================================================
-- 7. TABEL: energy_logs
-- ============================================================
CREATE TABLE energy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    change_amount INTEGER NOT NULL,
    reason VARCHAR(50) NOT NULL CHECK (reason IN ('timer_deduction', 'retroactive_deduction', 'dopamine_rescue', 'daily_reset', 'manual_adjustment')),
    energy_before INTEGER NOT NULL,
    energy_after INTEGER NOT NULL,
    task_id UUID NULL REFERENCES tasks(id),
    focus_session_id UUID NULL REFERENCES focus_sessions(id),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. TABEL: notifications
-- ============================================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    type VARCHAR(30) NOT NULL DEFAULT 'deadline_reminder' CHECK (type IN ('deadline_reminder', 'energy_critical', 'dopamine_rescue')),
    scheduled_at TIMESTAMP NOT NULL,
    sent_at TIMESTAMP NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_notifications_user_unsent ON notifications(user_id, scheduled_at) WHERE sent_at IS NULL AND deleted_at IS NULL;

-- ============================================================
-- TRIGGER: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON tasks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_focus_sessions_updated_at BEFORE UPDATE ON focus_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_guest_sessions_updated_at BEFORE UPDATE ON guest_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_task_templates_updated_at BEFORE UPDATE ON task_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_template_items_updated_at BEFORE UPDATE ON template_items FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
