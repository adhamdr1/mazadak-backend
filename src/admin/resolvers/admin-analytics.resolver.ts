import { Resolver, Query } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../users/enums/user-role.enum';
import { DashboardStats } from '../dto/dashboard-stats.dto';
import { AdminAnalyticsService } from '../services/admin-analytics.service';

@Resolver()
@UseGuards(RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminAnalyticsResolver {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Query(() => DashboardStats)
  async adminGetDashboardStats(): Promise<DashboardStats> {
    return this.adminAnalyticsService.getDashboardStats();
  }
}
