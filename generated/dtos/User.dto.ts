import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class User {
  @IsNumber()
  @ApiProperty({ "example": 10, "required": false })
  @IsOptional()
  public id?: number | undefined;
  @IsString()
  @ApiProperty({ "example": "theUser", "required": false })
  @IsOptional()
  public username?: string | undefined;
  @IsString()
  @ApiProperty({ "example": "John", "required": false })
  @IsOptional()
  public firstName?: string | undefined;
  @IsString()
  @ApiProperty({ "example": "James", "required": false })
  @IsOptional()
  public lastName?: string | undefined;
  @IsString()
  @ApiProperty({ "example": "john@email.com", "required": false })
  @IsOptional()
  public email?: string | undefined;
  @IsString()
  @ApiProperty({ "example": "12345", "required": false })
  @IsOptional()
  public password?: string | undefined;
  @IsString()
  @ApiProperty({ "example": "12345", "required": false })
  @IsOptional()
  public phone?: string | undefined;
  @IsNumber()
  @ApiProperty({ "description": "User Status", "example": 1, "required": false })
  @IsOptional()
  public userStatus?: number | undefined;
}
