-- Coordenadas de la dirección de servicio del cliente
ALTER TABLE users ADD COLUMN address_lat DECIMAL(10, 7) NULL;
ALTER TABLE users ADD COLUMN address_lng DECIMAL(10, 7) NULL;
ALTER TABLE users ADD COLUMN address_place_id VARCHAR(32) NULL;
