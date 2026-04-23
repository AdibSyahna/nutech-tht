CREATE TABLE IF NOT EXISTS "services" (
    "id"              INTEGER NOT NULL UNIQUE,
    "service_code"    CHAR(20) NOT NULL UNIQUE,
    "service_name"    VARCHAR(50) NOT NULL,
    "service_icon"    VARCHAR(100) NOT NULL,
    "service_tariff"  INTEGER NOT NULL,
    "created_at"      INTEGER NOT NULL,
    "updated_at"      INTEGER,
    "deleted_at"      INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT)
);