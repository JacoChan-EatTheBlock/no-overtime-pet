import { IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';

/** POST /v1/friend-requests — send friend request via friend code */
export class SendFriendRequestDto {
  @IsString()
  @MaxLength(12)
  friendCode: string;
}

/** PATCH /v1/friends/:id/visibility */
export class UpdateVisibilityDto {
  @IsBoolean()
  hidden: boolean;
}
