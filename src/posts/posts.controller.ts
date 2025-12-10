import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PostsService } from './posts.service';
import { CreatePostDto } from './dto/create-post.dto';
import { UpdatePostDto } from './dto/update-post.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import {
  GetCurrentUserId,
  GetCurrentUserIdOptional,
} from '../common/decorators/get-current-user-id.decorator';

@Controller('posts')
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  create(
    @Body() createPostDto: CreatePostDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.postsService.create(createPostDto, userId);
  }

  @Get()
  findAll(
    @Query() query: PaginationQueryDto,
    @GetCurrentUserIdOptional() userId?: string,
  ) {
    return this.postsService.findAll(query.page, query.limit, userId);
  }

  @Get('user/:userId')
  getPostsByUser(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
    @GetCurrentUserIdOptional() currentUserId?: string,
  ) {
    return this.postsService.getPostsByUser(
      userId,
      query.page,
      query.limit,
      currentUserId,
    );
  }

  @Get('liked/:userId')
  getLikedPostsByUser(
    @Param('userId') userId: string,
    @Query() query: PaginationQueryDto,
    @GetCurrentUserIdOptional() currentUserId?: string,
  ) {
    return this.postsService.getLikedPostsByUser(
      userId,
      query.page,
      query.limit,
      currentUserId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @GetCurrentUserIdOptional() userId?: string,
  ) {
    return this.postsService.findOne(id, userId);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePostDto: UpdatePostDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.postsService.update(id, updatePostDto, userId);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.postsService.remove(id, userId);
  }

  // Like endpoints
  @Post(':id/like')
  likePost(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.postsService.likePost(id, userId);
  }

  @Delete(':id/unlike')
  unlikePost(@Param('id') id: string, @GetCurrentUserId() userId: string) {
    return this.postsService.unlikePost(id, userId);
  }

  // Comment endpoints
  @Get(':id/comments')
  getComments(@Param('id') id: string) {
    return this.postsService.getComments(id);
  }

  @Post(':id/comments')
  createComment(
    @Param('id') id: string,
    @Body() createCommentDto: CreateCommentDto,
    @GetCurrentUserId() userId: string,
  ) {
    return this.postsService.createComment(
      id,
      userId,
      createCommentDto.content,
    );
  }
}
