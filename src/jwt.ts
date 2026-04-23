import jwt from 'jsonwebtoken';
import md5 from 'md5';
import crypto from 'crypto';
import type ms from 'ms';

export class JWTHandler {
    private readonly KEY: string = md5(process.env.JWT_SECRET_KEY || "SECRET");
    private readonly MAX_AGE: string = process.env.JWT_MAX_AGE || "15m";

    public getKey(id: string, password: string, credential: string): string {
        const rawKey = id + password + credential;
        const key = this.hashHmacSha256(rawKey);
        return key;
    }

    public verifyToken(token: string): JWTPayload | null {
        try {
            const Payload = jwt.verify(token, this.KEY);
            if (typeof Payload === "string") return null;
            else return Payload as JWTPayload;
        } catch {
            // Expired or invalid token 
            return null;
        }
    }
    
    public getAccessToken(id: string, email: string): string {
        const tokenPayload: JWTPayload = { id, email };
        const lifeSpan = <ms.StringValue>this.MAX_AGE;
        const accessToken = jwt.sign(tokenPayload, this.KEY, { expiresIn: lifeSpan });
        return accessToken;
    }

    private hashHmacSha256(data: crypto.BinaryLike): string {
        return crypto
            .createHmac('sha256', this.KEY)
            .update(data)
            .digest('hex');
    }
}