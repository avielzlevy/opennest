import { Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DeleteOrderEndpoint, GetInventoryEndpoint, GetOrderByIdEndpoint, PlaceOrderEndpoint } from "../decorators/store.decorator";

export interface IStoreService {
  getInventory(data?: unknown): Promise<any>;
  placeOrder(data?: unknown): Promise<any>;
  getOrderById(orderId: number): Promise<any>;
  deleteOrder(orderId: number): Promise<any>;
}

@ApiTags('store')
@Controller('api/store')
export class StoreController {
  constructor(@Inject('IStoreService') private readonly service: IStoreService) {
  }

  @Get('inventory')
  @GetInventoryEndpoint()
  async getInventory(): Promise<any> {
    return this.service.getInventory();
  }

  @Post('order')
  @PlaceOrderEndpoint()
  async placeOrder(): Promise<any> {
    return this.service.placeOrder();
  }

  @Get('order/:orderId')
  @GetOrderByIdEndpoint()
  async getOrderById(@Param('orderId') orderId: number): Promise<any> {
    return this.service.getOrderById(orderId);
  }

  @Delete('order/:orderId')
  @DeleteOrderEndpoint()
  async deleteOrder(@Param('orderId') orderId: number): Promise<any> {
    return this.service.deleteOrder(orderId);
  }
}
