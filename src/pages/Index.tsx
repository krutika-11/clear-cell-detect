import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/Auth/AuthForm";
import { ScanUpload } from "@/components/Scanner/ScanUpload";
import { ScanHistory } from "@/components/Scanner/ScanHistory";
import { Button } from "@/components/ui/button";
import { Activity, LogOut } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Activity className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <AuthForm />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold">MediScan AI</h1>
              <p className="text-xs text-muted-foreground">Advanced Cancer Detection</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <div className="space-y-8">
          {/* Welcome Section */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl font-bold tracking-tight">
              AI-Powered Medical Imaging Analysis
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Upload medical scans for instant AI analysis. Our advanced system helps identify 
              potential abnormalities and provides detailed insights.
            </p>
          </div>

          {/* Upload Section */}
          <ScanUpload />

          {/* Disclaimer */}
          <div className="bg-muted/50 rounded-lg p-6 border-l-4 border-primary">
            <h3 className="font-semibold mb-2">Important Medical Disclaimer</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This AI-powered analysis tool is designed to assist medical professionals and should not 
              be used as a substitute for professional medical advice, diagnosis, or treatment. Always 
              seek the advice of qualified healthcare providers with any questions regarding medical 
              conditions. Never disregard professional medical advice or delay seeking it because of 
              information provided by this tool.
            </p>
          </div>

          {/* History Section */}
          <ScanHistory />
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-16 py-8 bg-card/30">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2024 MediScan AI. For research and educational purposes only.</p>
          <p className="mt-2">Always consult with licensed healthcare professionals.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;