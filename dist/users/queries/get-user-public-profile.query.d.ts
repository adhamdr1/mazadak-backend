import { Query } from '@nestjs/cqrs';
import { PublicProfile } from '../dto/public-profile.dto';
export declare class GetUserPublicProfileQuery extends Query<PublicProfile> {
    readonly userId: string;
    constructor(userId: string);
}
