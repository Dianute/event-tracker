'use client';

import { signIn } from "next-auth/react";
import { useState } from "react";
import { Mail, ArrowRight, Chrome } from "lucide-react"; // Chrome icon as proxy for Google

export default function SignIn() {
    const [email, setEmail] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEmailLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        await signIn("email", { email, callbackUrl: "/admin" }); // Redirect to Admin after login
        setIsSubmitting(false);
    };

    return (
        <div className="min-h-screen bg-[#050510] flex items-center justify-center p-6 text-white font-sans">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-600 to-blue-600 rounded-3xl mx-auto flex items-center justify-center mb-6 shadow-xl shadow-blue-900/20">
                        <span className="text-4xl">🔐</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight mb-2">Welcome Back</h1>
                    <p className="text-gray-400">Sign in to manage your events</p>
                </div>

                <div className="space-y-4">
                    {/* Google Login */}
                    <button
                        onClick={() => signIn("google", { callbackUrl: "/admin" })}
                        className="w-full bg-white text-black hover:bg-gray-100 font-bold py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                    >
                        <Chrome size={20} className="text-blue-500" />
                        <span>Continue with Google</span>
                    </button>

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-800" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-[#050510] px-2 text-gray-500">Or using Magic Link</span>
                        </div>
                    </div>

                    {/* Email Login */}
                    <form onSubmit={handleEmailLogin} className="space-y-4">
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-500 transition-colors" size={20} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                required
                                className="w-full bg-white/5 border border-white/10 rounded-2xl pl-12 pr-5 py-4 text-white focus:outline-none focus:border-blue-500/50 focus:bg-blue-500/10 transition-all placeholder:text-gray-600 font-medium"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <span>Sending Secure Link...</span>
                            ) : (
                                <>
                                    <span>Send Magic Link</span>
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
