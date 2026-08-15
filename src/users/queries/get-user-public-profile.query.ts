import { Query } from '@nestjs/cqrs';
import { PublicProfile } from '../dto/public-profile.dto';

export class GetUserPublicProfileQuery extends Query<PublicProfile> {
  constructor(readonly userId: string) {
    super();
  }
}
