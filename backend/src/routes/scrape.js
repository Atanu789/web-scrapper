import axios from 'axios';
import * as cheerio from 'cheerio';
import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { URL } from 'url';

const router = Router();

// Essential user agents for bot detection avoidance
const userAgents = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0'
];

// Essential HTTP client with basic headers and retry logic
const createAxiosInstance = (customHeaders = {}) => {
  const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];

  return axios.create({
    timeout: 30000, // Increased timeout
    maxRedirects: 5,
    headers: {
      'User-Agent': randomUserAgent,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'DNT': '1',
      'Connection': 'keep-alive',
      'Upgrade-Insecure-Requests': '1',
      ...customHeaders
    },
    validateStatus: (status) => status >= 200 && status < 400
  });
};

// Enhanced content extraction class
class ContentExtractor {
  constructor(html, url) {
    this.$ = cheerio.load(html);
    this.url = url;
    this.contentSelectors = [
      'main article',
      'article',
      '.post-content',
      '.entry-content',
      '.article-content',
      '.article-body',
      'main',
      '.content-body',
      '.main-content',
      '#content',
      '.content',
      '[role="main"]'
    ];
  }

  // Extract title using common selectors
  extractTitle() {
    const titleSelectors = [
      'h1',
      'title',
      'meta[property="og:title"]',
      'meta[name="twitter:title"]',
      '.post-title',
      '.entry-title',
      '.article-title',
      '.page-title'
    ];

    for (const selector of titleSelectors) {
      const element = this.$(selector);
      if (element.length > 0) {
        const title = selector.startsWith('meta')
          ? element.attr('content')
          : element.first().text().trim();

        if (title && title.length > 0 && title.length < 300) {
          return this.cleanText(title);
        }
      }
    }
    return 'No title found';
  }

  // Enhanced content extraction with better fallbacks
  extractContent() {
    // Create a working copy of the DOM
    const $body = this.$('body').clone();

    // Remove unwanted elements
    $body.find(`
      script, style, nav, footer, header, aside, 
      .advertisement, .ad, .ads, .sidebar, .menu, 
      .social, .share, .comment, .comments, 
      .related, .recommended, .popup, .modal,
      [class*="ad"], [id*="ad"], [class*="sidebar"],
      [class*="menu"], [class*="nav"]
    `).remove();

    // Try content selectors first
    for (const selector of this.contentSelectors) {
      const element = $body.find(selector);
      if (element.length > 0) {
        const text = element.text().trim();
        if (text.length > 200) { // Minimum content threshold
          return this.cleanContent(text);
        }
      }
    }

    // Fallback: extract from paragraphs
    const paragraphs = $body.find('p');
    if (paragraphs.length > 0) {
      let combinedText = '';
      paragraphs.each((i, elem) => {
        const pText = this.$(elem).text().trim();
        if (pText.length > 50) {
          combinedText += pText + '\n\n';
        }
      });
      if (combinedText.length > 200) {
        return this.cleanContent(combinedText);
      }
    }

    // Last resort: body text
    const bodyText = $body.text().trim();
    return bodyText.length > 200 ? this.cleanContent(bodyText) : 'No content found';
  }

  // Extract structured HTML content for PDF generation
  extractContentHtml() {
    const $body = this.$('body').clone();

    // Remove unwanted elements
    $body.find(`
      script, style, nav, footer, header, aside,
      .advertisement, .ad, .ads, .sidebar, .menu,
      .social, .share, .comment, .comments,
      .related, .recommended, .popup, .modal,
      [class*="ad"], [id*="ad"]
    `).remove();

    // Try to find main content container
    for (const selector of this.contentSelectors) {
      const element = $body.find(selector);
      if (element.length > 0) {
        const html = element.html();
        const textLength = element.text().trim().length;
        if (html && textLength > 200) {
          return this.cleanHtml(html);
        }
      }
    }

    // Fallback: collect paragraphs and headings
    const contentElements = $body.find('h1, h2, h3, h4, h5, h6, p, ul, ol, blockquote');
    if (contentElements.length > 0) {
      let html = '';
      contentElements.each((i, elem) => {
        const elementHtml = this.$(elem).toString();
        const elementText = this.$(elem).text().trim();
        if (elementText.length > 10) {
          html += elementHtml + '\n';
        }
      });
      return html ? this.cleanHtml(html) : null;
    }

    return null;
  }

