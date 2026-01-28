import { Controller, Delete, Get, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { CreateUserEndpoint, CreateUsersWithListInputEndpoint, DeleteUserEndpoint, GetUserByNameEndpoint, LoginUserEndpoint, LogoutUserEndpoint, UpdateUserEndpoint } from "../decorators/user.decorator";

export interface IuserService {
  createUser(...args: any[]): Promise<any>;
  createUsersWithListInput(...args: any[]): Promise<any>;
  loginUser(...args: any[]): Promise<any>;
  logoutUser(...args: any[]): Promise<any>;
  getUserByName(...args: any[]): Promise<any>;
  updateUser(...args: any[]): Promise<any>;
  deleteUser(...args: any[]): Promise<any>;
}

@ApiTags('user')
@Controller('api/user')
export class userController {
  constructor(@Inject('IuserService') private readonly service: IuserService) {
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
