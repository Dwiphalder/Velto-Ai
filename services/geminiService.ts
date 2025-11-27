import { GoogleGenAI } from "@google/genai";
import { AspectRatio, GeneratedImage } from "../types";

// Initialize the client
// API Key is strictly from process.env.API_KEY as per instructions
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a Base64 string.
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data-URL declaration (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Helper to parse base64 from string or File
 */
const getBase64AndMime = async (source: File | string): Promise<{ data: string, mimeType: string }> => {
  let base64Data = '';
  let mimeType = 'image/png';

  if (source instanceof File) {
    base64Data = await fileToBase64(source);
    mimeType = source.type;
  } else if (typeof source === 'string') {
    // Assume it is a Data URL: "data:image/jpeg;base64,..."
    const matches = source.match(/^data:(.+);base64,(.+)$/);
    if (matches && matches.length === 3) {
      mimeType = matches[1];
      base64Data = matches[2];
    } else {
      base64Data = source;
    }
  }
  return { data: base64Data, mimeType };
};

/**
 * Generates text content (Titles, Tags, etc.)
 */
export const generateText = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "";
  } catch (error: any) {
    console.error("AI Text API Error:", error);
    throw new Error(error.message || "Failed to generate text.");
  }
};

/**
 * Fallback function to generate images using Imagen model
 * Used when gemini-2.5-flash-image fails or for pure text-to-image
 */
const generateWithImagen = async (prompt: string, aspectRatio: AspectRatio): Promise<GeneratedImage> => {
    try {
        console.log("Switching to Imagen model for generation...");
        const response = await ai.models.generateImages({
            model: 'imagen-3.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 1,
                aspectRatio: aspectRatio,
                outputMimeType: 'image/jpeg'
            },
        });

        const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
        if (!imageBytes) {
            throw new Error("Imagen returned no image data.");
        }

        return {
            url: `data:image/jpeg;base64,${imageBytes}`,
            mimeType: 'image/jpeg'
        };
    } catch (error: any) {
        console.error("Imagen API Error:", error);
        throw new Error(error.message || "Imagen generation failed.");
    }
};

/**
 * Generates a thumbnail using AI.
 * accepts imageSource as File (upload) or string (data URL from previous generation)
 * accepts optional maskSource for inpainting/editing specific areas
 */
export const generateThumbnail = async (
  imageSource: File | string | null,
  prompt: string,
  aspectRatio: AspectRatio,
  maskSource?: string | null
): Promise<GeneratedImage> => {
  
  try {
    const model = 'gemini-2.5-flash-image';
    
    const parts: any[] = [];

    // 1. Add Main Image
    if (imageSource) {
      const { data, mimeType } = await getBase64AndMime(imageSource);
      parts.push({
        inlineData: {
          data: data,
          mimeType: mimeType,
        },
      });
    }

    // 2. Add Mask if present
    if (maskSource) {
      const { data, mimeType } = await getBase64AndMime(maskSource);
      parts.push({
        inlineData: {
          data: data,
          mimeType: mimeType,
        },
      });
    }

    // 3. Construct Concise Prompt for Speed
    let enhancedPrompt = '';
    
    if (maskSource) {
       enhancedPrompt = `Edit the image using the provided mask. Instruction: ${prompt}`;
    } else {
       // Concise prompt instruction
       enhancedPrompt = `Generate a high-quality image. Request: ${prompt}. Output only the image.`;
    }

    parts.push({ text: enhancedPrompt });

    // Create the API request promise
    const responsePromise = ai.models.generateContent({
      model: model,
      contents: {
        parts: parts,
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
        },
      },
    });

    // Create a timeout promise (e.g., 180 seconds)
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Request timed out.")), 180000);
    });

    // Race the API call against the timeout
    const response: any = await Promise.race([responsePromise, timeoutPromise]);

    // Iterate through parts to find the image
    const candidates = response.candidates;
    if (!candidates || candidates.length === 0) {
       // Often safety filters result in empty candidates
       if (response.promptFeedback?.blockReason) {
         throw new Error(`Generation blocked: ${response.promptFeedback.blockReason}`);
       }
       throw new Error("No candidates returned from AI.");
    }

    const contentParts = candidates[0].content?.parts;
    let generatedImage: GeneratedImage | null = null;

    if (contentParts) {
        for (const part of contentParts) {
          if (part.inlineData) {
            const base64String = part.inlineData.data;
            const mimeType = part.inlineData.mimeType || 'image/png'; 
            generatedImage = {
              url: `data:${mimeType};base64,${base64String}`,
              mimeType: mimeType
            };
            break; // Found the image
          }
        }
    }

    if (!generatedImage) {
      // Check for text refusal
      const textPart = contentParts?.find((p: any) => p.text);
      if (textPart) {
        console.warn("Model responded with text instead of image:", textPart.text);
      }
      
      // FALLBACK LOGIC: If no image and it was a text-to-image request, try Imagen
      if (!imageSource && !maskSource) {
          return await generateWithImagen(prompt, aspectRatio);
      }

      throw new Error("No image data found in response. The prompt might have triggered safety filters.");
    }

    return generatedImage;

  } catch (error: any) {
    console.error("AI API Error:", error);
    
    // Attempt fallback if the error is related to no image data in a text-to-image scenario
    if ((error.message.includes("No image data") || error.message.includes("candidate")) && !imageSource && !maskSource) {
        try {
            return await generateWithImagen(prompt, aspectRatio);
        } catch (fallbackError: any) {
            throw new Error(fallbackError.message || "Failed to generate image.");
        }
    }

    throw new Error(error.message || "Failed to generate image.");
  }
};

