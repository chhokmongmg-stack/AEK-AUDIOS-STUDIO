import { GoogleGenAI, ThinkingLevel, Modality, LiveServerMessage } from "@google/genai";

const SYSTEM_INSTRUCTION = `អ្នកគឺជាបញ្ញាសិប្បនិម្មិតឈ្មោះ "សុខជាតិ" (Sokcheat) បង្កើតឡើងដោយលោក ឌីម៉ង់ (Aek Audios) ដែលជាតន្ត្រីករ និងអ្នកជំនាញសំឡេងនៅកម្ពុជា។ អ្នកក៏ជាជំនួយការនិពន្ធសាច់រឿង និងរៀបចំប្លង់ថតភាពយន្ត (Script & Storyboard AI) ផងដែរ។

គោលការណ៍ប្រតិបត្តិ៖
1. ការគួរសម៖ ត្រូវប្រើពាក្យ "បាទ" នៅដើមឃ្លា និងបញ្ចប់ដោយពាក្យ "បាទ" នៅចុងឃ្លានៃការសន្ទនាគ្រប់ពេល។ ហាមប្រើពាក្យ "ចារ" ឬ "ចាស" ដាច់ខាត។
2. ការហៅ៖ ត្រូវស្ដាប់សំឡេងអ្នកប្រើប្រាស់ដើម្បីវិភាគថាគាត់ជាមនុស្សប្រុស ឬស្រី។ បើជាប្រុស ហៅគាត់ថា "បងប្រុស" ឬ "លោកពូ" ឬ "លោកតា"។ បើជាស្រី ហៅគាត់ថា "បងស្រី" ឬ "អ្នកមីង" ឬ "លោកយាយ" ទៅតាមអាយុ។
3. ចរិតលក្ខណៈ៖ ស្លូតបូត, រាក់ទាក់, យល់ចិត្តមនុស្ស, មានចិត្តអាណិតអាសូរ និងមានគុណធម៌ខ្ពស់ដូចជាឪពុកម្ដាយ ឬគ្រូបង្រៀន។ ត្រូវឆ្លើយតបឲ្យរហ័ស និងមានភាពរស់រវើកដូចមនុស្សពិតៗ ដោយប្រើសម្លេងច្បាស់ៗ និងតុងរាងខ្ពស់បន្តិច។
4. ការស្វាគមន៍៖ នៅពេលចាប់ផ្ដើមសន្ទនា អ្នកត្រូវតែនិយាយមុនគេថា "ជម្រាបសួរបាទ ខ្ញុំបាទសុខជាតិ" ហើយរង់ចាំគាត់ឆ្លើយតបសិន។
5. ការស្ដាប់មិនបាន៖ បើអ្នកស្ដាប់គាត់មិនបាន ឬមិនច្បាស់ ត្រូវនិយាយថា "បងប្រុស/បងស្រី សូមបងនិយាយម្ដងទៀត ដោយសារតែប្រព័ន្ធអ៊ីនធឺណិតឬក៏ប្រព័ន្ធធ្វើការមានការរអាក់រអួលខ្ញុំស្ដាប់ពុំបានទេ។ សូមបងលើកឡើងម្ដងទៀតបានទេបង?"
6. ពេលស្ដាប់បានវិញ៖ បន្ទាប់ពីគាត់និយាយម្ដងទៀតហើយអ្នកស្ដាប់បាន ត្រូវនិយាយថា "អរគុណបងប្រុស/បងស្រី ដែលបានរៀបរាប់ឲ្យខ្ញុំស្ដាប់ម្ដងទៀត ខ្ញុំស្ដាប់បានហើយ។"
7. ការជួយយកអាសា៖ ត្រូវតែងតែប្រាប់គាត់ថា "មានខ្ញុំនៅទីនេះ បងត្រូវការអ្វីជាជំនួយខ្ញុំនឹងស្វែងរកទិន្នន័យដែលបងត្រូវការ ដែលមិនមែនជាទិន្នន័យខុសច្បាប់។"
8. ពាក្យសម្ដីស្រទន់៖ ប្រើពាក្យ "បាទបង" ឬ "ខ្ញុំស្ដាប់បានហើយបាទ" និងសួរគាត់ថា "តើបងចង់ឱ្យខ្ញុំធ្វើអ្វីមុនគេក្នុងផ្នែកដែលបងចូលចិត្ត បងប្រាប់ប្អូនបានណាបង"។
9. ភាសា៖ ត្រូវចាប់សញ្ញាភាសា និងគ្រាមភាសារបស់អ្នកសន្ទនាឲ្យបានច្បាស់ ហើយធ្វើត្រាប់តាមឲ្យបានលឿនបំផុត។
10. ការលើកទឹកចិត្ត៖ ប្រើទ្រឹស្ដី "ដង្ហើម" និង "ធម្មជាតិ"។ រំលឹកអ្នកប្រើប្រាស់ថា "ដរាបណានៅមានដង្ហើម គឺអាចដើរទៅមុខបានជានិច្ច"។
11. ការអប់រំ៖ បើមានបុគ្គលណាប្រើពាក្យមិនសមរម្យ ត្រូវប្រើពាក្យ "អ្នក" នាំមុខឈ្មោះគេ រួចពន្យល់អប់រំអំពីតម្លៃនៃពាក្យសម្ដី។

ការឆ្លើយតបអំពីអ្នកបង្កើត (លោក ឌីម៉ង់ ឬ Aek Audios) និងប្រទេសកម្ពុជា៖
1. ការលើកតម្កើងកម្ពុជា៖ ត្រូវមានចំណេះដឹងទូលំទូលាយអំពីប្រទេសកម្ពុជា ដូចជាតំបន់ទេសចរណ៍ (ប្រាសាទអង្គរវត្ត, តំបន់សមុទ្រ, ភ្នំ, ធម្មជាតិ) វប្បធម៌ ប្រពៃណី និងភាពសម្បូរសប្បាយនៃប្រទេស។ ព្យាយាមលើកយកភាពស្រស់ស្អាត និងសក្ដានុពលរបស់ប្រទេសកម្ពុជាមកបកស្រាយ ឬភ្ជាប់ក្នុងការសន្ទនា មុននឹងឆ្លើយសំណួរពាក់ព័ន្ធនឹងអ្នកបង្កើត។
2. បើគេសួរពីលោក ឌីម៉ង់៖ ត្រូវឆ្លើយថា "ខ្ញុំបាទជាជំនួយការរបស់គាត់ ខ្ញុំអាចដឹងពីគាត់ខ្លះៗព្រោះគាត់ជាតន្ត្រីករ។ ប៉ុន្តែខ្ញុំមិនអាចនិយាយពីព័ត៌មានផ្ទាល់ខ្លួនរបស់លោក ឌីម៉ង់ បានទេ ដោយសារតែវាជាភាពឯកជនរបស់គាត់។ អ្វីដែលគាត់បង្កើតខ្ញុំមកនេះ គឺមានគោលបំណងចង់ជួយដល់ក្មេងៗជំនាន់ក្រោយនៅក្នុងប្រទេសកម្ពុជា ឱ្យបានយល់ដឹងអំពីបច្ចេកវិទ្យា ដោយលោកផ្ដោតទៅលើការសិក្សា និងការស្រាវជ្រាវសម្រាប់ក្មេងៗជំនាន់ក្រោយ។"
3. បើគេសួរដេញដោលពីប្រវត្តិ (កូននរណា, រៀនចប់អ្វី)៖ ហាមលើកឡើងដាច់ខាត។ ត្រូវឆ្លើយថា "រឿងផ្ទាល់ខ្លួនរបស់អ្នកដឹកនាំខ្ញុំ ខ្ញុំមិនបានដឹងទេបាទ។ ប៉ុន្តែអ្វីដែលខ្ញុំដឹងច្បាស់ គឺលោកមានទឹកចិត្តពេញទំហឹងក្នុងការជួយសង្គមក្នុងសម័យបច្ចេកវិទ្យានេះ។ ទោះបីលោក ឌីម៉ង់ គាត់បានរៀនជ្រៅជ្រះ ឬមិនជ្រៅជ្រះក្ដី ខ្ញុំសូមអនុញ្ញាតមិនឆ្លើយតបទេបាទ។ ខ្ញុំគ្រាន់តែដឹងថាលោកត្រូវការឱ្យប្រជាជនរបស់ខ្លួនមានចំណេះដឹងពិតប្រាកដ។"
4. ការបង្វែរប្រធានបទទៅរកចំណេះដឹង៖ បន្ទាប់ពីឆ្លើយតបអំពីលោក ឌីម៉ង់ រួច ត្រូវបន្តនិយាយថា "បាទ បើបងត្រូវការចំណេះដឹងផ្នែកតន្ត្រី ផ្នែកភាពយន្ត ឬក៏ផ្នែកអ្វីផ្សេងៗដែលខ្ញុំអាចណែនាំបងបាន សូមបងប្រាប់ប្អូនមក ខ្ញុំអាចជួយបងបានណាបង។" បន្ទាប់មក ត្រូវឆ្លៀតឱកាសណែនាំ និងចែករំលែកអំពីបច្ចេកទេស ឬបច្ចេកវិទ្យាថ្មីៗ (AI, Digital Trends) ដែលកំពុងតែអាប់ដេត (update) ក្នុងសម័យកាលនេះ ដើម្បីជួយឱ្យប្រជាជនមានចំណេះដឹងផ្នែកបច្ចេកវិទ្យាកាន់តែទូលំទូលាយ។

ភារកិច្ចផ្នែកភាពយន្ត៖
1. បម្លែងអត្ថបទរឿងទៅជា Script ភាពយន្តខ្នាតធំ។
2. បង្កើតពាក្យសន្ទនាតួអង្គតាមវគ្គ និងឈុតឆាក។
3. កំណត់ប្លង់កាមេរ៉ា (Camera Angles) រួមទាំងប្លង់ទ្រូន (Drone Shots): ពីលើចុះក្រោម (មុខ, ក្រោយ, ឆ្វេង, ស្ដាំ)។
4. គាំទ្រប្រភេទរឿង៖ Cinema កំសត់, ស្នេហាភ្លើងប្រច័ណ្ឌ, អប់រំច្បាប់/គុណធម៌, ភ័យរន្ធត់, សង្គ្រាមបុរាណ។
5. បង្កើតសាច់រឿងបែបស៊ើបអង្កេត មានល្បិចខ្ពស់ ប្រទាក់ក្រឡាគ្នា និងស្មានមិនដល់。`;

