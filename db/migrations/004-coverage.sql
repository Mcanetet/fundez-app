-- Cobertura territorial por región y comuna (v1.3.3)

CREATE TABLE IF NOT EXISTS coverage_communes (
  region_code VARCHAR(64) NOT NULL,
  commune_code VARCHAR(64) NOT NULL,
  region_name VARCHAR(160) NOT NULL,
  commune_name VARCHAR(120) NOT NULL,
  enabled TINYINT(1) NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (region_code, commune_code),
  INDEX idx_coverage_enabled (enabled),
  INDEX idx_coverage_region (region_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
