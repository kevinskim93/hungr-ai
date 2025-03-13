declare module 'sentiment' {
  interface SentimentResult {
    score: number;
    comparative: number;
    tokens: string[];
    words: string[];
    positive: string[];
    negative: string[];
  }

  class Sentiment {
    constructor(options?: any);
    analyze(phrase: string, options?: any): SentimentResult;
  }

  export = Sentiment;
} 