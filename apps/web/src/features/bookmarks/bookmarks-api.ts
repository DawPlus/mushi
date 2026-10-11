import { ownerRequest } from '../../lib/owner-api'
export type Bookmark={id:string;url:string;title:string;description:string;category:string;tags:string[];isFavorite:boolean;createdAt:string;updatedAt:string}
export type BookmarkInput=Pick<Bookmark,'url'|'title'|'description'|'category'|'tags'|'isFavorite'>
export const listBookmarks=(q:string,category:string,favorite:boolean,page=1)=>ownerRequest<{items:Bookmark[],total:number}>('owner/bookmarks?'+new URLSearchParams({q,category,page:String(page),...(favorite?{favorite:'true'}:{})}))
export const createBookmark=(v:BookmarkInput)=>ownerRequest<Bookmark>('owner/bookmarks',{method:'POST',body:v})
export const updateBookmark=(id:string,v:BookmarkInput)=>ownerRequest<Bookmark>('owner/bookmarks/'+id,{method:'PATCH',body:v})
export const deleteBookmark=(id:string)=>ownerRequest<void>('owner/bookmarks/'+id,{method:'DELETE'})
