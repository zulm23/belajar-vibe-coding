import { Elysia } from "elysia";
import { UserController } from "../controllers/user.controller";

/**
 * Factory function untuk membuat kumpulan rute CRUD User pada ElysiaJS.
 * Didaftarkan dengan prefix `/users`.
 *
 * @param controller Instance UserController yang menangani request
 * @returns Plugin Elysia untuk modul users
 */
export const createUsersRoute = (controller: UserController) => {
  return new Elysia({ prefix: "/users" })
    .post("/", (ctx) => controller.createUser(ctx as any))
    .get("/", (ctx) => controller.getAllUsers(ctx))
    .get("/:id", (ctx) => controller.getUserById(ctx))
    .put("/:id", (ctx) => controller.updateUser(ctx as any))
    .delete("/:id", (ctx) => controller.deleteUser(ctx));
};

