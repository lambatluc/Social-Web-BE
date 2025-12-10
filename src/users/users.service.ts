import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';
import * as bcrypt from 'bcrypt';

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

  async findAll(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      this.databaseService.user.findMany({
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.databaseService.user.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    // Exclude passwords from all users
    return {
      data: users.map(({ password, ...user }) => user),
      page,
      limit,
      total,
      pages: totalPages,
    };
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
    await this.findOne(id);

    // Check email uniqueness if email is being updated
    if (updateUserDto.email) {
      const existingUser = await this.databaseService.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser && existingUser.id !== id) {
        throw new ConflictException('Email already in use');
      }
    }

    // Prepare update data
    const updateData: any = { ...updateUserDto };

    // Hash password if it's being updated
    if (updateUserDto.password) {
      updateData.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const user = await this.databaseService.user.update({
      where: { id },
      data: updateData,
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

  async getUsersWithPostsSortedByLikes(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    // Get users who have posts, with their total likes count
    const usersWithLikes = await this.databaseService.user.findMany({
      where: {
        posts: {
          some: {}, // Only users who have at least one post
        },
      },
      select: {
        id: true,
        name: true,
        username: true,
        email: true,
        imageUrl: true,
        createdAt: true,
        updatedAt: true,
        posts: {
          select: {
            _count: {
              select: {
                likes: true,
              },
            },
          },
        },
      },
    });

    // Calculate total likes for each user and sort
    const usersWithTotalLikes = usersWithLikes.map((user) => {
      const totalLikes = user.posts.reduce(
        (sum, post) => sum + post._count.likes,
        0,
      );
      const { posts, ...userWithoutPosts } = user;
      return {
        ...userWithoutPosts,
        totalLikes,
      };
    });

    // Sort by total likes in descending order
    usersWithTotalLikes.sort((a, b) => b.totalLikes - a.totalLikes);

    // Apply pagination
    const paginatedUsers = usersWithTotalLikes.slice(skip, skip + limit);
    const total = usersWithTotalLikes.length;
    const totalPages = Math.ceil(total / limit);

    return {
      data: paginatedUsers,
      page,
      limit,
      total,
      pages: totalPages,
    };
  }
}
