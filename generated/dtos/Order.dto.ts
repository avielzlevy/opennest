import { ApiProperty } from "@nestjs/swagger";
import { IsBoolean, IsIn, IsNumber, IsOptional, IsString } from "class-validator";

export const ORDER_STATUS = {
  PLACED: 'placed',
  APPROVED: 'approved',
  DELIVERED: 'delivered'
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

export class Order {
  @IsNumber()
  @ApiProperty({ "example": 10, "required": false })
  @IsOptional()
  public id?: number | undefined;
  @IsNumber()
  @ApiProperty({ "example": 198772, "required": false })
  @IsOptional()
  public petId?: number | undefined;
  @IsNumber()
  @ApiProperty({ "example": 7, "required": false })
  @IsOptional()
  public quantity?: number | undefined;
  @IsString()
  @ApiProperty({ "required": false })
  @IsOptional()
  public shipDate?: string | undefined;
  @IsIn(Object.values(ORDER_STATUS))
  @ApiProperty({ "description": "Order Status", "example": "approved", "required": false, "enum": ["placed", "approved", "delivered"], "enumName": "OrderStatus" })
  @IsOptional()
  public status?: OrderStatus | undefined;
  @IsBoolean()
  @ApiProperty({ "required": false })
  @IsOptional()
  public complete?: boolean | undefined;
}
