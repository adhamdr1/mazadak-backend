import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ChatResolver } from './chat.resolver';
import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './entities/chat-message.entity';
import {
  ChatReadState,
  ChatReadStateSchema,
} from './entities/chat-read-state.entity';
import { MongoChatRepository } from './repositories/mongo.chat.repository';
import { AuctionsModule } from '../auctions/auctions.module';
import { RabbitMQModule } from '../infrastructure/rabbitmq/rabbitmq.module';
import { PubSubModule } from '../infrastructure/pubsub/pubsub.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ChatMessage.name, schema: ChatMessageSchema },
      { name: ChatReadState.name, schema: ChatReadStateSchema },
    ]),
    AuctionsModule,
    RabbitMQModule,
    PubSubModule,
  ],
  providers: [
    ChatResolver,
    ChatService,
    {
      provide: 'IChatRepository',
      useClass: MongoChatRepository,
    },
  ],
  exports: [ChatService],
})
export class ChatModule {}