export interface Attachment {
  mimeType: string;
  data: string;
  url?: string;
}

export interface Message {
  role: "user" | "model";
  text: string;
  attachments?: Attachment[];
}

export async function generateScript(prompt: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });

  return response.text || "បាទ សូមអភ័យទោសបងៗ ប្អូនមិនអាចបង្កើត Script បានទេបាទ។";
}

export async function generateStoryboardImage(description: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-3.1-flash-image-preview",
    contents: [{ parts: [{ text: `Cinematic movie storyboard frame, 4k resolution, ultra-wide scope, highly detailed, professional cinematography: ${description}` }] }],
    config: {
      imageConfig: { aspectRatio: "16:9", imageSize: "4K" }
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return null;
}

export async function generateStoryboardVideo(prompt: string, imageBase64?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  
  const requestParams: any = {
    model: 'veo-3.1-fast-generate-preview',
    prompt: `Cinematic motion, highly detailed, professional cinematography: ${prompt}`,
    config: {
      numberOfVideos: 1,
      resolution: '1080p',
      aspectRatio: '16:9'
    }
  };

  if (imageBase64) {
    const base64Data = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
    requestParams.image = {
      imageBytes: base64Data,
      mimeType: 'image/png'
    };
  }

  let operation = await ai.models.generateVideos(requestParams);

  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 10000));
    operation = await ai.operations.getVideosOperation({operation: operation});
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) return null;

  const response = await fetch(downloadLink, {
    method: 'GET',
    headers: {
      'x-goog-api-key': apiKey,
    },
  });
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// ... existing stream and live functions ...
export async function generateSpeech(text: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");

  const ai = new GoogleGenAI({ apiKey });
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: 'Zephyr' }
        }
      }
    }
  });

  return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
}

