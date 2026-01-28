import { applyDecorators } from "@nestjs/common";
import { ApiBearerAuth, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ErrorDto } from "../../dto/error.dto";

export function JwtDecorator() {

  return applyDecorators(
    ApiBearerAuth(),
    ApiUnauthorizedResponse({
      type: ErrorDto,
      description: 'Unauthorized',
      schema: {
        example: {
          message: 'Invalid or expired JWT token',
          status: 401,
          error: 'Unauthorized',
        }
      }
    }),
  );

}
