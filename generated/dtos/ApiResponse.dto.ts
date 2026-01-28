import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class ApiResponse {
  @IsNumber()
  @ApiProperty({ "required": false })
  @IsOptional()
  public code?: number | undefined;
  @IsString()
  @ApiProperty({ "required": false })
  @IsOptional()
  public type?: string | undefined;
  @IsString()
  @ApiProperty({ "required": false })
  @IsOptional()
  public message?: string | undefined;
}
