import React from 'react';
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BrowserRouter } from "react-router-dom";
import Login from "../pages/Login.jsx";

jest.mock('../components/ReCaptchaBox', () => ({
  __esModule: true,
  default: ({ onChange = () => {} }) => (
    <button onClick={() => onChange('mock-token')}>Mock ReCAPTCHA</button>
  ),
}));

// Mock the AuthContext
jest.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    login: jest.fn(),
    socialLogin: jest.fn().mockResolvedValue({ success: true }),
    logout: jest.fn(),
    verifyLoginOtp: jest.fn(),
    startTwoFactorSetup: jest.fn(),
    confirmTwoFactorSetup: jest.fn(),
    disableTwoFactor: jest.fn(),
    refreshUser: jest.fn(),
    user: null,
    loading: false,
  }),
}));

// Helper function to render with router
const renderWithRouter = (component) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

test("Login component can be imported", () => {
  expect(Login).toBeDefined();
  expect(typeof Login).toBe('function');
});

test("Login page renders correctly", () => {
  renderWithRouter(<Login />);

  // Check if main elements are present
  expect(screen.getByText("Welcome Back")).toBeInTheDocument();
  expect(screen.getByText(/step into your future career/i)).toBeInTheDocument();
  expect(screen.getByLabelText(/email/i, { selector: 'input' })).toBeInTheDocument();
  expect(screen.getByLabelText(/password/i, { selector: 'input' })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /sign in to portal/i })).toBeInTheDocument();
});

test("Login form has required fields", () => {
  renderWithRouter(<Login />);

  const emailInput = screen.getByLabelText(/email/i, { selector: 'input' });
  const passwordInput = screen.getByLabelText(/password/i, { selector: 'input' });

  expect(emailInput).toBeRequired();
  expect(passwordInput).toBeRequired();
});

test("Signup link is present", () => {
  renderWithRouter(<Login />);

  const signupLink = screen.getByText(/create an account/i);
  expect(signupLink).toBeInTheDocument();
  expect(signupLink.closest('a')).toHaveAttribute('to', '/signup');
});

test("Forgot password dialog opens when button is clicked", async () => {
  const user = userEvent.setup();
  renderWithRouter(<Login />);

  const forgotButton = screen.getByText(/forgot/i);
  expect(forgotButton.closest('button')).not.toBeNull();

  await user.click(forgotButton);

  expect(await screen.findByText(/send yourself a secure reset link/i)).toBeInTheDocument();
});
