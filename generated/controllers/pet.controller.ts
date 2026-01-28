import { Controller, Delete, Get, Headers, Inject, Param, Post, Put, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { AddPetEndpoint, DeletePetEndpoint, FindPetsByStatusEndpoint, FindPetsByTagsEndpoint, GetPetByIdEndpoint, UpdatePetEndpoint, UpdatePetWithFormEndpoint, UploadFileEndpoint } from "../decorators/pet.decorator";

export interface IpetService {
  addPet(...args: any[]): Promise<any>;
  updatePet(...args: any[]): Promise<any>;
  findPetsByStatus(...args: any[]): Promise<any>;
  findPetsByTags(...args: any[]): Promise<any>;
  getPetById(...args: any[]): Promise<any>;
  updatePetWithForm(...args: any[]): Promise<any>;
  deletePet(...args: any[]): Promise<any>;
  uploadFile(...args: any[]): Promise<any>;
}

@ApiTags('pet')
@Controller('api/pet')
export class petController {
  constructor(@Inject('IpetService') private readonly service: IpetService) {
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
