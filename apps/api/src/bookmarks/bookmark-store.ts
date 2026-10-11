import postgres from 'postgres'
import { BadRequestException } from '@nestjs/common'
import { checkedOwner, uuidPattern } from '../notes/note-contract.js'
import { parseBookmark, parseBookmarkQuery } from './bookmark-contract.js'
const validId=(id:string)=>{if(!uuidPattern.test(id))throw new BadRequestException('Invalid bookmark ID')}
type Row={id:string;url:string;title:string;description:string;category:string;tags:string[];is_favorite:boolean;created_at:Date;updated_at:Date}
const output=(r:Row)=>({id:r.id,url:r.url,title:r.title,description:r.description,category:r.category,tags:r.tags,isFavorite:r.is_favorite,createdAt:r.created_at,updatedAt:r.updated_at})
export function createBookmarkStore(url:string){
 if(!url)throw new Error('BOOKMARKS_DATABASE_URL required')
 const sql=postgres(url,{max:2,idle_timeout:10,connect_timeout:5,prepare:false})
 return {
  async list(owner:string,raw:Record<string,unknown>={}){
   checkedOwner(owner);const {page,limit,q,category,favorite}=parseBookmarkQuery(raw)
   const match='%'+q.replace(/[\\%_]/g,c=>'\\'+c)+'%'
   const rows=await sql<Row[]>`select * from bookmarks.items where owner_id=${owner} and deleted_at is null
    and (${q}='' or title ilike ${match} or url ilike ${match} or description ilike ${match})
    and (${category}='' or category=${category})
    and (${favorite}::boolean is null or is_favorite=${favorite})
    order by is_favorite desc,created_at desc,id desc limit ${limit} offset ${(page-1)*limit}`
   const count=await sql<{total:number}[]>`select count(*)::int as total from bookmarks.items where owner_id=${owner} and deleted_at is null
    and (${q}='' or title ilike ${match} or url ilike ${match} or description ilike ${match})
    and (${category}='' or category=${category})
    and (${favorite}::boolean is null or is_favorite=${favorite})`
   return {items:rows.map(output),total:count[0]?.total??0,page,limit}
  },
  async get(owner:string,id:string){checkedOwner(owner);validId(id);const rows=await sql<Row[]>`select * from bookmarks.items where id=${id} and owner_id=${owner} and deleted_at is null`;return rows[0]?output(rows[0]):null},
  async create(owner:string,value:unknown){checkedOwner(owner);const b=parseBookmark(value);const rows=await sql<Row[]>`insert into bookmarks.items(owner_id,url,title,description,category,tags,is_favorite) values(${owner},${b.url},${b.title},${b.description},${b.category},${b.tags},${b.isFavorite}) returning *`;return output(rows[0])},
  async update(owner:string,id:string,value:unknown){checkedOwner(owner);validId(id);const b=parseBookmark(value);const rows=await sql<Row[]>`update bookmarks.items set url=${b.url},title=${b.title},description=${b.description},category=${b.category},tags=${b.tags},is_favorite=${b.isFavorite},updated_at=now() where id=${id} and owner_id=${owner} and deleted_at is null returning *`;return rows[0]?output(rows[0]):null},
  async remove(owner:string,id:string){checkedOwner(owner);validId(id);const rows=await sql`update bookmarks.items set deleted_at=now() where id=${id} and owner_id=${owner} and deleted_at is null returning id`;return Boolean(rows[0])},
  async close(){await sql.end()}
 }
}
