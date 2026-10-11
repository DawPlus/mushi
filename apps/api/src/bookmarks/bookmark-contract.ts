import { BadRequestException } from '@nestjs/common'
export function parseBookmark(value: unknown) {
 if (!value || typeof value !== 'object' || Array.isArray(value)) throw new BadRequestException('Invalid bookmark')
 const v=value as Record<string,unknown>
 if (Object.keys(v).some(k=>!['url','title','description','category','tags','isFavorite'].includes(k))) throw new BadRequestException('Unexpected field')
 if(typeof v.url!=='string'||v.url.length>2048)throw new BadRequestException('Invalid URL')
 let url:URL
 try{url=new URL(v.url)}catch{throw new BadRequestException('Invalid URL')}
 if(!['http:','https:'].includes(url.protocol)||!url.hostname||url.username||url.password)throw new BadRequestException('Invalid URL')
 if(typeof v.title!=='string'||!v.title.trim()||v.title.length>200)throw new BadRequestException('Invalid title')
 if(v.description!==undefined&&(typeof v.description!=='string'||v.description.length>5000))throw new BadRequestException('Invalid description')
 if(v.category!==undefined&&(typeof v.category!=='string'||v.category.length>80))throw new BadRequestException('Invalid category')
 if(v.isFavorite!==undefined&&typeof v.isFavorite!=='boolean')throw new BadRequestException('Invalid favorite')
 if(v.tags!==undefined&&(!Array.isArray(v.tags)||v.tags.length>12||v.tags.some(t=>typeof t!=='string'||!t.trim()||t.length>40)))throw new BadRequestException('Invalid tags')
 return {url:url.href,title:v.title.trim(),description:(v.description as string)??'',category:((v.category as string)??'').trim(),tags:[...new Set(((v.tags as string[])??[]).map(t=>t.trim().toLowerCase()))],isFavorite:(v.isFavorite as boolean)??false}
}
export function parseBookmarkQuery(raw:Record<string,unknown>) {
 const page=raw.page===undefined?1:Number(raw.page),limit=raw.limit===undefined?20:Number(raw.limit)
 if(!Number.isInteger(page)||page<1||page>100000||!Number.isInteger(limit)||limit<1||limit>100)throw new BadRequestException('Invalid pagination')
 const q=typeof raw.q==='string'?raw.q.trim():'',category=typeof raw.category==='string'?raw.category.trim():''
 if(q.length>100||category.length>80)throw new BadRequestException('Invalid filter')
 if(raw.favorite!==undefined&&raw.favorite!=='true'&&raw.favorite!=='false')throw new BadRequestException('Invalid favorite filter')
 return {page,limit,q,category,favorite:raw.favorite==='true'?true:raw.favorite==='false'?false:null}
}
