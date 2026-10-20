import { Types } from 'mongoose';
import { Auction } from '../../auctions/entities/auction.entity';
import { ChatMessage } from '../entities/chat-message.entity';
export declare class ChatRoom {
    auctionId: Types.ObjectId;
    auction: Auction;
    lastMessage: ChatMessage | null;
    lastMessageAt: Date | null;
    unreadCount: number;
}
