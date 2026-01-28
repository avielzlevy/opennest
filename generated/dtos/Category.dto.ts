import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class Category {
  @IsNumber()
  @ApiProperty({ "example": 1, "required": false })
  @IsOptional()
  public id?: number | undefined;
  @IsString()
  @ApiProperty({ "example": "Dogs", "required": false })
  @IsOptional()
  public name?: string | undefined;
}
