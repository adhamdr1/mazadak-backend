import { registerEnumType } from '@nestjs/graphql';

export enum ChatMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
}

registerEnumType(ChatMessageType, {
  name: 'ChatMessageType',
});
