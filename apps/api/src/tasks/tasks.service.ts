import {
  Injectable,
  NotFoundException,
  ConflictException,
  PreconditionFailedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { TaskEntity } from './entities/task.entity';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepo: Repository<TaskEntity>,
  ) {}

  /** Create a new task for the user. */
  async create(userId: string, dto: CreateTaskDto): Promise<TaskEntity> {
    const task = this.taskRepo.create({
      userId,
      title: dto.title,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      importance: dto.importance ?? 'MEDIUM',
      status: 'PENDING',
    });
    return this.taskRepo.save(task);
  }

  /** List tasks for the user, optionally filtered by status. */
  async findAll(
    userId: string,
    status?: string,
  ): Promise<TaskEntity[]> {
    const where: any = { userId, deletedAt: IsNull() };
    if (status) {
      where.status = status;
    }
    return this.taskRepo.find({
      where,
      order: { createdAt: 'DESC' },
    });
  }

  /** Find a single task by id, ensuring ownership and not deleted. */
  async findOneOrFail(userId: string, taskId: string): Promise<TaskEntity> {
    const task = await this.taskRepo.findOne({
      where: { id: taskId, userId, deletedAt: IsNull() },
    });
    if (!task) {
      throw new NotFoundException({
        code: 'TASK_NOT_FOUND',
        message: `Task ${taskId} not found`,
      });
    }
    return task;
  }

  /**
   * Update a task with optimistic locking via revision.
   * @param expectedRevision — from If-Match header
   */
  async update(
    userId: string,
    taskId: string,
    dto: UpdateTaskDto,
    expectedRevision: number,
  ): Promise<TaskEntity> {
    const task = await this.findOneOrFail(userId, taskId);

    if (Number(task.revision) !== expectedRevision) {
      throw new PreconditionFailedException({
        code: 'REVISION_CONFLICT',
        message: `Expected revision ${expectedRevision}, actual ${task.revision}`,
      });
    }

    if (dto.title !== undefined) task.title = dto.title;
    if (dto.dueAt !== undefined) task.dueAt = dto.dueAt ? new Date(dto.dueAt) : null;
    if (dto.importance !== undefined) task.importance = dto.importance;
    if (dto.status !== undefined) task.status = dto.status;

    task.revision = Number(task.revision) + 1;

    return this.taskRepo.save(task);
  }

  /**
   * Complete a task (idempotent via Idempotency-Key).
   */
  async complete(
    userId: string,
    taskId: string,
    idempotencyKey: string,
  ): Promise<TaskEntity> {
    // Check idempotency — if key already used, return existing result
    const existing = await this.taskRepo.findOne({
      where: { idempotencyKey, userId },
    });
    if (existing) {
      return existing; // idempotent: already completed with this key
    }

    const task = await this.findOneOrFail(userId, taskId);

    if (task.status === 'COMPLETED') {
      return task; // already completed
    }

    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.idempotencyKey = idempotencyKey;
    task.revision = Number(task.revision) + 1;

    try {
      return await this.taskRepo.save(task);
    } catch (err: any) {
      // unique constraint on idempotency_key — concurrent request
      if (err.code === '23505' && err.constraint?.includes('idempotency')) {
        const result = await this.taskRepo.findOne({
          where: { idempotencyKey, userId },
        });
        if (result) return result;
      }
      throw err;
    }
  }

  /** Soft-delete a task. */
  async softDelete(userId: string, taskId: string): Promise<void> {
    const task = await this.findOneOrFail(userId, taskId);
    task.deletedAt = new Date();
    task.revision = Number(task.revision) + 1;
    await this.taskRepo.save(task);
  }
}
