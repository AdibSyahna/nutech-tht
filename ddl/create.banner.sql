CREATE TABLE IF NOT EXISTS "banners" (
    "id"             INTEGER NOT NULL UNIQUE,
    "banner_name"    VARCHAR(50) NOT NULL,
    "banner_image"   VARCHAR(100) NOT NULL,
    "description"    VARCHAR(255),
    "created_at"     INTEGER NOT NULL,
    "updated_at"     INTEGER,
    "deleted_at"     INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT)
);