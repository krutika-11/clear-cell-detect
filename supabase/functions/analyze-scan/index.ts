import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, scanId } = await req.json();

    if (!imageBase64 || !scanId) {
      throw new Error("Missing required fields: imageBase64 and scanId");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Starting AI analysis for scan:", scanId);

    // Call Lovable AI for image analysis
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are a medical imaging AI assistant specializing in cancer detection. Analyze medical images and provide:
1. Detected abnormalities or concerning areas
2. Confidence score (0-100)
3. Brief description of findings
4. Risk level: low, moderate, or high
5. Recommendations

IMPORTANT: You are an AI assistant, not a replacement for professional medical diagnosis. Always recommend consulting with healthcare professionals.

Respond in JSON format:
{
  "detectedConditions": ["list of findings"],
  "confidenceScore": 85,
  "riskLevel": "moderate",
  "analysis": "detailed description",
  "recommendations": ["list of recommendations"]
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze this medical imaging scan for potential cancer indicators or abnormalities."
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/jpeg;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error("Rate limit exceeded. Please try again later.");
      }
      if (aiResponse.status === 402) {
        throw new Error("Payment required. Please add credits to your workspace.");
      }
      throw new Error(`AI analysis failed: ${errorText}`);
    }

    const aiResult = await aiResponse.json();
    const analysisText = aiResult.choices?.[0]?.message?.content || "{}";
    
    console.log("Raw AI response:", analysisText);

    let analysisResult;
    try {
      // Try to parse JSON from the response
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback structure if JSON parsing fails
        analysisResult = {
          detectedConditions: ["Analysis completed"],
          confidenceScore: 75,
          riskLevel: "moderate",
          analysis: analysisText,
          recommendations: ["Consult with a medical professional for proper diagnosis"]
        };
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisResult = {
        detectedConditions: ["Analysis completed"],
        confidenceScore: 75,
        riskLevel: "moderate",
        analysis: analysisText,
        recommendations: ["Consult with a medical professional for proper diagnosis"]
      };
    }

    // Update scan with results
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error: updateError } = await supabase
      .from("scans")
      .update({
        analysis_result: analysisResult,
        confidence_score: analysisResult.confidenceScore || 75,
        detected_conditions: analysisResult.detectedConditions || [],
        status: "completed",
      })
      .eq("id", scanId);

    if (updateError) {
      console.error("Failed to update scan:", updateError);
      throw updateError;
    }

    console.log("Analysis completed successfully for scan:", scanId);

    return new Response(
      JSON.stringify({
        success: true,
        analysis: analysisResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in analyze-scan:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});