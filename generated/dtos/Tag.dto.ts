import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsString } from "class-validator";

export class Tag {
  @IsNumber()
  @ApiProperty({ "required": false })
  @IsOptional()
  public id?: number | undefined;
  @IsString()
  @ApiProperty({ "required": false })
  @IsOptional()
  public name?: string | undefined;
}
