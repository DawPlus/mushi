import { Module } from '@nestjs/common'
import { NotesController, NoteCategoriesController } from './notes.controller.js'

@Module({ controllers: [NotesController, NoteCategoriesController] })
export class NotesModule {}
