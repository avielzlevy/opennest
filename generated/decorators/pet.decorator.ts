import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse } from "@nestjs/swagger";

export function AddPetEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Add a new pet to the store.", "description": "Add a new pet to the store." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function UpdatePetEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Update an existing pet.", "description": "Update an existing pet by Id." }),
    ApiResponse({ status: 200, description: 'Success' })
  );
}

export function FindPetsByStatusEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Finds Pets by status.", "description": "Multiple status values can be provided with comma separated strings." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiQuery({ name: 'status', required: true, type: String })
  );
}

export function FindPetsByTagsEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Finds Pets by tags.", "description": "Multiple tags can be provided with comma separated strings. Use tag1, tag2, tag3 for testing." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiQuery({ name: 'tags', required: true, type: String })
  );
}

export function GetPetByIdEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Find pet by ID.", "description": "Returns a single pet." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'petId', type: Number })
  );
}

export function UpdatePetWithFormEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Updates a pet in the store with form data.", "description": "Updates a pet resource based on the form data." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'petId', type: Number }),
    ApiQuery({ name: 'name', required: false, type: String }),
    ApiQuery({ name: 'status', required: false, type: String })
  );
}

export function DeletePetEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Deletes a pet.", "description": "Delete a pet." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'petId', type: Number })
  );
}

export function UploadFileEndpoint() {
  return applyDecorators(
    ApiOperation({ "summary": "Uploads an image.", "description": "Upload image of the pet." }),
    ApiResponse({ status: 200, description: 'Success' }),
    ApiParam({ name: 'petId', type: Number }),
    ApiQuery({ name: 'additionalMetadata', required: false, type: String })
  );
}
