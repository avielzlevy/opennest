import { applyDecorators } from "@nestjs/common";
import { ApiSecurity, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ErrorDto } from "../../dto/error.dto";

export function ApiKeyDecorator() {

  return applyDecorators(
    ApiSecurity('Api-Key'),
    ApiUnauthorizedResponse({
      type: ErrorDto,
      description: 'Unauthorized',
      schema: {
        example: {
          message: 'Invalid or missing API key',
          status: 401,
          error: 'Unauthorized',
        }
      }
    }),
  );

}
