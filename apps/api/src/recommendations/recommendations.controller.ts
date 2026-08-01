import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AuthUser } from '../auth/types/auth-user.type';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { RecommendationsService } from './recommendations.service';
import type { FriendRecommendationsResponse } from './types/friend-recommendation.type';

@Controller('recommendations')
@UseGuards(JwtAuthGuard)
@ApiTags('Recommendations')
@ApiBearerAuth()
export class RecommendationsController {
  constructor(
    private readonly recommendationsService: RecommendationsService,
  ) {}

  @Get('friends')
  getFriends(
    @CurrentUser() user: AuthUser,
    @Query() query: RecommendationQueryDto,
  ): Promise<FriendRecommendationsResponse> {
    return this.recommendationsService.getFriendRecommendations(
      user.personId,
      query.limit,
    );
  }
}
