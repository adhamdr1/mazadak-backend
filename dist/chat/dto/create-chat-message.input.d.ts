import { ChatMessageType } from '../enums/chat-message-type.enum';
export declare class CreateChatMessageInput {
    auctionId: string;
    content?: string;
    type?: ChatMessageType;
    mediaUrls?: string[];
    clientMessageId: string;
}
