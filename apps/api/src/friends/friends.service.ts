import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { FriendRelationEntity } from './entities/friend-relation.entity';
import { FriendVisibilityOverrideEntity } from './entities/friend-visibility-override.entity';
import { UserEntity } from '../auth/entities/user.entity';

@Injectable()
export class FriendsService {
  constructor(
    @InjectRepository(FriendRelationEntity)
    private relationRepo: Repository<FriendRelationEntity>,
    @InjectRepository(FriendVisibilityOverrideEntity)
    private visibilityRepo: Repository<FriendVisibilityOverrideEntity>,
    @InjectRepository(UserEntity)
    private userRepo: Repository<UserEntity>,
  ) {}

  /** Normalize a pair so userLowId < userHighId (string comparison). */
  private normalizePair(a: string, b: string): { low: string; high: string } {
    return a < b ? { low: a, high: b } : { low: b, high: a };
  }

  /**
   * Send a friend request using the target's friend code.
   */
  async sendRequest(requesterId: string, friendCode: string): Promise<FriendRelationEntity> {
    const target = await this.userRepo.findOne({
      where: { friendCode, status: 'ACTIVE' },
    });
    if (!target) {
      throw new NotFoundException({
        code: 'FRIEND_CODE_NOT_FOUND',
        message: `No user found with friend code ${friendCode}`,
      });
    }

    if (target.id === requesterId) {
      throw new BadRequestException({
        code: 'CANNOT_ADD_SELF',
        message: 'You cannot send a friend request to yourself',
      });
    }

    const { low, high } = this.normalizePair(requesterId, target.id);

    // Check existing relation
    const existing = await this.relationRepo.findOne({
      where: { userLowId: low, userHighId: high },
    });

    if (existing) {
      if (existing.status === 'ACCEPTED') {
        throw new ConflictException({
          code: 'ALREADY_FRIENDS',
          message: 'You are already friends',
        });
      }
      if (existing.status === 'PENDING') {
        throw new ConflictException({
          code: 'REQUEST_ALREADY_PENDING',
          message: 'A friend request is already pending',
        });
      }
      // DECLINED — allow re-request: reset to PENDING
      existing.requesterId = requesterId;
      existing.status = 'PENDING';
      existing.revision = Number(existing.revision) + 1;
      return this.relationRepo.save(existing);
    }

    const relation = this.relationRepo.create({
      userLowId: low,
      userHighId: high,
      requesterId,
      status: 'PENDING',
    });
    return this.relationRepo.save(relation);
  }

  /**
   * Get pending friend requests FOR the current user (where they are the non-requester).
   */
  async getPendingRequests(userId: string): Promise<FriendRelationEntity[]> {
    const allPending = await this.relationRepo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.requester', 'requester')
      .where('fr.status = :status', { status: 'PENDING' })
      .andWhere('fr.requester_id != :userId', { userId })
      .andWhere('(fr.user_low_id = :userId OR fr.user_high_id = :userId)', { userId })
      .orderBy('fr.created_at', 'DESC')
      .getMany();

    return allPending;
  }

  /**
   * Accept a friend request. Only the non-requester can accept.
   */
  async acceptRequest(userId: string, relationId: string): Promise<FriendRelationEntity> {
    const relation = await this.findPendingRequest(userId, relationId);
    this.ensureRecipient(userId, relation);

    relation.status = 'ACCEPTED';
    relation.revision = Number(relation.revision) + 1;
    return this.relationRepo.save(relation);
  }

  /**
   * Decline a friend request. Only the non-requester can decline.
   */
  async declineRequest(userId: string, relationId: string): Promise<FriendRelationEntity> {
    const relation = await this.findPendingRequest(userId, relationId);
    this.ensureRecipient(userId, relation);

    relation.status = 'DECLINED';
    relation.revision = Number(relation.revision) + 1;
    return this.relationRepo.save(relation);
  }

  /**
   * List ACCEPTED friends with their user info.
   */
  async listFriends(userId: string): Promise<Array<{ relation: FriendRelationEntity; friend: UserEntity }>> {
    const relations = await this.relationRepo
      .createQueryBuilder('fr')
      .leftJoinAndSelect('fr.userLow', 'userLow')
      .leftJoinAndSelect('fr.userHigh', 'userHigh')
      .where('fr.status = :status', { status: 'ACCEPTED' })
      .andWhere('(fr.user_low_id = :userId OR fr.user_high_id = :userId)', { userId })
      .orderBy('fr.updated_at', 'DESC')
      .getMany();

    return relations.map((rel) => ({
      relation: rel,
      friend: rel.userLowId === userId ? rel.userHigh : rel.userLow,
    }));
  }

  /**
   * Remove a friend (delete the relation).
   */
  async removeFriend(userId: string, relationId: string): Promise<void> {
    const relation = await this.relationRepo.findOne({
      where: { id: relationId },
    });
    if (!relation) {
      throw new NotFoundException({
        code: 'FRIEND_RELATION_NOT_FOUND',
        message: 'Friend relation not found',
      });
    }

    // Ensure user is part of this relation
    if (relation.userLowId !== userId && relation.userHighId !== userId) {
      throw new NotFoundException({
        code: 'FRIEND_RELATION_NOT_FOUND',
        message: 'Friend relation not found',
      });
    }

    await this.relationRepo.remove(relation);
  }

  /**
   * Update visibility for a specific friend ("不对其展示").
   */
  async updateVisibility(
    ownerId: string,
    relationId: string,
    hidden: boolean,
  ): Promise<FriendVisibilityOverrideEntity> {
    // Find the relation to get the friend's ID
    const relation = await this.relationRepo.findOne({
      where: { id: relationId },
    });
    if (!relation) {
      throw new NotFoundException({
        code: 'FRIEND_RELATION_NOT_FOUND',
        message: 'Friend relation not found',
      });
    }
    if (relation.userLowId !== ownerId && relation.userHighId !== ownerId) {
      throw new NotFoundException({
        code: 'FRIEND_RELATION_NOT_FOUND',
        message: 'Friend relation not found',
      });
    }

    const friendId = relation.userLowId === ownerId
      ? relation.userHighId
      : relation.userLowId;

    let override = await this.visibilityRepo.findOne({
      where: { ownerId, friendId },
    });

    if (override) {
      override.hidden = hidden;
      return this.visibilityRepo.save(override);
    }

    override = this.visibilityRepo.create({ ownerId, friendId, hidden });
    return this.visibilityRepo.save(override);
  }

  // ─── Private helpers ─────────────────────────────────
  private async findPendingRequest(
    userId: string,
    relationId: string,
  ): Promise<FriendRelationEntity> {
    const relation = await this.relationRepo.findOne({
      where: { id: relationId, status: 'PENDING' as any },
    });
    if (!relation) {
      throw new NotFoundException({
        code: 'FRIEND_REQUEST_NOT_FOUND',
        message: 'Friend request not found',
      });
    }
    if (relation.userLowId !== userId && relation.userHighId !== userId) {
      throw new NotFoundException({
        code: 'FRIEND_REQUEST_NOT_FOUND',
        message: 'Friend request not found',
      });
    }
    return relation;
  }

  /** Ensure the user is the recipient (not the requester). */
  private ensureRecipient(userId: string, relation: FriendRelationEntity): void {
    if (relation.requesterId === userId) {
      throw new BadRequestException({
        code: 'CANNOT_RESPOND_OWN_REQUEST',
        message: 'You cannot accept/decline your own friend request',
      });
    }
  }
}
