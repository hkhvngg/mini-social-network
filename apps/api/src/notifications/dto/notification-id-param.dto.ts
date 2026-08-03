import { IsUUID } from 'class-validator';

export class NotificationIdParamDto {
  @IsUUID()
  notificationId!: string;
}
