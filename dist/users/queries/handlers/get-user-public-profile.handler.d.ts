import { IQueryHandler } from '@nestjs/cqrs';
import { GetUserPublicProfileQuery } from '../get-user-public-profile.query';
import { UsersService } from '../../users.service';
import { PublicProfile } from '../../dto/public-profile.dto';
export declare class GetUserPublicProfileHandler implements IQueryHandler<GetUserPublicProfileQuery, PublicProfile> {
    private readonly usersService;
    constructor(usersService: UsersService);
    execute(query: GetUserPublicProfileQuery): Promise<PublicProfile>;
}