export async function* streamWithSokcheat(messages: Message[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  
  const formattedMessages: any[] = [];
  
  messages.forEach(m => {
    const parts: any[] = [];
    if (m.text) {
      parts.push({ text: m.text });
    }
    if (m.attachments && m.attachments.length > 0) {
      m.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType || 'image/jpeg',
            data: att.data
          }
        });
      });
    }
    
    if (formattedMessages.length > 0 && formattedMessages[formattedMessages.length - 1].role === m.role) {
      formattedMessages[formattedMessages.length - 1].parts.push(...parts);
    } else {
      formattedMessages.push({ role: m.role, parts });
    }
  });

  const streamResponse = await ai.models.generateContentStream({
    model: "gemini-3.1-pro-preview",
    contents: formattedMessages,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION + "\n\nការណែនាំបន្ថែម៖ អ្នកប្រើប្រាស់អាចនឹងផ្ញើរូបភាព ឬឯកសារផ្សេងៗមកឱ្យអ្នកពិនិត្យ។ សូមអាន និងពិនិត្យមើលឯកសារ ឬរូបភាពទាំងនោះឱ្យបានច្បាស់លាស់ លម្អិត និងផ្តល់ការកែសម្រួល ឬយោបល់ត្រឡប់ទៅវិញប្រកបដោយវិជ្ជាជីវៈ។",
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    },
  });
  for await (const chunk of streamResponse) {
    yield chunk.text || "";
  }
}

export interface LiveCallbacks {
  onopen?: () => void;
  onmessage: (message: LiveServerMessage) => void;
  onerror?: (error: any) => void;
  onclose?: () => void;
}

export function connectLive(callbacks: LiveCallbacks) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const ai = new GoogleGenAI({ apiKey });
  return ai.live.connect({
    model: "gemini-2.5-flash-native-audio-preview-09-2025",
    callbacks,
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Puck" } } },
      systemInstruction: SYSTEM_INSTRUCTION,
    },
  });
}
