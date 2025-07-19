import { GoogleGenerativeAI } from '@google/generative-ai';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { Router } from 'express';
import { URL } from 'url';

const router = Router();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/121.0'
];

const createAxiosInstance = (customHeaders = {}) => {
  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  return axios.create({
    timeout: 20000,
    maxRedirects: 5,
    headers: {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Cache-Control': 'no-cache',
      'Pragma': 'no-cache',
      ...customHeaders
    },
    validateStatus: function (status) {
      return status >= 200 && status < 400;
    }
  });
};

// Link discovery and classification
class LinkDiscovery {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.baseDomain = new URL(baseUrl).hostname;
  }

  extractLinks(html) {
    const $ = cheerio.load(html);
    const links = [];

    const linkSelectors = [
      'a[href*="article"]',
      'a[href*="post"]',
      'a[href*="blog"]',
      'a[href*="news"]',
      'a[href*="story"]',
      'a[href*="content"]',
      'a[href*="page"]',
      'main a',
      'article a',
      '.content a',
      '#content a',
      '.post a',
      '.entry a',
      'a'
    ];

    const processedUrls = new Set();

    linkSelectors.forEach(selector => {
      $(selector).each((i, element) => {
        const href = $(element).attr('href');
        if (!href) return;

        try {
          const absoluteUrl = new URL(href, this.baseUrl).href;
          const urlObj = new URL(absoluteUrl);

          if (processedUrls.has(absoluteUrl)) return;
          processedUrls.add(absoluteUrl);

          if (this.isValidLink(absoluteUrl, urlObj)) {
            const linkText = $(element).text().trim();
            const context = this.extractContext($(element));

            links.push({
              url: absoluteUrl,
              text: linkText,
              context: context,
              priority: this.calculatePriority(absoluteUrl, linkText, context),
              selector: selector
            });
          }
        } catch (error) {
          // Skip invalid URLs
        }
      });
    });

    return links
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 10);
  }

  isValidLink(url, urlObj) {
    const hostname = urlObj.hostname;
    const pathname = urlObj.pathname;

    if (hostname !== this.baseDomain && !hostname.includes(this.baseDomain.replace('www.', ''))) {
      return false;
    }

    const unwantedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.zip', '.rar', '.exe', '.dmg', '.jpg', '.jpeg', '.png', '.gif', '.svg', '.mp3', '.mp4', '.avi', '.mov'];
    if (unwantedExtensions.some(ext => pathname.toLowerCase().endsWith(ext))) {
      return false;
    }

    const unwantedPaths = ['/login', '/register', '/cart', '/checkout', '/account', '/admin', '/wp-admin', '/search', '/tag/', '/category/', '/author/'];
    if (unwantedPaths.some(path => pathname.toLowerCase().includes(path))) {
      return false;
    }

    if (url.includes('#') && !url.includes('?')) {
      return false;
    }

    return true;
  }

  extractContext(element) {
    const parent = element.parent();
    const context = parent.text().trim();
    return context.length > 200 ? context.substring(0, 200) + '...' : context;
  }

  calculatePriority(url, linkText, context) {
    let priority = 0;

    const urlLower = url.toLowerCase();
    if (urlLower.includes('article')) priority += 20;
    if (urlLower.includes('post')) priority += 15;
    if (urlLower.includes('blog')) priority += 15;
    if (urlLower.includes('news')) priority += 18;
    if (urlLower.includes('story')) priority += 16;
    if (urlLower.includes('content')) priority += 10;

    const textLower = linkText.toLowerCase();
    if (textLower.includes('read more')) priority += 25;
    if (textLower.includes('continue reading')) priority += 25;
    if (textLower.includes('full article')) priority += 30;
    if (textLower.includes('details')) priority += 15;
    if (textLower.length > 10 && textLower.length < 100) priority += 10;

    if (context.includes('article') || context.includes('post')) priority += 10;

    if (linkText.length < 5) priority -= 10;
    if (linkText.length > 150) priority -= 5;

    if (/^\d+$/.test(linkText.trim())) priority -= 20;

    return priority;
  }
}

// Enhanced content extraction with multiple strategies
class ContentExtractor {
  constructor(html, url) {
    this.$ = cheerio.load(html);
    this.url = url;
    this.content = '';
  }

  extractContent() {
    const strategies = [
      this.extractJSONLD.bind(this),
      this.extractOpenGraph.bind(this),
      this.extractBySemanticTags.bind(this),
      this.extractBySelectors.bind(this),
      this.extractByReadability.bind(this),
      this.extractFallback.bind(this)
    ];

    for (const strategy of strategies) {
      try {
        const result = strategy();
        if (result && result.length > 100) {
          return this.cleanContent(result);
        }
      } catch (error) {
        console.log(`Extraction strategy failed: ${error.message}`);
      }
    }

    return '';
  }