  // Extract comprehensive metadata
  extractMetadata() {
    const metadata = {};

    // Description
    metadata.description =
      this.$('meta[name="description"]').attr('content') ||
      this.$('meta[property="og:description"]').attr('content') ||
      this.$('meta[name="twitter:description"]').attr('content') || '';

    // Keywords
    metadata.keywords = this.$('meta[name="keywords"]').attr('content') || '';

    // Author
    metadata.author =
      this.$('meta[name="author"]').attr('content') ||
      this.$('meta[property="article:author"]').attr('content') ||
      this.$('.author').first().text().trim() ||
      this.$('[rel="author"]').first().text().trim() || '';

    // Publication date
    metadata.publishDate =
      this.$('meta[property="article:published_time"]').attr('content') ||
      this.$('meta[name="date"]').attr('content') ||
      this.$('time[datetime]').first().attr('datetime') ||
      this.$('time').first().text().trim() || '';

    // Language
    metadata.language =
      this.$('html').attr('lang') ||
      this.$('meta[http-equiv="content-language"]').attr('content') || 'en';

    // Site name
    metadata.siteName =
      this.$('meta[property="og:site_name"]').attr('content') || '';

    // Image
    metadata.image =
      this.$('meta[property="og:image"]').attr('content') ||
      this.$('meta[name="twitter:image"]').attr('content') || '';

    return metadata;
  }

  // Clean text content
  cleanText(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/[\r\n]+/g, ' ')
      .trim();
  }

  // Clean extracted content
  cleanContent(content) {
    return content
      .replace(/\s+/g, ' ')           // Multiple spaces to single
      .replace(/\n\s*\n/g, '\n\n')    // Multiple newlines to double
      .replace(/\t/g, ' ')            // Tabs to spaces
      .trim()
      .substring(0, 50000);           // Reasonable content length limit
  }

  // Clean HTML content
  cleanHtml(html) {
    return html
      .replace(/\s+/g, ' ')
      .replace(/>\s+</g, '><')
      .trim();
  }
}

