import { Module } from '@nestjs/common';
import { cloudinaryProvider } from './cloudinary.provider';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [cloudinaryProvider, UploadsService],
  exports: [UploadsService],
})
export class UploadsModule {}
