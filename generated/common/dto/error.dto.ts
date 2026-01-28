import { ApiProperty } from "@nestjs/swagger";

export class ErrorDto {
  @ApiProperty({ description: 'Error message' })
  message!: string;
  @ApiProperty({ description: 'HTTP status code' })
  status!: number;
  @ApiProperty({ description: 'Error type' })
  error!: string;
}

export const examples = {
  NotFoundError: {
    message: 'The requested resource was not found',
    status: 404,
    error: 'Not Found',
  },
  InternalServerError: {
    message: 'An unexpected error occurred',
    status: 500,
    error: 'Internal Server Error',
  },
};
