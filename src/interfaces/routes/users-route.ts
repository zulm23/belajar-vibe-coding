import { Elysia } from "elysia";
import { UserController } from "../controllers/user.controller";

export const createUsersRoute = (controller: UserController) => {
  return new Elysia({ prefix: "/users" })
    .post("/", (ctx) => controller.createUser(ctx))
    .get("/", (ctx) => controller.getAllUsers(ctx))
    .get("/:id", (ctx) => controller.getUserById(ctx))
    .put("/:id", (ctx) => controller.updateUser(ctx))
    .delete("/:id", (ctx) => controller.deleteUser(ctx));
};
