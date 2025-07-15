import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { opts } from '../../auth/[...nextauth]/route';
import { Groq } from 'groq-sdk';

const groq = process.env.GROQ_API_KEY ? new Groq({
  apiKey: process.env.GROQ_API_KEY,
}) : null;

interface AIAnalysisResult {
  summary: string;
  setupInstructions: string;
  error?: string;
}

function cleanupMarkdown(content: string): string {
  //temp testing
  // Convert • bullets to proper markdown bullets
  // content = content.replace(/^•\s+/gm, '- ');
  
  // // Convert numbered bullet points like "1." to markdown bullets
  // content = content.replace(/^\d+\.\s+/gm, '- ');
  
  // // Ensure proper spacing after bullets
  // content = content.replace(/^-\s*/gm, '- ');
  // content = content.replace(/^\*\s*/gm, '- ');
  
  return content.trim();
}

async function fetchReadmeFromGitHub(githubUrl: string): Promise<string> {
  // Parse GitHub URL to extract owner and repo
  const match = githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub URL format');
  }
  
  const [, owner, repo] = match;
  const cleanRepo = repo.replace(/\.git$/, ''); // Remove .git suffix if present
  
  // GitHub API endpoint for README
  const apiUrl = `https://api.github.com/repos/${owner}/${cleanRepo}/readme`;
  
  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'README-Extractor'
      }
    });
    
    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // The content is base64 encoded, so we need to decode it
    const readmeContent = Buffer.from(data.content, 'base64').toString('utf-8');
    return readmeContent;
  } catch (error) {
    throw new Error(`Failed to fetch README: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function summarizeProject(readmeContent: string): Promise<string> {
  if (!groq) {
    throw new Error('Groq API key not configured');
  }

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out after 30 seconds')), 30000);
    });

    const groqPromise = groq.chat.completions.create({
      "messages": [
        {
          "role": "system",
          "content": "You are an assistant that summarizes GitHub projects for human reviewers. Extract the main goals and key features of the project from the README content. Provide exactly 5 bullet points in proper markdown format using - or * for bullets. Each bullet should be 1-2 sentences maximum and focus on what the project does, its main functionality, and key features. This summary is for a human reviewer to quickly understand the project's purpose and capabilities. You're not selling a product, just summarizing the project for quality assessment. Keep it simple and unbiased so the reviewer can focus on quality testing the project. Only talk about the 5 most important features to keep it digestible and focused. Use proper markdown formatting with - or * for bullet points, **bold** for emphasis, and `code` for technical terms."
        },
        {
          "role": "user",
          "content": readmeContent
        }
      ],
      "model": "llama3-8b-8192",
      "temperature": 0.7,
      "max_tokens": 512,
      "top_p": 1,
      "stream": false,
      "stop": null
    });

    const chatCompletion = await Promise.race([groqPromise, timeoutPromise]) as Awaited<typeof groqPromise>;

    // Check if we got a valid response
    if (!chatCompletion || !chatCompletion.choices || chatCompletion.choices.length === 0) {
      throw new Error('No response received from AI service');
    }

    const rawContent = chatCompletion.choices[0]?.message?.content;
    
    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error('AI service returned empty response');
    }

    return cleanupMarkdown(rawContent);
  } catch (error) {
    console.error('Error in summarizeProject:', error);
    
    // Return a fallback message instead of throwing
    return '- Unable to generate AI summary at this time\n- Please review the project README manually\n- This may be due to AI service issues or README parsing problems\n- The project information is still available in the repository\n- Contact support if this issue persists';
  }
}

async function extractSetupInstructions(readmeContent: string): Promise<string> {
  if (!groq) {
    throw new Error('Groq API key not configured');
  }

  try {
    // Add timeout to prevent hanging
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('AI request timed out after 30 seconds')), 30000);
    });

    const groqPromise = groq.chat.completions.create({
      "messages": [
        {
          "role": "system",
          "content": "You are a assistant that is designed to extract setup instructions from github readme's that are in markdown into a simple followable, step by step bulleted format. Use easy to follow terminology & be specific. eg. if there's an .env.example, give the user a command to copy it and tell them to fill it out with instructions if needed. Keep in mind, you are creating these instructions for a human reviewer assessing project quality and nothing else. The setup process should be simple for them so they can just focus on quality testing the project."
        },
        {
          "role": "user",
          "content": readmeContent
        }
      ],
      "model": "llama3-8b-8192",
      "temperature": 1,
      "max_tokens": 1024,
      "top_p": 1,
      "stream": false,
      "stop": null
    });

    const chatCompletion = await Promise.race([groqPromise, timeoutPromise]) as Awaited<typeof groqPromise>;

    // Check if we got a valid response
    if (!chatCompletion || !chatCompletion.choices || chatCompletion.choices.length === 0) {
      throw new Error('No response received from AI service');
    }

    const rawContent = chatCompletion.choices[0]?.message?.content;
    
    if (!rawContent || rawContent.trim().length === 0) {
      throw new Error('AI service returned empty response');
    }

    return cleanupMarkdown(rawContent);
  } catch (error) {
    console.error('Error in extractSetupInstructions:', error);
    
    // Return a fallback message instead of throwing
    return '## Setup Instructions Unavailable\n\n- AI-generated setup instructions could not be created at this time\n- Please refer to the project\'s README file for manual setup instructions\n- Look for sections like "Installation", "Getting Started", or "Setup"\n- Check for package.json, requirements.txt, or similar dependency files\n- Contact the project maintainer if setup instructions are unclear';
  }
}

export async function POST(request: Request) {
  try {
    // Check for valid session and proper authorization
    const session = await getServerSession(opts);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if the user is an admin or reviewer
    const isAdmin = session.user.role === 'Admin' || session.user.isAdmin === true;
    const isReviewer = session.user.role === 'Reviewer';

    if (!isAdmin && !isReviewer) {
      return NextResponse.json({ error: 'Forbidden: Requires Admin or Reviewer role' }, { status: 403 });
    }

    // Check if Groq API key is configured
    if (!groq) {
      return NextResponse.json({ error: 'Groq API key not configured' }, { status: 500 });
    }

    const { githubUrl } = await request.json();

    if (!githubUrl) {
      return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });
    }

    // Validate GitHub URL format
    if (!githubUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/)) {
      return NextResponse.json({ error: 'Invalid GitHub URL format' }, { status: 400 });
    }

    try {
      console.log(`Fetching README from: ${githubUrl}`);
      const readmeContent = await fetchReadmeFromGitHub(githubUrl);
      
      // Generate project summary and setup instructions in parallel
      // Use Promise.allSettled to handle partial failures gracefully
      const [summaryResult, setupResult] = await Promise.allSettled([
        summarizeProject(readmeContent),
        extractSetupInstructions(readmeContent)
      ]);

      // Extract results, using fallback messages for failures
      const summary = summaryResult.status === 'fulfilled' 
        ? summaryResult.value 
        : '- Unable to generate project summary\n- Please review the project README manually\n- This may be due to AI service issues\n- The project information is still available in the repository';

      const setupInstructions = setupResult.status === 'fulfilled' 
        ? setupResult.value 
        : '## Setup Instructions Unavailable\n\n- AI-generated setup instructions could not be created\n- Please refer to the project\'s README file for manual setup instructions\n- Look for sections like "Installation", "Getting Started", or "Setup"';

      const result: AIAnalysisResult = {
        summary,
        setupInstructions
      };

      return NextResponse.json(result);
    } catch (error) {
      console.error('Error analyzing project:', error);
      return NextResponse.json({ 
        error: `Failed to analyze project: ${error instanceof Error ? error.message : String(error)}`,
        summary: '',
        setupInstructions: ''
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error in AI analysis endpoint:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
