const API_KEY = 'APIKEYHERE'; // Replace with your actual NewsAPI key

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'fetchNews') {
    console.log('Received fetchNews request');
    fetchAndSummarizeNews().then(response => {
      console.log('Fetched news:', response);
      sendResponse(response);
    }).catch(error => {
      console.error('Error in fetchAndSummarizeNews:', error);
      sendResponse({error: error.message});
    });
    return true; // Indicates that the response is asynchronous
  }
});

async function fetchAndSummarizeNews() {
  try {
    console.log('Fetching AI news...');
    const aiNews = await fetchNews(
      '("artificial intelligence" OR "machine learning" OR "deep learning" OR ' +
      '"neural networks" OR NLP OR "computer vision" OR robotics) AND ' +
      '(breakthrough OR innovation OR research OR "real-world impact" OR ethics) ' +
      'AND (Google OR OpenAI OR DeepMind OR Microsoft OR IBM OR Amazon OR Meta) ' +
      'NOT (stock OR price OR lawsuit)'
    );
    
    console.log('Fetching Embedded Systems news...');
    const embeddedNews = await fetchNews(
      '("embedded systems" OR microcontroller OR SoC OR FPGA OR ' +
      '"Internet of Things" OR IoT OR "edge computing") AND ' +
      '(Qualcomm OR AMD OR Nvidia OR Intel OR ARM OR "RISC-V" OR Samsung OR NXP) AND ' +
      '(innovation OR breakthrough OR "new product" OR "performance improvement") ' +
      'NOT (stock OR price OR lawsuit)'
    );
    
    console.log('Fetching Indian Economy news...');
    const economyNews = await fetchNews(
      '(India OR "Indian economy") AND ' +
      '(GDP OR inflation OR "economic growth" OR "foreign investment" OR ' +
      'exports OR imports OR "fiscal policy" OR "monetary policy" OR ' +
      '"trade balance" OR "economic reforms" OR unemployment OR ' +
      '"industrial production" OR "Reserve Bank of India" OR RBI) ' +
      'NOT (cricket OR bollywood OR election)'
    );

    console.log('Fetching Wisdom, Spirituality, and Religion news...');
    const wisdomNews = await fetchNews(
      '(wisdom OR spirituality OR religion OR philosophy OR meditation OR ' +
      '"mindfulness" OR "self-improvement" OR "personal growth") AND ' +
      '(research OR study OR practice OR teaching OR "new book" OR conference) ' +
      'AND (Buddhism OR Hinduism OR Christianity OR Islam OR Judaism OR ' +
      '"secular spirituality" OR psychology OR neuroscience) ' +
      'NOT (politics OR controversy OR scandal)'
    );

    return {
      'AI News': aiNews,
      'Embedded Systems News': embeddedNews,
      'Indian Economy News': economyNews,
      'Wisdom & Spirituality News': wisdomNews
    };
  } catch (error) {
    console.error('Error in fetchAndSummarizeNews:', error);
    throw error;
  }
}

async function fetchNews(query) {
  const today = new Date();
  const lastWeek = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);
  const fromDate = lastWeek.toISOString().split('T')[0]; // Format: YYYY-MM-DD

  const url = `https://newsapi.org/v2/everything?q=${encodeURIComponent(query)}&language=en&sortBy=relevancy&pageSize=15&from=${fromDate}&apiKey=${API_KEY}`;
  
  try {
    console.log('Fetching from URL:', url);
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'ok') {
      console.log('Received data:', data);
      const validArticles = data.articles.filter(article => 
        article.title && 
        article.url && 
        article.description && 
        article.publishedAt &&
        !article.title.toLowerCase().includes('removed') &&
        !article.description.toLowerCase().includes('removed')
      );
      
      const uniqueArticles = removeDuplicates(validArticles);
      
      return Promise.all(uniqueArticles.slice(0, 5).map(async (article) => {
        const summary = await summarizeArticle(article.description || article.content);
        return {
          title: article.title,
          url: article.url,
          summary: summary,
          publishedAt: new Date(article.publishedAt).toLocaleDateString()
        };
      }));
    } else {
      console.error('API returned non-ok status:', data.status, data.message);
      throw new Error(`Failed to fetch news: ${data.message}`);
    }
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
}

function removeDuplicates(articles) {
  const uniqueArticles = [];
  const seenTitles = new Map();

  for (const article of articles) {
    const normalizedTitle = normalizeString(article.title);
    const titleHash = simpleHash(normalizedTitle);
    
    if (!seenTitles.has(titleHash)) {
      uniqueArticles.push(article);
      seenTitles.set(titleHash, normalizedTitle);
    } else {
      const existingTitle = seenTitles.get(titleHash);
      if (calculateSimilarity(normalizedTitle, existingTitle) <= 0.8) {
        uniqueArticles.push(article);
        seenTitles.set(titleHash, normalizedTitle);
      }
    }
  }

  return uniqueArticles;
}

function normalizeString(str) {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

function simpleHash(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash;
}

function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const maxLen = Math.max(len1, len2);
  
  if (maxLen === 0) return 1.0;
  
  const distance = levenshteinDistance(str1, str2);
  return 1 - distance / maxLen;
}

function levenshteinDistance(str1, str2) {
  if (str1.length < str2.length) {
    [str1, str2] = [str2, str1];
  }

  const rows = str1.length + 1;
  const cols = str2.length + 1;
  const distanceMatrix = new Array(2).fill(0).map(() => new Array(cols).fill(0));

  for (let col = 1; col < cols; col++) {
    distanceMatrix[0][col] = col;
  }

  for (let row = 1; row < rows; row++) {
    const currentRow = row % 2;
    const previousRow = (row - 1) % 2;
    distanceMatrix[currentRow][0] = row;

    for (let col = 1; col < cols; col++) {
      if (str1[row - 1] === str2[col - 1]) {
        distanceMatrix[currentRow][col] = distanceMatrix[previousRow][col - 1];
      } else {
        distanceMatrix[currentRow][col] = Math.min(
          distanceMatrix[previousRow][col],
          distanceMatrix[currentRow][col - 1],
          distanceMatrix[previousRow][col - 1]
        ) + 1;
      }
    }
  }

  return distanceMatrix[(rows - 1) % 2][cols - 1];
}

async function summarizeArticle(content) {
  if (!content) return "No content available for summarization.";
  const maxLength = 200;
  return content.length > maxLength ? content.substring(0, maxLength) + '...' : content;
}
