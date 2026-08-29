import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto } from './dto/auth.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /** POST /v1/auth/register */
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const result = await this.authService.register(dto);
    return { data: result };
  }

  /** POST /v1/auth/login */
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const result = await this.authService.login(dto);
    return { data: result };
  }

  /** GET /v1/auth/me — requires JWT */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Request() req: any) {
    const user = await this.authService.getUserById(req.user.sub);
    if (!user) {
      return { error: { code: 'USER_NOT_FOUND', message: 'User not found' } };
    }
    return {
      data: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        friendCode: user.friendCode,
        locale: user.locale,
        timeZone: user.timeZone,
        createdAt: user.createdAt,
      },
    };
  }
}
