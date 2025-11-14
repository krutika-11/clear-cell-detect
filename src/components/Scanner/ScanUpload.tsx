import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

export const ScanUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const queryClient = useQueryClient();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Upload to storage
      const fileName = `${user.id}/${Date.now()}-${file.name}`;
      const { error: uploadError, data } = await supabase.storage
        .from("medical-scans")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("medical-scans")
        .getPublicUrl(fileName);

      // Create scan record
      const { data: scanData, error: insertError } = await supabase
        .from("scans")
        .insert({
          user_id: user.id,
          image_url: publicUrl,
          status: "processing",
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success("Image uploaded successfully!");
      setUploading(false);
      setAnalyzing(true);

      // Convert image to base64 for AI analysis
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64 = reader.result?.toString().split(",")[1];
        
        try {
          const { error: analyzeError } = await supabase.functions.invoke("analyze-scan", {
            body: {
              imageBase64: base64,
              scanId: scanData.id,
            },
          });

          if (analyzeError) throw analyzeError;

          toast.success("Analysis complete!");
          queryClient.invalidateQueries({ queryKey: ["scans"] });
        } catch (error: any) {
          console.error("Analysis error:", error);
          toast.error("Analysis failed: " + error.message);
          
          // Update scan status to failed
          await supabase
            .from("scans")
            .update({ status: "failed" })
            .eq("id", scanData.id);
        } finally {
          setAnalyzing(false);
        }
      };
      
      reader.readAsDataURL(file);
    } catch (error: any) {
      console.error("Upload error:", error);
      toast.error(error.message || "Failed to upload image");
      setUploading(false);
      setAnalyzing(false);
    }
  };

  return (
    <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
      <CardContent className="p-8">
        <div className="flex flex-col items-center justify-center space-y-4">
          {uploading || analyzing ? (
            <>
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                {uploading ? "Uploading image..." : "Analyzing scan..."}
              </p>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <Upload className="h-8 w-8 text-white" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">Upload Medical Scan</h3>
                <p className="text-sm text-muted-foreground">
                  Upload X-ray, CT, MRI, or other medical imaging files
                </p>
              </div>
              <Button asChild variant="default" size="lg">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select Image
                  <input
                    id="file-upload"
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </Button>
              <p className="text-xs text-muted-foreground">
                Supported: JPG, PNG, DICOM • Max 10MB
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};