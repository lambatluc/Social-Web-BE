import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { DatabaseService } from '../database/database.service';

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Helper function to transform post response
  private transformPostResponse(post: any, userId?: string) {
    const { _count, likes, ...rest } = post;
    const isLiked = userId
      ? likes?.some((like: any) => like.userId === userId) || false
      : false;

    return {
      ...rest,
      likes: _count?.likes || 0,
      isLiked,
    };
  }

  async create(createPostDto: CreatePostDto, userId: string) {
    const post = await this.databaseService.post.create({
      data: {
        ...createPostDto,
        creatorId: userId,
        tags: createPostDto.tags || [],
      },
      select: {
        id: true,
        caption: true,
        imageUrl: true,
        location: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.transformPostResponse(post, userId);
  }

  async findAll(page: number = 1, limit: number = 10, userId?: string) {
    const skip = (page - 1) * limit;

    const [posts, total] = await Promise.all([
      this.databaseService.post.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          caption: true,
          imageUrl: true,
          location: true,
          tags: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              likes: true,
            },
          },
          likes: {
            select: {
              userId: true,
            },
          },
          creator: {
            select: {
              id: true,
              username: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.databaseService.post.count(),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      data: posts.map((post) => this.transformPostResponse(post, userId)),
      page,
      limit,
      total,
      pages: totalPages,
    };
  }

  async findOne(id: string, userId?: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id },
      select: {
        id: true,
        caption: true,
        imageUrl: true,
        location: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.transformPostResponse(post, userId);
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string) {
    // First check if post exists and belongs to user
    const post = await this.databaseService.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.creatorId !== userId) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    const updatedPost = await this.databaseService.post.update({
      where: { id },
      data: updatePostDto,
      select: {
        id: true,
        caption: true,
        imageUrl: true,
        location: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            likes: true,
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        creator: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });

    return this.transformPostResponse(updatedPost, userId);
  }

  async remove(id: string, userId: string) {
    // First check if post exists and belongs to user
    const post = await this.databaseService.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    if (post.creatorId !== userId) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    await this.databaseService.post.delete({
      where: { id },
    });

    return { success: true, message: 'Post deleted successfully' };
  }

  // Like functionality
  async likePost(postId: string, userId: string) {
    // Check if post exists
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    // Check if already liked
    const existingLike = await this.databaseService.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (existingLike) {
      return { success: true, message: 'Post already liked' };
    }

    // Create like
    await this.databaseService.postLike.create({
      data: {
        postId,
        userId,
      },
    });

    return { success: true, message: 'Post liked successfully' };
  }

  async unlikePost(postId: string, userId: string) {
    // Check if like exists
    const existingLike = await this.databaseService.postLike.findUnique({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    if (!existingLike) {
      throw new NotFoundException('Like not found');
    }

    // Delete like
    await this.databaseService.postLike.delete({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
    });

    return { success: true, message: 'Post unlike successfully' };
  }

  // Comment functionality
  async getComments(postId: string) {
    // Check if post exists
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    return this.databaseService.postComment.findMany({
      where: { postId },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async createComment(postId: string, userId: string, content: string) {
    // Check if post exists
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    return this.databaseService.postComment.create({
      data: {
        postId,
        userId,
        content,
      },
      select: {
        id: true,
        content: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
      },
    });
  }
}
