import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { LoginDto, SignupDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { IJwtPayload, ITokens, IUser } from 'src/types';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly jwtService: JwtService,
  ) {}

  async signup(dto: SignupDto): Promise<IUser> {
    // Check if user already exists
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ForbiddenException('emailExists');
    }

    // Hash password
    const hashedPassword = await this.hashData(dto.password);

    // Create user
    const newUser = await this.databaseService.user.create({
      data: {
        username: dto.username,
        email: dto.email,
        password: hashedPassword,
      },
    });

    return newUser;
  }

  async login(dto: LoginDto): Promise<{ user: IUser; tokens: ITokens }> {
    const user = await this.databaseService.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const passwordMatches = await bcrypt.compare(dto.password, user.password);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.getTokens(user.id, user.email);

    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    const { password, hashedRefreshToken, ...userWithoutPassword } = user;

    return { user: userWithoutPassword as IUser, tokens };
  }

  async refreshTokens(userId: string, refreshToken: string): Promise<ITokens> {
    // Find user
    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.hashedRefreshToken) {
      throw new ForbiddenException('Access Denied');
    }

    // Compare refresh token with stored hash
    const rtMatches = await bcrypt.compare(
      refreshToken,
      user.hashedRefreshToken,
    );

    if (!rtMatches) {
      throw new ForbiddenException('Access Denied');
    }

    // Generate new tokens
    const tokens = await this.getTokens(user.id, user.email);

    // Update refresh token hash
    await this.updateRefreshTokenHash(user.id, tokens.refresh_token);

    return tokens;
  }

  // Helper methods
  private async hashData(data: string): Promise<string> {
    return bcrypt.hash(data, 10);
  }

  private async getTokens(userId: string, email: string): Promise<ITokens> {
    const jwtPayload: IJwtPayload = {
      sub: userId,
      email: email,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_ACCESS_SECRET || 'at-secret',
        expiresIn: '1d',
      }),
      this.jwtService.signAsync(jwtPayload, {
        secret: process.env.JWT_REFRESH_SECRET || 'rt-secret',
        expiresIn: '7d',
      }),
    ]);

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async updateRefreshTokenHash(
    userId: string,
    refreshToken: string,
  ): Promise<void> {
    const hash = await this.hashData(refreshToken);
    await this.databaseService.user.update({
      where: { id: userId },
      data: { hashedRefreshToken: hash },
    });
  }
}
