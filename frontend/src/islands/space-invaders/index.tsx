import { createRoot } from 'react-dom/client'
import { SpaceInvadersIsland } from './SpaceInvadersIsland'

export function mount(element: HTMLElement, _props: unknown): void {
  element.innerHTML = ''
  const root = createRoot(element)
  root.render(<SpaceInvadersIsland />)
}
