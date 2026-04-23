import { Response, Handler, Router } from "express";
import SQLite3 from 'better-sqlite3';
import { JWTHandler } from "../jwt";

export class BaseRouterHandler {
    protected db?: SQLite3.Database;
    protected jsonWebToken?: JWTHandler;
    protected router = Router();

    public constructor() { };

    public setRouter(db: SQLite3.Database, jsonWebToken: JWTHandler): Router {
        this.db = db;
        this.jsonWebToken = jsonWebToken;
        return this.router;
    }

    protected ensureDeps(response?: Response): boolean {
        if (this.db === undefined) {
            if (response) this.internalError(response);
            throw new Error(`DB is undefined.`);
        } else if (this.jsonWebToken === undefined) {
            if (response) this.internalError(response);
            throw new Error(`JWT is undefined.`);
        }
        return true;
    }

    protected authenticationHandler: Handler = (request, response, next) => {
        if (!response.locals.user || !response.locals.user.id) {
            response.status(401).json({
                status: 108,
                message: "Token tidak valid atau kadaluwarsa.",
                data: null
            } satisfies StandardResponse);
            return;
        } else next();
    };

    protected internalError(response: Response): void {
        response.status(500).json({
            status: 500,
            message: "Terjadi kesalahan internal server.",
            data: null
        } satisfies StandardResponse);
    }

    protected getFail(reply: StandardResponse, response: Response) {
        return function fail(message: string, status: number = 102, response_status: number = 400) {
            reply.status = status;
            reply.message = message;
            response.status(response_status).json(reply);
            return;
        };
    }
}