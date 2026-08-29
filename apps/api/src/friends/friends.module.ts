import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendRelationEntity } from './entities/friend-relation.entity';
import { FriendVisibilityOverrideEntity } from './entities/friend-visibility-override.entity';
import { UserEntity } from '../auth/entities/user.entity';
import { FriendsService } from './friends.service';
import { FriendsController } from './friends.controller';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FriendRelationEntity,
      FriendVisibilityOverrideEntity,
      UserEntity,
    ]),
    AuthModule,
  ],
  controllers: [FriendsController],
  providers: [FriendsService],
  exports: [FriendsService],
})
export class FriendsModule {}
