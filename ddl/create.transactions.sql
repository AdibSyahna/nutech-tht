CREATE TABLE IF NOT EXISTS "transactions" (
    "id"                  INTEGER NOT NULL UNIQUE,
    "user_id"             INTEGER NOT NULL,
    "invoice_number"      VARCHAR(100) NOT NULL UNIQUE,
    "service_code"        CHAR(20),
    "transaction_type"    VARCHAR(50) NOT NULL CHECK("transaction_type" IN ('PAYMENT', 'TOPUP')),
    "amount"              INTEGER NOT NULL CHECK("amount" > 0),
    "created_at"          INTEGER NOT NULL,
    "deleted_at"          INTEGER,
    PRIMARY KEY("id" AUTOINCREMENT),
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE,
    FOREIGN KEY ("service_code") REFERENCES "services"("service_code") ON DELETE CASCADE
);