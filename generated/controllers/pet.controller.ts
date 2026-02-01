import { Controller, Delete, Get, Headers, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AddPetEndpoint, DeletePetEndpoint, FindPetsByStatusEndpoint, FindPetsByTagsEndpoint, GetPetByIdEndpoint, UpdatePetEndpoint, UpdatePetWithFormEndpoint, UploadFileEndpoint } from "../decorators/pet.decorator";

export interface IPetService {
  addPet(data?: unknown): Promise<any>;
  updatePet(data?: unknown): Promise<any>;
  findPetsByStatus(status: string): Promise<any>;
  findPetsByTags(tags: string): Promise<any>;
  getPetById(petId: number): Promise<any>;
  updatePetWithForm(petId: number, name: string, status: string): Promise<any>;
  deletePet(apiKey: string, petId: number): Promise<any>;
  uploadFile(petId: number, additionalMetadata: string): Promise<any>;
}

@ApiTags('pet')
@Controller('api/pet')
export class PetController {
  constructor(@Inject('IPetService') private readonly service: IPetService) {
  }

  @Post('')
  @AddPetEndpoint()
  async addPet(): Promise<any> {
    return this.service.addPet();
  }

  @Put('')
  @UpdatePetEndpoint()
  async updatePet(): Promise<any> {
    return this.service.updatePet();
  }

  @Get('findByStatus')
  @FindPetsByStatusEndpoint()
  async findPetsByStatus(@Query('status') status: string): Promise<any> {
    return this.service.findPetsByStatus(status);
  }

  @Get('findByTags')
  @FindPetsByTagsEndpoint()
  async findPetsByTags(@Query('tags') tags: string): Promise<any> {
    return this.service.findPetsByTags(tags);
  }

  @Get(':petId')
  @GetPetByIdEndpoint()
  async getPetById(@Param('petId') petId: number): Promise<any> {
    return this.service.getPetById(petId);
  }

  @Post(':petId')
  @UpdatePetWithFormEndpoint()
  async updatePetWithForm(@Param('petId') petId: number, @Query('name') name: string, @Query('status') status: string): Promise<any> {
    return this.service.updatePetWithForm(petId, name, status);
  }

  @Delete(':petId')
  @DeletePetEndpoint()
  async deletePet(@Headers('api_key') apiKey: string, @Param('petId') petId: number): Promise<any> {
    return this.service.deletePet(apiKey, petId);
  }

  @Post(':petId/uploadImage')
  @UploadFileEndpoint()
  async uploadFile(@Param('petId') petId: number, @Query('additionalMetadata') additionalMetadata: string): Promise<any> {
    return this.service.uploadFile(petId, additionalMetadata);
  }
}
