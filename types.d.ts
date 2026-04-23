export { };

declare global {
    type JWTPayload = { id: string, email: string };

    type StandardResponse = {
        status: number,
        message: string,
        data: unknown
    };

    type TransactionType = "PAYMENT" | "TOPUP";

    type Pagination = { limit?: number, offset?: number };

    interface User {
        id: number?,
        email: string?,
        first_name: string?,
        last_name: string?,
        password: string?,
        profile_image: string?,
        created_at: number,
        updated_at?: number?,
        deleted_at?: number?,
    }


    interface StoredTransaction {
        id: number,
        user_id: number,
        invoice_number: string,
        service_code: string?,
        transaction_type: TransactionType,
        amount: number,
        created_at: number,
        deleted_at?: number,
    }

    interface TransactionLog{
        invoice_number: string,
        transaction_type: TransactionType,
        description?: string,
        service_name?: string,
        total_amount: number,
        created_on: string
    }

    interface Service {
        id: number,
        service_code: string,
        service_name: string,
        service_icon: string,
        service_tariff: number,
        created_at: number,
        updated_at?: number,
        deleted_at?: number,
    }
}