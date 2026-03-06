CREATE TABLE feedback (
    id UUID PRIMARY KEY,
    name VARCHAR(120) NULL,
    email VARCHAR(254) NULL,
    category VARCHAR(40) NOT NULL,
    message VARCHAR(4000) NOT NULL,
    screenshot_url VARCHAR(2048) NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'New',
    CONSTRAINT ck_feedback_category CHECK (category IN ('Bug Report', 'Feature Request', 'Improvement', 'General Feedback')),
    CONSTRAINT ck_feedback_status CHECK (status IN ('New', 'Under Review', 'Planned', 'Completed'))
);

CREATE INDEX idx_feedback_created_at ON feedback (created_at DESC);
CREATE INDEX idx_feedback_status ON feedback (status);
