import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FriendsService } from './friends.service';
import { SendFriendRequestDto, UpdateVisibilityDto } from './dto/friend.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class FriendsController {
  constructor(private friendsService: FriendsService) {}

  // ━━━ Friend Requests ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** POST /v1/friend-requests — send request via friend code */
  @Post('friend-requests')
  async sendRequest(
    @Request() req: any,
    @Body() dto: SendFriendRequestDto,
  ) {
    const relation = await this.friendsService.sendRequest(
      req.user.sub,
      dto.friendCode,
    );
    return { data: relation };
  }

  /** GET /v1/friend-requests — pending requests for current user */
  @Get('friend-requests')
  async getPendingRequests(@Request() req: any) {
    const requests = await this.friendsService.getPendingRequests(req.user.sub);
    return { data: requests };
  }

  /** POST /v1/friend-requests/:id/accept */
  @Post('friend-requests/:id/accept')
  @HttpCode(200)
  async acceptRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const relation = await this.friendsService.acceptRequest(req.user.sub, id);
    return { data: relation };
  }

  /** POST /v1/friend-requests/:id/decline */
  @Post('friend-requests/:id/decline')
  @HttpCode(200)
  async declineRequest(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const relation = await this.friendsService.declineRequest(req.user.sub, id);
    return { data: relation };
  }

  // ━━━ Friends ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  /** GET /v1/friends — ACCEPTED friends list */
  @Get('friends')
  async listFriends(@Request() req: any) {
    const friends = await this.friendsService.listFriends(req.user.sub);
    return {
      data: friends.map((f) => ({
        relationId: f.relation.id,
        friend: {
          id: f.friend.id,
          username: f.friend.username,
          displayName: f.friend.displayName,
          friendCode: f.friend.friendCode,
        },
        since: f.relation.updatedAt,
      })),
    };
  }

  /** DELETE /v1/friends/:id — remove friend */
  @Delete('friends/:id')
  @HttpCode(204)
  async removeFriend(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.friendsService.removeFriend(req.user.sub, id);
  }

  /** PATCH /v1/friends/:id/visibility — hide/show from specific friend */
  @Patch('friends/:id/visibility')
  async updateVisibility(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisibilityDto,
  ) {
    const override = await this.friendsService.updateVisibility(
      req.user.sub,
      id,
      dto.hidden,
    );
    return { data: override };
  }
}
