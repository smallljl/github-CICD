import { render, screen } from '@testing-library/react'
import { test, expect } from 'vitest'

function Hello() {
  return <h1>Hello Vite + React</h1>
}

test('renders', () => {
  render(<Hello />)
  // 这句话的意思是：期望页面上有一个 role 为 'heading'，名字为 'Hello Vite + React' 的元素，并且它确实存在于文档中
  expect(screen.getByRole('heading', { name: 'Hello Vite + React' })).toBeInTheDocument()
})

