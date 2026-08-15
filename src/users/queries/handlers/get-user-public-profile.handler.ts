import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserPublicProfileQuery } from '../get-user-public-profile.query';
import { UsersService } from '../../users.service';
import { PublicProfile } from '../../dto/public-profile.dto';

@QueryHandler(GetUserPublicProfileQuery)
export class GetUserPublicProfileHandler implements IQueryHandler<
  GetUserPublicProfileQuery,
  PublicProfile
> {
  constructor(private readonly usersService: UsersService) {}

  async execute(query: GetUserPublicProfileQuery): Promise<PublicProfile> {
    return this.usersService.getPublicProfile(query.userId);
  }
}