/**
 * Internal helper to call generateVideos with specific model
 */
const callGenerateVideos = async (model: string, requestOptions: any) => {
    const finalOptions = { ...requestOptions, model };
    return await ai.models.generateVideos(finalOptions);
};

/**
 * Generates a video using Veo model
 */
export const generateVideo = async (
  prompt: string,
  imageSource: File | null,
  aspectRatio: string = '16:9'
): Promise<string> => {
  try {
    // Attempt with the latest model first
    let model = 'veo-3.1-generate-preview'; 
    const fallbackModel = 'veo-2.0-generate-preview-09-24';
    
    let requestOptions: any = {
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: aspectRatio, // '16:9' or '9:16'
      }
    };

    // Prompt is optional if image is provided, but recommended
    if (prompt) {
      requestOptions.prompt = prompt;
    } else if (!imageSource) {
      throw new Error("A text prompt is required if no image is provided.");
    } else {
      // Default prompt if missing for image-to-video
      requestOptions.prompt = "Animate this image"; 
    }

    if (imageSource) {
      const { data, mimeType } = await getBase64AndMime(imageSource);
      requestOptions.image = {
        imageBytes: data,
        mimeType: mimeType
      };
    }

    let operation;
    try {
        operation = await callGenerateVideos(model, requestOptions);
    } catch (e: any) {
        // If 404, try fallback model
        if (e.message?.includes('404') || e.message?.includes('NOT_FOUND')) {
            console.warn(`Model ${model} not found, retrying with ${fallbackModel}`);
            model = fallbackModel;
            operation = await callGenerateVideos(model, requestOptions);
        } else {
            throw e;
        }
    }

    // Polling Loop
    // Veo generation takes time. We use 10s intervals as recommended.
    while (!operation.done) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      // Pass the operation object to check status
      try {
          operation = await ai.operations.getVideosOperation({ operation: operation });
      } catch (pollErr) {
          console.error("Polling Error:", pollErr);
          // Sometimes polling fails transiently, continue loop if possible or break?
          // If we can't check status, we can't proceed.
          throw new Error("Connection lost during video generation. Please try again.");
      }
    }

    if (operation.error) {
      throw new Error(operation.error.message || "Video generation failed.");
    }

    const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
      throw new Error("No video URI returned.");
    }

    // Fetch the actual video bytes using the API key
    // Ensure we append the key correctly (? vs &)
    const separator = downloadLink.includes('?') ? '&' : '?';
    const videoResponse = await fetch(`${downloadLink}${separator}key=${process.env.API_KEY}`);
    
    if (!videoResponse.ok) {
      if (videoResponse.status === 404) {
         throw new Error("Video file expired or not found.");
      }
      throw new Error("Failed to download video file.");
    }
    
    const videoBlob = await videoResponse.blob();
    return URL.createObjectURL(videoBlob);

  } catch (error: any) {
    console.error("Video Gen Error:", error);
    if (error.message?.includes("404") || error.message?.includes("not found")) {
      throw new Error("Video model unavailable (404). Please try again later.");
    }
    throw new Error(error.message || "Failed to generate video.");
  }
};

/**
 * Generates Speech from Text
 */
export const generateSpeech = async (text: string, voiceName: string = 'Kore'): Promise<ArrayBuffer> => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voiceName },
            },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      throw new Error("No audio data generated.");
    }

    // Decode base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;

  } catch (error: any) {
    console.error("TTS API Error:", error);
    throw new Error(error.message || "Failed to generate speech.");
  }
};

/**
 * Translates audio content from a video file into text in the target language.
 */
export const translateVideoContent = async (videoFile: File, targetLanguage: string): Promise<string> => {
  try {
    const { data, mimeType } = await getBase64AndMime(videoFile);
    
    const prompt = `
      Listen to the audio in this video carefully.
      Transcribe what is being said and translate it into ${targetLanguage}.
      Return ONLY the translated text. Do not add any introduction or explanation.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              data: data,
              mimeType: mimeType
            }
          },
          { text: prompt }
        ]
      }
    });

    return response.text || "";
  } catch (error: any) {
    console.error("Video Translation Error:", error);
    throw new Error(error.message || "Failed to translate video content.");
  }
};
