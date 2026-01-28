import { Controller, Delete, Get, Inject, Param, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { DeleteOrderEndpoint, GetInventoryEndpoint, GetOrderByIdEndpoint, PlaceOrderEndpoint } from "../decorators/store.decorator";

export interface IstoreService {
  getInventory(...args: any[]): Promise<any>;
  placeOrder(...args: any[]): Promise<any>;
  getOrderById(...args: any[]): Promise<any>;
  deleteOrder(...args: any[]): Promise<any>;
}

@ApiTags('store')
@Controller('api/store')
export class storeController {
  constructor(@Inject('IstoreService') private readonly service: IstoreService) {
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
