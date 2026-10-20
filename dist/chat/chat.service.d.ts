import type { IChatRepository } from './interfaces/chat-repository.interface';
import type { IAuctionRepository } from '../auctions/interfaces/auction-repository.interface';
import { RabbitMQService } from '../infrastructure/rabbitmq/rabbitmq.service';
import { RealtimeService } from '../infrastructure/pubsub/realtime.service';
import { ChatMessage } from './entities/chat-message.entity';
import { ChatReadState } from './entities/chat-read-state.entity';
import { UserRole } from '../users/enums/user-role.enum';
import { CreateChatMessageInput } from './dto/create-chat-message.input';
import { ChatRoomsPage } from './dto/chat-rooms-page.type';
export declare class ChatService {
    private readonly chatRepository;
    private readonly auctionRepository;
    private readonly rabbitMQService;
    private readonly realtimeService;
    private readonly logger;
    constructor(chatRepository: IChatRepository, auctionRepository: IAuctionRepository, rabbitMQService: RabbitMQService, realtimeService: RealtimeService);
    private validateChatAccess;
    verifyChatAccess(userId: string, userRole: UserRole, auctionId: string): Promise<void>;
    sendMessage(senderId: string, senderName: string, userRole: UserRole, input: CreateChatMessageInput): Promise<ChatMessage>;
    private notifyChatRoomUpdatedOnMessage;
    private publishChatNotification;
    editMessage(userId: string, userRole: UserRole, messageId: string, newContent: string): Promise<ChatMessage>;
    deleteMessage(userId: string, userRole: UserRole, messageId: string): Promise<ChatMessage>;
    reactToMessage(userId: string, userRole: UserRole, messageId: string, emoji?: string): Promise<ChatMessage>;
    getChatMessages(userId: string, userRole: UserRole, auctionId: string, limit: number, cursor?: string): Promise<{
        items: ChatMessage[];
        hasNextPage: boolean;
        endCursor: string | null;
    }>;
    markChatAsRead(userId: string, userRole: UserRole, auctionId: string, lastReadMessageId: string): Promise<boolean>;
    private notifyChatRoomUpdatedOnRead;
    findReadState(userId: string, userRole: UserRole, auctionId: string): Promise<ChatReadState | null>;
    findReadStates(userId: string, userRole: UserRole, auctionId: string): Promise<ChatReadState[]>;
    getMyChatRooms(userId: string, page?: number, limit?: number): Promise<ChatRoomsPage>;
}
