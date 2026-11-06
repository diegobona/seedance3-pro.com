import { createFileRoute } from '@tanstack/react-router'
import { CreationsPage } from '../components/creations-page'
export const Route=createFileRoute('/creations')({head:()=>({meta:[{title:'My creations | SEEDANCE 3.0'},{name:'robots',content:'noindex,nofollow'}]}),component:CreationsPage})
