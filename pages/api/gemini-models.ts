import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { apiKey } = req.query;

  if (!apiKey) {
    return res.status(400).json({
      success: false,
      error: 'API key required',
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    
    if (!response.ok) {
      const error = await response.json();
      return res.status(response.status).json({
        success: false,
        error: error.error?.message || 'Failed to list models',
      });
    }

    const data = await response.json();
    const models = data.models || [];
    
    // Filter for text generation models
    const textModels = models.filter((m: any) => 
      m.supportedGenerationMethods && 
      m.supportedGenerationMethods.includes('generateContent')
    );

    return res.status(200).json({
      success: true,
      models: textModels.map((m: any) => ({
        name: m.name.replace('models/', ''),
        displayName: m.displayName,
      })),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Failed to list models',
    });
  }
}
