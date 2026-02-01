import { Controller, Delete, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateUserEndpoint, CreateUsersWithListInputEndpoint, DeleteUserEndpoint, GetUserByNameEndpoint, LoginUserEndpoint, LogoutUserEndpoint, UpdateUserEndpoint } from "../decorators/user.decorator";

export interface IUserService {
  createUser(data?: unknown): Promise<any>;
  createUsersWithListInput(data?: unknown): Promise<any>;
  loginUser(username: string, password: string): Promise<any>;
  logoutUser(data?: unknown): Promise<any>;
  getUserByName(username: string): Promise<any>;
  updateUser(username: string): Promise<any>;
  deleteUser(username: string): Promise<any>;
}

@ApiTags('user')
@Controller('api/user')
export class UserController {
  constructor(@Inject('IUserService') private readonly service: IUserService) {
  }

  @Post('')
  @CreateUserEndpoint()
  async createUser(): Promise<any> {
    return this.service.createUser();
  }

  @Post('createWithList')
  @CreateUsersWithListInputEndpoint()
  async createUsersWithListInput(): Promise<any> {
    return this.service.createUsersWithListInput();
  }

  @Get('login')
  @LoginUserEndpoint()
  async loginUser(@Query('username') username: string, @Query('password') password: string): Promise<any> {
    return this.service.loginUser(username, password);
  }

  @Get('logout')
  @LogoutUserEndpoint()
  async logoutUser(): Promise<any> {
    return this.service.logoutUser();
  }

  @Get(':username')
  @GetUserByNameEndpoint()
  async getUserByName(@Param('username') username: string): Promise<any> {
    return this.service.getUserByName(username);
  }

  @Put(':username')
  @UpdateUserEndpoint()
  async updateUser(@Param('username') username: string): Promise<any> {
    return this.service.updateUser(username);
  }

  @Delete(':username')
  @DeleteUserEndpoint()
  async deleteUser(@Param('username') username: string): Promise<any> {
    return this.service.deleteUser(username);
  }
}
