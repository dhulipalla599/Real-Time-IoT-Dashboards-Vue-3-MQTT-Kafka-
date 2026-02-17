-- Initialize IoT Platform Database

-- Create devices table
CREATE TABLE IF NOT EXISTS devices (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    status VARCHAR(50) DEFAULT 'offline',
    firmware_version VARCHAR(50),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_seen TIMESTAMP
);

CREATE INDEX idx_devices_status ON devices(status);
CREATE INDEX idx_devices_type ON devices(type);
CREATE INDEX idx_devices_last_seen ON devices(last_seen DESC);

-- Create telemetry history table (for time-series data)
CREATE TABLE IF NOT EXISTS telemetry_history (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    timestamp TIMESTAMP NOT NULL,
    signal_strength INTEGER,
    latency INTEGER,
    temperature DECIMAL(5, 2),
    uptime BIGINT,
    data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_telemetry_device_time ON telemetry_history(device_id, timestamp DESC);
CREATE INDEX idx_telemetry_timestamp ON telemetry_history(timestamp DESC);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id VARCHAR(50) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
    message TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT FALSE,
    acknowledged_by VARCHAR(255),
    acknowledged_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX idx_alerts_device ON alerts(device_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_alerts_unacknowledged ON alerts(acknowledged) WHERE acknowledged = FALSE;

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'viewer' CHECK (role IN ('admin', 'operator', 'viewer')),
    permissions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- Create device configurations table
CREATE TABLE IF NOT EXISTS device_configs (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    config_key VARCHAR(100) NOT NULL,
    config_value TEXT,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(device_id, config_key)
);

-- Insert sample devices
INSERT INTO devices (id, name, type, location, latitude, longitude, status, firmware_version) VALUES
('DEV-001', 'Gateway Alpha', 'gateway', 'Building A - Floor 1', 37.7749, -122.4194, 'online', '2.1.4'),
('DEV-002', 'Sensor Beta', 'temperature_sensor', 'Building A - Floor 2', 37.7750, -122.4195, 'online', '1.8.2'),
('DEV-003', 'Camera Gamma', 'camera', 'Building B - Entrance', 37.7751, -122.4196, 'degraded', '3.0.1'),
('DEV-004', 'Gateway Delta', 'gateway', 'Building B - Floor 1', 37.7752, -122.4197, 'offline', '2.1.3'),
('DEV-005', 'Sensor Epsilon', 'pressure_sensor', 'Building C - Roof', 37.7753, -122.4198, 'online', '1.9.0')
ON CONFLICT (id) DO NOTHING;

-- Insert sample user (password: admin123)
INSERT INTO users (email, username, password_hash, role, permissions) VALUES
('admin@iot-platform.com', 'admin', '$2b$10$rO5Z8qKZHKZQxKZHKZHKZeJ5Y8qKZHKZQxKZHKZHKZHKZQ', 'admin', '["device:read", "device:configure", "device:firmware", "alert:manage", "user:manage"]'::jsonb)
ON CONFLICT (email) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_devices_updated_at BEFORE UPDATE ON devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_device_configs_updated_at BEFORE UPDATE ON device_configs
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
