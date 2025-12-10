import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { DatabaseService } from '../database/database.service';
import { PaginationUtil } from '../common/utils/pagination.util';
import { PaginatedResponse } from '../common/interfaces/pagination-response.interface';

@Injectable()
export class PostsService {
  constructor(private readonly databaseService: DatabaseService) {}

  private readonly postSelectFields = {
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
        name: true,
        email: true,
        imageUrl: true,
      },
    },
  } as const;

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
      select: this.postSelectFields,
    });

    return this.transformPostResponse(post, userId);
  }

  async findAll(
    page: number = 1,
    limit: number = 10,
    userId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = PaginationUtil.calculateSkip(page, limit);

    const [posts, total] = await Promise.all([
      this.databaseService.post.findMany({
        skip,
        take: limit,
        select: this.postSelectFields,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.databaseService.post.count(),
    ]);

    const transformedPosts = posts.map((post) =>
      this.transformPostResponse(post, userId),
    );

    return PaginationUtil.buildPaginatedResponse(
      transformedPosts,
      page,
      limit,
      total,
    );
  }

  async getPostsByUser(
    creatorId: string,
    page: number = 1,
    limit: number = 10,
    userId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = PaginationUtil.calculateSkip(page, limit);

    const [posts, total] = await Promise.all([
      this.databaseService.post.findMany({
        where: {
          creatorId,
        },
        skip,
        take: limit,
        select: this.postSelectFields,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.databaseService.post.count({
        where: {
          creatorId,
        },
      }),
    ]);

    const transformedPosts = posts.map((post) =>
      this.transformPostResponse(post, userId),
    );

    return PaginationUtil.buildPaginatedResponse(
      transformedPosts,
      page,
      limit,
      total,
    );
  }

  async getLikedPostsByUser(
    userId: string,
    page: number = 1,
    limit: number = 10,
    currentUserId?: string,
  ): Promise<PaginatedResponse<any>> {
    const skip = PaginationUtil.calculateSkip(page, limit);

    const [likedPosts, total] = await Promise.all([
      this.databaseService.postLike.findMany({
        where: {
          userId,
        },
        skip,
        take: limit,
        select: {
          post: {
            select: this.postSelectFields,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.databaseService.postLike.count({
        where: {
          userId,
        },
      }),
    ]);

    const transformedPosts = likedPosts.map((likedPost) =>
      this.transformPostResponse(likedPost.post, currentUserId),
    );

    return PaginationUtil.buildPaginatedResponse(
      transformedPosts,
      page,
      limit,
      total,
    );
  }

  async findOne(id: string, userId?: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id },
      select: this.postSelectFields,
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.transformPostResponse(post, userId);
  }

  async update(id: string, updatePostDto: UpdatePostDto, userId: string) {
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
      select: this.postSelectFields,
    });

    return this.transformPostResponse(updatedPost, userId);
  }

  async remove(id: string, userId: string) {
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

  async likePost(postId: string, userId: string) {
    const post = await this.databaseService.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

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

    await this.databaseService.postLike.create({
      data: {
        postId,
        userId,
      },
    });

    return { success: true, message: 'Post liked successfully' };
  }

  async unlikePost(postId: string, userId: string) {
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

  async getComments(postId: string) {
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
