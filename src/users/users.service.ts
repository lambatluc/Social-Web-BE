import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createUserDto: CreateUserDto) {
    const existingUser = await this.databaseService.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const user = await this.databaseService.user.create({
      data: {
        ...createUserDto,
        password: '', // Password should be set through auth endpoints
      },
    });

    // Exclude password from response
    const { password, ...result } = user;
    return result;
  }

  async findAll() {
    const users = await this.databaseService.user.findMany();
    // Exclude passwords from all users
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.databaseService.user.findUnique({ where: { id } });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    const { password, ...result } = user;
    return result;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    await this.findOne(id); // Check if user exists

    if (updateUserDto.email) {
      const existingUser = await this.databaseService.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    const user = await this.databaseService.user.update({
      where: { id },
      data: updateUserDto,
    });

    const { password, ...result } = user;
    return result;
  }

  async remove(id: string) {
    await this.findOne(id); // Check if user exists

    const user = await this.databaseService.user.delete({ where: { id } });
    const { password, ...result } = user;
    return result;
  }
}
