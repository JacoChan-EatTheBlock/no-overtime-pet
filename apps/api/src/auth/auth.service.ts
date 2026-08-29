import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { UserEntity } from './entities/user.entity';
import { AuthSessionEntity } from './entities/auth-session.entity';
import { RegisterDto, LoginDto, AuthResponse } from './dto/auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(AuthSessionEntity)
    private readonly sessionRepo: Repository<AuthSessionEntity>,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Register a new user with username + password.
   * No email, no phone, no verification code.
   */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    // Check username uniqueness
    const existing = await this.userRepo.findOne({
      where: { username: dto.username.toLowerCase() },
    });
    if (existing) {
      throw new ConflictException('USERNAME_TAKEN');
    }

    // Hash password (never log or return it)
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Generate unique friend code (6 chars, alphanumeric, non-guessable)
    const friendCode = this.generateFriendCode();

    // Create user
    const user = this.userRepo.create({
      username: dto.username.toLowerCase(),
      passwordHash,
      displayName: dto.displayName,
      friendCode,
    });
    await this.userRepo.save(user);

    // Generate tokens
    return this.createSession(user);
  }

  /**
   * Login with username + password.
   */
  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.userRepo.findOne({
      where: { username: dto.username.toLowerCase(), status: 'ACTIVE' },
    });

    if (!user) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    const isValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('INVALID_CREDENTIALS');
    }

    return this.createSession(user);
  }

  /**
   * Get user profile by ID (for JWT validation).
   */
  async getUserById(userId: string): Promise<UserEntity | null> {
    return this.userRepo.findOne({
      where: { id: userId, status: 'ACTIVE' },
    });
  }

  // ─── Private Helpers ─────────────────────────────────────────

  private async createSession(user: UserEntity): Promise<AuthResponse> {
    const payload = { sub: user.id, username: user.username };
    const accessToken = this.jwtService.sign(payload);

    // Create refresh token and store session
    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto
      .createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    const session = this.sessionRepo.create({
      userId: user.id,
      refreshTokenHash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    });
    await this.sessionRepo.save(session);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        friendCode: user.friendCode,
      },
    };
  }

  private generateFriendCode(): string {
    // 8-char alphanumeric, uppercase for readability
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No I/O/0/1 (avoid confusion)
    let code = '';
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }
}
