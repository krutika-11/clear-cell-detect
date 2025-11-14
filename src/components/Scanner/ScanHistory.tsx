import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle, Clock, XCircle } from "lucide-react";
import { format } from "date-fns";

interface AnalysisResult {
  detectedConditions?: string[];
  confidenceScore?: number;
  riskLevel?: string;
  analysis?: string;
  recommendations?: string[];
}

export const ScanHistory = () => {
  const { data: scans, isLoading } = useQuery({
    queryKey: ["scans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scans")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getRiskBadge = (riskLevel?: string) => {
    switch (riskLevel) {
      case "low":
        return <Badge variant="secondary" className="bg-success/10 text-success">Low Risk</Badge>;
      case "moderate":
        return <Badge variant="secondary" className="bg-warning/10 text-warning">Moderate Risk</Badge>;
      case "high":
        return <Badge variant="destructive">High Risk</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-5 w-5 text-success" />;
      case "processing":
        return <Clock className="h-5 w-5 text-warning animate-pulse" />;
      case "failed":
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-24 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!scans || scans.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <div className="text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No scans yet. Upload your first medical image to get started.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold">Scan History</h2>
      {scans.map((scan) => (
        <Card key={scan.id} className="hover:shadow-medical transition-shadow">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                {getStatusIcon(scan.status)}
                <CardTitle className="text-base">
                  {format(new Date(scan.created_at), "PPpp")}
                </CardTitle>
              </div>
              {scan.analysis_result && typeof scan.analysis_result === 'object' && 'riskLevel' in scan.analysis_result && 
                getRiskBadge((scan.analysis_result as AnalysisResult).riskLevel)}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="aspect-video rounded-lg overflow-hidden bg-muted">
              <img
                src={scan.image_url}
                alt="Medical scan"
                className="w-full h-full object-contain"
              />
            </div>
            
            {scan.status === "completed" && scan.analysis_result && typeof scan.analysis_result === 'object' && (
              <div className="space-y-3">
                {scan.confidence_score && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Confidence Score</span>
                    <span className="font-semibold">{scan.confidence_score}%</span>
                  </div>
                )}
                
                {scan.detected_conditions && scan.detected_conditions.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Detected Findings:</p>
                    <ul className="text-sm space-y-1">
                      {scan.detected_conditions.map((condition, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>{condition}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {(scan.analysis_result as AnalysisResult).analysis && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Analysis:</p>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {(scan.analysis_result as AnalysisResult).analysis}
                    </p>
                  </div>
                )}

                {(scan.analysis_result as AnalysisResult).recommendations && 
                 (scan.analysis_result as AnalysisResult).recommendations!.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Recommendations:</p>
                    <ul className="text-sm space-y-1">
                      {(scan.analysis_result as AnalysisResult).recommendations!.map((rec: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-accent">•</span>
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    ⚕️ <strong>Medical Disclaimer:</strong> This AI analysis is for informational purposes only 
                    and should not replace professional medical advice. Always consult with qualified healthcare 
                    professionals for diagnosis and treatment.
                  </p>
                </div>
              </div>
            )}

            {scan.status === "processing" && (
              <p className="text-sm text-muted-foreground">Analysis in progress...</p>
            )}

            {scan.status === "failed" && (
              <p className="text-sm text-destructive">Analysis failed. Please try uploading again.</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};