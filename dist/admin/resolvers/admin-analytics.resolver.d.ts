import { DashboardStats } from '../dto/dashboard-stats.dto';
import { AdminAnalyticsService } from '../services/admin-analytics.service';
export declare class AdminAnalyticsResolver {
    private readonly adminAnalyticsService;
    constructor(adminAnalyticsService: AdminAnalyticsService);
    adminGetDashboardStats(): Promise<DashboardStats>;
}
