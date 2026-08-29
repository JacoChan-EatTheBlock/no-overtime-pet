import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  Request,
  ParseUUIDPipe,
  BadRequestException,
  HttpCode,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private tasksService: TasksService) {}

  /** POST /v1/tasks — create task */
  @Post()
  async create(@Request() req: any, @Body() dto: CreateTaskDto) {
    const task = await this.tasksService.create(req.user.sub, dto);
    return { data: task };
  }

  /** GET /v1/tasks — list tasks (optional ?status=PENDING) */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('status') status?: string,
  ) {
    const tasks = await this.tasksService.findAll(req.user.sub, status);
    return { data: tasks };
  }

  /** PATCH /v1/tasks/:id — update task (If-Match revision) */
  @Patch(':id')
  async update(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('if-match') ifMatch: string,
    @Body() dto: UpdateTaskDto,
  ) {
    const expectedRevision = this.parseRevisionHeader(ifMatch);
    const task = await this.tasksService.update(
      req.user.sub,
      id,
      dto,
      expectedRevision,
    );
    return { data: task };
  }

  /** POST /v1/tasks/:id/complete — complete task (Idempotency-Key) */
  @Post(':id/complete')
  @HttpCode(200)
  async complete(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    if (!idempotencyKey) {
      throw new BadRequestException({
        code: 'MISSING_IDEMPOTENCY_KEY',
        message: 'Idempotency-Key header is required',
      });
    }
    const task = await this.tasksService.complete(
      req.user.sub,
      id,
      idempotencyKey,
    );
    return { data: task };
  }

  /** DELETE /v1/tasks/:id — soft delete */
  @Delete(':id')
  @HttpCode(204)
  async remove(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.tasksService.softDelete(req.user.sub, id);
  }

  // ─── Helpers ──────────────────────────────────────────
  private parseRevisionHeader(ifMatch: string | undefined): number {
    if (!ifMatch) {
      throw new BadRequestException({
        code: 'MISSING_IF_MATCH',
        message: 'If-Match header is required for updates',
      });
    }
    const revision = parseInt(ifMatch, 10);
    if (isNaN(revision) || revision < 1) {
      throw new BadRequestException({
        code: 'INVALID_IF_MATCH',
        message: 'If-Match must be a positive integer revision number',
      });
    }
    return revision;
  }
}
