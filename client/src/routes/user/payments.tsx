import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/user/payments')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/user/payments"!</div>
}
