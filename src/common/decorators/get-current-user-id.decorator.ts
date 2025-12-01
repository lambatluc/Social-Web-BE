import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { IJwtPayload } from 'src/types';

export const GetCurrentUserId = createParamDecorator(
  (_: undefined, context: ExecutionContext): string => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as IJwtPayload;
    return user.sub;
  },
);

// Optional version - returns undefined if not authenticated
export const GetCurrentUserIdOptional = createParamDecorator(
  (_: undefined, context: ExecutionContext): string | undefined => {
    const request = context.switchToHttp().getRequest();
    const user = request.user as IJwtPayload | undefined;
    return user?.sub;
  },
);
