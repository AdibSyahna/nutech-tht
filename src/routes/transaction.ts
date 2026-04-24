import { Request, Response } from 'express';
import { BaseRouterHandler } from "./base";

interface TransactionHistory {
    offset?: number
    limit?: number
    records: TransactionLog[]
}

export class TransactionRouter extends BaseRouterHandler {
    public constructor() {
        super();
        this.router.use(this.authenticationHandler.bind(this));
        this.router.get("/balance", this.balance.bind(this));
        this.router.post("/topup", this.topup.bind(this));
        this.router.post("/transaction", this.transaction.bind(this));
        this.router.get("/transaction/history", this.transactionHistory.bind(this));
    }

    private transactionHistory(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const LimitQuery = request.query["limit"];
        const OffsetQuery = request.query["offset"];
        let pagination: Pagination | undefined;

        if (
            (LimitQuery && (/[^0-9]/.test((String(LimitQuery))) || parseInt(String(LimitQuery)) < 0))
            ||
            (OffsetQuery && (/[^0-9]/.test((String(OffsetQuery))) || parseInt(String(OffsetQuery)) < 0))
        ) {
            return Fail("Limit atau Offset hanya boleh angka dan tidak boleh lebih kecil dari 0.", 102, 400);
        }
        else if (!LimitQuery && OffsetQuery) {
            return Fail("Parameter offset membutuhkan parameter limit", 102, 400);
        }
        else {
            pagination = { limit: parseInt(String(LimitQuery)), offset: parseInt(String(OffsetQuery)) };
        }

        const Transactions: (StoredTransaction & TransactionLog)[] = this.getTransactions(UID, pagination);
        const Data: TransactionHistory = { records: [] };
        if (pagination) {
            if (pagination.limit) Data["limit"] = pagination.limit;
            if (pagination.offset) Data["offset"] = pagination.offset;
        };

        for (let i = 0; i < Transactions.length; i++) {
            const Transaction = Transactions[i]!;
            const CreatedOn = new Date(Transaction.created_at!).toISOString();

            let description = "";
            if (Transaction.transaction_type == "TOPUP") {
                description = "Top Up balance";
            } else {
                description = Transaction.service_name!;
            }

            Data.records.push({
                "invoice_number": Transaction.invoice_number,
                "transaction_type": Transaction.transaction_type,
                "description": description,
                "total_amount": Transaction.amount,
                "created_on": CreatedOn
            });
        }

        Reply.data = Data;
        Reply.message = "Get History Berhasil.";
        response.json(Reply);
    }

