import 'dotenv/config';
import express from 'express';
import { Config } from './config';
import { JWTHandler } from './jwt';
import { DatabaseHandler } from './database';
import { RouterHandler } from './router';

export class Main {
    private readonly DEFAULT_PORT: string = '3000';
    private readonly PORT: string = process.env.EXPRESS_PORT || this.DEFAULT_PORT;

    private app: express.Application = express();
    private jsonWebToken: JWTHandler = new JWTHandler();
    private database: DatabaseHandler = new DatabaseHandler();
    private config: Config = new Config(this.app, this.jsonWebToken);
    private router: RouterHandler = new RouterHandler(this.app, this.jsonWebToken);

    public constructor() { this.start() };

    public start(): void {
        const Port: number = parseInt(this.PORT);
        this.app.listen(Port, this.afterListen.bind(this));
    };

    private afterListen(error?: Error): void {
        if (error) {
            console.error(`Error occurred when attempting to listen to port ${this.PORT}.`, error);
            process.exit(1);
        }
        console.log(`Running on port ${this.PORT}. (http://localhost:${this.PORT})`);

        /** Apply configurations */
        this.config.apply();

        /** Assign routers */
        this.router.assignRouters(this.database.getDatabase());
    };
}

new Main();