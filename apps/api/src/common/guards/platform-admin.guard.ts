import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PLATFORM_ADMIN_KEY } from '../decorators/auth.decorators';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<boolean>(
      IS_PLATFORM_ADMIN_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!required) return true;

    const { user } = context.switchToHttp().getRequest();
    if (!user?.isPlatformAdmin) {
      throw new ForbiddenException('Acceso restringido a administradores de plataforma');
    }
    return true;
  }
}
