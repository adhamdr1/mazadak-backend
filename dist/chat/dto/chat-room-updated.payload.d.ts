import { ChatMessage } from '../entities/chat-message.entity';
export declare class ChatRoomUpdatedPayload {
    auctionId: string;
    unreadCount: number;
    totalUnreadRooms: number;
    lastMessageAt: Date;
    lastMessage: ChatMessage;
}
