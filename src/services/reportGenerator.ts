
interface ReportGenerationParams {
  detectionResult: {
    hasTrash: boolean;
    confidence: number;
    description: string;
  };
  location: {
    latitude?: number;
    longitude?: number;
    address: string;
  };
  timestamp: string;
  reportId: string;
}

export const generateAIReport = async (params: ReportGenerationParams): Promise<string> => {
  try {
    const prompt = `Generate a formal municipal complaint report for trash/waste found at a location. 

Details:
- Location: ${params.location.address}
- Date/Time: ${new Date(params.timestamp).toLocaleString()}
- AI Detection: ${params.detectionResult.description} (${(params.detectionResult.confidence * 100).toFixed(0)}% confidence)
- Report ID: ${params.reportId}

Please write a professional, concise complaint report that a municipal corporation would take seriously. Include:
1. Clear subject line
2. Formal greeting
3. Location details
4. Description of the waste problem
5. Request for action
6. Contact information placeholder
7. Professional closing

Keep it under 300 words and make it actionable.`;

    const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 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'
      },
      body: JSON.stringify({
        model: 'deepseek-ai/deepseek-r1',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.6,
        top_p: 0.7,
        max_tokens: 4096,
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error('AI API request failed');
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error('AI report generation failed:', error);
    // Return null to indicate AI generation failed
    return null;
  }
};

export const generateSimpleReport = (params: ReportGenerationParams): string => {
  return `MUNICIPAL WASTE COMPLAINT REPORT

Report ID: ${params.reportId}
Date & Time: ${new Date(params.timestamp).toLocaleString()}

Subject: Waste/Trash Complaint at ${params.location.address}

Dear Municipal Corporation,

I am writing to report improper waste disposal at the following location:

Location: ${params.location.address}
${params.location.latitude ? `Coordinates: ${params.location.latitude.toFixed(6)}, ${params.location.longitude?.toFixed(6)}` : ''}

Problem Description:
${params.detectionResult.description}

This waste poses a health and environmental risk to our community. I kindly request immediate action to clean up this area and investigate the source of improper waste disposal.

Please take necessary steps to:
1. Clean up the reported waste
2. Investigate the cause
3. Take preventive measures to avoid future occurrences

I am available to provide additional information if needed.

Thank you for your attention to this matter.

Sincerely,
[Your Name]
[Your Contact Information]

---
This report was generated on ${new Date(params.timestamp).toLocaleString()}
Photo evidence attached separately.`;
};
