-- Cobertura por región (control maestro) — v1.3.3

CREATE TABLE IF NOT EXISTS coverage_regions (
  region_code VARCHAR(64) PRIMARY KEY,
  region_name VARCHAR(160) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_coverage_regions_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
