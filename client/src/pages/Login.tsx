import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { getLoginUrl } from '@/const';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Github, Zap, Shield, Workflow } from 'lucide-react';

export default function Login() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (isAuthenticated && !loading) {
      navigate('/dashboard');
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
        <div className="animate-spin">
          <div className="h-12 w-12 border-4 border-accent border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/5 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col lg:flex-row">
        {/* Left side - Branding and features */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12">
          <div>
            {/* Logo and tagline */}
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-accent/20 backdrop-blur-sm border border-accent/30">
                <Workflow className="w-8 h-8 text-accent" />
              </div>
              <h1 className="text-3xl font-bold text-white">Wingm8n</h1>
            </div>
            <p className="text-accent text-lg font-semibold">FlowBridge</p>
            <p className="text-slate-400 mt-4 text-lg">Bridge your workflows from staging to production with confidence</p>
          </div>

          {/* Features list */}
          <div className="space-y-6">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent/20 border border-accent/30">
                  <Zap className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Intelligent Merging</h3>
                <p className="text-slate-400 text-sm">Compare credentials, domains, and workflow chains between branches</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent/20 border border-accent/30">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Secure Integration</h3>
                <p className="text-slate-400 text-sm">GitHub OAuth with encrypted session management</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center h-12 w-12 rounded-lg bg-accent/20 border border-accent/30">
                  <Workflow className="h-6 w-6 text-accent" />
                </div>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">N8N Workflows</h3>
                <p className="text-slate-400 text-sm">Seamlessly manage your N8N workflow deployments</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right side - Login form */}
        <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-md">
            {/* Mobile logo */}
            <div className="lg:hidden mb-8 text-center">
              <div className="flex items-center justify-center gap-3 mb-4">
                <div className="p-2 rounded-lg bg-accent/20 backdrop-blur-sm border border-accent/30">
                  <Workflow className="w-8 h-8 text-accent" />
                </div>
                <h1 className="text-2xl font-bold text-white">Wingm8n</h1>
              </div>
              <p className="text-accent text-sm font-semibold">FlowBridge</p>
            </div>

            {/* Login card with glassmorphism */}
            <div className="glassmorphism p-8 space-y-6">
              <div className="text-center">
                <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">Welcome Back</h2>
                <p className="text-slate-400">Sign in to manage your N8N workflows</p>
              </div>

              {/* GitHub OAuth Button */}
              <div className="space-y-4">
                <Button
                  onClick={() => {
                    const loginUrl = getLoginUrl();
                    window.location.href = loginUrl;
                  }}
                  className="w-full h-12 bg-accent hover:bg-accent-dark text-accent-foreground font-semibold rounded-lg transition-all duration-200 flex items-center justify-center gap-3 group"
                >
                  <Github className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Sign in with GitHub</span>
                </Button>

                <p className="text-xs text-slate-500 text-center">
                  By signing in, you agree to our Terms of Service and Privacy Policy
                </p>
              </div>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-700" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800/50 text-slate-400">Secure & Fast</span>
                </div>
              </div>

              {/* Info boxes */}
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Zap className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Real-time branch comparison and analysis</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Shield className="w-4 h-4 text-accent flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-slate-300">Enterprise-grade security with OAuth 2.0</p>
                </div>
              </div>
            </div>

            {/* Footer text */}
            <p className="text-center text-slate-500 text-xs mt-6">
              v1.0.0 • Built for N8N workflow management
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
