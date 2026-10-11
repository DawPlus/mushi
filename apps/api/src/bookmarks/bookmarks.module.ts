import { Module } from '@nestjs/common'
import { BookmarksController } from './bookmarks.controller.js'
@Module({ controllers: [BookmarksController] })
export class BookmarksModule {}
