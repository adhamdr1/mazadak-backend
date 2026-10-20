import { ChatMessage } from '../entities/chat-message.entity';
export declare class ChatMessagesConnection {
    items: ChatMessage[];
    hasNextPage: boolean;
    endCursor: string | null;
}
