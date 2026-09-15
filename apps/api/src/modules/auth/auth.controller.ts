import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto, RefreshTokenDto, VerifyPasswordDto } from './dto/auth.dto';
import { CurrentUser, JwtPayload, Public } from '../../common/decorators/auth.decorators';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('verify-password')
  verifyPassword(@CurrentUser() user: JwtPayload, @Body() dto: VerifyPasswordDto) {
    return this.authService.verifyPassword(user.sub, dto.password).then(() => ({
      verified: true,
      message: 'Identidad verificada. Puedes editar datos sensibles.',
    }));
  }
}
