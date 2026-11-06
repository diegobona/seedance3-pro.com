import { createAuth } from './auth'
import { createAppDatabase, isD1Database } from '../db'

export async function creationAccess(request:Request, env:Env) {
  const database = createAppDatabase(env)
  if (!isD1Database(database)) throw new Error('Library unavailable')
  const session = await createAuth(request,env).api.getSession({headers:request.headers})
  // Account history only. Guest cookies, device hints and shared IPs never grant access.
  const owners = session?.user?.id ? [session.user.id] : []
  return {db:database,owners,guest:!session?.user?.id}
}
