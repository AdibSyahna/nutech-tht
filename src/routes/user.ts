import { Router, Request, Response } from "express";
import validator from 'validator';
import md5 from 'md5';
import multer from 'multer';
import path from 'path';
import { BaseRouterHandler } from "./base";

export class UserRouter extends BaseRouterHandler {
    private readonly PROFILE_DIR: string = process.env.PROFILE_DIR || "profiles";
    private readonly PROFILE_UPLOAD_PATH: string = path.resolve("./", process.env.UPLOAD_DIR || "uploads", this.PROFILE_DIR);
    private readonly STATIC_PATH: string = `${process.env.EXPRESS_STATIC_PATH || "/public"}/${this.PROFILE_DIR}`;
    private readonly DEFAULT_PROFILE_IMAGE: string = process.env.PROFILE_DEFAULT_IMAGE || "default.png";

    private uploadProfileImage = multer({ fileFilter: this.profileImageFileFilter.bind(this), storage: this.profileImageFileStorage() });

    public constructor() {
        super();
        this.router.post('/registration', this.registration.bind(this));
        this.router.post('/login', this.login.bind(this));

        const ProfileRouter = Router();
        ProfileRouter.use(this.authenticationHandler.bind(this));
        ProfileRouter.get("/", this.profile.bind(this));
        ProfileRouter.put("/update", this.profileUpdate.bind(this));
        ProfileRouter.put("/image", this.uploadProfileImage.single("file"), this.profileUpdateImage.bind(this));

        this.router.use("/profile", ProfileRouter);
    }

