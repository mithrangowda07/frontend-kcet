import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { authService } from "../services/api";

const LoginRegister = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [studentType, setStudentType] = useState<"counselling" | "studying">(
    "counselling"
  );
  const {login, register } = useAuth();
  const navigate = useNavigate();
  
  // Check URL params for verification status
  useEffect(() => {
    const typeParam = searchParams.get("type");
    const verifiedParam = searchParams.get("verified");
    
    if (typeParam === "studying" && verifiedParam === "true") {
      setIsLogin(false);
      setStudentType("studying");
    }
  }, [searchParams]);

  useEffect(() => {
    if (!isLogin) {
      if (studentType === "studying") {
        navigate("/register/studying");
      } else {
        navigate("/register/counselling");
      }
    }
  }, [isLogin, studentType, navigate]);

  const [formData, setFormData] = useState({
    name: "",
    email_id: "",
    phone_number: "",
    password: "",
    password_confirm: "",
    category: "",
    kcet_rank: "",
    college_code: "",
    unique_key: "",
    year_of_starting: "",
    usn: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showPasswordConfirm, setShowPasswordConfirm] = useState(false);
  const [emailError, setEmailError] = useState("");
  const submitRef = useRef(false);

  // Forgot Password States
  const [view, setView] = useState<'login' | 'forgot_email' | 'forgot_otp' | 'forgot_reset'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [forgotToken, setForgotToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const email = forgotEmail.trim();
      if (!email) {
        setError('Email address is required.');
        setLoading(false);
        return;
      }
      if (!isValidEmail(email)) {
        setError('Please enter a valid email address.');
        setLoading(false);
        return;
      }

      await authService.sendOtp(email, 'forgot_password');
      setView('forgot_otp');
      setResendCooldown(60);
      setSuccessMessage('OTP sent successfully.');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to send OTP.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const email = forgotEmail.trim();
      if (!otp.trim()) {
        setError('OTP is required.');
        setLoading(false);
        return;
      }

      const response = await authService.verifyOtp(email, otp.trim(), 'forgot_password');
      if (response.tempToken) {
        setForgotToken(response.tempToken);
        setView('forgot_reset');
        setOtp('');
      } else {
        setError('Verification failed. No token received.');
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Invalid OTP.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (!newPassword || !newPasswordConfirm) {
        setError('Password fields are required.');
        setLoading(false);
        return;
      }
      if (newPassword !== newPasswordConfirm) {
        setError('Passwords do not match.');
        setLoading(false);
        return;
      }

      const { strength } = getPasswordStrength(newPassword);
      if (strength < 5) {
        setError('Password does not satisfy the strong password policy.');
        setLoading(false);
        return;
      }

      if (!forgotToken) {
        setError('Verification token is missing. Please restart password recovery.');
        setLoading(false);
        return;
      }

      await authService.resetPassword(forgotEmail.trim(), newPassword, newPasswordConfirm, forgotToken);
      setSuccessMessage('Password reset successful. Please login with your new password.');
      setView('login');
      setNewPassword('');
      setNewPasswordConfirm('');
      setForgotEmail('');
      setForgotToken('');
    } catch (err: any) {
      const errMsg = err.response?.data?.error || err.response?.data?.message || 'Failed to reset password.';
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear error when any field changes
    setError("");
    if (name === 'email_id') {
      // Clear email-specific errors when email changes
      setEmailError("");
      if (value && !isValidEmail(value)) {
        setEmailError("Please enter a valid email address.");
      }
    }
  };



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // ✅ PART 1: HARD GUARD - Prevent duplicate submissions
    if (loading) return;
    
    // ✅ PART 6: Idempotency guard
    if (submitRef.current) return;
    submitRef.current = true;
    
    setError("");
    setLoading(true);

    if (emailError) {
      setError("Please enter a valid email address.");
      setLoading(false);
      submitRef.current = false; // Reset on error
      return;
    }

    try {
      if (isLogin) {
        // ✅ PART 2: Fix login flow - use returned user data
        const loggedInUser = await login(formData.email_id, formData.password);
        navigate(
          loggedInUser.type_of_student === "counselling"
            ? "/dashboard/counselling"
            : "/dashboard/studying"
        );
      } else {
        const registerData: any = {
          type_of_student: studentType,
          name: formData.name,
          email_id: formData.email_id,
          phone_number: formData.phone_number,
          password: formData.password,
          password_confirm: formData.password_confirm,
        };

        if (studentType === "counselling") {
          registerData.kcet_rank = formData.kcet_rank
            ? parseInt(formData.kcet_rank)
            : null;
          registerData.category = formData.category || null;
        } else {
          // Redirect to new registration flow for studying students
          setError("Please use the new registration flow");
          setLoading(false);
          submitRef.current = false; // Reset on error
          navigate("/register/studying");
          return;
        }

        // For counselling students, also redirect to new flow
        if (studentType === "counselling") {
          setError("Please use the new registration flow");
          setLoading(false);
          submitRef.current = false;
          navigate("/register/counselling");
          return;
        }

        await register(registerData);

// ✅ RESET idempotency guard on success
submitRef.current = false;

alert("Registration successful! Please login with your credentials.");

setFormData({
  name: "",
  email_id: "",
  phone_number: "",
  password: "",
  password_confirm: "",
  category: "",
  kcet_rank: "",
  college_code: "",
  unique_key: "",
  year_of_starting: "",
  usn: "",
});

// ✅ Switch to login view
setIsLogin(true);
      }
    } catch (err: any) {
      // Reset idempotency guard on error
      submitRef.current = false;
      // Handle validation errors (400 Bad Request with errors object)
      if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const errorMessages = Object.entries(errors)
          .map(([field, messages]: [string, any]) => {
            const msg = Array.isArray(messages)
              ? messages.join(", ")
              : messages;
            return `${field}: ${msg}`;
          })
          .join("\n");
        setError(
          errorMessages || err.response.data.message || "Validation failed"
        );
      } else {
        // Handle other errors (409 Conflict, 500, etc.)
        // Prioritize 'message' field as it's more descriptive, then 'error' field
        const errorMessage = 
          err.response?.data?.message ||
          err.response?.data?.error ||
          err.message ||
          "An error occurred";
        setError(errorMessage);
      }
    } finally {
      setLoading(false);
      // Only reset submitRef if there was an error (already reset in catch block)
      // On success, we navigate away so it doesn't matter
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#111827] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white dark:bg-slate-800 p-8 rounded-lg shadow-lg border border-slate-300 dark:border-slate-700">
        
        {/* Header */}
        <div>
          <h2 className="text-center text-3xl font-extrabold text-slate-800 dark:text-gray-100">
            {view === 'login' && (isLogin ? "Sign in to your account" : "Create a new account")}
            {view === 'forgot_email' && "Reset Password"}
            {view === 'forgot_otp' && "Verify OTP"}
            {view === 'forgot_reset' && "Set New Password"}
          </h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-gray-400">
            {view === 'forgot_email' && "Enter your email address to receive a verification OTP."}
            {view === 'forgot_otp' && `Enter the 6-digit code sent to ${forgotEmail}`}
            {view === 'forgot_reset' && "Choose a strong new password for your account."}
          </p>
        </div>

        {/* Tab Selection (only in Login mode if we support switching, though registering redirects) */}
        {view === 'login' && !isLogin && (
          <div className="flex space-x-4">
            <button
              type="button"
              onClick={() => setStudentType("counselling")}
              className={`flex-1 py-2 px-4 rounded-md ${
                studentType === "counselling"
                  ? "bg-blue-600 dark:bg-sky-400 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300"
              }`}
            >
              Counselling Student
            </button>
            <button
              type="button"
              onClick={() => {
                navigate("/register/studying");
              }}
              className={`flex-1 py-2 px-4 rounded-md ${
                studentType === "studying"
                  ? "bg-blue-600 dark:bg-sky-400 text-white"
                  : "bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-gray-300"
              }`}
            >
              Studying Student
            </button>
          </div>
        )}

        {/* Notifications */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-400 dark:border-red-600 text-red-700 dark:text-red-300 px-4 py-3 rounded whitespace-pre-line text-sm">
            <strong>Error:</strong>
            <div className="mt-1">{error}</div>
          </div>
        )}

        {successMessage && (
          <div className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-400 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 px-4 py-3 rounded text-sm">
            {successMessage}
          </div>
        )}

        {/* View Controller */}
        {view === 'login' && (
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                name="email_id"
                required
                value={formData.email_id}
                onChange={handleInputChange}
                className={`mt-1 block w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-slate-300 dark:border-slate-600'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200`}
              />
              {emailError && (
                <div className="mt-1 text-red-600 dark:text-red-400 text-sm">
                  {emailError}
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center">
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setView('forgot_email');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="text-xs text-blue-600 dark:text-sky-400 hover:underline font-medium"
                >
                  Forgot Password?
                </button>
              </div>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-sky-400 hover:bg-blue-700 dark:hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-sky-400 disabled:opacity-50"
              >
                {loading ? "Processing..." : "Sign in"}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  navigate("/register");
                }}
                className="text-blue-600 dark:text-sky-400 hover:text-blue-500 dark:hover:text-sky-300 text-sm"
              >
                Don't have an account? Register
              </button>
            </div>
          </form>
        )}

        {view === 'forgot_email' && (
          <form className="space-y-6" onSubmit={handleForgotPasswordRequest}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Email Address
              </label>
              <input
                type="email"
                required
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                placeholder="Enter your registered email"
              />
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setView('login');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-none"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !forgotEmail}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 dark:bg-sky-400 hover:bg-blue-700 dark:hover:bg-sky-500 focus:outline-none disabled:opacity-50"
              >
                {loading ? "Sending..." : "Send OTP"}
              </button>
            </div>
          </form>
        )}

        {view === 'forgot_otp' && (
          <form className="space-y-6" onSubmit={handleVerifyForgotPasswordOtp}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Enter 6-Digit OTP
              </label>
              <input
                type="text"
                required
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="mt-1 block w-full text-center tracking-[0.5em] font-mono text-lg px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                placeholder="------"
              />
            </div>

            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500 dark:text-gray-400">Didn't receive code?</span>
              <button
                type="button"
                disabled={resendCooldown > 0 || loading}
                onClick={handleForgotPasswordRequest}
                className="text-blue-600 dark:text-sky-400 hover:underline font-semibold disabled:opacity-50"
              >
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend OTP'}
              </button>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => {
                  setView('forgot_email');
                  setError('');
                }}
                className="flex-1 py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-750 focus:outline-none"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 dark:bg-green-500 dark:hover:bg-green-600 focus:outline-none disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
            </div>
          </form>
        )}

        {view === 'forgot_reset' && (
          <form className="space-y-6" onSubmit={handleResetPasswordSubmit}>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                New Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                  placeholder="Enter strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-gray-500 hover:text-slate-600"
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {newPassword.length > 0 && (
                <PasswordStrengthIndicator password={newPassword} />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300">
                Confirm Password
              </label>
              <div className="mt-1 relative">
                <input
                  type={showPasswordConfirm ? "text" : "password"}
                  required
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="block w-full px-3 py-2 pr-10 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 dark:focus:ring-sky-400 focus:border-blue-500 dark:focus:border-sky-400 bg-white dark:bg-slate-700 text-slate-800 dark:text-gray-200"
                  placeholder="Confirm password"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirm(!showPasswordConfirm)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 dark:text-gray-500 hover:text-slate-600"
                >
                  {showPasswordConfirm ? (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || newPassword !== newPasswordConfirm || getPasswordStrength(newPassword).strength < 5}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 focus:outline-none disabled:opacity-50"
            >
              {loading ? "Resetting..." : "Reset Password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const PasswordStrengthIndicator = ({ password }: { password: string }) => {
  const { strength, checks } = getPasswordStrength(password);
  const strengthLabels = ["Very Weak", "Weak", "Fair", "Good", "Strong"];
  const strengthColors = [
    "bg-red-500",
    "bg-orange-500",
    "bg-yellow-500",
    "bg-blue-500",
    "bg-green-500",
  ];

  return (
    <div className="mt-2">
      <div className="flex items-center space-x-2 mb-1">
        <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              strengthColors[strength - 1] || "bg-slate-400 dark:bg-slate-600"
            }`}
            style={{ width: `${(strength / 5) * 100}%` }}
          />
        </div>
        <span className="text-xs text-slate-600 dark:text-gray-400">
          {strengthLabels[strength - 1] || "Very Weak"}
        </span>
      </div>
      <div className="text-xs text-slate-600 dark:text-gray-400 space-y-1">
        <div
          className={
            checks.length
              ? "text-green-600 dark:text-green-400"
              : "text-slate-400 dark:text-gray-600"
          }
        >
          ✓ At least 8 characters
        </div>
        <div
          className={
            checks.upper
              ? "text-green-600 dark:text-green-400"
              : "text-slate-400 dark:text-gray-600"
          }
        >
          ✓ One uppercase letter
        </div>
        <div
          className={
            checks.lower
              ? "text-green-600 dark:text-green-400"
              : "text-slate-400 dark:text-gray-600"
          }
        >
          ✓ One lowercase letter
        </div>
        <div
          className={
            checks.number
              ? "text-green-600 dark:text-green-400"
              : "text-slate-400 dark:text-gray-600"
          }
        >
          ✓ One number
        </div>
        <div
          className={
            checks.special
              ? "text-green-600 dark:text-green-400"
              : "text-slate-400 dark:text-gray-600"
          }
        >
          ✓ One special character
        </div>
      </div>
    </div>
  );
};

function getPasswordStrength(password: string) {
  let strength = 0;
  const checks = {
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
  };
  strength = Object.values(checks).filter(Boolean).length;
  return { strength, checks };
}

export default LoginRegister;
