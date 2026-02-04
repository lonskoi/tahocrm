-- Runs only on first init of the Postgres data directory.
-- Creates master DB and a default demo tenant DB.

CREATE DATABASE tahocrm_master;
CREATE DATABASE "tahocrm_tenant_tenant-1";

