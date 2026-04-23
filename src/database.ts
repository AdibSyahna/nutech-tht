import SQLite3 from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseHandler {
    private readonly DB_PATH: string = path.resolve("./", (process.env.DATABASE_FILE_NAME || "database") + ".db");
    private readonly DDL_PATH: string = path.resolve("./", (process.env.DATA_DEFINITION_LANGUAGE_DIR || "ddl"));
    private db?: SQLite3.Database;

    private readonly MIGRATION_LIST: string[] = [
        "create.users.sql",
        "create.banner.sql",
        "insert.banner.sql",
        "create.services.sql",
        "insert.services.sql",
        "create.transactions.sql"
    ];

    public constructor() { }

    public getDatabase(): SQLite3.Database {
        if (!this.db) {
            this.ensureDatabase();
        }
        return this.db!;
    }

    private ensureDatabase(): void {
        if (fs.existsSync(this.DB_PATH)) {
            this.db = new SQLite3(this.DB_PATH);
            return;
        };

        console.warn(`Database not found. Migrating...`);
        this.db = new SQLite3(this.DB_PATH);
        console.info(`Using database "${this.DB_PATH}".`);
        this.migrate(this.db);
    }

    private migrate(db: SQLite3.Database) {
        console.info(`${this.MIGRATION_LIST.length} migration files listed.`);

        for (let i = 0; i < this.MIGRATION_LIST.length; i++) {
            const SQLPath = path.resolve(__dirname, this.DDL_PATH, this.MIGRATION_LIST[i]!);

            try {
                const SQL = fs.readFileSync(SQLPath, { encoding: 'utf-8' });
                db.exec(SQL);
                console.info(`Migrated ${SQLPath}.`);
            } catch (err: unknown) {
                console.error(`Failed to migrate ${SQLPath}:`, err);
                throw err;
            }

        }
        console.log(`Database migration finished.`)
    }
}