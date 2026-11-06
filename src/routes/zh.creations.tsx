import { createFileRoute } from '@tanstack/react-router'
import { CreationsPage } from '../components/creations-page'
export const Route=createFileRoute('/zh/creations')({head:()=>({meta:[{title:'我的作品 | SEEDANCE 3.0'},{name:'robots',content:'noindex,nofollow'}]}),component:CreationsPage})
