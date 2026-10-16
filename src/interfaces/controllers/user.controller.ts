import type { UserService } from "../../use-cases/user-service";
import { successResponse, errorResponse } from "../../shared/api-response";
import type { CreateUserDto, UpdateUserDto } from "../../domain/entities/user.entity";

export class UserController {
  constructor(private readonly userService: UserService) {}

  async createUser({ body, set }: { body: CreateUserDto; set: any }) {
    try {
      if (!body || !body.name || !body.email || !body.password) {
        set.status = 400;
        return errorResponse("Missing required fields: name, email, and password are required");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        set.status = 400;
        return errorResponse("Invalid email format");
      }

      const user = await this.userService.createUser(body);
      set.status = 201;
      return successResponse("User successfully created", user);
    } catch (err: any) {
      if (err.message === "EMAIL_EXISTS") {
        set.status = 409;
        return errorResponse("Email is already registered");
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async getAllUsers({ set }: { set: any }) {
    try {
      const users = await this.userService.getAllUsers();
      set.status = 200;
      return successResponse("Users retrieved successfully", users);
    } catch (err: any) {
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async getUserById({ params, set }: { params: { id: string }; set: any }) {
    try {
      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return errorResponse("Invalid user ID parameter");
      }

      const user = await this.userService.getUserById(id);
      if (!user) {
        set.status = 404;
        return errorResponse("User not found");
      }

      set.status = 200;
      return successResponse("User retrieved successfully", user);
    } catch (err: any) {
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async updateUser({
    params,
    body,
    set,
  }: {
    params: { id: string };
    body: UpdateUserDto;
    set: any;
  }) {
    try {
      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return errorResponse("Invalid user ID parameter");
      }

      if (body.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(body.email)) {
          set.status = 400;
          return errorResponse("Invalid email format");
        }
      }

      const updated = await this.userService.updateUser(id, body);
      if (!updated) {
        set.status = 404;
        return errorResponse("User not found");
      }

      set.status = 200;
      return successResponse("User updated successfully", updated);
    } catch (err: any) {
      if (err.message === "EMAIL_EXISTS") {
        set.status = 409;
        return errorResponse("Email is already registered by another user");
      }
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }

  async deleteUser({ params, set }: { params: { id: string }; set: any }) {
    try {
      const id = Number(params.id);
      if (isNaN(id)) {
        set.status = 400;
        return errorResponse("Invalid user ID parameter");
      }

      const deleted = await this.userService.deleteUser(id);
      if (!deleted) {
        set.status = 404;
        return errorResponse("User not found");
      }

      set.status = 200;
      return successResponse("User deleted successfully");
    } catch (err: any) {
      set.status = 500;
      return errorResponse("Internal server error", err.message);
    }
  }
}
