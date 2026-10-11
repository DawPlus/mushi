import { BadRequestException, Body, Controller, Delete, Get, Headers, HttpCode, NotFoundException, Param, Patch, Post, Query, ServiceUnavailableException } from '@nestjs/common'
import { Public } from '../auth/public.decorator.js'
import { requireNotesOwnerFromBearer } from '../auth/require-notes-owner.js'
import { createNotesRepository } from './notes.repository.js'

type Store = ReturnType<typeof createNotesRepository>
let repository: Store | undefined
function store(): Store {
  if (!process.env.NOTES_DATABASE_URL) throw new ServiceUnavailableException('Notes storage not configured')
  return repository ??= createNotesRepository(process.env.NOTES_DATABASE_URL)
}
function invalid(e: unknown): never {
  if (e instanceof Error && /^(Invalid |Unexpected |Verified )/.test(e.message)) throw new BadRequestException(e.message)
  throw e
}
@Public()
@Controller('owner/notes')
export class NotesController {
  @Get()
  async list(@Headers('authorization') authorization?: string, @Query() query?: Record<string, unknown>) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try { return await store().list(owner, query) } catch (e) { invalid(e) }
  }
  @Get(':id')
  async get(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try {
      const note = await store().get(owner, id)
      if (!note) throw new NotFoundException('Note not found')
      return note
    } catch (e) { invalid(e) }
  }
  @Post()
  async create(@Body() body: unknown, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try { return await store().create(owner, body) } catch (e) { invalid(e) }
  }
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: unknown, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try {
      const note = await store().update(owner, id, body)
      if (!note) throw new NotFoundException('Note not found')
      return note
    } catch (e) { invalid(e) }
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try {
      if (!await store().remove(owner, id)) throw new NotFoundException('Note not found')
    } catch (e) { invalid(e) }
  }
}
@Public()
@Controller('owner/note-categories')
export class NoteCategoriesController {
  @Get()
  async list(@Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    return store().categories(owner)
  }
  @Post()
  async create(@Body() body: { name?: string }, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try { return await store().createCategory(owner, body?.name ?? '') } catch (e) { invalid(e) }
  }
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string }, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try {
      const category = await store().updateCategory(owner, id, body?.name ?? '')
      if (!category) throw new NotFoundException('Category not found')
      return category
    } catch (e) { invalid(e) }
  }
  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Headers('authorization') authorization?: string) {
    const owner = await requireNotesOwnerFromBearer(authorization)
    try {
      if (!await store().removeCategory(owner, id)) throw new NotFoundException('Category not found')
    } catch (e) { invalid(e) }
  }
}
