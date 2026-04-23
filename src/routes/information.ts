import { Request, Response } from 'express';
import { BaseRouterHandler } from "./base";

export class InformationRouter extends BaseRouterHandler {
    public constructor() {
        super();
        this.router.get("/banner", this.banner.bind(this));
        this.router.get("/services", this.authenticationHandler.bind(this), this.services.bind(this));
    }

    private services(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const SQLGet = /*sql*/`
            SELECT
                "service_code",
                "service_name",
                "service_icon",
                "service_tariff"
            FROM
                "services"
            WHERE
                "deleted_at" IS NULL
            ORDER BY 
                "created_at" DESC
            `;

        Reply.data = this.db!.prepare(SQLGet).all();
        Reply.message = "Sukses.";
        response.json(Reply);
        return;
    }

    private banner(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const SQLGet = /*sql*/`
            SELECT
                "banner_name",
                "banner_image",
                "description"
            FROM
                "banners"
            WHERE
                "deleted_at" IS NULL
            ORDER BY 
                "created_at" DESC
            `;

        Reply.data = this.db!.prepare(SQLGet).all();
        Reply.message = "Sukses.";
        response.json(Reply);
        return;
    }
}