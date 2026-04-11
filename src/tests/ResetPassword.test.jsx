import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import ResetPassword from '../pages/ResetPassword'

const mockPost = jest.fn()

jest.mock('../services/api', () => ({
  __esModule: true,
  default: {
    post: (...args) => mockPost(...args),
  },
}))

const mockedNavigate = jest.fn()
jest.mock('react-router-dom', () => {
  const actual = jest.requireActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockedNavigate,
  }
})

const renderWithRouter = () =>
  render(
    <MemoryRouter
      initialEntries={['/reset-password/abc/token123']}
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />
      </Routes>
    </MemoryRouter>
  )

describe('ResetPassword', () => {
  beforeEach(() => {
    mockPost.mockReset()
    mockedNavigate.mockReset()
  })

  test('renders reset password form', () => {
    renderWithRouter()

    expect(screen.getByText(/reset your internconnect password/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/new password/i, { selector: 'input' })).toBeInTheDocument()
    expect(screen.getByLabelText(/confirm password/i, { selector: 'input' })).toBeInTheDocument()
  })

  test('shows validation message when passwords do not match', async () => {
    const user = userEvent.setup()
    renderWithRouter()

    fireEvent.change(screen.getByLabelText(/new password/i, { selector: 'input' }), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i, { selector: 'input' }), {
      target: { value: 'Password124!' },
    })
    await user.click(screen.getByRole('button', { name: /save new password/i }))

    expect(await screen.findByText(/passwords must match exactly/i)).toBeInTheDocument()
    expect(mockPost).not.toHaveBeenCalled()
  })

  test('submits new password to API', async () => {
    const user = userEvent.setup()
    mockPost.mockResolvedValueOnce({})
    renderWithRouter()

    fireEvent.change(screen.getByLabelText(/new password/i, { selector: 'input' }), {
      target: { value: 'Password123!' },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i, { selector: 'input' }), {
      target: { value: 'Password123!' },
    })
    await user.click(screen.getByRole('button', { name: /save new password/i }))

    await screen.findByText(/password updated/i)

    expect(mockPost).toHaveBeenCalledWith('/auth/users/reset_password_confirm/', {
      uid: 'abc',
      token: 'token123',
      new_password: 'Password123!',
      re_new_password: 'Password123!',
    })
  })
})
