import { createDeepSeek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

// 允许流式响应最长 30 秒
export const maxDuration = 30;

export async function POST(req: Request) {
  // 检查 API Key 是否配置
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    console.error('DEEPSEEK_API_KEY is not configured');
    return new Response(
      JSON.stringify({ error: 'AI service not configured. Please set DEEPSEEK_API_KEY in .env file.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    // 创建 DeepSeek 客户端
    const deepseek = createDeepSeek({
      apiKey,
    });

    const { messages } = await req.json();
    
    // 从 UI 消息中提取文本内容，构建简单的消息格式
    const simpleMessages = messages.map((msg: { role: string; parts?: Array<{ type: string; text?: string }> }) => {
      const textParts = msg.parts?.filter((p: { type: string }) => p.type === 'text') || [];
      const content = textParts.map((p: { text?: string }) => p.text || '').join('');
      return {
        role: msg.role as 'user' | 'assistant',
        content,
      };
    });

    const result = streamText({
      model: deepseek('deepseek-chat'),
      system: `你是一个友好、专业的 AI 助手。你的任务是帮助用户解答问题、提供信息和协助完成各种任务。
请用简洁、清晰的语言回答问题。如果用户使用中文提问，请用中文回答。`,
      messages: simpleMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
