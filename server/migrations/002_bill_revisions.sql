CREATE TABLE IF NOT EXISTS bill_revisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  bill_id BIGINT UNSIGNED NOT NULL,
  revision_number INT UNSIGNED NOT NULL,
  previous_total_litres DECIMAL(12,2) NOT NULL,
  previous_total_amount DECIMAL(12,2) NOT NULL,
  previous_status VARCHAR(20) NOT NULL,
  previous_lines JSON NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY one_revision_number (bill_id, revision_number),
  CONSTRAINT fk_revision_bill FOREIGN KEY (bill_id) REFERENCES bills(id)
);