  // Extract title separately
  extractTitle() {
    const titleSelectors = [
      'h1',
      'title',
      'meta[property="og:title"]',
      '.post-title',
      '.entry-title',
      '.article-title',
      '.page-title'
    ];

    for (const selector of titleSelectors) {
      const element = this.$(selector);
      if (element.length > 0) {
        const title = element.first().text().trim() || element.first().attr('content');
        if (title && title.length > 0) {
          return title;
        }
      }
    }
    return 'No title found';
  }

  extractJSONLD() {
    const jsonLdScripts = this.$('script[type="application/ld+json"]');

    for (let i = 0; i < jsonLdScripts.length; i++) {
      try {
        const jsonData = JSON.parse(this.$(jsonLdScripts[i]).html());
        if (jsonData.articleBody) {
          return jsonData.articleBody;
        }
        if (jsonData.description) {
          return jsonData.description;
        }
      } catch (error) {
        continue;
      }
    }
    return '';
  }

  extractOpenGraph() {
    const description = this.$('meta[property="og:description"]').attr('content');
    if (description && description.length > 100) {
      return description;
    }
    return '';
  }

  extractBySemanticTags() {
    this.$('script, style, nav, footer, header, aside, .advertisement, .ad, .sidebar, .menu, .navigation, .breadcrumb, .social-share, .related-posts, .comments').remove();

    const semanticSelectors = [
      'main article',
      'main',
      'article',
      '[role="main"]',
      '.main-content',
      '#main-content',
      '.content-area',
      '#content-area'
    ];

    for (const selector of semanticSelectors) {
      const element = this.$(selector);
      if (element.length > 0) {
        const text = element.text().replace(/\s+/g, ' ').trim();
        if (text.length > 200) {
          return text;
        }
      }
    }
    return '';
  }

  extractBySelectors() {
    const contentSelectors = [
      '.post-content',
      '.entry-content',
      '.article-content',
      '.content-body',
      '.post-body',
      '.article-body',
      '.text-content',
      '.main-text',
      '#post-content',
      '#article-content',
      '.content',
      '#content'
    ];

    for (const selector of contentSelectors) {
      const element = this.$(selector);
      if (element.length > 0) {
        const text = element.text().replace(/\s+/g, ' ').trim();
        if (text.length > 200) {
          return text;
        }
      }
    }
    return '';
  }

  extractByReadability() {
    const $ = this.$;
    let bestCandidate = null;
    let bestScore = 0;

    $('p').each((i, element) => {
      const $element = $(element);
      const text = $element.text().trim();

      if (text.length < 50) return;

      let score = text.length;

      if (text.length > 100 && text.length < 1000) {
        score += 50;
      }

      if ($element.closest('article, .post, .entry, .content, main').length > 0) {
        score += 30;
      }

      const linkCount = $element.find('a').length;
      if (linkCount > 3) {
        score -= linkCount * 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestCandidate = $element.parent();
      }
    });

    if (bestCandidate) {
      return bestCandidate.text().replace(/\s+/g, ' ').trim();
    }
    return '';
  }

  extractFallback() {
    this.$('script, style, nav, footer, header, aside, .advertisement, .ad, .sidebar').remove();
    const bodyText = this.$('body').text().replace(/\s+/g, ' ').trim();
    return bodyText.length > 100 ? bodyText : '';
  }

  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')
      .replace(/\n+/g, '\n')
      .replace(/\t+/g, ' ')
      .trim()
      .slice(0, 50000);
  }
}

// Advanced scraping with nested link support
class AdvancedScraper {
  constructor(maxDepth = 2, maxLinksPerPage = 5) {
    this.maxDepth = maxDepth;
    this.maxLinksPerPage = maxLinksPerPage;
    this.scrapedUrls = new Set();
    this.results = [];
  }

  async scrapeWithNestedLinks(startUrl, query = '', depth = 0) {
    if (depth > this.maxDepth || this.scrapedUrls.has(startUrl)) {
      return this.results;
    }

    console.log(`Scraping depth ${depth}: ${startUrl}`);
    this.scrapedUrls.add(startUrl);

    try {
      const html = await this.scrapeWithFallback(startUrl);
      const extractor = new ContentExtractor(html, startUrl);
      const content = extractor.extractContent();
      const title = extractor.extractTitle();

      if (content) {
        this.results.push({
          url: startUrl,
          title: title,
          content: content,
          depth: depth,
          contentLength: content.length,
          timestamp: new Date().toISOString()
        });
      }

      if (depth < this.maxDepth) {
        const linkDiscovery = new LinkDiscovery(startUrl);
        const links = linkDiscovery.extractLinks(html);

        const relevantLinks = query
          ? this.filterLinksByQuery(links, query)
          : links.slice(0, this.maxLinksPerPage);

        for (const link of relevantLinks) {
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          await this.scrapeWithNestedLinks(link.url, query, depth + 1);
        }
      }

    } catch (error) {
      console.error(`Failed to scrape ${startUrl}:`, error.message);
    }

    return this.results;
  }

