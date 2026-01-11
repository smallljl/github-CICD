import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'

function Hello() {
  return <h1>Hello Vite + React</h1>
}

test('renders', () => {
  render(<Hello />)
  expect(screen.getByRole('heading', { name: 'Hello Vite + React' })).toBeInTheDocument()
})

