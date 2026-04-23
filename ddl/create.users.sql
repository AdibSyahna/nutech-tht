CREATE TABLE IF NOT EXISTS "users" (
    "id"             INTEGER NOT NULL UNIQUE,
    "email"          VARCHAR(100) NOT NULL UNIQUE,
    "first_name"     VARCHAR(50) NOT NULL,
    "last_name"	     VARCHAR(50) NOT NULL,
    "password"	     VARCHAR(255) NOT NULL,
    "profile_image"  VARCHAR(50),
    "created_at"     INTEGER NOT NULL,
    "updated_at"     INTEGER,
    "deleted_at"     INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT)
);