import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export const PET_STATUS = {
  AVAILABLE: 'available',
  PENDING: 'pending',
  SOLD: 'sold'
} as const;

export type PetStatus = (typeof PET_STATUS)[keyof typeof PET_STATUS];

export class Pet {
  @IsNumber()
  @ApiProperty({ "example": 10, "required": false })
  @IsOptional()
  public id?: number | undefined;
  @IsString()
  @ApiProperty({ "example": "doggie" })
  @IsNotEmpty()
  public name!: string;
  @ApiProperty({ "required": false })
  @IsOptional()
  public category?: object | undefined;
  @IsArray()
  @IsNotEmpty()
  public photoUrls!: string[];
  @IsArray()
  @IsOptional()
  public tags?: object[] | undefined;
  @IsIn(Object.values(PET_STATUS))
  @ApiProperty({ "description": "pet status in the store", "required": false, "enum": ["available", "pending", "sold"], "enumName": "PetStatus" })
  @IsOptional()
  public status?: PetStatus | undefined;
}
