import express from 'express';
import path from 'path';
import { rateLimit, RateLimitRequestHandler } from 'express-rate-limit';
import type { JWTHandler } from './jwt';

export class Config {
    private readonly UPLOAD_PATH: string = path.resolve("./", process.env.UPLOAD_DIR || "uploads");
    private readonly STATIC_PATH: string = process.env.EXPRESS_STATIC_PATH || "/public";
    private readonly apiLimiter: RateLimitRequestHandler = rateLimit({
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(60000)), // Time before counter reset (window)
        max: parseInt(process.env.RATE_LIMIT_WINDOW_MS || String(100)) // Limit each IP to x requests per `window` 
    });

    public constructor(private app: express.Application, private jsonWebToken: JWTHandler) { }

    public apply(): void {
        /** JSON Body parser */
        this.app.use(express.json());

        /** Rate limiter */
        this.app.use(this.apiLimiter);

        /** Authorization */
        this.app.use(this.handleAuthorization.bind(this));

        /** Static path */
        this.app.use(this.STATIC_PATH, express.static(this.UPLOAD_PATH));
    }

    private handleAuthorization: express.Handler = (request, response, next) => {
        const accessToken = request.headers.authorization;

        if (!accessToken) return next();
        const Token = accessToken.replaceAll("Bearer", "").trim();
        const Payload: JWTPayload | null = this.jsonWebToken.verifyToken(Token);
        if (Payload === null) return next();

        response.locals.user = Payload;
        next();
    }
}