import { Test, TestingModule } from '@nestjs/testing';
import { InAppNotificationsService } from './in-app-notifications.service';
import { InAppNotificationType } from './enums/in-app-notification-type.enum';
import { NotificationCategory } from './enums/notification-category.enum';
import { NotificationReferenceType } from './enums/notification-reference-type.enum';
import { InAppNotificationNotFoundException } from '../exceptions/in-app-notification-not-found.exception';
import { Types } from 'mongoose';

import { RealtimeService } from '../../infrastructure/pubsub/realtime.service';

const mockNotificationRepository = {
  create: jest.fn(),
  findByUserId: jest.fn(),
  countByUserId: jest.fn(),
  countUnread: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
};

const mockRealtimeService = {
  publishBidAdded: jest.fn().mockResolvedValue(undefined),
  publishNotificationAdded: jest.fn().mockResolvedValue(undefined),
  publishNotificationReadStatusUpdated: jest.fn().mockResolvedValue(undefined),
  publishAuctionStatusChanged: jest.fn().mockResolvedValue(undefined),
};

describe('InAppNotificationsService', () => {
  let service: InAppNotificationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InAppNotificationsService,
        {
          provide: 'IInAppNotificationRepository',
          useValue: mockNotificationRepository,
        },
        {
          provide: RealtimeService,
          useValue: mockRealtimeService,
        },
      ],
    }).compile();

    service = module.get<InAppNotificationsService>(InAppNotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  const userId = new Types.ObjectId().toString();
  const notificationId = new Types.ObjectId().toString();
  const mockNotification = {
    _id: notificationId,
    userId,
    type: InAppNotificationType.OUTBID,
    category: NotificationCategory.AUCTIONS,
    title: 'Outbid',
    body: 'You have been outbid',
    isRead: false,
    referenceId: '123',
    referenceType: NotificationReferenceType.AUCTION,
    createdAt: new Date(),
  };

  describe('create', () => {
    it('should create notification successfully', async () => {
      mockNotificationRepository.create.mockResolvedValue(mockNotification);

      const dto = {
        userId,
        type: InAppNotificationType.OUTBID,
        title: 'Outbid',
        body: 'You have been outbid',
        referenceId: '123',
        referenceType: NotificationReferenceType.AUCTION,
      };

      const result = await service.create(dto);
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.create).toHaveBeenCalledWith(
        dto,
        undefined,
      );
      expect(mockRealtimeService.publishNotificationAdded).toHaveBeenCalledWith(
        mockNotification,
      );
    });
  });

  describe('getMyNotifications', () => {
    it('should return paginated notifications without filter', async () => {
      mockNotificationRepository.findByUserId.mockResolvedValue([
        mockNotification,
      ]);
      mockNotificationRepository.countByUserId.mockResolvedValue(1);

      const result = await service.getMyNotifications(userId, {
        page: 1,
        limit: 10,
      });

      expect(result).toEqual({
        items: [mockNotification],
        total: 1,
        totalPages: 1,
        hasNextPage: false,
      });
      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
        undefined,
      );
      expect(mockNotificationRepository.countByUserId).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });

    it('should pass filter to repository when provided', async () => {
      mockNotificationRepository.findByUserId.mockResolvedValue([
        mockNotification,
      ]);
      mockNotificationRepository.countByUserId.mockResolvedValue(1);

      const filter = {
        category: NotificationCategory.AUCTIONS,
        isRead: false,
      };

      const result = await service.getMyNotifications(
        userId,
        { page: 1, limit: 10 },
        filter,
      );

      expect(result.items).toHaveLength(1);
      expect(mockNotificationRepository.findByUserId).toHaveBeenCalledWith(
        userId,
        1,
        10,
        filter,
      );
      expect(mockNotificationRepository.countByUserId).toHaveBeenCalledWith(
        userId,
        filter,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return total unread count when category is omitted', async () => {
      mockNotificationRepository.countUnread.mockResolvedValue(5);
      const result = await service.getUnreadCount(userId);
      expect(result).toBe(5);
      expect(mockNotificationRepository.countUnread).toHaveBeenCalledWith(
        userId,
        undefined,
      );
    });

    it('should return unread count for specific category', async () => {
      mockNotificationRepository.countUnread.mockResolvedValue(2);
      const result = await service.getUnreadCount(
        userId,
        NotificationCategory.FINANCIAL,
      );
      expect(result).toBe(2);
      expect(mockNotificationRepository.countUnread).toHaveBeenCalledWith(
        userId,
        NotificationCategory.FINANCIAL,
      );
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read and publish read status', async () => {
      mockNotificationRepository.markAsRead.mockResolvedValue(mockNotification);
      mockNotificationRepository.countUnread.mockResolvedValue(3);

      const result = await service.markAsRead(notificationId, userId);
      expect(result).toEqual(mockNotification);
      expect(mockNotificationRepository.markAsRead).toHaveBeenCalledWith(
        notificationId,
        userId,
        undefined,
      );
      expect(mockNotificationRepository.countUnread).toHaveBeenCalledWith(
        userId,
      );
      expect(
        mockRealtimeService.publishNotificationReadStatusUpdated,
      ).toHaveBeenCalledWith(userId, {
        notificationId,
        unreadCount: 3,
        category: mockNotification.category,
      });
    });

    it('should throw InAppNotificationNotFoundException if notification does not exist', async () => {
      mockNotificationRepository.markAsRead.mockResolvedValue(null);
      await expect(service.markAsRead(notificationId, userId)).rejects.toThrow(
        InAppNotificationNotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all user notifications as read and broadcast zero count', async () => {
      mockNotificationRepository.markAllAsRead.mockResolvedValue(undefined);
      await service.markAllAsRead(userId);
      expect(mockNotificationRepository.markAllAsRead).toHaveBeenCalledWith(
        userId,
        undefined,
      );
      expect(
        mockRealtimeService.publishNotificationReadStatusUpdated,
      ).toHaveBeenCalledWith(userId, {
        notificationId: null,
        unreadCount: 0,
        category: null,
      });
    });
  });
});
