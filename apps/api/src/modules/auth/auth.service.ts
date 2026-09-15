import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.module';
import { LoginDto } from './dto/auth.dto';
import { JwtPayload } from '../../common/decorators/auth.decorators';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        platformAdmin: true,
        tenantMemberships: {
          include: {
            tenant: {
              include: {
                modules: {
                  where: { isActive: true },
                  include: { module: true },
                },
              },
            },
          },
        },
        borrowerAccount: {
          include: {
            borrower: {
              include: {
                tenant: {
                  include: {
                    modules: {
                      where: { isActive: true },
                      include: { module: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPlatformAdmin = !!user.platformAdmin;
    let tenantId: string | undefined;
    let role: string | undefined;
    let modules: string[] = [];
    let permissions: string[] = [];

    if (isPlatformAdmin) {
      role = 'platform_admin';
    } else if (user.borrowerAccount) {
      tenantId = user.borrowerAccount.borrower.tenantId;
      role = 'borrower';
      modules = user.borrowerAccount.borrower.tenant.modules.map(
        (m) => m.module.code,
      );
    } else if (user.tenantMemberships.length > 0) {
      const membership = dto.tenantId
        ? user.tenantMemberships.find((m) => m.tenantId === dto.tenantId)
        : user.tenantMemberships[0];

      if (!membership) {
        throw new UnauthorizedException('Tenant no válido');
      }

      tenantId = membership.tenantId;
      role = membership.role;
      modules = membership.tenant.modules.map((m) => m.module.code);
      permissions = await this.getPermissionsForRole(membership.role);
    } else {
      throw new UnauthorizedException('Usuario sin acceso asignado');
    }

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      isPlatformAdmin,
      tenantId,
      role,
    };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get('JWT_REFRESH_SECRET'),
      expiresIn: this.config.get('JWT_REFRESH_EXPIRES_IN', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role,
        tenantId,
        isPlatformAdmin,
        modules,
        permissions,
        tenants: user.tenantMemberships.map((m) => ({
          id: m.tenant.id,
          name: m.tenant.name,
          role: m.role,
        })),
      },
    };
  }

  async refresh(refreshToken: string) {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get('JWT_REFRESH_SECRET'),
      });
      const accessToken = this.jwt.sign({
        sub: payload.sub,
        email: payload.email,
        isPlatformAdmin: payload.isPlatformAdmin,
        tenantId: payload.tenantId,
        role: payload.role,
      });
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Refresh token inválido');
    }
  }

  async verifyPassword(userId: string, password: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Usuario no válido');
    }
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
  }

  private async getPermissionsForRole(role: string): Promise<string[]> {
    const perms = await this.prisma.rolePermission.findMany({
      where: { role: role as any },
      include: { permission: true },
    });
    return perms.map((p) => p.permission.code);
  }
}
