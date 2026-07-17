-- ============================================================
-- reality-shop · ecommerce database bootstrap
--
-- Creates the dedicated role + database, isolated from Strapi.
-- Idempotent: safe to run multiple times.
--
-- MUST be executed with psql (uses \set / \getenv / \gexec):
--
--   Path A · existing PG instance (local or VPS):
--     psql -h <host> -p <port> -U <admin> -d postgres \
--          -v ON_ERROR_STOP=1 -f infra/postgres-init.sql
--
--   Path B · fresh docker compose PG:
--     mounted into /docker-entrypoint-initdb.d/, runs automatically
--     on first startup (empty data volume).
--
-- Password: defaults to the dev password below; override by
-- exporting APP_DB_PASSWORD before running (do this in production).
-- ============================================================

-- Guard: this script must run against PostgreSQL 18.x
DO $$
DECLARE
  v int := current_setting('server_version_num')::int;
BEGIN
  IF v < 180000 OR v >= 190000 THEN
    RAISE EXCEPTION 'expected PostgreSQL 18.x, but server_version_num is %', v;
  END IF;
END
$$;

-- Resolve the application role password (env override > dev default)
\set app_password 'ecommerce_dev'
\getenv app_password APP_DB_PASSWORD

-- Create the dedicated application role (idempotent)
SELECT format('CREATE ROLE ecommerce_app LOGIN PASSWORD %L', :'app_password')
WHERE NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'ecommerce_app')
\gexec

-- Create the ecommerce database owned by that role (idempotent)
SELECT 'CREATE DATABASE ecommerce OWNER ecommerce_app'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ecommerce')
\gexec
