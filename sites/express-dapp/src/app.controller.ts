import { Controller, Get, Render, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@liquid/auth-api';

@Controller()
export class AppController {
  constructor() {}

  @Get('protected')
  @UseGuards(AuthGuard)
  getProtected() {
    return 'Protected route';
  }

  @Get()
  @Render('index')
  getIndex() {}
}