// Enhanced scraper with better error handling
class WebScraper {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 2000;
  }

  async scrapeUrl(url) {
    let lastError = null;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Scraping attempt ${attempt}/${this.maxRetries}: ${url}`);

        const html = await this.fetchWithRetry(url, attempt);
        const extractor = new ContentExtractor(html, url);

        const result = {
          url: url,
          title: extractor.extractTitle(),
          content: extractor.extractContent(),
          contentHtml: extractor.extractContentHtml(),
          metadata: extractor.extractMetadata(),
          timestamp: new Date().toISOString(),
          success: true,
          wordCount: this.countWords(extractor.extractContent()),
          scrapingAttempts: attempt
        };

        // Validate extracted content
        if (!result.content || result.content === 'No content found' || result.content.length < 100) {
          throw new Error('Insufficient content extracted - content too short or empty');
        }

        console.log(`✅ Successfully scraped: ${url} (${result.wordCount} words)`);
        return result;

      } catch (error) {
        lastError = error;
        console.log(`❌ Attempt ${attempt} failed for ${url}: ${error.message}`);

        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * attempt;
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    return {
      url: url,
      error: lastError?.message || 'Unknown error',
      success: false,
      timestamp: new Date().toISOString(),
      scrapingAttempts: this.maxRetries
    };
  }

  // Enhanced fetch with multiple strategies
  async fetchWithRetry(url, attempt) {
    const strategies = [
      // Strategy 1: Standard request
      async () => {
        const axiosInstance = createAxiosInstance();
        const response = await axiosInstance.get(url);
        return response.data;
      },
      // Strategy 2: With referer
      async () => {
        const axiosInstance = createAxiosInstance({
          'Referer': 'https://www.google.com/',
          'Cache-Control': 'no-cache'
        });
        const response = await axiosInstance.get(url);
        return response.data;
      },
      // Strategy 3: Mobile user agent
      async () => {
        const axiosInstance = createAxiosInstance({
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
        });
        const response = await axiosInstance.get(url);
        return response.data;
      }
    ];

    const strategyIndex = Math.min(attempt - 1, strategies.length - 1);
    return await strategies[strategyIndex]();
  }

  // Count words in content
  countWords(content) {
    if (!content) return 0;
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }

  // Utility delay function
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Scrape multiple URLs with proper concurrency control
  async scrapeMultipleUrls(urls, concurrent = 2) {
    const results = [];
    const batches = [];

    // Create batches
    for (let i = 0; i < urls.length; i += concurrent) {
      batches.push(urls.slice(i, i + concurrent));
    }

    console.log(`🚀 Starting batch scraping: ${urls.length} URLs in ${batches.length} batches`);

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 Processing batch ${batchIndex + 1}/${batches.length}: ${batch.length} URLs`);

      const batchPromises = batch.map(url => this.scrapeUrl(url));
      const batchResults = await Promise.allSettled(batchPromises);

      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const scrapedData = result.value;
          // Remove HTML content for batch operations to save memory
          if (scrapedData.success) {
            delete scrapedData.contentHtml;
          }
          results.push(scrapedData);
        } else {
          results.push({
            url: batch[index],
            error: result.reason?.message || 'Unknown error',
            success: false,
            timestamp: new Date().toISOString()
          });
        }
      });

      // Add delay between batches to be respectful
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ Waiting 3s before next batch...`);
        await this.delay(3000);
      }
    }

    return results;
  }
}

// ===================================================================
// START OF CORRECTED CODE
// ===================================================================

// Enhanced PDF generation (Corrected)
function generatePDF(doc, title, content, metadata) {
  // --- This part is the same as before ---
  doc.font('Helvetica-Bold')
    .fontSize(24)
    .text(title, { align: 'center' });

  doc.moveDown(1);

  if (metadata.author) {
    doc.font('Helvetica')
      .fontSize(12)
      .text(`Author: ${metadata.author}`, { align: 'center' });
  }

  if (metadata.publishDate) {
    doc.fontSize(12)
      .text(`Published: ${new Date(metadata.publishDate).toLocaleDateString()}`, { align: 'center' });
  }

  doc.moveDown(2);

  doc.font('Helvetica')
    .fontSize(11)
    .text(content, {
      width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
      align: 'left',
      lineGap: 3
    });

  // --- THIS IS THE CORRECTED PART ---
  // Add footer with the correct page range logic
  const range = doc.bufferedPageRange();
  const pageCount = range.count;

  for (let i = range.start; i < range.start + pageCount; i++) {
    doc.switchToPage(i);

    const pageNumber = i + 1;

    doc.fontSize(8)
      .text(`Generated on ${new Date().toLocaleDateString()} • Page ${pageNumber} of ${pageCount}`,
        doc.page.margins.left, doc.page.height - 50, {
        width: doc.page.width - doc.page.margins.left - doc.page.margins.right,
        align: 'center'
      });
  }
}

// ROUTES

// Single URL scraping endpoint
router.post('/scrape', async (req, res) => {
  const { url } = req.body;
  const { format } = req.query;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required',
      example: { url: 'https://example.com' }
    });
  }

  // Validate URL format
  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format',
      provided: url
    });
  }

  try {
    const scraper = new WebScraper();
    const result = await scraper.scrapeUrl(url);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'Scraping failed',
        details: result.error,
        url: result.url,
        attempts: result.scrapingAttempts
      });
    }

    // PDF format requested
    if (format === 'pdf') {
      try {
        const doc = new PDFDocument({
          margins: { top: 50, bottom: 60, left: 72, right: 72 } // Increased bottom margin for footer
        });

        const filename = (result.title || 'scraped-content')
          .replace(/[^a-z0-9\s]/gi, '')
          .replace(/\s+/g, '_')
          .toLowerCase()
          .substring(0, 50);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);

        doc.pipe(res);
        generatePDF(doc, result.title, result.content, result.metadata);
        doc.end();

      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        // Simply end the response. Don't try to send JSON.
        res.end();
      }
    } else {
      // JSON format (default)
      delete result.contentHtml; // Remove HTML to keep response clean
      return res.json({
        success: true,
        data: result,
        stats: {
          contentLength: result.content.length,
          wordCount: result.wordCount,
          extractedAt: result.timestamp
        }
      });
    }

  } catch (error) {
    console.error('Scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal scraping error',
      message: error.message
    });
  }
});

// ===================================================================
// END OF CORRECTED CODE
// ===================================================================


// Batch scraping endpoint
router.post('/scrape/batch', async (req, res) => {
  const { urls, concurrent = 2 } = req.body;

  if (!urls || !Array.isArray(urls) || urls.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'URLs array is required',
      example: { urls: ['https://example1.com', 'https://example2.com'] }
    });
  }

  if (urls.length > 20) {
    return res.status(400).json({
      success: false,
      error: 'Maximum 20 URLs allowed per batch',
      provided: urls.length
    });
  }

  if (concurrent > 5 || concurrent < 1) {
    return res.status(400).json({
      success: false,
      error: 'Concurrent value must be between 1 and 5',
      provided: concurrent
    });
  }

  // Validate all URLs
  const invalidUrls = [];
  urls.forEach((url, index) => {
    try {
      new URL(url);
    } catch (error) {
      invalidUrls.push({ index, url, error: 'Invalid URL format' });
    }
  });

  if (invalidUrls.length > 0) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URLs found',
      invalidUrls: invalidUrls
    });
  }

  try {
    const scraper = new WebScraper();
    const results = await scraper.scrapeMultipleUrls(urls, concurrent);

    const stats = results.reduce((acc, result) => {
      if (result.success) {
        acc.successful++;
        acc.totalWords += result.wordCount || 0;
        acc.totalContent += result.content ? result.content.length : 0;
      } else {
        acc.failed++;
      }
      return acc;
    }, { successful: 0, failed: 0, totalWords: 0, totalContent: 0 });

    return res.json({
      success: true,
      summary: {
        total: results.length,
        successful: stats.successful,
        failed: stats.failed,
        totalWords: stats.totalWords,
        totalContentLength: stats.totalContent
      },
      results: results,
      processedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Batch scraping error:', error);
    return res.status(500).json({
      success: false,
      error: 'Batch scraping failed',
      message: error.message
    });
  }
});

// Preview endpoint
router.post('/preview', async (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({
      success: false,
      error: 'URL is required'
    });
  }

  try {
    new URL(url);
  } catch (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid URL format'
    });
  }

  try {
    const scraper = new WebScraper();
    const result = await scraper.scrapeUrl(url);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        error: 'Preview failed',
        details: result.error
      });
    }

    return res.json({
      success: true,
      url: result.url,
      title: result.title,
      preview: result.content.substring(0, 800) + (result.content.length > 800 ? '...' : ''),
      metadata: result.metadata,
      stats: {
        fullContentLength: result.content.length,
        wordCount: result.wordCount,
        hasHtmlContent: !!result.contentHtml
      },
      extractedAt: result.timestamp
    });

  } catch (error) {
    console.error('Preview error:', error);
    return res.status(500).json({
      success: false,
      error: 'Preview failed',
      message: error.message
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    status: '✅ Web Scraper API is running',
    version: '2.0.0',
    features: [
      'Single URL scraping (JSON/PDF)',
      'Batch URL scraping (up to 20 URLs)',
      'Content preview',
      'Comprehensive metadata extraction',
      'Enhanced error handling & retries',
      'Rate limiting with configurable concurrency',
      'User agent rotation',
      'PDF generation with proper formatting',
      'Word count and content statistics'
    ],
    endpoints: {
      scrape: 'POST /scrape - Scrape single URL',
      batch: 'POST /scrape/batch - Scrape multiple URLs',
      preview: 'POST /preview - Get content preview',
      health: 'GET /health - Health check'
    },
    limits: {
      batchSize: 20,
      maxConcurrent: 5,
      contentLimit: '50KB',
      timeout: '30s'
    },
    timestamp: new Date().toISOString()
  });
});

export default router;