  filterLinksByQuery(links, query) {
    const queryTerms = query.toLowerCase().split(' ');

    return links
      .map(link => {
        let relevanceScore = link.priority;

        queryTerms.forEach(term => {
          if (link.text.toLowerCase().includes(term)) {
            relevanceScore += 30;
          }
          if (link.context.toLowerCase().includes(term)) {
            relevanceScore += 20;
          }
          if (link.url.toLowerCase().includes(term)) {
            relevanceScore += 15;
          }
        });

        return { ...link, relevanceScore };
      })
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, this.maxLinksPerPage);
  }

  async scrapeWithFallback(url) {
    const strategies = [
      async () => {
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(url);
        return response.data;
      },
      async () => {
        const axiosInstance = createAxiosInstance({ 'Referer': 'https://www.google.com/' });
        const response = await axiosInstance.get(url);
        return response.data;
      },
      async () => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        const axiosInstance = createAxiosInstance({
          'Referer': 'https://duckduckgo.com/',
          'Accept-Language': 'en-GB,en;q=0.9',
          'Sec-CH-UA': '"Google Chrome";v="120", "Chromium";v="120", "Not?A_Brand";v="99"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"'
        });
        const response = await axiosInstance.get(url);
        return response.data;
      },
      async () => {
        const axiosInstance = createAxiosInstance({
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        });
        const response = await axiosInstance.get(url);
        return response.data;
      }
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`Trying strategy ${i + 1} for ${url}`);
        return await strategies[i]();
      } catch (error) {
        console.log(`Strategy ${i + 1} failed:`, error.message);
        if (i === strategies.length - 1) throw error;
      }
    }
  }
}

// Main router endpoint
router.post('/', async (req, res) => {
  const { query, url, maxDepth = 2, maxLinksPerPage = 3, summarize = false } = req.body;

  if (!query && !url) {
    return res.status(400).json({ error: 'Provide url or query' });
  }

  try {
    const scraper = new AdvancedScraper(maxDepth, maxLinksPerPage);
    let results = [];
    let targetUrl = url;

    if (!url && query) {
      const tavilyKey = "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";
      const tavilyResp = await axios.post(
        'https://api.tavily.com/search',
        { query, max_results: 5 },
        { headers: { Authorization: `Bearer ${tavilyKey}` } }
      );

      const searchResults = tavilyResp.data?.results || [];
      if (searchResults.length === 0) {
        return res.status(404).json({ error: 'No results found' });
      }

      for (const result of searchResults.slice(0, 2)) {
        const urlResults = await scraper.scrapeWithNestedLinks(result.url, query);
        results = results.concat(urlResults);
      }
    } else {
      results = await scraper.scrapeWithNestedLinks(targetUrl, query);
    }

    if (results.length === 0) {
      return res.status(500).json({ error: 'Failed to extract content from any pages' });
    }

    // Organize results by depth
    const depthWiseResults = {};
    results.forEach(result => {
      if (!depthWiseResults[result.depth]) {
        depthWiseResults[result.depth] = [];
      }
      depthWiseResults[result.depth].push(result);
    });

    // Prepare response based on summarize flag
    let aiResponse = null;
    if (summarize) {
      const combinedContent = results.map(r => `[URL: ${r.url}]\n[Title: ${r.title}]\n${r.content}`).join('\n\n---\n\n');

      const prompt = query
        ? `Based on the following web content from multiple pages, please provide a comprehensive answer to: "${query}"\n\nContent:\n${combinedContent.slice(0, 40000)}`
        : `Summarize and extract the most important information from the following web content collected from multiple pages:\n\n${combinedContent.slice(0, 40000)}`;

      const aiResult = await model.generateContent(prompt);
      aiResponse = aiResult.response.text();
    }

    return res.json({
      query: query || 'Direct URL scraping',
      timestamp: new Date().toISOString(),
      totalPages: results.length,
      maxDepth: maxDepth,
      depthWiseResults: depthWiseResults,
      summary: aiResponse || 'No summary requested - set summarize=true to get AI summary',
      rawResults: results.map(r => ({
        url: r.url,
        title: r.title,
        depth: r.depth,
        contentLength: r.contentLength,
        timestamp: r.timestamp,
        contentPreview: r.content.substring(0, 300) + '...'
      }))
    });

  } catch (error) {
    console.error('Advanced scraping error:', error);
    return res.status(500).json({
      error: 'Scraping failed: ' + error.message
    });
  }
});

// New endpoint for getting full content of a specific page
router.get('/content/:index', async (req, res) => {
  const { index } = req.params;
  const { results } = req.body;

  if (!results || !results[index]) {
    return res.status(404).json({ error: 'Content not found' });
  }

  const selectedResult = results[index];
  return res.json({
    url: selectedResult.url,
    title: selectedResult.title,
    depth: selectedResult.depth,
    fullContent: selectedResult.content,
    contentLength: selectedResult.contentLength
  });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'Advanced scraper with depth-wise results is running' });
});

export default router;