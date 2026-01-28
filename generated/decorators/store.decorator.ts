import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse } from "@nestjs/swagger";

export function GetInventoryEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Returns pet inventories by status.", "description": "Returns a map of status codes to quantities." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function PlaceOrderEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Place an order for a pet.", "description": "Place a new order in the store." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function GetOrderByIdEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Find purchase order by ID.", "description": "For valid response try integer IDs with value <= 5 or > 10. Other values will generate exceptions." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'orderId', type: Number })
  );
}

export function DeleteOrderEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Delete purchase order by identifier.", "description": "For valid response try integer IDs with value < 1000. Anything above 1000 or non-integers will generate API errors." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'orderId', type: Number })
  );
}
