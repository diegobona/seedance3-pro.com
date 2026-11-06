import { stripeRouteDependencies } from './stripe-route-dependencies'
export function refundRouteDependencies(environment:Parameters<typeof stripeRouteDependencies>[0]) {
  const deps=stripeRouteDependencies(environment)
  return {...deps,store:deps.refundStore}
}
