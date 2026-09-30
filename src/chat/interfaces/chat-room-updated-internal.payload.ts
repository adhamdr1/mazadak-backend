import type { ChatMessage } from '../entities/chat-message.entity';

export interface ChatRoomUpdatedInternalPayload {
  recipientId: string;
  auctionId: string;
  unreadCount: number;
  totalUnreadRooms: number;
  lastMessageAt: Date;
  lastMessage: ChatMessage;
}
