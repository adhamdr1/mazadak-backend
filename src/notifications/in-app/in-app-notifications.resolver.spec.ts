import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationsResolver } from './in-app-notifications.resolver';
import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotificationType } from './enums/in-app-notification-type.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { Types } from 'mongoose';
import { JwtPayload } from '../../auth/interfaces/jwt-payload.interface';
import { UserRole } from '../../users/enums/user-role.enum';

const mockInAppNotificationsService = {
  getMyNotifications: jest.fn(),
  getUnreadCount: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

describe('InAppNotificationsResolver', () => {
  let resolver: InAppNotificationsResolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationsResolver,
        {
          provide: InAppNotificationsService,
          useValue: mockInAppNotificationsService,
        },
      ],
    }).compile();

    resolver = module.get<InAppNotificationsResolver>(
      InAppNotificationsResolver,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const notificationId = new Types.ObjectId().toString();
  const mockCurrentUser: JwtPayload = {
    sub: userId,
    email: 'test@example.com',
    role: UserRole.USER,
  };

  const mockNotification = {
    _id: notificationId,
    userId,
    type: InAppNotificationType.OUTBID,
    title: 'Outbid',
    body: 'You have been outbid',
    isRead: false,
    referenceId: '123',
    referenceType: NotificationReferenceType.AUCTION,
    createdAt: new Date(),
  };

  describe('myNotifications', () => {
    it('should return service getMyNotifications result', async () => {
      const pagination = { page: 1, limit: 10 };
      const pageResult = {
        items: [mockNotification],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      };
      mockInAppNotificationsService.getMyNotifications.mockResolvedValue(
        pageResult,
      );

      const result = await resolver.getMyNotifications(
        mockCurrentUser,
        pagination,
      );
      expect(result).toEqual(pageResult);
      expect(
        mockInAppNotificationsService.getMyNotifications,
      ).toHaveBeenCalledWith(userId, pagination);
    });
  });

  describe('unreadNotificationsCount', () => {
    it('should return unread count', async () => {
      mockInAppNotificationsService.getUnreadCount.mockResolvedValue(3);
      const result =
        await resolver.getUnreadNotificationsCount(mockCurrentUser);
      expect(result).toBe(3);
      expect(mockInAppNotificationsService.getUnreadCount).toHaveBeenCalledWith(
        userId,
      );
    });
  });

  describe('markNotificationAsRead', () => {
    it('should call service markAsRead', async () => {
      mockInAppNotificationsService.markAsRead.mockResolvedValue(
        mockNotification,
      );
      const result = await resolver.markNotificationAsRead(
        mockCurrentUser,
        notificationId,
      );
      expect(result).toEqual(mockNotification);
      expect(mockInAppNotificationsService.markAsRead).toHaveBeenCalledWith(
        notificationId,
        userId,
      );
    });
  });

  describe('markAllNotificationsAsRead', () => {
    it('should call service markAllAsRead and return true', async () => {
      mockInAppNotificationsService.markAllAsRead.mockResolvedValue(undefined);
      const result = await resolver.markAllNotificationsAsRead(mockCurrentUser);
      expect(result).toBe(true);
      expect(mockInAppNotificationsService.markAllAsRead).toHaveBeenCalledWith(
        userId,
      );
    });
  });
});
