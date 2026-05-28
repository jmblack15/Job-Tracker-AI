import Anthropic from '@anthropic-ai/sdk';

// Single shared client — reads ANTHROPIC_API_KEY from the environment
export const client = new Anthropic();
