import { Body, Controller, Delete, Get, Headers, HttpCode, NotFoundException, Param, Patch, Post, Query, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireNotesOwnerFromBearer } from '../auth/require-notes-owner.js'
import { createBookmarkStore } from './bookmark-store.js'
let repo: ReturnType<typeof createBookmarkStore> | undefined
function store() {
 if(!process.env.BOOKMARKS_DATABASE_URL)throw new ServiceUnavailableException('Bookmark storage not configured')
 return repo??=createBookmarkStore(process.env.BOOKMARKS_DATABASE_URL)
}
@Public()
@Controller('owner/bookmarks')
export class BookmarksController {
 @Get() async list(@Headers('authorization') auth?:string,@Query() q?:Record<string,unknown>){const owner=await requireNotesOwnerFromBearer(auth);return store().list(owner,q)}
 @Get(':id') async get(@Param('id') id:string,@Headers('authorization') auth?:string){const owner=await requireNotesOwnerFromBearer(auth);const row=await store().get(owner,id);if(!row)throw new NotFoundException();return row}
 @Post() async create(@Body() value:unknown,@Headers('authorization') auth?:string){const owner=await requireNotesOwnerFromBearer(auth);return store().create(owner,value)}
 @Patch(':id') async update(@Param('id') id:string,@Body() value:unknown,@Headers('authorization') auth?:string){const owner=await requireNotesOwnerFromBearer(auth);const row=await store().update(owner,id,value);if(!row)throw new NotFoundException();return row}
 @Delete(':id') @HttpCode(204) async remove(@Param('id') id:string,@Headers('authorization') auth?:string){const owner=await requireNotesOwnerFromBearer(auth);if(!await store().remove(owner,id))throw new NotFoundException()}
}
