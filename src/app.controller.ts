import { Controller, Get, Render, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller()
export class AppController {
  constructor(private readonly configService: ConfigService) {}

  @Get()
  @Render('index')
  root() {
    if (!this.configService.get<boolean>('enableIndexPage')) {
      throw new NotFoundException();
    }
    return { message: 'TODO: inject variables into service' };
  }
}