    private profileUpdateImage(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        if (!request.file) {
            return Fail("Format Image tidak sesuai.", 102, 400);
        }

        const FileName: string = request.file!.filename;
        const SQLUpdate = /*sql*/`
            UPDATE
                "users"
            SET
                "profile_image" = ?,
                "updated_at" = ?
            WHERE
                "id" = ?
        `;

        this.db!.exec("BEGIN");
        try {
            this.db!.prepare(SQLUpdate).run(FileName, Date.now(), UID);

            const User = this.getUser(UID, request);
            if (!User) {
                throw new Error(`User with UID: "${UID}" not found.`);
            }

            this.db!.exec("COMMIT");
            Reply.message = "Update Profile Image berhasil.";
            Reply.data = User;
            response.json(Reply);
        } catch (err: unknown) {
            this.db!.exec("ROLLBACK");
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private profileUpdate(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const UID: number = parseInt(response.locals.user.id);
        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const Body = request.body;
        if (!Body) {
            return Fail("Parameter tidak ditemukan.", 100, 411);
        }

        const FirstName: string | undefined = Body["first_name"];
        const LastName: string | undefined = Body["last_name"];

        if (!FirstName && !LastName) {
            return Fail("Parameter tidak lengkap.", 100, 411);
        }

        const UpdatedCols: string[] = [];
        const Values: (string | number)[] = [];

        if (typeof FirstName === "string" && FirstName.length > 0) {
            UpdatedCols.push(`"first_name" = ?`);
            Values.push(FirstName);
        }
        if (typeof LastName === "string" && LastName.length > 0) {
            UpdatedCols.push(`"last_name" = ?`);
            Values.push(LastName);
        }
        UpdatedCols.push(`"updated_at" = ?`);
        Values.push(Date.now());
        Values.push(UID);

        const SQLUpdate = /*sql*/`
            UPDATE
                "users"
            SET
                ${UpdatedCols.join(", ")}
            WHERE
                "id" = ?
        `;

        this.db!.exec("BEGIN");
        try {
            this.db!.prepare(SQLUpdate).run(...Values);

            const User = this.getUser(UID, request);
            if (!User) {
                throw new Error(`User with UID: "${UID}" not found.`);
            }

            this.db!.exec("COMMIT");
            Reply.message = "Update Profile berhasil.";
            Reply.data = User;
            response.json(Reply);
        } catch (err: unknown) {
            this.db!.exec("ROLLBACK");
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private profile(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const UID: number = parseInt(response.locals.user.id);

        const User = this.getUser(UID, request);
        if (!User) {
            this.internalError(response);
            console.warn(`User with UID: "${UID}" not found.`);
            return;
        }

        Reply.message = "Sukses.";
        Reply.data = User;
        response.json(Reply);
    }

    private login(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const Body = request.body;
        if (!Body) {
            return Fail("Parameter tidak ditemukan.", 100, 411);
        }

        const Email: string = Body["email"];
        const Password: string = Body["password"];

        if (!Email || !Password) {
            return Fail("Parameter tidak lengkap.", 100, 411);
        }

        if (!validator.isEmail(Email)) {
            return Fail("Parameter email tidak sesuai format.");
        }

        if (Password.length < 8) {
            return Fail("Parameter password minimal 8 karakter.");
        }

        const SQLLogin = /*sql*/`
                SELECT
                    "id",
                    "email"
                FROM
                    "users"
                WHERE
                    "email" = ?
                AND
                    "password" = ?
                LIMIT 1
        `;

        const User = <JWTPayload>this.db!.prepare(SQLLogin).get(Email, md5(Password));
        if (!User || !User.id) {
            return Fail(`Username atau password salah.`, 103, 401);
        }

        const Token = this.jsonWebToken!.getAccessToken(String(User.id), User.email);
        Reply.data = { token: Token };
        Reply.message = "Login Sukses.";
        response.json(Reply);
    }

    private registration(request: Request, response: Response): void {
        if (!this.ensureDeps(response)) return;

        const Reply: StandardResponse = { status: 0, message: "", data: null };
        const Fail = this.getFail(Reply, response);

        const Body = request.body;
        if (!Body) {
            return Fail("Parameter tidak ditemukan.", 100, 411);
        }

        const Email: string = Body["email"];
        const FirstName: string = Body["first_name"];
        const LastName: string = Body["last_name"];
        const Password: string = Body["password"];

        if (!Email || !FirstName || !LastName || !Password) {
            return Fail("Parameter tidak lengkap.", 100, 411);
        }

        if (!validator.isEmail(Email)) {
            return Fail("Parameter email tidak sesuai format.");
        }

        if (Password.length < 8) {
            return Fail("Parameter password minimal 8 karakter.");
        }

        if (FirstName.length > 50 || LastName.length > 50) {
            return Fail("Parameter first_name dan last_name tidak boleh lebih dari 50 karakter.");
        }

        const SQLCheckEmail = /*sql*/`SELECT "id" FROM "users" WHERE "email" = ?`;
        const ExistingEmail = <{ id: number }>this.db!.prepare(SQLCheckEmail).get(Email);
        if (ExistingEmail && ExistingEmail.id) {
            return Fail(`Email "${Email}" sudah terdaftar.`);
        }

        const RegisterTime = Date.now();
        const SQLRegisterUser = /*sql*/`
            INSERT INTO "users" ("email", "first_name", "last_name", "password", "created_at")
            VALUES (?, ?, ?, ?, ?)
        `;

        this.db!.exec("BEGIN");
        try {
            this.db!.prepare(SQLRegisterUser).run(Email, FirstName, LastName, md5(Password), RegisterTime);
            this.db!.exec("COMMIT");
            Reply.message = "Registrasi berhasil silahkan login";
            response.json(Reply);
        } catch (err: unknown) {
            this.db!.exec("ROLLBACK");
            console.error(err);
            this.internalError(response);
            return;
        }
    }

    private getUser(uid: number, request: Request): User | null {
        if (!this.ensureDeps()) throw new Error(`Tried to get user, but dependencies are not injected.`);

        const SQLProfile = /*sql*/`
                SELECT
                    "email",
                    "first_name",
                    "last_name",
                    "profile_image"
                FROM
                    "users"
                WHERE
                    "id" = ?
        `;

        const User = <User>this.db!.prepare(SQLProfile).get(uid);
        if (!User) return null;

        const BaseUrl = `${request.protocol}://${request.get('host')}${this.STATIC_PATH}`;
        if (!User.profile_image) {
            User.profile_image = `${BaseUrl}/${this.DEFAULT_PROFILE_IMAGE}`;
        } else {
            User.profile_image = `${BaseUrl}/${User.profile_image}`;
        }
        return User;
    }

    private profileImageFileStorage(): multer.StorageEngine {
        return multer.diskStorage({
            destination: (request: Request, file: Express.Multer.File, callback: CallableFunction) => {
                callback(null, this.PROFILE_UPLOAD_PATH);
            },
            filename: (request: Request, file: Express.Multer.File, callback: CallableFunction) => {
                const ext = path.extname(file.originalname);
                const name = Date.now() + ext;
                callback(null, name);
            },
        });
    }

    private profileImageFileFilter(request: Request, file: Express.Multer.File, callback: CallableFunction): void {
        const allowedExt = [".jpg", ".jpeg", ".png"];
        const ext = path.extname(file.originalname).toLowerCase();

        if (
            ["image/jpeg", "image/png"].includes(file.mimetype) &&
            allowedExt.includes(ext)
        ) {
            callback(null, true);
        } else {
            callback(null, false);
        }
    }

}