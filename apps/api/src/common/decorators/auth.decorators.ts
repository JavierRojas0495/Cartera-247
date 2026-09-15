import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);

export const IS_PLATFORM_ADMIN_KEY = 'isPlatformAdmin';
export const PlatformAdminOnly = () => SetMetadata(IS_PLATFORM_ADMIN_KEY, true);

export interface JwtPayload {
  sub: string;
  email: string;
  isPlatformAdmin: boolean;
  tenantId?: string;
  role?: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.user?.tenantId;
  },
);

export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.ip || request.headers['x-forwarded-for'] || 'unknown';
  },
);