    private transaction(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const Body = request.body;
        if (!Body) {
            return Fail("Parameter tidak ditemukan.", 100, 411);
        }

        const ServiceCode: string = Body["service_code"];
        if (!ServiceCode) {
            return Fail("Parameter tidak lengkap.", 100, 411);
        }

        const Service: Service | null = this.getService(ServiceCode);
        if (!Service) {
            return Fail(`Service atau Layanan tidak ditemukan.`, 102, 400);
        }

        const Balance: number = this.getBalance(UID);
        if (Balance < Service.service_tariff) {
            return Fail(`Saldo tidak mencukupi.`, 103, 409);
        }

        const Invoice = this.generateInvoice();
        const Type: TransactionType = "PAYMENT";
        const SQLInsert = /*sql*/`
            INSERT INTO "transactions" ("user_id", "invoice_number", "service_code", "transaction_type", "amount", "created_at")
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        this.db!.exec("BEGIN");
        try {
            const TransactionResult = this.db!.prepare(SQLInsert).run(UID, Invoice, ServiceCode, Type, Service.service_tariff, Date.now());
            const Transaction = this.getTransaction(<number>TransactionResult.lastInsertRowid);
            if (!Transaction) {
                this.db!.exec("ROLLBACK");
                console.error(`Cannot find transaction after insert.`);
                this.internalError(response);
                return;
            }

            const CreatedOn = new Date(Transaction.created_at!).toISOString();
            Reply.message = "Transaksi berhasil.";
            Reply.data = {
                "invoice_number": Transaction.invoice_number,
                "service_code": Transaction.service_code,
                "service_name": Transaction.service_name,
                "transaction_type": Transaction.transaction_type,
                "total_amount": Transaction.amount,
                "created_on": CreatedOn
            };

            this.db!.exec("COMMIT");
            response.json(Reply);
        } catch (err: unknown) {
            this.db!.exec("ROLLBACK");
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private topup(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;
        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const Body = request.body;
        if (!Body) {
            return Fail("Parameter tidak ditemukan.", 100, 411);
        }

        const Amount: string = Body["top_up_amount"];
        if (!Amount) {
            return Fail("Parameter tidak lengkap.", 100, 411);
        }

        if (/[^0-9]/.test((String(Amount))) || parseInt(Amount) < 0) {
            return Fail("Parameter amount hanya boleh angka dan tidak boleh lebih kecil dari 0.", 102, 411);
        }

        const Invoice = this.generateInvoice();
        const Type: TransactionType = "TOPUP";
        const SQLInsert = /*sql*/`
            INSERT INTO "transactions" ("user_id", "invoice_number", "transaction_type", "amount", "created_at")
            VALUES (?, ?, ?, ?, ?)
        `;

        this.db!.exec("BEGIN");
        try {
            this.db!.prepare(SQLInsert).run(UID, Invoice, Type, parseInt(Amount), Date.now());
            this.db!.exec("COMMIT");
            Reply.message = "Top Up Balance berhasil";
            Reply.data = { balance: this.getBalance(UID) };
            response.json(Reply);
        } catch (err: unknown) {
            this.db!.exec("ROLLBACK");
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private balance(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };

        try {
            Reply.data = { balance: this.getBalance(UID) };
            Reply.message = "Get Balance Berhasil.";
            response.json(Reply);
            return;
        } catch (err: unknown) {
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private getBalance(uid: number): number {
        if (!this.ensureDeps()) throw new Error(`Tried to get balance, but dependencies are not injected.`);

        const SQLGet = /*sql*/`
            SELECT
                "amount",
                "transaction_type"
            FROM
                "transactions"
            WHERE
                "user_id" = ?
            AND
                "deleted_at" IS NULL
            `;

        const Transactions = <StoredTransaction[]>this.db!.prepare(SQLGet).all(uid);
        if (Transactions.length === 0) return 0;

        let balance = 0;
        for (let i = 0; i < Transactions.length; i++) {
            const Transaction = Transactions[i]!;
            if (Transaction.transaction_type == "PAYMENT") balance -= Transaction.amount;
            else balance += Transaction.amount;
        }
        return balance;
    }

    private generateInvoice(): string {
        if (!this.ensureDeps()) throw new Error(`Tried to generate invoice, but dependencies are not injected.`);

        const SQLSelect = /*sql*/`
            SELECT COUNT(*)
            FROM "transactions"
            WHERE "created_at" >= ?
            `;
        const Midnight = new Date(new Date().setHours(0, 0, 0, 0)).getTime();
        const Counter = <{ 'COUNT(*)': number }>this.db!.prepare(SQLSelect).get(Midnight);
        const DayTransactionCounter = Counter['COUNT(*)'] + 1;

        const Today = new Date();
        const TodayDate = String(Today.getDate()).padStart(2, "0");
        const TodayMonth = String(Today.getMonth() + 1).padStart(2, "0");
        const TodayYear = String(Today.getUTCFullYear());
        const DateFormat = TodayDate + TodayMonth + TodayYear;

        return `INV${DateFormat}-${String(DayTransactionCounter).padStart(3, "0")}`;
    }

    private getService(service_code: string): Service | null {
        if (!this.ensureDeps()) throw new Error(`Tried to get service, but dependencies are not injected.`);

        const SQLGet = /*sql*/`
            SELECT *
            FROM "services"
            WHERE "service_code" = ?
            AND "deleted_at" IS NULL
        `;
        return <Service | null>this.db!.prepare(SQLGet).get(service_code);
    }

    private getTransaction(id: number): StoredTransaction & TransactionLog | null {
        if (!this.ensureDeps()) throw new Error(`Tried to get transaction, but dependencies are not injected.`);

        const SQLGet = /*sql*/`
            SELECT 
                "t"."invoice_number",
                "t"."service_code",
                "s"."service_name",
                "t"."transaction_type",
                "t"."amount",
                "t"."created_at"
            FROM "transactions" "t"
            INNER JOIN "services" "s"
            ON "t"."service_code" = "s"."service_code"
            WHERE "t"."id" = ?
            AND "t"."deleted_at" IS NULL
        `;

        return <StoredTransaction & TransactionLog | null>this.db!.prepare(SQLGet).get(id);
    }

    private getTransactions(uid: number, pagination?: Pagination): (StoredTransaction & TransactionLog)[] {
        if (!this.ensureDeps()) throw new Error(`Tried to get transactions, but dependencies are not injected.`);

        const Values: unknown[] = [uid];
        let SQLGet = /*sql*/`
            SELECT 
                "t"."invoice_number",
                "t"."service_code",
                "s"."service_name",
                "t"."transaction_type",
                "t"."amount",
                "t"."created_at"
            FROM "transactions" "t"
            LEFT JOIN "services" "s"
            ON "t"."service_code" = "s"."service_code"
            WHERE "t"."user_id" = ?
            AND "t"."deleted_at" IS NULL
            ORDER BY "t"."created_at" ASC
        `;

        if (pagination) {
            if (pagination.limit) {
                SQLGet += /*sql*/`
                    LIMIT ?
                `;
                Values.push(pagination.limit);
            }

            if (pagination.offset) {
                SQLGet += /*sql*/`
                    OFFSET ?
                `;
                Values.push(pagination.offset);
            }
        }

        return <(StoredTransaction & TransactionLog)[]>this.db!.prepare(SQLGet).all(...Values);
    }
}