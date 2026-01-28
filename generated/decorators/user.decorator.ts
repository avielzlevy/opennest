import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";

export function CreateUserEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Create user.", "description": "This can only be done by the logged in user." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function CreateUsersWithListInputEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Creates list of users with given input array.", "description": "Creates list of users with given input array." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function LoginUserEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Logs user into the system.", "description": "Log into the system." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiQuery({ name: 'username', required: false, type: String }),
    ApiQuery({ name: 'password', required: false, type: String })
  );
}

export function LogoutUserEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Logs out current logged in user session.", "description": "Log user out of the system." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function GetUserByNameEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Get user by user name.", "description": "Get user detail based on username." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'username', type: String })
  );
}

export function UpdateUserEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Update user resource.", "description": "This can only be done by the logged in user." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'username', type: String })
  );
}

export function DeleteUserEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Delete user resource.", "description": "This can only be done by the logged in user." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'username', type: String })
  );
}
